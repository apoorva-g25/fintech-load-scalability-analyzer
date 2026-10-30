# Testing and results

Executed 30 October 2026 (Asia/Kolkata). Python 3.11.9, Node 22.19.0, Windows/PowerShell. Evidence is in `documentation_context/evidence`. No cloud or browser test has been performed. Existing project data was inspected read-only and preserved.

## Commands and exact outcomes

From the repository root:

```powershell
$env:DATABASE_URL='sqlite:///./documentation_context/evidence/verification.db'
venv\Scripts\python.exe -m pytest -v
venv\Scripts\python.exe -m pip check
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
venv\Scripts\python.exe scratch/verify_deployment.py
```

| Check | Observed outcome | Evidence |
|---|---|---|
| Initial pytest before collection fix | `8 items / 1 error`; SQLAlchemy duplicate `test_runs` table during collection; no successful suite claim | `pytest-initial-failure.txt` |
| Pytest after `testpaths = backend/tests` | **8 passed, 1 warning in 1.83s** | `pytest.txt` |
| Dependency consistency | `No broken requirements found.` | `pip-check.txt` |
| Production build including `tsc -b` | Exit 0; Vite 8.3.5, 2,541 modules transformed, `dist` generated; JS approximately 715.17 kB | `frontend-build-verified.txt` |
| Lint (`oxlint`) | Exit 0, **24 warnings**, including unused symbols and React hook/immutability guidance | `frontend-lint-verified.txt` |
| Local HTTP startup/integration | PASS: health/docs, sequential and concurrent 20-record runs, retrieval, CSV/XLSX, selected error responses and CORS | `http-verification.json`, `server.txt`; script prints PASS |
| Historical database preservation | SHA-256 unchanged after verification | `database_audit.json`; verification script hash assertion |

The pytest warning is Starlette's deprecation of httpx for TestClient in the installed stack; it suggests httpx2. Production dependency files were not changed solely to silence it. Build warning: minified chunk exceeds 500 kB. This is not a build failure. Frontend tests initially could not launch using PowerShell `npm` because npm.ps1 execution was blocked; `npm.cmd` succeeded without changing execution policy. An initial HTTP verification cleanup failed due to a Windows subprocess holding a temporary database open; the helper was corrected to send CTRL_BREAK to its process group, rerun successfully, and the saved server log shows normal shutdown.

The pytest suite tests health, seeded generation, FX direct/inverse/domestic bypass, fraud threshold/velocity, notification drain, percentile interpolation, balanced/backlog bottleneck rules, and a 20-transaction integration experiment with pagination. See REQUIREMENTS_TRACEABILITY.md for proof boundaries. No backend lint/type-check configuration was found; frontend type checking is part of the build.

The HTTP helper launches Uvicorn binding `0.0.0.0` on an available local port with a fresh temporary SQLite file. It waits for health, uses real HTTP to create a sequential and a concurrent mixed workload with seed 77, polls until COMPLETED, retrieves status/records, checks 20 records and 20 processed notifications per run, checks CSV line count and XLSX sheet names, checks 404/422/400 responses, and tests an allowed and denied origin. These are small integration checks, not a capacity benchmark. Result objects are retained in JSON; temporary run data is not merged into the historical database. Tests do not directly simulate the production frontend browser.

## Historical data provenance and actual measurements

`fintech_analyzer.db` is tracked in Git. Read-only audit: **13 TestRun records, 10,360 Transaction records, 7 ExchangeRate records, 0 NotificationEvent records**. All runs are marked COMPLETED and each transaction row count matches its declared workload. Exact run IDs, timestamps, seeds, configuration snapshots, full metrics/bottlenecks and counts are in `database_audit.json`. The full audit SHA-256 is `5df59305335156195c92905bfd318e9bdd700c3fff9c06348b460fff54768cd2`.

The table below is generated from that saved audit, not new benchmark execution. Historical timestamps originate from the database's naive `datetime.utcnow` values and should be interpreted as UTC, not local IST. Originating hardware/OS, dependency versions, full effective settings and commit identity were not saved; those are [INPUT REQUIRED] for reproducibility. No existing CSV/XLSX/export or screenshot artifacts were found in the source inventory.

