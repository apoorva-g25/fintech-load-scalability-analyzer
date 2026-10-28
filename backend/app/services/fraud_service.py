import time
import asyncio
import random
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from backend.app.core.config import settings

class FraudCheckResult:
    def __init__(self, is_flagged: bool, reason: Optional[str] = None, duration_ms: float = 0.0):
        self.is_flagged = is_flagged
        self.reason = reason
        self.duration_ms = duration_ms

class FraudService:
    def __init__(
        self,
        amount_threshold: Decimal = settings.FRAUD_AMOUNT_THRESHOLD,
        velocity_window_seconds: int = settings.FRAUD_VELOCITY_WINDOW_SECONDS,
        velocity_max_txns: int = settings.FRAUD_VELOCITY_MAX_TXNS,
        probabilistic_rate: float = settings.FRAUD_PROBABILISTIC_RATE,
        base_latency_ms: float = settings.BASE_FRAUD_DELAY_MS,
        random_seed: Optional[int] = None
    ):
        self.amount_threshold = amount_threshold
        self.velocity_window_seconds = velocity_window_seconds
        self.velocity_max_txns = velocity_max_txns
        self.probabilistic_rate = probabilistic_rate
        self.base_latency_ms = base_latency_ms
        self._rng = random.Random(random_seed) if random_seed is not None else random.Random()
        
        # In-memory customer transaction history for velocity checks
        self._customer_history: Dict[str, List[float]] = defaultdict(list)

    async def evaluate(self, customer_id: str, amount_in_domestic: Decimal) -> FraudCheckResult:
        """
        Evaluates fraud rules sequentially:
        1. Amount Threshold Check
        2. Customer Velocity Check
        3. Probabilistic Pattern Check
        """
        start_time = time.perf_counter()

        if self.base_latency_ms > 0:
            await asyncio.sleep(self.base_latency_ms / 1000.0)

        current_time = time.time()
        
        # Rule 1: High-value transaction threshold
        if amount_in_domestic > self.amount_threshold:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return FraudCheckResult(
                is_flagged=True,
                reason=f"High-value transaction: {amount_in_domestic} exceeds threshold {self.amount_threshold}",
                duration_ms=duration_ms
            )

        # Rule 2: Customer Velocity Window Check
        recent_timestamps = [
            ts for ts in self._customer_history[customer_id]
            if current_time - ts <= self.velocity_window_seconds
        ]
        recent_timestamps.append(current_time)
        self._customer_history[customer_id] = recent_timestamps

        if len(recent_timestamps) > self.velocity_max_txns:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return FraudCheckResult(
                is_flagged=True,
                reason=f"Velocity anomaly: {len(recent_timestamps)} transactions within {self.velocity_window_seconds}s",
                duration_ms=duration_ms
            )

        # Rule 3: Configurable Probabilistic Alert Simulation
        if self.probabilistic_rate > 0 and self._rng.random() < self.probabilistic_rate:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return FraudCheckResult(
                is_flagged=True,
                reason="Behavioral anomaly: risk score exceeded security threshold",
                duration_ms=duration_ms
            )

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        return FraudCheckResult(is_flagged=False, reason=None, duration_ms=duration_ms)
