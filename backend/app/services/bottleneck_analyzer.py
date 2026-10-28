from typing import List, Dict, Any

class BottleneckAnalyzer:
    @staticmethod
    def analyze(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        findings = []
        total_tx = metrics.get("total_transactions", 0)
        
        if total_tx < 50:
            return [{
                "title": "Insufficient Data for Statistical Bottleneck Analysis",
                "severity": "INFO",
                "supporting_measurements": {"transaction_count": total_tx},
                "explanation": "Workloads smaller than 50 transactions do not exhibit steady-state queue or resource characteristics.",
                "recommendation": "Execute a workload of at least 500 to 1,000 transactions for conclusive bottleneck detection."
            }]

        total_resp = metrics.get("avg_response_time_ms", 0.0)
        p95_resp = metrics.get("p95_response_time_ms", 0.0)
        latencies = metrics.get("service_latencies", {})
        fx_metrics = metrics.get("fx_conversions", {})
        notif = metrics.get("notification_metrics", {})
        
        # 1. Check Notification Queue Buildup
        max_q = notif.get("max_queue_size", 0)
        avg_wait = notif.get("avg_wait_time_ms", 0.0)
        num_workers = notif.get("num_workers", 1)
        
        if max_q > 150 or avg_wait > 80.0:
            findings.append({
                "title": "Asynchronous Notification Delivery Bottleneck",
                "severity": "HIGH",
                "supporting_measurements": {
                    "max_observed_queue_size": max_q,
                    "avg_queue_wait_ms": avg_wait,
                    "worker_count": num_workers
                },
                "explanation": f"Notification queue experienced backlog accumulation ({max_q} pending events) with an average wait time of {avg_wait}ms. The {num_workers} background workers cannot keep pace with the payment arrival rate.",
                "recommendation": f"Scale notification background workers from {num_workers} to {min(num_workers * 2, 16)} or implement batched notification dispatching."
            })

        # 2. Check FX Overhead Bottleneck
        fx_p95 = latencies.get("fx_p95_ms", 0.0)
        fx_avg = latencies.get("fx_avg_ms", 0.0)
        intl_count = fx_metrics.get("total_intl", 0)
        
        if intl_count > 0 and total_resp > 0:
            fx_share = (fx_avg / total_resp) * 100.0
            if fx_share > 35.0 or fx_p95 > 25.0:
                findings.append({
                    "title": "Foreign Exchange Rate Lookup Latency Bottleneck",
                    "severity": "MEDIUM",
                    "supporting_measurements": {
                        "fx_avg_latency_ms": fx_avg,
                        "fx_share_of_response_pct": round(fx_share, 1),
                        "fx_p95_ms": fx_p95
                    },
                    "explanation": f"Foreign Exchange conversion accounts for {round(fx_share, 1)}% of total payment processing duration due to synchronous database/service rate resolution.",
                    "recommendation": "Enable in-memory LRU exchange-rate caching with periodic invalidation to bypass database lookup overhead."
                })

        # 3. Check Tail Latency Divergence (P95 vs Average)
        if total_resp > 0 and (p95_resp / total_resp) > 2.5:
            findings.append({
                "title": "Severe Tail Latency Divergence (P95/Average)",
                "severity": "MEDIUM",
                "supporting_measurements": {
                    "avg_response_ms": total_resp,
                    "p95_response_ms": p95_resp,
                    "divergence_ratio": round(p95_resp / total_resp, 2)
                },
                "explanation": f"The 95th percentile latency ({p95_resp}ms) is {round(p95_resp / total_resp, 2)}x higher than average ({total_resp}ms), pointing to resource contention or thread starvation under load spikes.",
                "recommendation": "Tune bounded concurrency pool limits and optimize database write batches."
            })

        # 4. Check Concurrency Saturation / Low Throughput
        tps = metrics.get("throughput_tps", 0.0)
        if total_tx >= 500 and tps < 25.0:
            findings.append({
                "title": "Low Throughput / Sequential Execution Saturation",
                "severity": "HIGH",
                "supporting_measurements": {
                    "throughput_tps": tps,
                    "total_transactions": total_tx
                },
                "explanation": f"System throughput is limited to {tps} TPS during a {total_tx}-transaction workload. This frequently indicates sequential execution or an overly restrictive concurrency limit.",
                "recommendation": "Switch from sequential mode to concurrent mode with a bounded semaphore of 50 to 100 concurrent workers."
            })

        # 5. Fallback if healthy
        if not findings:
            findings.append({
                "title": "Balanced System Performance - No Critical Bottleneck Detected",
                "severity": "LOW",
                "supporting_measurements": {
                    "throughput_tps": tps,
                    "avg_response_ms": total_resp,
                    "p95_response_ms": p95_resp
                },
                "explanation": "All monitored subsystems (validation, FX, fraud, notification queue) operated within nominal latency and capacity thresholds.",
                "recommendation": "Continue scaling workload up to 5,000 or 10,000 transactions to determine the ultimate saturation breakpoint."
            })

        return findings
