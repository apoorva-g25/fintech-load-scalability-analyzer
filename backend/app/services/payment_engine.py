import time
import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.services.fx_service import FXService, FXConversionError
from backend.app.services.fraud_service import FraudService
from backend.app.services.notification_service import NotificationService
from backend.app.services.metrics_collector import MetricsCollector
from backend.app.services.bottleneck_analyzer import BottleneckAnalyzer
from backend.app.models.transaction import Transaction
from backend.app.models.test_run import TestRun

class PaymentEngine:
    def __init__(
        self,
        db: Session,
        test_run: TestRun,
        fx_service: FXService,
        fraud_service: FraudService,
        notification_service: NotificationService,
        concurrency_limit: int = 50,
        processing_mode: str = "concurrent",
        base_payment_delay_ms: float = 5.0
    ):
        self.db = db
        self.test_run = test_run
        self.fx_service = fx_service
        self.fraud_service = fraud_service
        self.notification_service = notification_service
        self.concurrency_limit = concurrency_limit
        self.processing_mode = processing_mode
        self.base_payment_delay_ms = base_payment_delay_ms
        self.is_cancelled = False

    async def _process_single_transaction(self, tx_dict: Dict[str, Any], semaphore: Optional[asyncio.Semaphore]) -> Dict[str, Any]:
        """
        Executes the transactional pipeline for a single synthetic payment.
        """
        if semaphore:
            async with semaphore:
                return await self._execute_pipeline(tx_dict)
        else:
            return await self._execute_pipeline(tx_dict)

    async def _execute_pipeline(self, tx_dict: Dict[str, Any]) -> Dict[str, Any]:
        t_start_perf = time.perf_counter()
        started_at_dt = datetime.utcnow()
        
        tx_id = tx_dict["id"]
        source_curr = tx_dict["source_currency"]
        dest_curr = tx_dict["destination_currency"]
        customer_id = tx_dict["customer_id"]
        original_amount = Decimal(tx_dict["original_amount"])
        tx_type = tx_dict["transaction_type"]

        status = "PROCESSING"
        fraud_flagged = False
        fraud_reason = None
        error_message = None
        rate = None
        converted_amount = None
        fx_fee = None

        fx_duration = 0.0
        fraud_duration = 0.0
        payment_duration = 0.0

        p_start = time.perf_counter()
        try:
            # 1. Validation Stage
            if original_amount <= Decimal("0"):
                raise ValueError("Transaction amount must be strictly positive")

            # Simulate core ledger / payment validation latency
            if self.base_payment_delay_ms > 0:
                await asyncio.sleep(self.base_payment_delay_ms / 1000.0)

            payment_duration = (time.perf_counter() - p_start) * 1000.0

            # 2. Foreign Exchange Stage (Domestic bypasses)
            if tx_type == "international":
                try:
                    rate_dec, conv_amt, fee_amt, fx_duration = await self.fx_service.convert(
                        original_amount=original_amount,
                        source_curr=source_curr,
                        dest_curr=dest_curr
                    )
                    rate = str(rate_dec)
                    converted_amount = str(conv_amt)
                    fx_fee = str(fee_amt)
                    amount_for_fraud_check = conv_amt if dest_curr == "INR" else (original_amount * Decimal("83.0"))
                except FXConversionError as fx_err:
                    status = "FAILED"
                    error_message = f"FX Error: {str(fx_err)}"
                    amount_for_fraud_check = original_amount
            else:
                # Domestic INR -> INR
                rate = "1.0"
                converted_amount = str(original_amount)
                fx_fee = "0.00"
                amount_for_fraud_check = original_amount

            # 3. Fraud Detection Stage (only if not already failed)
            if status != "FAILED":
                fraud_result = await self.fraud_service.evaluate(
                    customer_id=customer_id,
                    amount_in_domestic=amount_for_fraud_check
                )
                fraud_duration = fraud_result.duration_ms
                if fraud_result.is_flagged:
                    status = "FLAGGED"
                    fraud_flagged = True
                    fraud_reason = fraud_result.reason
                else:
                    status = "SUCCESS"

        except Exception as ex:
            status = "FAILED"
            error_message = f"Processing Error: {str(ex)}"
            payment_duration = (time.perf_counter() - p_start) * 1000.0

        completed_at_dt = datetime.utcnow()
        total_duration_ms = (time.perf_counter() - t_start_perf) * 1000.0

        # 4. Asynchronous Notification Enqueue
        await self.notification_service.enqueue(
            transaction_id=tx_id,
            test_run_id=self.test_run.id,
            status=status
        )

        return {
            "id": tx_id,
            "test_run_id": self.test_run.id,
            "customer_id": customer_id,
            "transaction_type": tx_type,
            "source_currency": source_curr,
            "destination_currency": dest_curr,
            "original_amount": str(original_amount),
            "exchange_rate": rate,
            "converted_amount": converted_amount,
            "fx_fee": fx_fee,
            "status": status,
            "fraud_flagged": fraud_flagged,
            "fraud_reason": fraud_reason,
            "created_at": started_at_dt,
            "started_at": started_at_dt,
            "completed_at": completed_at_dt,
            "total_duration_ms": round(total_duration_ms, 2),
            "payment_duration_ms": round(payment_duration, 2),
            "fraud_duration_ms": round(fraud_duration, 2),
            "fx_duration_ms": round(fx_duration, 2),
            "notification_duration_ms": 0.0,
            "error_message": error_message
        }

    async def run(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Executes the entire batch with bounded concurrency or sequentially,
        collects metrics, persists records, and detects bottlenecks.
        """
        # Start notification worker pool
        await self.notification_service.start()
        
        self.test_run.status = "RUNNING"
        self.test_run.started_at = datetime.utcnow()
        self.db.commit()

        total_tx = len(transactions)
        completed_records: List[Dict[str, Any]] = []
        
        start_pipeline_perf = time.perf_counter()
        start_payment_perf = time.perf_counter()

        semaphore = asyncio.Semaphore(self.concurrency_limit) if self.processing_mode == "concurrent" else None

        if self.processing_mode == "sequential":
            for idx, tx in enumerate(transactions):
                if self.is_cancelled:
                    break
                record = await self._process_single_transaction(tx, None)
                completed_records.append(record)
                
                # Update progress periodically
                if (idx + 1) % max(1, total_tx // 20) == 0 or idx == total_tx - 1:
                    self.test_run.progress = round(((idx + 1) / total_tx) * 100.0, 1)
                    self.test_run.processed_count = idx + 1
                    self.db.commit()
        else:
            # Concurrent processing using bounded tasks
            tasks = [self._process_single_transaction(tx, semaphore) for tx in transactions]
            # Chunking or as_completed to update progress smoothly
            chunk_size = max(10, total_tx // 50)
            done_count = 0
            for future in asyncio.as_completed(tasks):
                if self.is_cancelled:
                    break
                record = await future
                completed_records.append(record)
                done_count += 1
                if done_count % chunk_size == 0 or done_count == total_tx:
                    self.test_run.progress = round((done_count / total_tx) * 100.0, 1)
                    self.test_run.processed_count = done_count
                    self.db.commit()

        total_payment_duration_s = time.perf_counter() - start_payment_perf

        # Drain asynchronous notification queue
        await self.notification_service.drain_and_stop()
        full_pipeline_duration_s = time.perf_counter() - start_pipeline_perf

        # Persist transactions in database efficiently (batch insert)
        db_transactions = [Transaction(**rec) for rec in completed_records]
        # Insert in batches of 1,000 to keep SQLite fast and avoid param limits
        batch_size = 1000
        for b_start in range(0, len(db_transactions), batch_size):
            self.db.bulk_save_objects(db_transactions[b_start:b_start + batch_size])
            self.db.commit()

        # Calculate final comprehensive metrics
        notification_summary = self.notification_service.get_summary()
        metrics = MetricsCollector.calculate_run_metrics(
            total_payment_duration_s=total_payment_duration_s,
            full_pipeline_duration_s=full_pipeline_duration_s,
            transaction_records=completed_records,
            notification_summary=notification_summary
        )

        # Detect bottlenecks using rule-based analyzer
        bottlenecks = BottleneckAnalyzer.analyze(metrics)

        # Update test run record to COMPLETED
        self.test_run.status = "COMPLETED"
        self.test_run.completed_at = datetime.utcnow()
        self.test_run.progress = 100.0
        self.test_run.processed_count = len(completed_records)
        self.test_run.metrics = metrics
        self.test_run.bottlenecks = bottlenecks
        self.db.commit()

        return metrics
