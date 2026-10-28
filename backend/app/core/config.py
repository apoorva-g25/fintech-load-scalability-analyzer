from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict, List
from decimal import Decimal

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinTech System Load & Scalability Analyzer"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./fintech_analyzer.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    
    # Financial & Currency Defaults
    DOMESTIC_CURRENCY: str = "INR"
    SUPPORTED_CURRENCIES: List[str] = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "JPY"]
    DEFAULT_FX_FEE_PERCENTAGE: Decimal = Decimal("1.00")  # 1%
    
    # Initial Baseline Simulated Exchange Rates (1 Source = X Destination)
    DEFAULT_RATES: Dict[str, float] = {
        "USD_INR": 83.25,
        "EUR_INR": 89.50,
        "GBP_INR": 105.10,
        "SGD_INR": 61.80,
        "AED_INR": 22.65,
        "USD_EUR": 0.93,
        "GBP_USD": 1.26,
    }
    
    # Fraud Rules Defaults
    FRAUD_AMOUNT_THRESHOLD: Decimal = Decimal("250000.00") # High amount flag
    FRAUD_VELOCITY_WINDOW_SECONDS: int = 60
    FRAUD_VELOCITY_MAX_TXNS: int = 5
    FRAUD_PROBABILISTIC_RATE: float = 0.015 # 1.5% random alert rate
    
    # Concurrency & Queue Defaults
    DEFAULT_MAX_CONCURRENCY: int = 50
    DEFAULT_NOTIFICATION_WORKERS: int = 4
    NOTIFICATION_QUEUE_MAX_SIZE: int = 50000
    
    # Simulated Service Delays (ms) to reflect real microservices
    BASE_PAYMENT_DELAY_MS: float = 5.0
    BASE_FX_DELAY_MS: float = 8.0
    BASE_FRAUD_DELAY_MS: float = 6.0
    BASE_NOTIFICATION_DELAY_MS: float = 12.0

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
