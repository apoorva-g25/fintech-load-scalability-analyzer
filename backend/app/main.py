from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.api.routes import router as api_router
from backend.app.models.exchange_rate import ExchangeRate

# Create database tables
Base.metadata.create_all(bind=engine)

# Pre-seed exchange rates if table is empty
def seed_exchange_rates():
    db = SessionLocal()
    try:
        count = db.query(ExchangeRate).count()
        if count == 0:
            for pair_str, rate_val in settings.DEFAULT_RATES.items():
                src, dst = pair_str.split("_")
                db.add(ExchangeRate(source_currency=src, destination_currency=dst, rate=rate_val, is_active=True))
            db.commit()
    finally:
        db.close()

seed_exchange_rates()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Academic load-testing and scalability analyzer for domestic and international FinTech payment systems."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_prefix": settings.API_V1_STR
    }
