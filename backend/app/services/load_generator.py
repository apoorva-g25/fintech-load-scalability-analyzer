import uuid
import random
from decimal import Decimal
from typing import List, Dict, Any
from backend.app.core.config import settings

class SyntheticLoadGenerator:
    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)

    def generate_batch(
        self,
        test_run_id: str,
        count: int,
        workload_type: str = "mixed",
        intl_percentage: float = 50.0,
        customer_pool_size: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Generates synthetic transactions with deterministic properties.
        """
        transactions = []
        customer_ids = [f"CUST_{i:04d}" for i in range(1, customer_pool_size + 1)]
        
        foreign_currencies = [c for c in settings.SUPPORTED_CURRENCIES if c != settings.DOMESTIC_CURRENCY]
        
        for i in range(count):
            tx_id = str(uuid.uuid4())
            customer_id = self.rng.choice(customer_ids)
            
            # Determine transaction type
            if workload_type == "domestic":
                is_intl = False
            elif workload_type == "international":
                is_intl = True
            else:  # mixed
                is_intl = (self.rng.random() * 100.0) < intl_percentage

            if is_intl:
                tx_type = "international"
                # Either Foreign -> INR or INR -> Foreign or Cross
                if self.rng.random() < 0.7:
                    source_curr = self.rng.choice(foreign_currencies)
                    dest_curr = settings.DOMESTIC_CURRENCY
                else:
                    source_curr = settings.DOMESTIC_CURRENCY
                    dest_curr = self.rng.choice(foreign_currencies)
                
                # International amounts (e.g. 20 to 5000 foreign currency units)
                raw_amount = self.rng.uniform(25.0, 4500.0)
                amount = Decimal(str(round(raw_amount, 2)))
            else:
                tx_type = "domestic"
                source_curr = settings.DOMESTIC_CURRENCY
                dest_curr = settings.DOMESTIC_CURRENCY
                
                # 95% regular amounts, 5% high value to test fraud threshold
                if self.rng.random() < 0.05:
                    raw_amount = self.rng.uniform(260000.0, 500000.0)
                else:
                    raw_amount = self.rng.uniform(100.0, 45000.0)
                amount = Decimal(str(round(raw_amount, 2)))

            transactions.append({
                "id": tx_id,
                "test_run_id": test_run_id,
                "customer_id": customer_id,
                "transaction_type": tx_type,
                "source_currency": source_curr,
                "destination_currency": dest_curr,
                "original_amount": str(amount),
                "created_at": None  # Assigned when processing begins
            })

        return transactions