| Run ID | Name | UTC created_at | Tx | Seed | Mode / concurrency | Payment TPS | Mean ms | P95 ms |
|---|---|---|---|---|---|---|---|---|
| cfdb9438-85d0-4803-abef-a8b42f1790dc | Integration-Test-20tx | 2026-10-28 13:25:02.384795 | 20 | 77 | concurrent / 10 | 506.77 | 15.84 | 25.49 |
| cfef8fbc-85bc-4933-b283-ceff21e87831 | Integration-Test-20tx | 2026-10-28 13:37:12.904281 | 20 | 77 | concurrent / 10 | 659.14 | 11.04 | 16.0 |
| 6e5a657e-2512-464d-8d11-69ab43a410be | Benchmark-100tx-Concurrent | 2026-10-28 14:08:23.121238 | 100 | 101 | concurrent / 25 | 1100.2 | 15.44 | 24.49 |
| 0642ae4f-b4d9-4a71-8424-88880b6b63b9 | Benchmark-500tx-Concurrent | 2026-10-28 14:08:24.085208 | 500 | 102 | concurrent / 50 | 1352.88 | 28.56 | 35.26 |
| 9650d8f8-88e9-448b-bb70-2263774fe1cf | Benchmark-500tx-Sequential | 2026-10-28 14:08:26.747067 | 500 | 102 | sequential / 1 | 1989.64 | 0.28 | 1.39 |
| 8756f516-8f5c-43f2-b03c-4da5ff763cf9 | Benchmark-1000tx-Concurrent | 2026-10-28 14:08:27.687951 | 1000 | 103 | concurrent / 50 | 2036.95 | 16.77 | 24.87 |
| 6dbd32c8-da0c-4dbe-8816-dfd71561d258 | WorkerScaling-1000tx-1Worker | 2026-10-28 14:08:32.428273 | 1000 | 104 | concurrent / 50 | 2126.18 | 15.75 | 24.16 |
| bb5a7bf4-0f4d-437c-b34f-a8d42d911a8f | FX-1000tx-Uncached | 2026-10-28 14:08:47.996285 | 1000 | 105 | concurrent / 50 | 753.5 | 58.84 | 74.41 |
| 2264031f-7408-4103-93b1-09949fc17a0e | Benchmark-5000tx-HeavyScale | 2026-10-28 14:08:53.732244 | 5000 | 106 | concurrent / 100 | 4578.13 | 9.96 | 21.12 |
| 88c55e41-e8b4-4b6f-ad22-d99706398fe3 | Integration-Test-20tx | 2026-10-28 14:20:21.432161 | 20 | 77 | concurrent / 10 | 544.51 | 14.76 | 24.2 |
| 0eb72827-522d-4ebd-a09c-e9089168e0cf | Benchmark-1000tx-Concurrent | 2026-10-28 14:22:16.481154 | 1000 | 42 | concurrent / 50 | 1789.8 | 21.58 | 52.31 |
| 490e62f2-adda-4c2c-83c0-891dcc98ad9a | Smoke-Test-100tx | 2026-10-28 14:28:36.434875 | 100 | 42 | concurrent / 25 | 1058.98 | 15.03 | 26.68 |
| 0986c8d8-0f4b-419f-aed4-a9744d67a01f | Smoke-Test-100tx | 2026-10-28 14:28:39.696953 | 100 | 42 | concurrent / 25 | 1009.91 | 16.36 | 28.09 |


## Integrity findings and rerun requirements

- The historical 500-transaction sequential experiment reports payment mean approximately 0.08 ms, fraud mean 0.05 ms and overall mean 0.28 ms; its transaction records support these aggregates. These measurements do not match the current configured default simulated delays (5 ms payment, 6 ms fraud and 12 ms notification). The snapshot contains empty fraud/FX dictionaries and two notification workers, not the full effective settings. It is not possible to establish why defaults were bypassed/changed from this evidence. Do not claim that it proves sequential processing is faster or use it to derive a concurrent speedup. Preserve and label it; rerun both modes with identical settings except processing mode.
- At least one heavy-scale run also has mean payment time below the current default 5 ms; effective historic configuration cannot be reconstructed. Saved data existence is verified, applicability to current source/settings is unverified.
- The existing benchmark script sends real API requests and polls results; it does not fabricate numbers. It contains seven configurations: counts 100/500/1,000/5,000, one sequential baseline, a one-worker run and one uncached FX run. There is no 10,000 workload, dedicated matching cached FX partner, or fixed-seed matching worker-count pair. Different workload seeds, mixes, delays and worker counts confound causal comparisons.
- The script's BASE_URL is fixed to local HTTP. For hosted testing, deliberately configure the target first. It has no overall polling timeout, does not raise HTTP errors consistently while polling, and can hang on an interrupted job. No saved console log from its historical execution was found.
- Its printed COMPLETED duration starts after the create response, which excludes request creation and includes polling granularity/network. It is not end-to-end transaction latency. FastAPI TestClient waits for background tasks before returning a response, so pytest request timing is also not comparable to a browser request's response time.
- Default FX cache preload can ignore database rate changes, and missing JPY rates cause failures. Global fee settings do not reach the payment engine. These affect financial semantics; document before interpreting FX experiments.
- Historical notification counts match queued counts, but pre-fix worker drain could cancel in-flight processing when the queue itself was empty. Historical matching counters are not independent proof of successful external notification delivery; there is no external provider or event persistence.

For a controlled rerun, use a separate database or clearly named new experiments; never overwrite existing data. Save the source commit, hardware, runtime versions, effective service delays, rate values, cache state, fee behavior, workload mix, seed, count, concurrency and notification workers. Test 100/500/1,000/5,000/10,000 with repeated trials and warm-up policy. Change one factor at a time for mode/cache/worker comparisons. Keep seed and settings fixed where comparison requires it; expect velocity-rule outcomes to depend on timing. Verify processed/persisted counts and statuses. Save raw records/metrics/logs and distinguish historical results from the rerun. These reruns were not performed in this task to avoid manufacturing a missing dataset.

## Measurement definitions and limits

- Payment batch TPS includes all processed records, not only SUCCESS, divided by timed processing before notification drain. Pipeline TPS includes drain but still excludes bulk record writes/final persistence. Generation precedes both timers.
- Individual total duration starts after acquiring the concurrency semaphore and stops before notification enqueue. It excludes queueing to enter the pipeline, delivery, persistence, HTTP/browser overhead and network latency.
- Main percentiles use linear interpolation; notification/global-FX P95 uses a sorted index. Their algorithms differ.
- Resource figures are snapshots, not profiling or sustained utilization. Queue maximum is sampled backlog, not total outstanding work.
- Hosted cold starts, shared resources and database contention would change observed results. No stress/fault/restart/PostgreSQL/browser test has been run, and no network-inclusive performance result is claimed.
