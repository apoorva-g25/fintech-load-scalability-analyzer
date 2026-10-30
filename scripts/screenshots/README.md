# Documentation screenshot capture

This separate development tool uses Playwright Chromium against the existing React/Vite frontend and FastAPI backend. It does not change application code or styling. Navigation was inspected in `frontend/src/App.tsx` and `components/Navbar.tsx`: eight stateful tabs share `/`, and the completed-results panel belongs to Run Load Test. Backend docs are at `/docs`; there is no login. Existing tests are pytest backend tests; this folder adds a standalone browser workflow, not a production dependency.

## Setup

Run these commands from `D:\Fintech Project` in PowerShell:

```powershell
# Existing application prerequisites (skip if already installed)
venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm.cmd --prefix frontend ci

# Separate screenshot-only dependencies
npm.cmd --prefix scripts/screenshots ci
npm.cmd --prefix scripts/screenshots run install-browser
```

Use Python 3.11+ and Node 22.x (the versions already used by this project). If there is no venv, first run `python -m venv venv`. Linux/macOS use `venv/bin/python` and `npm` instead of the Windows commands. Playwright may require `npx playwright install --with-deps chromium` from this folder on Linux; review system package installation before running it. Browser downloads need network access. Installation documentation: [Playwright](https://playwright.dev/docs/intro).

The npm lockfile fixes the separate Playwright and Swagger UI asset versions. Neither `frontend/package.json` nor `backend/requirements.txt` is changed. The browser installation is a one-time development prerequisite, not a deployment requirement.

## One capture command

```powershell
npm.cmd --prefix scripts/screenshots run capture
```

No manual service startup is needed. The command locates root `venv`, starts Uvicorn and Vite on available loopback ports, launches Chromium, navigates the actual UI, saves artifacts, and stops only its own services. `SCREENSHOT_PYTHON` may point to a different backend interpreter. Optional `SCREENSHOT_HEADED=1` opens a visible browser for debugging; default capture is headless. No external target URL option is provided: writes are restricted to this isolated local session.

Each invocation creates a new directory:

```text
documentation_context/screenshots/<YYYYMMDD-HHMMSS-microseconds-IST>/
  00-overview-before-demo.png
  01-overview-dashboard.png
  02-run-load-test.png
  03-load-test-results.png
  03a-sequential-results.png
  04-performance-analytics.png
  04a-performance-run-details.png
  05-bottleneck-analysis.png
  06-experiment-comparison.png
  07-fx-analytics.png
  08-transaction-explorer.png
  09-system-configuration.png
  10-api-documentation.png
  SCREENSHOT_INDEX.md
  CAPTURE_RESULTS.json
  DATA_PRESERVATION.json
  OPENAPI.json
  runtime/
    demo.db          # New isolated data; ignored by Git
    backend.log
    frontend.log
```

There are 13 planned images: all ten requested views plus the empty dashboard, sequential results and detailed analytics. Previous captures/data are never overwritten or deleted. The terminal prints the exact output directory. A PNG is listed as CAPTURED only after Playwright writes it and its size/hash/dimensions are checked. Failures and unreached pages are listed in the index; exit code 1 means incomplete capture or browser/API/preservation issues. Exit code 0 means every planned image exists and checks passed. Setup/service startup failures also create an index with a reason. Do not treat a failed run's partial folder as a full evidence set.

## What the browser does

1. Checks that the new API history is empty and captures the genuine empty Overview.
2. Uses Quick Smoke Test, configures 100 mixed transactions and sequential mode, captures the form, submits through the actual UI, polls the actual API, and waits for the UI's `Experiment Completed!` and `100 / 100`. Saves sequential results.
3. Runs the same 100-transaction mixed form in concurrent mode, then verifies completion and 100 persisted transactions before capturing results. It submits only these two small trials; no 500–10,000 workload is executed.
4. Captures populated Overview, aggregate and run-specific Analytics, actual heuristic Bottleneck Analysis, Comparison, FX Analytics, Explorer and read-only System Configuration. It never saves config/rates. API route interception rejects writes other than the two bounded runs and the read-only comparison POST for those run IDs.
5. Captures real FastAPI `/docs` using the actual `/openapi.json`. Swagger's official CSS/JS comes from the separate `swagger-ui-dist` development package to avoid CDN dependency; no endpoint/schema/result is mocked. No Swagger Try it out request is executed.

The two trials use existing form defaults (seed 42, mixed FX workload, four notification workers; smoke concurrent limit 25, sequential sends 1). Exact submitted JSON and completed metrics are saved, so changed form defaults are observable. These are single small demonstrations, **not** publication-ready throughput/scaling experiments. Existing missing FX rates, cache/fee behavior and comparison baseline ordering are not altered to improve screenshots. Flags/failures are real generated results and retained. No historic benchmark rows are imported into the screenshot database.

## Readiness, consistency and privacy

The driver registers exact API response waits before tab changes, waits for page-specific headings/tables/completion, fonts/images and stable Recharts SVG geometry. It avoids `networkidle`, since this application polls continuously. Screenshots use Chromium, a 1600×1000 viewport, device scale 1, 100% zoom, en-IN locale and Asia/Kolkata timezone; full-page heights vary. Playwright disables CSS animations/carets for capture. No CSS/layout/data is injected. See [Playwright screenshot options](https://playwright.dev/docs/api/class-page#page-screenshot).

Only fresh synthetic CUST_ IDs and transaction UUIDs appear. The historical `fintech_analyzer.db` is hashed before/after and never opened by the screenshot backend. New data lives under the capture's `runtime/demo.db`; it is kept for reproducibility and ignored by Git. Uvicorn starts with its working directory inside that runtime folder, preventing the project-root `.env` from being loaded; explicit per-process environment settings select the isolated database/API/origin/delays. Existing shell environment overrides may affect other backend defaults; consult saved requests/config/schema and keep them consistent for repeat trials. No real user data, credentials, cookies, browser profile or authentication state is loaded or persisted. Browser screenshots omit browser chrome/address bars.

The current application has no authentication. If login is added, adapt the driver to an interactive sign-in or a locally stored, Git-ignored Playwright storage-state file and exclude login/credential pages from screenshots. Do not hardcode credentials or commit storage state. No authentication bypass is implemented here.

## Troubleshooting and evidence for Claude

- Missing module/browser: rerun the setup commands in this folder; use the same Playwright lockfile/browser installation. Do not add these packages to production requirements.
- Backend/frontend startup failure: read that run's runtime logs. Check backend imports/dependencies and frontend `node_modules`. Dynamic ports avoid reusing other services; a strict port conflict fails rather than switching silently.
- Selector/readiness failure: read `SCREENSHOT_INDEX.md` for the exact step. If UI text changes, update selectors in `capture.mjs` after inspecting the source. Data-dependent screenshots fail if trials did not complete; no placeholder PNG is substituted.
- Blank chart: missing API data is a failure. Two 100-transaction trials are insufficient to illustrate workload scaling; the index explicitly says so.
- Swagger failure: inspect runtime backend logs and ensure local swagger-ui-dist is installed. The backend must return real schema data.
- Unexpected interruption: normal shutdown sends CTRL_BREAK on Windows/SIGTERM elsewhere. Hard process termination may leave local processes; use the ports in DATA_PRESERVATION.json to identify the exact session before stopping anything. Never terminate unrelated application services.

Give Claude the PNGs plus that run's index, CAPTURE_RESULTS.json, OPENAPI.json and DATA_PRESERVATION.json. The capture JSON includes the actual public config and rate snapshots. The index flags any observed payment-stage mean below the configured delay: this does not falsify the screenshot, but makes performance interpretations unsafe without further timing investigation. These caveats do not fail an otherwise successful capture. Explain that localhost URLs are ephemeral and captures show a local synthetic demo, not deployed verification or historic benchmark screenshots. Use existing project context for metric definitions and implementation limitations. Older context files say screenshots were unavailable **at their earlier audit**; this new index is the evidence for the capture date. Do not silently replace historical results with these demo metrics.
