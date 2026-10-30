# Screenshot index

Captured: 30/10/2026, 6:16:31 pm IST. Chromium 156.0.8078.4.

Viewport: 1600 × 1000, device scale 1, normal 100% zoom. Full-page PNGs preserve all content, so heights vary. Original styling and actual UI text are retained.

Frontend navigation uses stateful tabs at the same root URL; tab names below are not invented routes. Results share the Load Test tab. URLs were ephemeral localhost services and are stopped after capture.

Data is generated only in a new isolated SQLite database (runtime/demo.db). No existing history is copied or edited. Two 100-transaction mixed demo trials use the same seed; no large workload is submitted. These are demonstration screenshots, not new validated scalability results. Metrics exclude network and some queue/persistence costs; see the project context for definitions. Missing JPY rates and existing FX/cache/fee/comparison limitations are preserved.

| Page / state | Actual URL | Tab | Screenshot filename | Outcome / notes |
|---|---|---|---|---|
| Overview before demonstrations | http://127.0.0.1:58239/ | overview | 00-overview-before-demo.png | NOT CAPTURED: Workflow did not reach this step |
| Overview after demonstrations | http://127.0.0.1:58239/ | overview | 01-overview-dashboard.png | NOT CAPTURED: Workflow did not reach this step |
| Configured 100-transaction demonstration form | http://127.0.0.1:58239/ | load-test | 02-run-load-test.png | NOT CAPTURED: Workflow did not reach this step |
| Completed concurrent demonstration | http://127.0.0.1:58239/ | load-test | 03-load-test-results.png | NOT CAPTURED: Workflow did not reach this step |
| Completed sequential demonstration | http://127.0.0.1:58239/ | load-test | 03a-sequential-results.png | NOT CAPTURED: Workflow did not reach this step |
| Performance Analytics: aggregate | http://127.0.0.1:58239/ | analytics | 04-performance-analytics.png | NOT CAPTURED: Workflow did not reach this step |
| Performance Analytics: concurrent run | http://127.0.0.1:58239/ | analytics | 04a-performance-run-details.png | NOT CAPTURED: Workflow did not reach this step |
| Bottleneck Analysis | http://127.0.0.1:58239/ | bottlenecks | 05-bottleneck-analysis.png | NOT CAPTURED: Workflow did not reach this step |
| Experiment Comparison | http://127.0.0.1:58239/ | comparison | 06-experiment-comparison.png | NOT CAPTURED: Workflow did not reach this step |
| FX Analytics | http://127.0.0.1:58239/ | fx | 07-fx-analytics.png | NOT CAPTURED: Workflow did not reach this step |
| Transaction Explorer | http://127.0.0.1:58239/ | explorer | 08-transaction-explorer.png | NOT CAPTURED: Workflow did not reach this step |
| System Configuration (read only) | http://127.0.0.1:58239/ | config | 09-system-configuration.png | NOT CAPTURED: Workflow did not reach this step |
| Actual backend Swagger UI | http://127.0.0.1:58238/docs | backend /docs | 10-api-documentation.png | NOT CAPTURED: Workflow did not reach this step |

Read CAPTURE_RESULTS.json for exact requests, completed run IDs/metrics, stored counts, screenshot dimensions/hashes and browser/API errors. No credentials, external user data or browser profiles are used; only synthetic customer IDs appear. Screenshots show actual implementation labels, including any wording inaccuracies.

Fatal issue: response.request is not a function

Historical database unchanged: **True** (SHA-256 verified).
