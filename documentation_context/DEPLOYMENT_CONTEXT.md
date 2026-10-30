# Deployment context

As of 30 October 2026: **prepared and locally verified; not deployed**. Backend and frontend URLs: **[INPUT REQUIRED]**. No paid service, database replacement, data deletion, Git push or publication was performed in this session.

## Intended architecture and settings

Browser → Vercel static React/Vite frontend → HTTPS FastAPI backend on Render → SQLite via backend-only SQLAlchemy. FX/fraud/payment/notification classes execute within one backend process. There are no independently hosted workers or external service credentials.

| Setting | Exact configuration |
|---|---|
| Render root | Repository root (`.`); leave dashboard Root Directory blank |
| Render build | `pip install -r backend/requirements.txt` |
| Render start | `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 1 --timeout-graceful-shutdown 30` |
| Runtime | Python 3.11; local tested patch 3.11.9, provider patch availability pending |
| Render health | `/api/health` |
| Vercel root | `frontend` |
| Vercel framework/runtime | Vite / Node 22.x; local tested Node 22.19.0 |
| Vercel install/build/output | `npm ci` / `npm run build` / `dist` |
| Frontend API variable | `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com/api` |
| CORS | Render `CORS_ORIGINS=["https://YOUR-FRONTEND.vercel.app"]` as a JSON array; exact origins |
| Disposable database | Render `DATABASE_URL=sqlite:////tmp/fintech_analyzer.db` |

All URL values are placeholders. Configure actual provider environment variables, not committed `.env` files. Vite variables are public build-time values; no database URL/secrets belong there. Local Vite retains its `/api` development proxy when the frontend variable is unset. All API requests/export URLs share the centralized prefix. Application tabs are not URL routes; SPA fallback supports loading nested URLs but refresh returns to Overview.

## Persistence decision

Existing SQLite root file is tracked in Git; it has been preserved unchanged. Render's default filesystem is ephemeral, so new history/transactions do **not** reliably survive restart/redeploy/spin-down. `/tmp` creates an empty demo database and seeds rates. Using the Git-tracked default path merely restores a historical snapshot after filesystem replacement; it does not make runtime writes durable.

Smallest durable option: approve a paid Render disk, mount `/var/data`, and set `sqlite:////var/data/fintech_analyzer.db`; separately plan backup/explicit historical data transfer if required. Prefer PostgreSQL for durable multiwriter/multi-instance use, but driver/migration/data transfer and tests are missing; no such migration was authorized or performed. Completed data persistence would not preserve in-memory jobs. User selection and any cost approval remain [INPUT REQUIRED]. Current provider limitations should be rechecked in [Render Free](https://render.com/docs/free) and [Persistent Disks](https://render.com/docs/disks).

## Verified and pending checks

Local pytest: 8 passed / 1 warning. Production build/type checking passes; lint exits 0 / 24 warnings. Actual local HTTP server checks cover health/docs, sequential/concurrent experiments and retrieval, CSV/Excel and restricted CORS. Original DB hash unchanged. Fresh cloud dependency install, browser UX, nested refresh on Vercel and all live checks remain unverified.

Liveness placeholder: `https://YOUR-BACKEND.onrender.com/api/health` → expected HTTP 200, `{ "status": "healthy", "service": "FinTech System Load & Scalability Analyzer", "version": "1.0.0" }` with default settings. Docs: `https://YOUR-BACKEND.onrender.com/docs`; schema: `/openapi.json`. Frontend placeholder: `https://YOUR-FRONTEND.vercel.app`. Health does not assert DB/worker readiness.

Unresolved operational limits: RUNNING-only admission race; SQLite write contention; weak nested config validation; no authentication/rate limiting; no durable queues, restart reconciliation or cancellation endpoint; partial DB failure recovery; broad dependency version ranges. Keep one process/instance, one experiment at a time, use only synthetic data, and avoid deploying mid-run. Render free service inactivity/cold starts and shared resources affect demos and measurements. No live performance claim is supportable yet.

## Required manual actions

Render and Vercel integrations were discoverable but not installed/connected. Install/connect and authorize them for assisted deployment, or sign in to each dashboard, authorize the GitHub import, and follow `DEPLOYMENT.md`. Review/push prepared changes, choose retention, create the backend, configure the actual backend URL in Vercel, configure the frontend origin in Render, and verify the live application. No new permission is needed to inspect prepared files; account authorization and any paid storage choice are the remaining external steps. Preserve real deployment logs/URLs and browser screenshots for Claude after successful live verification.
