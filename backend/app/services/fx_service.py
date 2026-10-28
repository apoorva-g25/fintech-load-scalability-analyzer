import time
import asyncio
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models.exchange_rate import ExchangeRate
from backend.app.core.config import settings

class FXConversionError(Exception):
    pass

class FXService:
    def __init__(self, db_session: Optional[Session] = None, use_cache: bool = True, base_latency_ms: float = 8.0):
        self.db = db_session
        self.use_cache = use_cache
        self.base_latency_ms = base_latency_ms
        self._cache: Dict[str, Decimal] = {}
        self._load_initial_cache()

    def _load_initial_cache(self):
        # Seed from settings defaults
        for pair_str, rate_val in settings.DEFAULT_RATES.items():
            self._cache[pair_str] = Decimal(str(rate_val))

    def clear_cache(self):
        self._cache.clear()

    async def get_exchange_rate(self, source_curr: str, dest_curr: str) -> Decimal:
        """
        Fetch exchange rate with direct and inverse lookup.
        Supports caching to evaluate cache optimization benchmarks.
        """
        if source_curr == dest_curr:
            return Decimal("1.0")

        pair_key = f"{source_curr}_{dest_curr}"
        inverse_key = f"{dest_curr}_{source_curr}"

        # If cache is enabled and key exists, return immediately
        if self.use_cache and pair_key in self._cache:
            return self._cache[pair_key]

        # Simulate microservice network / DB lookup latency if uncached or cache disabled
        if self.base_latency_ms > 0:
            await asyncio.sleep(self.base_latency_ms / 1000.0)

        # 1. Direct DB lookup if session available
        if self.db:
            rate_obj = self.db.query(ExchangeRate).filter(
                ExchangeRate.source_currency == source_curr,
                ExchangeRate.destination_currency == dest_curr,
                ExchangeRate.is_active == True
            ).first()
            if rate_obj:
                rate_dec = Decimal(str(rate_obj.rate))
                if self.use_cache:
                    self._cache[pair_key] = rate_dec
                return rate_dec

            # 2. Inverse lookup
            inv_obj = self.db.query(ExchangeRate).filter(
                ExchangeRate.source_currency == dest_curr,
                ExchangeRate.destination_currency == source_curr,
                ExchangeRate.is_active == True
            ).first()
            if inv_obj and inv_obj.rate > 0:
                inv_rate = Decimal("1.0") / Decimal(str(inv_obj.rate))
                inv_rate_rounded = inv_rate.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
                if self.use_cache:
                    self._cache[pair_key] = inv_rate_rounded
                return inv_rate_rounded

        # Fallback to configured in-memory cache
        if pair_key in self._cache:
            return self._cache[pair_key]

        if inverse_key in self._cache:
            inv_rate = Decimal("1.0") / self._cache[inverse_key]
            return inv_rate.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)

        raise FXConversionError(f"No exchange rate configured between {source_curr} and {dest_curr}")

    async def convert(
        self,
        original_amount: Decimal,
        source_curr: str,
        dest_curr: str,
        fee_percentage: Decimal = Decimal("1.00")
    ) -> Tuple[Decimal, Decimal, Decimal, float]:
        """
        Calculates:
        - Exchange rate
        - Converted amount before fees
        - FX fee
        - Final destination amount
        - FX processing duration in milliseconds
        """
        start_time = time.perf_counter()

        # Same-currency domestic bypass
        if source_curr == dest_curr:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return Decimal("1.0"), original_amount, Decimal("0.00"), elapsed_ms

        rate = await self.get_exchange_rate(source_curr, dest_curr)

        # Decimal calculations as required:
        # Converted amount before fees = Original amount * Exchange rate
        # FX fee = Converted amount before fees * FX fee percentage / 100
        # Final destination amount = Converted amount before fees - FX fee
        precision = Decimal("1") if dest_curr == "JPY" else Decimal("0.01")
        
        converted_before_fees = (original_amount * rate).quantize(precision, rounding=ROUND_HALF_UP)
        fx_fee = (converted_before_fees * (fee_percentage / Decimal("100.0"))).quantize(precision, rounding=ROUND_HALF_UP)
        final_dest_amount = (converted_before_fees - fx_fee).quantize(precision, rounding=ROUND_HALF_UP)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return rate, final_dest_amount, fx_fee, elapsed_ms
