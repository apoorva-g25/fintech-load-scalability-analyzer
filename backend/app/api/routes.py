import uuid
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.test_run import TestRun
from backend.app.models.transaction import Transaction
from backend.app.models.exchange_rate import ExchangeRate
from backend.app.schemas.schemas import (
    TestRunCreate, TestRunResponse, TransactionResponse,
    ExchangeRateSchema, ExchangeRateUpdate, ComparisonRequest, BenchmarkSuiteRequest
)
from backend.app.services.benchmark_runner import execute_test_run_task, active_engines
from backend.app.services.export_service import ExportService

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns high-level statistics for the Overview page.
    """
    total_tx = db.query(func.count(Transaction.id)).scalar() or 0
    total_runs = db.query(func.count(TestRun.id)).scalar() or 0
    completed_runs = db.query(func.count(TestRun.id)).filter(TestRun.status == "COMPLETED").scalar() or 0
    
    # Latest completed test run
    latest_run = db.query(TestRun).filter(TestRun.status == "COMPLETED").order_by(desc(TestRun.completed_at)).first()
    
    latest_metrics = latest_run.metrics if latest_run and latest_run.metrics else {}
    latest_bottlenecks = latest_run.bottlenecks if latest_run and latest_run.bottlenecks else []

    # Active run check
    active_run = db.query(TestRun).filter(TestRun.status.in_(["QUEUED", "RUNNING"])).order_by(desc(TestRun.created_at)).first()

    return {
        "total_transactions_processed": total_tx,
        "total_experiments_count": total_runs,
        "completed_experiments_count": completed_runs,
        "latest_throughput_tps": latest_metrics.get("throughput_tps", 0.0),
        "latest_avg_response_ms": latest_metrics.get("avg_response_time_ms", 0.0),
        "latest_p95_response_ms": latest_metrics.get("p95_response_time_ms", 0.0),
        "latest_success_rate_pct": latest_metrics.get("success_rate_pct", 0.0),
        "active_run": {
            "id": active_run.id,
            "name": active_run.name,
            "progress": active_run.progress,
            "status": active_run.status,
            "processed_count": active_run.processed_count,
            "transaction_count": active_run.transaction_count
        } if active_run else None,
        "latest_bottlenecks": latest_bottlenecks
    }

@router.get("/config")
def get_system_config():
    return {
        "domestic_currency": settings.DOMESTIC_CURRENCY,
        "supported_currencies": settings.SUPPORTED_CURRENCIES,
        "default_fx_fee_pct": float(settings.DEFAULT_FX_FEE_PERCENTAGE),
        "fraud_amount_threshold": float(settings.FRAUD_AMOUNT_THRESHOLD),
        "fraud_velocity_window_seconds": settings.FRAUD_VELOCITY_WINDOW_SECONDS,
        "fraud_velocity_max_txns": settings.FRAUD_VELOCITY_MAX_TXNS,
        "fraud_probabilistic_rate": settings.FRAUD_PROBABILISTIC_RATE,
        "default_concurrency": settings.DEFAULT_MAX_CONCURRENCY,
        "default_workers": settings.DEFAULT_NOTIFICATION_WORKERS,
        "base_payment_delay_ms": settings.BASE_PAYMENT_DELAY_MS,
        "base_fx_delay_ms": settings.BASE_FX_DELAY_MS,
        "base_fraud_delay_ms": settings.BASE_FRAUD_DELAY_MS,
        "base_notification_delay_ms": settings.BASE_NOTIFICATION_DELAY_MS
    }

@router.put("/config")
def update_system_config(config_data: dict):
    if "fraud_amount_threshold" in config_data:
        settings.FRAUD_AMOUNT_THRESHOLD = config_data["fraud_amount_threshold"]
    if "default_fx_fee_pct" in config_data:
        settings.DEFAULT_FX_FEE_PERCENTAGE = config_data["default_fx_fee_pct"]
    if "base_fx_delay_ms" in config_data:
        settings.BASE_FX_DELAY_MS = float(config_data["base_fx_delay_ms"])
    if "base_notification_delay_ms" in config_data:
        settings.BASE_NOTIFICATION_DELAY_MS = float(config_data["base_notification_delay_ms"])
    return {"status": "updated", "config": get_system_config()}

@router.get("/fx/rates")
def get_exchange_rates(db: Session = Depends(get_db)):
    rates = db.query(ExchangeRate).all()
    # If table is empty, seed defaults
    if not rates:
        for pair_str, rate_val in settings.DEFAULT_RATES.items():
            src, dst = pair_str.split("_")
            db.add(ExchangeRate(source_currency=src, destination_currency=dst, rate=rate_val, is_active=True))
        db.commit()
        rates = db.query(ExchangeRate).all()
    return rates

@router.put("/fx/rates")
def update_exchange_rate(rate_in: ExchangeRateSchema, db: Session = Depends(get_db)):
    existing = db.query(ExchangeRate).filter(
        ExchangeRate.source_currency == rate_in.source_currency,
        ExchangeRate.destination_currency == rate_in.destination_currency
    ).first()
    if existing:
        existing.rate = rate_in.rate
        existing.is_active = rate_in.is_active
    else:
        existing = ExchangeRate(
            source_currency=rate_in.source_currency,
            destination_currency=rate_in.destination_currency,
            rate=rate_in.rate,
            is_active=rate_in.is_active
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

@router.get("/fx/analytics")
def get_fx_analytics(db: Session = Depends(get_db)):
    """
    Computes aggregated Foreign Exchange performance across all test runs.
    """
    intl_tx = db.query(Transaction).filter(Transaction.transaction_type == "international").all()
    total_intl = len(intl_tx)
    domestic_count = db.query(func.count(Transaction.id)).filter(Transaction.transaction_type == "domestic").scalar() or 0
    
    fx_success = sum(1 for tx in intl_tx if tx.exchange_rate is not None)
    fx_failed = total_intl - fx_success
    
    latencies = [tx.fx_duration_ms for tx in intl_tx]
    avg_fx_latency = sum(latencies) / total_intl if total_intl else 0.0
    sorted_lat = sorted(latencies)
    p95_fx_latency = sorted_lat[int(len(sorted_lat) * 0.95)] if sorted_lat else 0.0

    # Currency pairs distribution
    pair_counts = {}
    for tx in intl_tx:
        pair = f"{tx.source_currency} → {tx.destination_currency}"
        pair_counts[pair] = pair_counts.get(pair, 0) + 1

    return {
        "domestic_transactions_count": domestic_count,
        "international_transactions_count": total_intl,
        "fx_conversion_success_count": fx_success,
        "fx_conversion_failure_count": fx_failed,
        "fx_success_rate_pct": round((fx_success / total_intl * 100.0), 2) if total_intl else 100.0,
        "avg_fx_latency_ms": round(avg_fx_latency, 2),
        "p95_fx_latency_ms": round(p95_fx_latency, 2),
        "currency_pair_distribution": pair_counts
    }

@router.post("/test-runs", response_model=TestRunResponse)
def create_test_run(
    payload: TestRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Prevent duplicate submissions if an experiment is actively running
    running = db.query(TestRun).filter(TestRun.status == "RUNNING").first()
    if running:
        raise HTTPException(
            status_code=409,
            detail=f"An experiment ('{running.name}', ID: {running.id}) is currently executing. Wait for completion before launching another."
        )

    test_id = str(uuid.uuid4())
    run_name = payload.name or f"Run-{payload.transaction_count}tx-{payload.processing_mode}"
    
    snapshot = {
        "fraud_config": payload.fraud_config or {},
        "fx_config": payload.fx_config or {},
        "notification_config": payload.notification_config or {}
    }

    test_run = TestRun(
        id=test_id,
        name=run_name,
        status="QUEUED",
        transaction_count=payload.transaction_count,
        workload_type=payload.workload_type,
        processing_mode=payload.processing_mode,
        concurrency_limit=payload.concurrency_limit,
        intl_percentage=payload.intl_percentage,
        random_seed=payload.random_seed,
        config_snapshot=snapshot,
        progress=0.0,
        processed_count=0
    )
    db.add(test_run)
    db.commit()
    db.refresh(test_run)

    background_tasks.add_task(
        execute_test_run_task,
        test_run_id=test_id,
        transaction_count=payload.transaction_count,
        workload_type=payload.workload_type,
        processing_mode=payload.processing_mode,
        concurrency_limit=payload.concurrency_limit,
        intl_percentage=payload.intl_percentage,
        random_seed=payload.random_seed,
        fraud_config=payload.fraud_config,
        fx_config=payload.fx_config,
        notification_config=payload.notification_config
    )

    return test_run

@router.get("/test-runs", response_model=List[TestRunResponse])
def list_test_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return db.query(TestRun).order_by(desc(TestRun.created_at)).offset(skip).limit(limit).all()

@router.get("/test-runs/{run_id}", response_model=TestRunResponse)
def get_test_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    return run

@router.get("/test-runs/{run_id}/status")
def get_test_run_status(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    return {
        "id": run.id,
        "status": run.status,
        "progress": run.progress,
        "processed_count": run.processed_count,
        "transaction_count": run.transaction_count,
        "metrics": run.metrics,
        "bottlenecks": run.bottlenecks,
        "error_details": run.error_details
    }

@router.get("/test-runs/{run_id}/transactions")
def get_test_run_transactions(
    run_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    tx_type: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.test_run_id == run_id)
    
    if status:
        query = query.filter(Transaction.status == status)
    if tx_type:
        query = query.filter(Transaction.transaction_type == tx_type)
    if customer_id:
        query = query.filter(Transaction.customer_id.ilike(f"%{customer_id}%"))

    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(desc(Transaction.started_at)).offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [TransactionResponse.model_validate(t) for t in items]
    }

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """
    Returns historical trend analytics across completed experiments.
    """
    completed_runs = db.query(TestRun).filter(TestRun.status == "COMPLETED").order_by(TestRun.created_at).all()
    
    analytics_data = []
    for r in completed_runs:
        m = r.metrics or {}
        analytics_data.append({
            "id": r.id,
            "name": r.name,
            "transaction_count": r.transaction_count,
            "mode": r.processing_mode,
            "concurrency": r.concurrency_limit,
            "throughput_tps": m.get("throughput_tps", 0.0),
            "avg_latency_ms": m.get("avg_response_time_ms", 0.0),
            "p95_latency_ms": m.get("p95_response_time_ms", 0.0),
            "p99_latency_ms": m.get("p99_response_time_ms", 0.0),
            "success_rate_pct": m.get("success_rate_pct", 0.0),
            "payment_lat_ms": m.get("service_latencies", {}).get("payment_avg_ms", 0.0),
            "fraud_lat_ms": m.get("service_latencies", {}).get("fraud_avg_ms", 0.0),
            "fx_lat_ms": m.get("service_latencies", {}).get("fx_avg_ms", 0.0),
            "notification_wait_ms": m.get("service_latencies", {}).get("notification_avg_wait_ms", 0.0),
            "max_queue_size": m.get("notification_metrics", {}).get("max_queue_size", 0)
        })
    return analytics_data

@router.get("/bottlenecks/{run_id}")
def get_bottlenecks_for_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    return {
        "test_run_id": run.id,
        "test_run_name": run.name,
        "bottlenecks": run.bottlenecks or []
    }

@router.post("/comparisons")
def compare_experiments(payload: ComparisonRequest, db: Session = Depends(get_db)):
    """
    Compares two or more test runs, computing percentage improvements/regressions.
    """
    runs = db.query(TestRun).filter(TestRun.id.in_(payload.test_run_ids)).all()
    if len(runs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 test runs are required for comparison")

    comparison_items = []
    for r in runs:
        m = r.metrics or {}
        comparison_items.append({
            "id": r.id,
            "name": r.name,
            "transaction_count": r.transaction_count,
            "processing_mode": r.processing_mode,
            "concurrency_limit": r.concurrency_limit,
            "workload_type": r.workload_type,
            "throughput_tps": m.get("throughput_tps", 0.0),
            "avg_latency_ms": m.get("avg_response_time_ms", 0.0),
            "p95_latency_ms": m.get("p95_response_time_ms", 0.0),
            "success_rate_pct": m.get("success_rate_pct", 0.0),
            "max_queue_size": m.get("notification_metrics", {}).get("max_queue_size", 0),
            "fx_avg_ms": m.get("service_latencies", {}).get("fx_avg_ms", 0.0),
            "notification_avg_wait_ms": m.get("service_latencies", {}).get("notification_avg_wait_ms", 0.0)
        })

    # Compute baseline comparison against first run
    baseline = comparison_items[0]
    comparison_results = []
    for item in comparison_items:
        tps_change = 0.0
        lat_change = 0.0
        if baseline["throughput_tps"] > 0:
            # Throughput Improvement (%) = ((Optimized TPS - Baseline TPS) / Baseline TPS) * 100
            tps_change = round(((item["throughput_tps"] - baseline["throughput_tps"]) / baseline["throughput_tps"]) * 100.0, 2)
        if baseline["avg_latency_ms"] > 0:
            # Latency Reduction (%) = ((Baseline Latency - Optimized Latency) / Baseline Latency) * 100
            lat_change = round(((baseline["avg_latency_ms"] - item["avg_latency_ms"]) / baseline["avg_latency_ms"]) * 100.0, 2)

        comparison_results.append({
            **item,
            "throughput_improvement_pct": tps_change,
            "latency_reduction_pct": lat_change
        })

    return {
        "baseline_run_id": baseline["id"],
        "comparison": comparison_results
    }

@router.get("/exports/{run_id}")
def export_test_run_csv(run_id: str, db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.test_run_id == run_id).all()
    if not transactions:
        raise HTTPException(status_code=404, detail="No transactions found for this run")
    
    csv_data = ExportService.export_transactions_csv(transactions)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=test_run_{run_id}.csv"}
    )

@router.get("/exports/all/excel")
def export_all_excel(db: Session = Depends(get_db)):
    completed = db.query(TestRun).filter(TestRun.status == "COMPLETED").all()
    stream = ExportService.export_benchmark_workbook(completed)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Experimental_Results.xlsx"}
    )
