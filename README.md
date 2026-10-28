# FinTech System Load & Scalability Analyzer with Foreign Exchange (FX) Support

A full-stack, academic simulation and performance benchmarking platform designed to model, analyze, and optimize domestic (INR) and cross-border FinTech payment transactions under increasing load volumes (100 to 10,000+ transactions).

---

## 🚀 Key Features

1. **Transactional Microservice Pipeline**:
   - Synthetic Load Generator with deterministic random seed reproducibility.
   - Core Payment Validation with balance and currency validation.
   - Foreign Exchange (FX) Conversion Engine supporting direct and inverse lookups, configurable percentage fees, decimal precision, and in-memory caching.
   - Rule-based Fraud Detection with high-value thresholds, customer transaction velocity windows, and probabilistic pattern checks.
   - Asynchronous Notification Delivery using bounded `asyncio.Queue` and scalable worker pools.

2. **Empirical Performance Engineering**:
   - Monotonic timer measurements (`time.perf_counter()`).
   - Throughput (TPS), Average Latency, Median (P50), P95, and P99 tail latency percentiles.
   - Accurate separation of successful payments, fraud-flagged transactions, and system processing failures.
   - Real-time CPU and Memory RSS monitoring via `psutil`.

3. **Rule-Based Bottleneck Diagnostics**:
   - Automated detection of notification queue backlog buildup.
   - Identification of foreign exchange rate resolution bottlenecks.
   - Detection of tail latency divergence and thread starvation under peak concurrency.
   - Concrete, actionable engineering mitigations.

4. **Interactive Dashboard (8 Full Pages)**:
   - **Overview**: Real-time KPI statistics, active experiment progress bar, and recent benchmark runs.
   - **Run Load Test**: Interactive parameter tuning (volume, mode, concurrency, worker count, FX caching) with quick scenario presets.
   - **Performance Analytics**: Interactive Recharts for throughput scaling curves, tail latency growth, and subsystem breakdowns.
   - **Bottleneck Analysis**: Root-cause diagnostic explanations and mitigation strategies.
   - **Experiment Comparison**: Multi-run side-by-side comparison matrix with computed Throughput Improvement (%) and Latency Reduction (%).
   - **FX Analytics**: Currency pair distribution, exchange rates table, and live financial conversion calculator.
   - **Transaction Explorer**: Backend-paginated transactional explorer with customer search, status filters, and CSV export.
   - **System Configuration**: Real-time parameter editor for simulated microservice latencies and fraud limits.

---

## 🛠 Technology Stack

- **Backend**: Python 3.11, FastAPI, Uvicorn, SQLAlchemy, SQLite, Pydantic v2, Python asyncio, psutil.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React.
- **Testing & Verification**: Pytest, Pytest-Asyncio, HTTPX.
- **Exports**: Openpyxl (Excel `.xlsx`), Python CSV.

---

## 📦 Installation & Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm 9+

### 2. Backend Setup
```bash
# Clone or navigate to the project directory
cd "d:/Fintech Project"

# Activate Python virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
# source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and Swagger docs will be accessible at:
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- API Health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 3. Frontend Setup
```bash
cd "d:/Fintech Project/frontend"

# Install dependencies (already installed)
npm install

# Start Vite development server
npm run dev -- --host 127.0.0.1
```
The frontend dashboard will be accessible at:
- Dashboard UI: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

---

## 🧪 Running Automated Tests

Run the comprehensive pytest suite covering all subsystems:
```bash
pytest backend/tests -v
```

All 8 test suites verify:
- API health and routing
- Synthetic transaction generator determinism
- Direct and inverse exchange-rate lookup & domestic bypass
- Rule-based fraud detection thresholds and velocity windows
- Notification queue concurrency and clean draining
- Monotonic percentile algorithms (P50/P95/P99)
- Rule-based bottleneck analyzer heuristics
- End-to-end integration test runs with pagination and persistence

---

## 📊 Executing Real Benchmarks

To execute the automated benchmark suite:
```bash
python scratch/run_benchmarks.py
```
This executes the standard experimental suites:
1. **Workload Scaling**: 100, 500, 1,000, 5,000 transactions.
2. **Processing Mode**: Sequential vs Bounded Concurrent (50 workers).
3. **Worker Scaling**: 1 notification worker vs 4 notification workers.
4. **FX Optimization**: Uncached rate lookup vs In-Memory LRU Cache.

All experiment records, individual transactions, and metrics are persisted in `fintech_analyzer.db` and immediately viewable on the dashboard.
