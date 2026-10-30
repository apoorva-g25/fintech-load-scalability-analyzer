# Screenshot index

Captured: 30/10/2026, 6:17:08 pm IST. Chromium 156.0.8078.4.

Viewport: 1600 × 1000, device scale 1, normal 100% zoom. Full-page PNGs preserve all content, so heights vary. Original styling and actual UI text are retained.

Frontend navigation uses stateful tabs at the same root URL; tab names below are not invented routes. Results share the Load Test tab. URLs were ephemeral localhost services and are stopped after capture.

Data is generated only in a new isolated SQLite database (runtime/demo.db). No existing history is copied or edited. Two 100-transaction mixed demo trials use the same seed; no large workload is submitted. These are demonstration screenshots, not new validated scalability results. Metrics exclude network and some queue/persistence costs; see the project context for definitions. Missing JPY rates and existing FX/cache/fee/comparison limitations are preserved.

| Page / state | Actual URL | Tab | Screenshot filename | Outcome / notes |
|---|---|---|---|---|
| Overview before demonstrations | http://127.0.0.1:58294/ | overview | [00-overview-before-demo.png](00-overview-before-demo.png) | CAPTURED: Fresh isolated database; no experiments exist yet. |
| Overview after demonstrations | http://127.0.0.1:58294/ | overview | [01-overview-dashboard.png](01-overview-dashboard.png) | CAPTURED: 2 genuine completed demonstration runs in isolated database. |
| Configured 100-transaction demonstration form | http://127.0.0.1:58294/ | load-test | [02-run-load-test.png](02-run-load-test.png) | CAPTURED: Before execution; genuine UI form configured for 100 mixed transactions. |
| Completed concurrent demonstration | http://127.0.0.1:58294/ | load-test | [03-load-test-results.png](03-load-test-results.png) | CAPTURED: Actual concurrent run f5091b5e-e7c0-4d6a-9ba5-c0f5a9928faa; COMPLETED, 100 processed and 100 stored. Not a scalability benchmark. |
| Completed sequential demonstration | http://127.0.0.1:58294/ | load-test | [03a-sequential-results.png](03a-sequential-results.png) | CAPTURED: Actual sequential run 623017fb-b3fd-44f1-a452-ca1c9371a6e2; COMPLETED, 100 processed and 100 stored. Not a scalability benchmark. |
| Performance Analytics: aggregate | http://127.0.0.1:58294/ | analytics | [04-performance-analytics.png](04-performance-analytics.png) | CAPTURED: Two 100-transaction demonstrations only; not a workload-scaling curve. |
| Performance Analytics: concurrent run | http://127.0.0.1:58294/ | analytics | [04a-performance-run-details.png](04a-performance-run-details.png) | CAPTURED: Service timings and outcomes for run f5091b5e-e7c0-4d6a-9ba5-c0f5a9928faa. |
| Bottleneck Analysis | http://127.0.0.1:58294/ | bottlenecks | [05-bottleneck-analysis.png](05-bottleneck-analysis.png) | CAPTURED: Actual heuristic findings for the small concurrent demonstration; not proof of production bottlenecks. |
| Experiment Comparison | http://127.0.0.1:58294/ | comparison | [06-experiment-comparison.png](06-experiment-comparison.png) | CAPTURED: Unmodified application comparison; backend chooses baseline in DB result order. Single trials are not causal speedup evidence. |
| FX Analytics | http://127.0.0.1:58294/ | fx | [07-fx-analytics.png](07-fx-analytics.png) | CAPTURED: Illustrative seeded FX rates and real aggregate demo outcomes; calculator not edited. |
| Transaction Explorer | http://127.0.0.1:58294/ | explorer | [08-transaction-explorer.png](08-transaction-explorer.png) | CAPTURED: Only generated CUST_ IDs and synthetic transactions from run f5091b5e-e7c0-4d6a-9ba5-c0f5a9928faa. The UI labels timings microseconds, but values are milliseconds. |
| System Configuration (read only) | http://127.0.0.1:58294/ | config | [09-system-configuration.png](09-system-configuration.png) | CAPTURED: Read-only capture; no settings or rates were saved/modified. Fee config propagation remains a documented implementation limitation. |
| Actual backend Swagger UI | http://127.0.0.1:58293/docs | backend /docs | [10-api-documentation.png](10-api-documentation.png) | CAPTURED: Real backend /docs and /openapi.json; official Swagger JS/CSS served from isolated dev dependency to avoid CDN failures. No Try it out actions executed. |

Read CAPTURE_RESULTS.json for exact requests, completed run IDs/metrics, stored counts, screenshot dimensions/hashes and browser/API errors. No credentials, external user data or browser profiles are used; only synthetic customer IDs appear. Screenshots show actual implementation labels, including any wording inaccuracies.

Historical database unchanged: **True** (SHA-256 verified).
