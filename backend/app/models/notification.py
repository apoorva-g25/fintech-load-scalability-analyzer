from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index
from datetime import datetime
from backend.app.core.database import Base

class NotificationEvent(Base):
    __tablename__ = "notification_events"

    id = Column(String(36), primary_key=True, index=True)
    test_run_id = Column(String(36), ForeignKey("test_runs.id"), nullable=False, index=True)
    transaction_id = Column(String(36), ForeignKey("transactions.id"), nullable=False, index=True)
    
    status = Column(String(20), default="QUEUED", index=True)  # QUEUED, DELIVERED, FAILED
    worker_id = Column(Integer, nullable=True)
    
    queued_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    wait_time_ms = Column(Float, default=0.0)
    processing_time_ms = Column(Float, default=0.0)
    error_message = Column(String(255), nullable=True)

Index("idx_notif_testrun_status", NotificationEvent.test_run_id, NotificationEvent.status)
