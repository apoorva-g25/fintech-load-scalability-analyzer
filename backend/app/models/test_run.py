from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON
from datetime import datetime
from backend.app.core.database import Base

class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="QUEUED", index=True)  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    
    # Configuration
    transaction_count = Column(Integer, nullable=False)
    workload_type = Column(String(20), default="mixed")  # domestic, international, mixed
    processing_mode = Column(String(20), default="concurrent")  # sequential, concurrent
    concurrency_limit = Column(Integer, default=50)
    intl_percentage = Column(Float, default=50.0)
    random_seed = Column(Integer, default=42)
    config_snapshot = Column(JSON, nullable=True)

    # Execution Timings
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Progress & Counts
    progress = Column(Float, default=0.0)
    processed_count = Column(Integer, default=0)

    # Calculated Aggregated Metrics
    metrics = Column(JSON, nullable=True)
    
    # Bottleneck Findings
    bottlenecks = Column(JSON, nullable=True)
    
    # Error information
    error_details = Column(Text, nullable=True)
