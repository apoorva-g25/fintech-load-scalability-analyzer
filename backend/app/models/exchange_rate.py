from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, UniqueConstraint
from datetime import datetime
from backend.app.core.database import Base

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_currency = Column(String(3), nullable=False)
    destination_currency = Column(String(3), nullable=False)
    rate = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("source_currency", "destination_currency", name="uq_pair"),
    )
