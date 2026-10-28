from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class TestRunCreate(BaseModel):
    name: Optional[str] = "Simulation Run"
    transaction_count: int = Field(default=500, ge=10, le=50000)
    workload_type: str = Field(default="mixed", pattern="^(domestic|international|mixed)$")
    processing_mode: str = Field(default="concurrent", pattern="^(sequential|concurrent)$")
    concurrency_limit: int = Field(default=50, ge=1, le=500)
    intl_percentage: float = Field(default=50.0, ge=0.0, le=100.0)
    random_seed: int = Field(default=42)
    
    fraud_config: Optional[Dict[str, Any]] = None
    fx_config: Optional[Dict[str, Any]] = None
    notification_config: Optional[Dict[str, Any]] = None

class TestRunResponse(BaseModel):
    id: str
    name: str
    status: str
    transaction_count: int
    workload_type: str
    processing_mode: str
    concurrency_limit: int
    intl_percentage: float
    random_seed: int
    created_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    progress: float
    processed_count: int
    metrics: Optional[Dict[str, Any]] = None
    bottlenecks: Optional[List[Dict[str, Any]]] = None
    error_details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionResponse(BaseModel):
    id: str
    test_run_id: str
    customer_id: str
    transaction_type: str
    source_currency: str
    destination_currency: str
    original_amount: str
    exchange_rate: Optional[str]
    converted_amount: Optional[str]
    fx_fee: Optional[str]
    status: str
    fraud_flagged: bool
    fraud_reason: Optional[str]
    total_duration_ms: float
    payment_duration_ms: float
    fraud_duration_ms: float
    fx_duration_ms: float
    notification_duration_ms: float
    error_message: Optional[str]
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class ExchangeRateSchema(BaseModel):
    source_currency: str
    destination_currency: str
    rate: float
    is_active: bool = True

class ExchangeRateUpdate(BaseModel):
    rate: float

class ComparisonRequest(BaseModel):
    test_run_ids: List[str]

class BenchmarkSuiteRequest(BaseModel):
    suite_type: str = "workload_scaling"
