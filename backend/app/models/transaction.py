from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, Index
from datetime import datetime
from backend.app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, index=True)
    test_run_id = Column(String(36), ForeignKey("test_runs.id"), nullable=False, index=True)
    customer_id = Column(String(36), nullable=False, index=True)
    
    transaction_type = Column(String(20), nullable=False, index=True)  # domestic, international
    source_currency = Column(String(3), nullable=False, index=True)
    destination_currency = Column(String(3), nullable=False, index=True)
    
    # Financial fields stored as string/float for exact decimal precision
    original_amount = Column(String(30), nullable=False)
    exchange_rate = Column(String(30), nullable=True)
    converted_amount = Column(String(30), nullable=True)
    fx_fee = Column(String(30), nullable=True)
    
    # Status and flags
    status = Column(String(20), default="PENDING", index=True)  # PENDING, PROCESSING, SUCCESS, FAILED, FLAGGED
    fraud_flagged = Column(Boolean, default=False, index=True)
    fraud_reason = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Service Timings (ms)
    total_duration_ms = Column(Float, default=0.0)
    payment_duration_ms = Column(Float, default=0.0)
    fraud_duration_ms = Column(Float, default=0.0)
    fx_duration_ms = Column(Float, default=0.0)
    notification_duration_ms = Column(Float, default=0.0)
    
    error_message = Column(String(255), nullable=True)

# Composite indices for fast pagination and filtering
Index("idx_tx_testrun_status", Transaction.test_run_id, Transaction.status)
Index("idx_tx_testrun_type", Transaction.test_run_id, Transaction.transaction_type)
