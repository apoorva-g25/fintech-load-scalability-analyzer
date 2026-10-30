# Requirements traceability

Inspected 30 October 2026. Fully implemented means the stated application capability exists; it does not imply production certification. Partially implemented means a concrete gap exists. Unverified means no adequate execution evidence; unimplemented means no implementation was found. Paths are relative to the repository root. Test names refer to `backend/tests/test_fintech_system.py`; HTTP checks refer to `scratch/verify_deployment.py` and `evidence/http-verification.json`.

| Requirement | Implemented? | Relevant File/API | Evidence | Missing Work |
|---|---|---|---|---|
| Generate synthetic transactions | Fully implemented | `services/load_generator.py` under `backend/app`; POST `/api/test-runs` | Seeded customer/amount/currency generation; `test_load_generator` passes | UUIDs and timings are not deterministic; generator has no foreign→foreign branch |
| Process transactions with payment/FX/fraud stages | Fully implemented as simulation | `backend/app/services/payment_engine.py` | Existing integration test and isolated HTTP runs produce 20 stored records each | Real settlement/ledger/gateway outside current scope |
| Workloads 100, 500, 1,000, 5,000 | Fully implemented capability | `schemas/schemas.py`, `RunLoadTestPage.tsx`; POST run | API allows 10–50,000; corresponding historical stored records exist | Controlled repeated measurements remain incomplete |
| 10,000-transaction workload | Implemented input; execution unverified | Same API/form | UI preset and schema accept count | No saved 10,000-transaction run; execute and save real evidence |
| Sequential processing | Fully implemented; historical performance claim unverified | `payment_engine.py` sequential loop | Local HTTP sequential run completes; historical 500-row run exists | Historical stage timings conflict with default delays; controlled rerun required |
| Bounded concurrent processing | Fully implemented | `payment_engine.py` semaphore/as_completed | Existing integration test and HTTP concurrent run | Full batch still scheduled in memory; no distributed processing |
| Increase processing capacity | Partially implemented | Per-run concurrency and notification worker configuration | HTTP defaults and saved snapshots; UI exposes capacity | Separate service replicas/CPU scaling not implemented; worker-count causal comparison unverified |
| Measure throughput and latency | Fully implemented for application metrics | `metrics_collector.py` | `test_metrics_percentiles`, run metrics and stored records | No network-inclusive latency; exclude semaphore wait/persistence; document denominators |
| Notification queue sizes and waits | Fully implemented aggregate simulation | `notification_service.py` | Queue/drain test; HTTP verifies 20 deliveries for each 20-record run | No durable event log or actual message delivery |
| CPU/memory measurements | Partially implemented | `metrics_collector.py` resource_usage | Snapshot code and saved JSON | Not continuous or isolated per-run profiling |
| Display performance graphs | Implemented; browser behavior unverified | `frontend/src/pages/PerformanceAnalyticsPage.tsx`, comparison/FX pages | Recharts source and passing production build | Browser screenshots and live interactions absent |
| Identify bottlenecks | Fully implemented as heuristics | `bottleneck_analyzer.py`; GET `/api/bottlenecks/{run_id}` | `test_bottleneck_analyzer_rules`; HTTP returns findings | Heuristics are not proof of root cause or statistical significance |
| Fraud amount/velocity/probability rules | Fully implemented simulation | `fraud_service.py` | `test_fraud_service_rules` verifies threshold and velocity | Probabilistic branch lacks dedicated automated assertion; history only per run |
| Financially correct fraud normalization | Partially implemented | `payment_engine.py` amount_for_fraud_check | Source uses INR net or fixed original×83 | Replace approximation with actual domestic conversion for general FX correctness |
| FX direct/inverse, Decimal conversion and fees | Partially implemented | `fx_service.py` | `test_fx_conversion_direct_and_inverse`; 100 USD → 8241.75 INR at 1% | Missing JPY rates; float rate storage; fees do not consume global config |
| Configure FX rates | Partially implemented | GET/PUT `/api/fx/rates`; `fx_service.py` | HTTP upsert succeeds; DB unique pair | Preseeded cache/default fallback can ignore edits/deactivation |
| Cache versus no-cache configurations | Implemented options; comparison unverified | `fx_service.py`, run fx_config | Code paths and one saved uncached experiment | No controlled matching cached pair; dictionary has no TTL/LRU/invalidation |
| Configure FX fee | Partially implemented | PUT `/api/config`, `FXService.convert` | Setting updates but engine uses method default 1% | Wire configured fee into pipeline and verify before claiming support |
| FX calculator matches backend | Partially implemented | `frontend/src/pages/FxAnalyticsPage.tsx` | JS calculation source | Missing pairs return 1.0, uses floats and differs from backend; not authoritative |
| Experiment history and transaction exploration | Fully implemented for completed persisted data | GET `/api/test-runs`, `/{run_id}`, `/{run_id}/transactions` | Eight-test suite integration retrieval and HTTP pagination | Interrupted jobs unrecovered; frontend selectors default to newest 50 |
| Compare configurations | Partially implemented | POST `/api/comparisons`; comparison page | HTTP comparison returns actual deltas | DB result order chooses baseline; no controlled-match/status validation |
| CSV transaction export | Fully implemented | GET `/api/exports/{run_id}`; `export_service.py` | HTTP verifies header plus 20 rows | In-memory generation; no full database backup |
| Excel benchmark export | Fully implemented | GET `/api/exports/all/excel` | HTTP opens workbook with Test Summary and FX Analysis | No transaction sheet; no saved XLSX evidence predating audit found |
| Durable notification service | Unimplemented | NotificationEvent model only | Historical table has 0 rows; worker does not insert events | Broker/event persistence/restart replay and real delivery absent |
| Automated service addition/autoscaling | Unimplemented | Recommendations only | No infrastructure controller in repository | Future extension; user manually adjusts parameters |
| Render-compatible backend | Locally verified; hosting unverified | `backend.app.main:app`, DEPLOYMENT.md | Real local HTTP bind to 0.0.0.0, health and docs pass | Account authorization, cloud install/start, actual URL verification |
| Vercel-compatible frontend/API configuration | Locally verified; hosting unverified | `api.ts`, `.env.example`, `vercel.json` | Build/type check pass; centralized prefix covers requests/exports | Actual Vercel deploy, nested refresh and browser CORS check |
| Restricted production CORS | Fully implemented configuration; live origin pending | `main.py`, Settings.CORS_ORIGINS | HTTP allowed/denied preflights verified | Supply real frontend origins in hosting JSON setting |
| Database initialization | Fully implemented for new schema | `main.py`, SQLAlchemy models | Temporary fresh database starts and seeds seven rates | No migration system; existing-schema upgrade unverified |
| Persistence across free hosting restart/redeploy | Unimplemented without external storage | SQLite DATABASE_URL | Default filesystem persistence is not configured | Approve durable disk or PostgreSQL migration; no false retention claim |
| Safe concurrent experiments | Partially implemented | RUNNING check in POST run; SQLite | Code blocks observed running job only | Atomic QUEUED/RUNNING admission and durable scheduler absent |
| Error/loading/empty states | Partially implemented | React pages and App availability banner | Source review, build passes | Browser verification; individual errors often console-only/stale data |
| Graceful completion/shutdown | Partially implemented | `notification_service.py`, Uvicorn | Normal HTTP server stop and notification drain verified | Forced-stop recovery/cancellation/rollback cleanup incomplete |
| Production dependency coverage | Locally verified | `backend/requirements.txt` | Imported packages available, `pip check` passes | Fresh cloud install and locked Python versions unverified |
| Benchmark integrity / reproducibility | Partially implemented | `scratch/run_benchmarks.py`, historical DB | Read-only audit and per-run transaction counts saved | Effective delays/environment/repetitions missing; suspect sequential data and unmatched comparisons |
| Automated verification | Fully implemented for listed tests only | `backend/tests`, `scratch/verify_deployment.py` | 8 tests pass, local HTTP checks pass, build passes | No browser, real hosting, recovery, PostgreSQL or sustained contention tests |

## Evidence-to-test mapping

| Test | What it proves | What it does not prove |
|---|---|---|
| `test_health_check` | API health returns healthy/version | Database readiness or hosted uptime |
| `test_load_generator` | Count, first-record seed properties, domestic currencies | Whole-batch UUID equality or statistical workload guarantees |
| `test_fx_conversion_direct_and_inverse` | Fixed direct conversion, domestic bypass, inverse lookup | Cache invalidation or fee config propagation |
| `test_fraud_service_rules` | Normal/threshold/velocity outcomes | Real fraud classification accuracy |
| `test_notification_service_queue_and_drain` | Ten simulated queued messages drain with counts | Durable delivery or forced termination behavior |
| `test_metrics_percentiles` | Interpolated median and high percentile on fixed data | Correctness of every derived metric or network timing |
| `test_bottleneck_analyzer_rules` | Balanced and notification backlog branches | All heuristic branches or diagnostic causality |
| `test_create_and_run_test_experiment` | 20-record background experiment and pagination | Long-duration scalability or live frontend flow |
| `scratch/verify_deployment.py` | Real local HTTP startup, both modes, retrieval, exports, selected errors and CORS | Cloud deploy, browser UX or durable restart recovery |
