# Deployment guide

Verified locally on 30 October 2026 (Asia/Kolkata). No Render or Vercel deployment has been performed and no live URL has been verified. All `YOUR-*` URLs below are placeholders.

## Prerequisites

- GitHub access to the existing repository; Render and Vercel accounts authorized to import it.
- Python 3.11 (local verification: 3.11.9), Node.js 22 (local verification: 22.19.0), npm and Git.
- Keep secrets in hosting environment settings, never Git. `.env` is ignored; `.env.example` contains examples only. No external FX key is required: rates are simulated.
- Review the data retention options below before choosing a hosting plan. No paid resource or database migration has been created.

## Verified configuration

| Setting | Render backend | Vercel frontend |
|---|---|---|
| Project root directory | Repository root (`.`); leave Root Directory blank | `frontend` |
| Runtime / framework | Python / FastAPI | Vite / Node.js 22.x |
| Install / build | `pip install -r backend/requirements.txt` | Install: `npm ci`; build: `npm run build` |
| Start | `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 1 --timeout-graceful-shutdown 30` | Static hosting; no start command |
| Output directory | Not applicable | `dist` |
| Health check path | `/api/health` | Not applicable |

Do not set Render's root to `backend`: imports start with `backend.app`. `$PORT` is Render's Linux environment variable, not a literal port. Use one process and one service instance; in-memory queues, configuration and admission checks are not shared across workers. The backend requirements already cover imported production modules (FastAPI, Uvicorn, SQLAlchemy, Pydantic/settings, psutil and openpyxl). They also contain testing/reporting dependencies; these were retained. Versions are lower bounds, not a reproducible lock. Fresh cloud dependency resolution is still unverified; installed dependencies passed `pip check`.

## Environment variables

| Location | Variable | Value / meaning |
|---|---|---|
| Render | `DATABASE_URL` | Disposable demo: `sqlite:////tmp/fintech_analyzer.db`. Creates an empty database and seeds rates; does not import the tracked historical file. |
| Render | `CORS_ORIGINS` | JSON array such as `["https://YOUR-FRONTEND.vercel.app"]`. Exact origins, no `/` suffix or paths. |
| Render | `PYTHON_VERSION` | Select a supported Python 3.11 patch version; local verification used 3.11.9. Confirm availability in Render. |
| Render | `PORT` | Supplied by Render; start command consumes it. |
| Vercel | `VITE_API_BASE_URL` | `https://YOUR-BACKEND.onrender.com/api` (includes `/api`). Public, embedded at build time. |

Other optional backend settings are in `.env.example` and `backend/app/core/config.py`: project/version/API prefix; currency/rate JSON collections; fraud thresholds/window/probability; concurrency/notification defaults and queue bound; simulated service delays. Collection settings use JSON. Keep `API_V1_STR=/api` unless you also change the frontend prefix and health path. Put actual backend `.env` in the repository root for local use. The frontend reads its environment from `frontend`; do not put database credentials in any `VITE_` variable.

## Local startup

From `D:\Fintech Project` in PowerShell:

```powershell
python -m venv venv
venv\Scripts\python.exe -m pip install -r backend/requirements.txt
venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

In another terminal:

```powershell
cd 'D:\Fintech Project\frontend'
npm.cmd ci
npm.cmd run dev
```

Use `http://localhost:5173`. Leave `VITE_API_BASE_URL` unset locally: Vite proxies `/api` to `http://127.0.0.1:8000`. These loopback addresses are intentional development settings. On shells without the PowerShell npm script restriction, `npm` works in place of `npm.cmd`.

## Render steps

1. Review and commit the prepared source and documentation, then push your branch. Existing database data is preserved; do not add `.env` or generated verification databases.
2. Sign into Render, authorize the GitHub repository, and create a Python Web Service. Choose your intended branch. Use the exact backend settings above. A free instance is suitable for a disposable classroom demo only.
3. Set `DATABASE_URL` and JSON `CORS_ORIGINS`. Initially use a known frontend origin; after Vercel provides the real URL, replace the placeholder and redeploy. Do not leave placeholder domains or use wildcard CORS.
4. Deploy and inspect startup logs. Import creates missing tables and seeds seven illustrative rates if the entire rate table is empty. There is no migration system; `create_all` does not upgrade an existing schema. The directory containing SQLite must already exist and be writable.
5. Verify `https://YOUR-BACKEND.onrender.com/api/health` returns HTTP 200 with `status: healthy`, then open `/docs` and `/openapi.json`. Health is liveness, not a database or worker readiness probe.
6. Record the real URL only after successful checks. Do not run large experiments during a redeploy.

## Vercel steps

1. Sign into Vercel, import the same GitHub repository and branch, select Vite, and set Root Directory to `frontend`.
2. Set install `npm ci`, build `npm run build`, output `dist`, and Node 22.x.
3. Add `VITE_API_BASE_URL` for Production and any intended Preview environment. Use the actual Render HTTPS URL plus `/api`. Rebuild after every value change.
4. Deploy, copy the assigned frontend origin into Render's `CORS_ORIGINS`, and wait for the backend redeploy.
5. Open the frontend, inspect browser Network requests, and confirm they target Render. Run a 100-transaction smoke experiment, wait for completion, retrieve it in history/explorer, and test exports. Select two runs to test comparison.
6. Refresh the root and a nested URL. `frontend/vercel.json` supplies an SPA fallback, but the application uses stateful tabs, not URL routes. A refresh returns to Overview; nested URLs do not restore tabs. Assets remain normal static files. Hosted refresh behavior is unverified until deployment.

## SQLite and data retention

The current default is `sqlite:///./fintech_analyzer.db`, relative to the process working directory. The existing root file **is tracked in Git** and contains 13 runs / 10,360 transactions at audit time. The application writes runs, progress, transaction batches and rates. It never requires direct frontend database access. Notification event rows are not written by the simulated worker implementation.

