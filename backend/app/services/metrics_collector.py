import psutil
from typing import List, Dict, Any, Optional
from decimal import Decimal
import math

class MetricsCollector:
    @staticmethod
    def get_percentile(data: List[float], percentile: float) -> float:
        if not data:
            return 0.0
        sorted_data = sorted(data)
        k = (len(sorted_data) - 1) * (percentile / 100.0)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return float(sorted_data[int(k)])
        d0 = sorted_data[int(f)] * (c - k)
        d1 = sorted_data[int(c)] * (k - f)
        return float(d0 + d1)

    @staticmethod
    def calculate_run_metrics(
        total_payment_duration_s: float,
        full_pipeline_duration_s: float,
        transaction_records: List[Dict[str, Any]],
        notification_summary: Dict[str, Any],
        initial_cpu: Optional[float] = None,
        final_cpu: Optional[float] = None,
        initial_memory_mb: Optional[float] = None,
        final_memory_mb: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Computes accurate aggregate metrics across the test run.
        """
        total_tx = len(transaction_records)
        if total_tx == 0:
            return {"error": "No transactions processed"}

        total_latencies = [t["total_duration_ms"] for t in transaction_records]
        payment_latencies = [t["payment_duration_ms"] for t in transaction_records]
        fraud_latencies = [t["fraud_duration_ms"] for t in transaction_records]
        fx_latencies = [t["fx_duration_ms"] for t in transaction_records if t["transaction_type"] == "international"]

        success_count = sum(1 for t in transaction_records if t["status"] == "SUCCESS")
        fraud_count = sum(1 for t in transaction_records if t["status"] == "FLAGGED")
        failed_count = sum(1 for t in transaction_records if t["status"] == "FAILED")
        
        intl_count = sum(1 for t in transaction_records if t["transaction_type"] == "international")
        domestic_count = total_tx - intl_count
        
        fx_success = sum(1 for t in transaction_records if t["transaction_type"] == "international" and t.get("exchange_rate") is not None)
        fx_failed = intl_count - fx_success

        # Monotonic throughput calculation
        throughput_tps = (total_tx / total_payment_duration_s) if total_payment_duration_s > 0 else 0.0
        pipeline_throughput_tps = (total_tx / full_pipeline_duration_s) if full_pipeline_duration_s > 0 else 0.0

        avg_latency = sum(total_latencies) / total_tx if total_tx else 0.0
        p50_latency = MetricsCollector.get_percentile(total_latencies, 50.0)
        p95_latency = MetricsCollector.get_percentile(total_latencies, 95.0)
        p99_latency = MetricsCollector.get_percentile(total_latencies, 99.0)

        avg_payment_lat = sum(payment_latencies) / total_tx if total_tx else 0.0
        p95_payment_lat = MetricsCollector.get_percentile(payment_latencies, 95.0)

        avg_fraud_lat = sum(fraud_latencies) / total_tx if total_tx else 0.0
        p95_fraud_lat = MetricsCollector.get_percentile(fraud_latencies, 95.0)

        avg_fx_lat = sum(fx_latencies) / len(fx_latencies) if fx_latencies else 0.0
        p95_fx_lat = MetricsCollector.get_percentile(fx_latencies, 95.0) if fx_latencies else 0.0

        # Collect resource usage
        cpu_usage = None
        memory_usage_mb = None
        try:
            current_proc = psutil.Process()
            memory_usage_mb = round(current_proc.memory_info().rss / (1024 * 1024), 2)
            cpu_usage = psutil.cpu_percent(interval=None)
        except Exception:
            pass

        return {
            "total_transactions": total_tx,
            "total_payment_time_s": round(total_payment_duration_s, 4),
            "full_pipeline_time_s": round(full_pipeline_duration_s, 4),
            "throughput_tps": round(throughput_tps, 2),
            "pipeline_throughput_tps": round(pipeline_throughput_tps, 2),
            "avg_response_time_ms": round(avg_latency, 2),
            "p50_response_time_ms": round(p50_latency, 2),
            "p95_response_time_ms": round(p95_latency, 2),
            "p99_response_time_ms": round(p99_latency, 2),
            "success_count": success_count,
            "success_rate_pct": round((success_count / total_tx) * 100.0, 2),
            "fraud_flagged_count": fraud_count,
            "fraud_rate_pct": round((fraud_count / total_tx) * 100.0, 2),
            "failed_count": failed_count,
            "failure_rate_pct": round((failed_count / total_tx) * 100.0, 2),
            "domestic_count": domestic_count,
            "international_count": intl_count,
            "fx_conversions": {
                "total_intl": intl_count,
                "success_count": fx_success,
                "failure_count": fx_failed,
                "avg_fx_latency_ms": round(avg_fx_lat, 2),
                "p95_fx_latency_ms": round(p95_fx_lat, 2)
            },
            "service_latencies": {
                "payment_avg_ms": round(avg_payment_lat, 2),
                "payment_p95_ms": round(p95_payment_lat, 2),
                "fraud_avg_ms": round(avg_fraud_lat, 2),
                "fraud_p95_ms": round(p95_fraud_lat, 2),
                "fx_avg_ms": round(avg_fx_lat, 2),
                "fx_p95_ms": round(p95_fx_lat, 2),
                "notification_avg_wait_ms": notification_summary.get("avg_wait_time_ms", 0.0),
                "notification_p95_wait_ms": notification_summary.get("p95_wait_time_ms", 0.0),
                "notification_avg_processing_ms": notification_summary.get("avg_processing_time_ms", 0.0)
            },
            "notification_metrics": notification_summary,
            "resource_usage": {
                "cpu_percent": cpu_usage if cpu_usage is not None else "unavailable",
                "memory_mb": memory_usage_mb if memory_usage_mb is not None else "unavailable"
            }
        }
