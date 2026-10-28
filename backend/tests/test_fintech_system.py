import pytest
import asyncio
from decimal import Decimal
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.exchange_rate import ExchangeRate
from backend.app.services.fx_service import FXService, FXConversionError
from backend.app.services.fraud_service import FraudService
from backend.app.services.notification_service import NotificationService
from backend.app.services.load_generator import SyntheticLoadGenerator
from backend.app.services.metrics_collector import MetricsCollector
from backend.app.services.bottleneck_analyzer import BottleneckAnalyzer

client = TestClient(app)

def setup_module():
    Base.metadata.create_all(bind=engine)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_load_generator():
    gen1 = SyntheticLoadGenerator(seed=42)
    txs1 = gen1.generate_batch("test-run-1", count=100, workload_type="mixed", intl_percentage=40.0)
    assert len(txs1) == 100
    
    # Verify deterministic reproducibility with identical seed
    gen2 = SyntheticLoadGenerator(seed=42)
    txs2 = gen2.generate_batch("test-run-1", count=100, workload_type="mixed", intl_percentage=40.0)
    assert txs1[0]["customer_id"] == txs2[0]["customer_id"]
    assert txs1[0]["original_amount"] == txs2[0]["original_amount"]

    # Verify domestic-only workload
    txs_dom = gen1.generate_batch("test-run-2", count=50, workload_type="domestic")
    assert all(t["transaction_type"] == "domestic" for t in txs_dom)
    assert all(t["source_currency"] == "INR" and t["destination_currency"] == "INR" for t in txs_dom)

@pytest.mark.asyncio
async def test_fx_conversion_direct_and_inverse():
    db = SessionLocal()
    try:
        fx = FXService(db_session=db, use_cache=True, base_latency_ms=0.0)
        
        # Test Direct lookup: 100 USD -> INR (using illustrative rate 83.25, 1% fee)
        rate, final_amt, fee, dur = await fx.convert(
            original_amount=Decimal("100.00"),
            source_curr="USD",
            dest_curr="INR",
            fee_percentage=Decimal("1.00")
        )
        assert rate == Decimal("83.25")
        # Converted before fee = 8325.00
        # Fee = 83.25
        # Final amount = 8241.75
        assert fee == Decimal("83.25")
        assert final_amt == Decimal("8241.75")
        
        # Test Domestic bypass: INR -> INR (should have rate 1.0, 0 fee)
        rate_dom, final_dom, fee_dom, _ = await fx.convert(
            original_amount=Decimal("5000.00"),
            source_curr="INR",
            dest_curr="INR"
        )
        assert rate_dom == Decimal("1.0")
        assert final_dom == Decimal("5000.00")
        assert fee_dom == Decimal("0.00")

        # Test Inverse lookup: INR -> USD
        inv_rate = await fx.get_exchange_rate("INR", "USD")
        assert inv_rate > Decimal("0")
        expected_approx = (Decimal("1.0") / Decimal("83.25")).quantize(Decimal("0.000001"))
        assert inv_rate == expected_approx
    finally:
        db.close()

@pytest.mark.asyncio
async def test_fraud_service_rules():
    fraud = FraudService(
        amount_threshold=Decimal("250000.00"),
        velocity_window_seconds=60,
        velocity_max_txns=3,
        probabilistic_rate=0.0,
        base_latency_ms=0.0,
        random_seed=123
    )

    # 1. Normal transaction under threshold
    res1 = await fraud.evaluate("CUST_001", Decimal("5000.00"))
    assert not res1.is_flagged

    # 2. Amount above threshold
    res2 = await fraud.evaluate("CUST_002", Decimal("300000.00"))
    assert res2.is_flagged
    assert "exceeds threshold" in res2.reason

    # 3. Velocity check
    await fraud.evaluate("CUST_003", Decimal("100.00"))
    await fraud.evaluate("CUST_003", Decimal("100.00"))
    await fraud.evaluate("CUST_003", Decimal("100.00"))
    res_vel = await fraud.evaluate("CUST_003", Decimal("100.00"))  # 4th transaction
    assert res_vel.is_flagged
    assert "Velocity anomaly" in res_vel.reason

