import httpx
import time
import sys

BASE_URL = "http://127.0.0.1:8000/api"

BENCHMARKS = [
    {
        "name": "Benchmark-100tx-Concurrent",
        "transaction_count": 100,
        "workload_type": "mixed",
        "processing_mode": "concurrent",
        "concurrency_limit": 25,
        "intl_percentage": 50.0,
        "random_seed": 101,
        "notification_config": {"num_workers": 4}
    },
    {
        "name": "Benchmark-500tx-Concurrent",
        "transaction_count": 500,
        "workload_type": "mixed",
        "processing_mode": "concurrent",
        "concurrency_limit": 50,
        "intl_percentage": 50.0,
        "random_seed": 102,
        "notification_config": {"num_workers": 4}
    },
    {
        "name": "Benchmark-500tx-Sequential",
        "transaction_count": 500,
        "workload_type": "mixed",
        "processing_mode": "sequential",
        "concurrency_limit": 1,
        "intl_percentage": 50.0,
        "random_seed": 102,
        "notification_config": {"num_workers": 2}
    },
    {
        "name": "Benchmark-1000tx-Concurrent",
        "transaction_count": 1000,
        "workload_type": "mixed",
        "processing_mode": "concurrent",
        "concurrency_limit": 50,
        "intl_percentage": 50.0,
        "random_seed": 103,
        "notification_config": {"num_workers": 4}
    },
    {
        "name": "WorkerScaling-1000tx-1Worker",
        "transaction_count": 1000,
        "workload_type": "mixed",
        "processing_mode": "concurrent",
        "concurrency_limit": 50,
        "intl_percentage": 50.0,
        "random_seed": 104,
        "notification_config": {"num_workers": 1}
    },
    {
        "name": "FX-1000tx-Uncached",
        "transaction_count": 1000,
        "workload_type": "international",
        "processing_mode": "concurrent",
        "concurrency_limit": 50,
        "intl_percentage": 100.0,
        "random_seed": 105,
        "fx_config": {"use_cache": False, "base_latency_ms": 15.0},
        "notification_config": {"num_workers": 4}
    },
    {
        "name": "Benchmark-5000tx-HeavyScale",
        "transaction_count": 5000,
        "workload_type": "mixed",
        "processing_mode": "concurrent",
        "concurrency_limit": 100,
        "intl_percentage": 50.0,
        "random_seed": 106,
        "notification_config": {"num_workers": 8}
    }
]

def run_suite():
    print("Starting automated benchmark suite execution...")
    for idx, bench in enumerate(BENCHMARKS, 1):
        print(f"\n[{idx}/{len(BENCHMARKS)}] Launching: {bench['name']} ({bench['transaction_count']} tx, {bench['processing_mode']})...")
        
        # Submit run
        resp = httpx.post(f"{BASE_URL}/test-runs", json=bench, timeout=10.0)
        if resp.status_code != 200:
            print(f"Error submitting run: {resp.text}")
            continue

        run_id = resp.json()["id"]
        
        # Poll until complete
        start_time = time.time()
        while True:
            st = httpx.get(f"{BASE_URL}/test-runs/{run_id}/status", timeout=5.0).json()
            if st["status"] == "COMPLETED":
                dur = round(time.time() - start_time, 2)
                m = st["metrics"]
                print(f"--> COMPLETED in {dur}s | TPS: {m['throughput_tps']} | Avg: {m['avg_response_time_ms']}ms | P95: {m['p95_response_time_ms']}ms | Queue Max: {m['notification_metrics']['max_queue_size']}")
                break
            elif st["status"] == "FAILED":
                print(f"--> FAILED: {st.get('error_details')}")
                break
            
            time.sleep(0.5)

    print("\nBenchmark suite execution complete!")

if __name__ == "__main__":
    run_suite()
