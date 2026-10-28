import asyncio
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class NotificationPayload:
    transaction_id: str
    test_run_id: str
    status: str
    queued_at_perf: float
    queued_at_dt: datetime

class NotificationMetrics:
    def __init__(self):
        self.queued_count: int = 0
        self.processed_count: int = 0
        self.success_count: int = 0
        self.failed_count: int = 0
        self.max_queue_size: int = 0
        self.wait_times_ms: List[float] = []
        self.processing_times_ms: List[float] = []
        self.drain_time_ms: float = 0.0

class NotificationService:
    def __init__(self, num_workers: int = 4, base_latency_ms: float = 12.0, max_queue_size: int = 50000):
        self.num_workers = num_workers
        self.base_latency_ms = base_latency_ms
        self.max_queue_size = max_queue_size
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.metrics = NotificationMetrics()
        self.workers: List[asyncio.Task] = []
        self.is_running: bool = False
        self._active_workers: int = 0

    async def start(self):
        self.is_running = True
        self.workers = [
            asyncio.create_task(self._worker_loop(i + 1))
            for i in range(self.num_workers)
        ]

    async def enqueue(self, transaction_id: str, test_run_id: str, status: str):
        payload = NotificationPayload(
            transaction_id=transaction_id,
            test_run_id=test_run_id,
            status=status,
            queued_at_perf=time.perf_counter(),
            queued_at_dt=datetime.utcnow()
        )
        await self.queue.put(payload)
        self.metrics.queued_count += 1
        q_size = self.queue.qsize()
        if q_size > self.metrics.max_queue_size:
            self.metrics.max_queue_size = q_size

    async def _worker_loop(self, worker_id: int):
        while self.is_running or not self.queue.empty():
            try:
                # Wait for next notification with timeout
                payload = await asyncio.wait_for(self.queue.get(), timeout=0.1)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                if not self.is_running and self.queue.empty():
                    break
                continue

            self._active_workers += 1
            wait_time = (time.perf_counter() - payload.queued_at_perf) * 1000.0
            self.metrics.wait_times_ms.append(wait_time)

            p_start = time.perf_counter()
            try:
                # Simulated I/O / delivery delay
                if self.base_latency_ms > 0:
                    await asyncio.sleep(self.base_latency_ms / 1000.0)
                self.metrics.success_count += 1
            except Exception:
                self.metrics.failed_count += 1
            finally:
                p_duration = (time.perf_counter() - p_start) * 1000.0
                self.metrics.processing_times_ms.append(p_duration)
                self.metrics.processed_count += 1
                self._active_workers -= 1
                self.queue.task_done()

    async def drain_and_stop(self):
        """
        Waits for all queued notifications to finish processing before shutting down.
        """
        drain_start = time.perf_counter()
        # Allow existing queue items to drain
        if not self.queue.empty():
            await self.queue.join()
        
        self.is_running = False
        for w in self.workers:
            if not w.done():
                w.cancel()
        
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.metrics.drain_time_ms = (time.perf_counter() - drain_start) * 1000.0

    def get_summary(self) -> Dict:
        wait_times = self.metrics.wait_times_ms
        p_times = self.metrics.processing_times_ms
        
        avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0.0
        sorted_wait = sorted(wait_times)
        p95_wait = sorted_wait[int(len(sorted_wait) * 0.95)] if sorted_wait else 0.0
        
        avg_proc = sum(p_times) / len(p_times) if p_times else 0.0
        
        return {
            "queued_count": self.metrics.queued_count,
            "processed_count": self.metrics.processed_count,
            "success_count": self.metrics.success_count,
            "failed_count": self.metrics.failed_count,
            "max_queue_size": self.metrics.max_queue_size,
            "current_queue_size": self.queue.qsize(),
            "avg_wait_time_ms": round(avg_wait, 2),
            "p95_wait_time_ms": round(p95_wait, 2),
            "avg_processing_time_ms": round(avg_proc, 2),
            "drain_time_ms": round(self.metrics.drain_time_ms, 2),
            "num_workers": self.num_workers
        }
