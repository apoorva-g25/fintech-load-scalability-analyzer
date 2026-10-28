import asyncio
import uuid
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime

from backend.app.core.database import SessionLocal
from backend.app.core.config import settings
from backend.app.models.test_run import TestRun
from backend.app.services.load_generator import SyntheticLoadGenerator
from backend.app.services.fx_service import FXService
from backend.app.services.fraud_service import FraudService
from backend.app.services.notification_service import NotificationService
from backend.app.services.payment_engine import PaymentEngine

# In-memory registry of running engines to support cancellation if needed
active_engines: Dict[str, PaymentEngine] = {}

async def execute_test_run_task(
    test_run_id: str,
    transaction_count: int,
    workload_type: str,
    processing_mode: str,
    concurrency_limit: int,
    intl_percentage: float,
    random_seed: int,
    fraud_config: Optional[Dict[str, Any]] = None,
    fx_config: Optional[Dict[str, Any]] = None,
    notification_config: Optional[Dict[str, Any]] = None
):
    """
    Background worker function that executes an experiment test run.
    """
    db = SessionLocal()
    try:
        test_run = db.query(TestRun).filter(TestRun.id == test_run_id).first()
        if not test_run:
            return

        # Snapshot configuration
        fraud_cfg = fraud_config or {}
        fx_cfg = fx_config or {}
        notif_cfg = notification_config or {}

        # Initialize Services with experiment configuration
        fx_service = FXService(
            db_session=db,
            use_cache=fx_cfg.get("use_cache", True),
            base_latency_ms=fx_cfg.get("base_latency_ms", settings.BASE_FX_DELAY_MS)
        )

        fraud_service = FraudService(
            amount_threshold=Decimal(str(fraud_cfg.get("amount_threshold", settings.FRAUD_AMOUNT_THRESHOLD))),
            velocity_window_seconds=fraud_cfg.get("velocity_window_seconds", settings.FRAUD_VELOCITY_WINDOW_SECONDS),
            velocity_max_txns=fraud_cfg.get("velocity_max_txns", settings.FRAUD_VELOCITY_MAX_TXNS),
            probabilistic_rate=fraud_cfg.get("probabilistic_rate", settings.FRAUD_PROBABILISTIC_RATE),
            base_latency_ms=fraud_cfg.get("base_latency_ms", settings.BASE_FRAUD_DELAY_MS),
            random_seed=random_seed
        )

        notification_service = NotificationService(
            num_workers=notif_cfg.get("num_workers", settings.DEFAULT_NOTIFICATION_WORKERS),
            base_latency_ms=notif_cfg.get("base_latency_ms", settings.BASE_NOTIFICATION_DELAY_MS),
            max_queue_size=settings.NOTIFICATION_QUEUE_MAX_SIZE
        )

        # Generate synthetic transactions
        generator = SyntheticLoadGenerator(seed=random_seed)
        transactions = generator.generate_batch(
            test_run_id=test_run_id,
            count=transaction_count,
            workload_type=workload_type,
            intl_percentage=intl_percentage
        )

        # Execute Engine
        engine = PaymentEngine(
            db=db,
            test_run=test_run,
            fx_service=fx_service,
            fraud_service=fraud_service,
            notification_service=notification_service,
            concurrency_limit=concurrency_limit,
            processing_mode=processing_mode,
            base_payment_delay_ms=settings.BASE_PAYMENT_DELAY_MS
        )
        active_engines[test_run_id] = engine

        await engine.run(transactions)

    except Exception as e:
        if test_run:
            test_run.status = "FAILED"
            test_run.error_details = str(e)
            test_run.completed_at = datetime.utcnow()
            db.commit()
    finally:
        active_engines.pop(test_run_id, None)
        db.close()