@pytest.mark.asyncio
async def test_notification_service_queue_and_drain():
    notif = NotificationService(num_workers=2, base_latency_ms=1.0)
    await notif.start()
    
    for i in range(10):
        await notif.enqueue(f"tx-{i}", "test-run-1", "SUCCESS")

    assert notif.queue.qsize() > 0 or notif.metrics.queued_count == 10
    await notif.drain_and_stop()
    
    summary = notif.get_summary()
    assert summary["queued_count"] == 10
    assert summary["processed_count"] == 10
    assert summary["success_count"] == 10
    assert summary["current_queue_size"] == 0

def test_metrics_percentiles():
    data = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
    p50 = MetricsCollector.get_percentile(data, 50.0)
    p95 = MetricsCollector.get_percentile(data, 95.0)
    assert abs(p50 - 55.0) < 0.1
    assert p95 > 90.0

def test_bottleneck_analyzer_rules():
    # Healthy run
    healthy_metrics = {
        "total_transactions": 500,
        "throughput_tps": 120.0,
        "avg_response_time_ms": 15.0,
        "p95_response_time_ms": 25.0,
        "service_latencies": {"fx_avg_ms": 4.0, "fx_p95_ms": 7.0},
        "fx_conversions": {"total_intl": 200},
        "notification_metrics": {"max_queue_size": 10, "avg_wait_time_ms": 5.0, "num_workers": 4}
    }
    findings_healthy = BottleneckAnalyzer.analyze(healthy_metrics)
    assert any("No Critical Bottleneck" in f["title"] for f in findings_healthy)

    # Queue bottleneck scenario
    bottleneck_metrics = {
        "total_transactions": 500,
        "throughput_tps": 40.0,
        "avg_response_time_ms": 20.0,
        "p95_response_time_ms": 40.0,
        "service_latencies": {"fx_avg_ms": 4.0, "fx_p95_ms": 7.0},
        "fx_conversions": {"total_intl": 100},
        "notification_metrics": {"max_queue_size": 250, "avg_wait_time_ms": 120.0, "num_workers": 2}
    }
    findings_bottleneck = BottleneckAnalyzer.analyze(bottleneck_metrics)
    assert any("Notification Delivery Bottleneck" in f["title"] for f in findings_bottleneck)

def test_create_and_run_test_experiment():
    # Submit a small 20-transaction test run via API
    payload = {
        "name": "Integration-Test-20tx",
        "transaction_count": 20,
        "workload_type": "mixed",
        "processing_mode": "concurrent",
        "concurrency_limit": 10,
        "intl_percentage": 50.0,
        "random_seed": 77
    }
    resp = client.post("/api/test-runs", json=payload)
    assert resp.status_code == 200
    run_data = resp.json()
    run_id = run_data["id"]

    # Poll status for up to 10 seconds until COMPLETED
    import time
    max_wait = 15
    start = time.time()
    completed = False
    while time.time() - start < max_wait:
        st_resp = client.get(f"/api/test-runs/{run_id}/status")
        assert st_resp.status_code == 200
        st_data = st_resp.json()
        if st_data["status"] == "COMPLETED":
            completed = True
            assert st_data["progress"] == 100.0
            assert st_data["processed_count"] == 20
            assert "metrics" in st_data and st_data["metrics"] is not None
            assert st_data["metrics"]["throughput_tps"] > 0
            break
        time.sleep(0.5)

    assert completed, "Experiment did not complete within the timeout period"

    # Query transactions with pagination
    tx_resp = client.get(f"/api/test-runs/{run_id}/transactions?page=1&page_size=10")
    assert tx_resp.status_code == 200
    tx_page = tx_resp.json()
    assert tx_page["total"] == 20
    assert len(tx_page["items"]) == 10