On Render's default ephemeral filesystem, runtime data is lost on restart/redeploy/spin-down. Using the default root database path can restore the Git snapshot, but does not preserve newer writes. The recommended disposable `/tmp` setting starts empty after filesystem replacement. Export CSV/Excel before ending the demo; exports are not full database backups.

For durable SQLite, a paid persistent disk is the smallest architecture change: after approving the cost, mount `/var/data`, set `DATABASE_URL=sqlite:////var/data/fintech_analyzer.db`, and use one instance. Existing history is not automatically copied; back up and explicitly transfer it if desired. Do not overwrite the original database. A disk preserves completed records, not in-memory queued work.

For multi-instance or concurrent durable use, prefer PostgreSQL. SQLAlchemy supports another URL, but the repository has no PostgreSQL driver, migrations, transfer procedure, or PostgreSQL verification. A migration needs a selected provider/plan, compatible driver (for example psycopg), schema/data migration, and tests. PostgreSQL alone does not make the queue durable or fix multi-process admission. No database replacement has been made.

SQLite serializes writes; concurrent requests/config updates or multiple backend workers can contend and raise locking errors. There is no WAL tuning, explicit retry strategy, cross-process lock, durable job broker, or atomic admission guard. Use one demo experiment at a time. The API rejects an observed RUNNING run, but simultaneous QUEUED submissions can race.

## Background work, shutdown and limitations

FastAPI BackgroundTasks executes experiments in the web process. asyncio semaphore limits payment pipelines, and an in-memory asyncio queue feeds notification tasks. These are simulated deliveries, not emails/SMS. Normal runs drain all queued/in-flight notifications; this was corrected and verified locally. Uvicorn waits for normal background work during graceful shutdown up to the configured timeout. A forced stop can lose unfinished work and leave stale QUEUED/RUNNING records. There is no restart recovery or cancellation API. Do not claim fault tolerance.

Uvicorn provides access/error logs. Transactions save per-record errors, and failed runs save `error_details`; the runner lacks structured exception logging and robust rollback/recovery after a database failure. Production APIs have no authentication, rate limiting, or strong nested service-config validation. CORS is a browser access rule, not authorization. Treat this as a synthetic academic demo; public exposure permits others to run experiments and change rates/configuration. Stronger protection is a separate enhancement.

Render's free web services sleep after 15 minutes without inbound traffic, can cold-start slowly, and have ephemeral storage; persistent disks require paid services. Resource contention and cold starts affect results. Review current quotas/terms in [Render Free](https://render.com/docs/free) and [Persistent Disks](https://render.com/docs/disks). Free PostgreSQL is not a permanent storage commitment; check expiry/backup limits before selecting it. See [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) and [Vercel environment variables](https://vercel.com/docs/environment-variables) for current hosting configuration. Provider facts checked 30 October 2026; no plan purchased.

## Verification and troubleshooting

Local checks (repository root; use disposable data):

```powershell
$env:DATABASE_URL='sqlite:///./documentation_context/evidence/verification.db'
venv\Scripts\python.exe -m pytest -v
venv\Scripts\python.exe -m pip check
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
venv\Scripts\python.exe scratch/verify_deployment.py
```

The verification script launches a local HTTP server with a temporary database, runs two 20-transaction experiments, verifies retrieval/exports/errors/CORS, stops the server and checks the historical database hash. It creates evidence files, not hosted benchmark claims. Existing pytest tests otherwise use the default database, so always set `DATABASE_URL` first.

| Symptom | Check / remedy |
|---|---|
| CORS blocked | Exact Vercel origin in Render JSON `CORS_ORIGINS`; redeploy backend; no path/trailing slash. Add explicitly approved preview origins separately. |
| API returns HTML / 404 | Frontend URL must include `/api`; Vite's development proxy is absent in production. Rebuild after changing Vercel environment values. |
| Connection error / timeout | Open Render health URL directly, allow cold start, inspect logs and HTTPS URL; check unavailable banner and browser Network panel. |
| Import/dependency failure | Root must be repository root, install `backend/requirements.txt`, inspect Python version; reproduce in a fresh environment. Existing lower-bound versions can resolve differently. |
| npm blocked in PowerShell | Use `npm.cmd`; do not weaken machine-wide execution policy. |
| Frontend build failure | Use Node 22.x, `npm ci`, inspect TypeScript output and lockfile. Build has a nonfatal chunk size warning. |
| SQLite unable to open / history lost | Verify absolute URL syntax, existing writable parent directory, selected filesystem persistence and chosen database path. |
| Database locked | Avoid overlapping experiments/config writes; one process/instance; consider PostgreSQL for sustained concurrent writers. |
| Stale RUNNING experiment | Process may have restarted during an in-memory job; preserve evidence and inspect records/backups. There is no recovery/delete endpoint; do not silently delete history. |
| Blank/zero data while unavailable | The shell shows an unavailable banner, but several pages log errors and retain empty/stale data; confirm backend connectivity before interpreting metrics. |

After source changes, push the configured branch and inspect each provider's automatic deploy logs (or manually redeploy). A Vite URL change always needs a new frontend build. Repeat health, experiment, retrieval and exports checks against the **live** URLs. Save actual live responses/screenshots and deployment IDs in the context package; until then deployment remains unverified.

## Remaining manual actions

Render and Vercel integrations were found but were not installed/connected in this session. Install/connect and authorize them to continue assisted deployment, or follow the dashboard steps above. Choose disposable free storage versus a separately approved durable option, authorize the GitHub imports, configure real origins/URLs, and verify the live application. No service was created, no repository visibility changed, and no deployment success is claimed.
