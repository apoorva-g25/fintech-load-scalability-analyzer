import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const frontend = process.env.SCREENSHOT_FRONTEND_URL;
const backend = process.env.SCREENSHOT_BACKEND_URL;
const output = process.env.SCREENSHOT_OUTPUT;
assert.equal(process.env.SCREENSHOT_ISOLATED, '1', 'Use npm run capture; direct/external targeting is disabled');
for (const url of [frontend, backend]) {
  assert.equal(new URL(url).hostname, '127.0.0.1', 'Only private local screenshot services are allowed');
}

const plans = [
  ['00-overview-before-demo.png', 'Overview before demonstrations', 'overview'],
  ['01-overview-dashboard.png', 'Overview after demonstrations', 'overview'],
  ['02-run-load-test.png', 'Configured 100-transaction demonstration form', 'load-test'],
  ['03-load-test-results.png', 'Completed concurrent demonstration', 'load-test'],
  ['03a-sequential-results.png', 'Completed sequential demonstration', 'load-test'],
  ['04-performance-analytics.png', 'Performance Analytics: aggregate', 'analytics'],
  ['04a-performance-run-details.png', 'Performance Analytics: concurrent run', 'analytics'],
  ['05-bottleneck-analysis.png', 'Bottleneck Analysis', 'bottlenecks'],
  ['06-experiment-comparison.png', 'Experiment Comparison', 'comparison'],
  ['07-fx-analytics.png', 'FX Analytics', 'fx'],
  ['08-transaction-explorer.png', 'Transaction Explorer', 'explorer'],
  ['09-system-configuration.png', 'System Configuration (read only)', 'config'],
  ['10-api-documentation.png', 'Actual backend Swagger UI', 'backend /docs'],
];
const entries = plans.map(([filename, page, tab]) => ({ filename, page, tab, url: tab === 'backend /docs' ? backend + '/docs' : frontend + '/', status: 'NOT CAPTURED', note: 'Workflow did not reach this step' }));
const runs = [];
const issues = [];
const measurementWarnings = [];
let effectiveConfig;
let rates;
let openapi;
let browser;
let context;
let page;
let posts = 0;
let fatal;

function checkResponse(response) {
  assert(response.ok(), `${new URL(response.url()).pathname}: HTTP ${response.status()}`);
  return response;
}

async function jsonGet(path) {
  const response = checkResponse(await context.request.get(backend + path));
  return response.json();
}

// Register response waiters before navigation: the app polls continuously, so
// networkidle is deliberately avoided. Wait for exact API data and rendered DOM.
async function withResponses(action, requests) {
  const promises = requests.map(([method, path]) => page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === backend && url.pathname === path && response.request().method() === method;
  }, { timeout: 20000 }));
  const responses = await Promise.all([Promise.resolve().then(action), ...promises]);
  for (const response of responses.slice(1)) {
    checkResponse(response);
    await response.finished();
  }
}

async function navigate(label, heading, requests = []) {
  await withResponses(() => page.locator('nav').getByRole('button', { name: label, exact: true }).click(), requests);
  await page.getByRole('heading', { level: 1, name: heading }).waitFor({ state: 'visible' });
}

async function ready(target) {
  await target.evaluate(() => document.fonts.ready);
  await target.waitForFunction(() => Array.from(document.images).every(image => image.complete));
  await target.waitForFunction(() => !document.querySelector('main .animate-spin'));
  // Recharts uses JS animation; wait for its actual geometry to stop changing.
  await target.waitForFunction(() => {
    const signature = Array.from(document.querySelectorAll('.recharts-surface')).map(svg => svg.innerHTML).join('');
    const now = performance.now();
    if (!window.__screenshotChartState || window.__screenshotChartState.signature !== signature) {
      window.__screenshotChartState = { signature, since: now };
      return false;
    }
    return now - window.__screenshotChartState.since > 650;
  }, undefined, { polling: 100, timeout: 20000 });
  await target.evaluate(() => window.scrollTo(0, 0));
  await target.mouse.move(0, 0); // avoid chart hover tooltips obscuring data
}

async function capture(filename, target = page, note = '') {
  const entry = entries.find(item => item.filename === filename);
  await ready(target);
  const content = await target.screenshot({ path: join(output, filename), fullPage: true,
    animations: 'disabled', caret: 'hide', scale: 'css', timeout: 20000 });
  assert((await stat(join(output, filename))).size > 1000, 'Screenshot is unexpectedly empty');
  Object.assign(entry, { status: 'CAPTURED', url: target.url(), note,
    bytes: content.length, sha256: createHash('sha256').update(content).digest('hex'),
    width: content.readUInt32BE(16), height: content.readUInt32BE(20), capturedAt: new Date().toISOString() });
  console.log(`Captured ${filename} (${entry.width} x ${entry.height})`);
}

async function step(filenames, action) {
  try {
    await action();
  } catch (error) {
    const reason = error.message.replaceAll('|', '/');
    for (const filename of filenames) {
      const entry = entries.find(item => item.filename === filename);
      if (entry.status !== 'CAPTURED') Object.assign(entry, { status: 'FAILED', note: reason });
    }
    console.error(`Failed ${filenames.join(', ')}: ${reason}`);
  }
}

async function demonstrate(mode) {
  await page.getByRole('button', { name: /Quick Smoke Test \(100 tx\)/ }).click();
  await page.getByPlaceholder('e.g. Benchmark-1000tx-50conc').fill(`Screenshot-Demo-100tx-${mode}`);
  await page.getByPlaceholder('Or enter custom transaction count (10 - 50,000)').fill('100');
  await page.locator('form select').selectOption('mixed');
  await page.locator('form').getByRole('button', { name: mode === 'sequential' ? /Sequential$/ : /Concurrent$/ }).click();
  if (mode === 'sequential') {
    await capture('02-run-load-test.png', page, 'Before execution; genuine UI form configured for 100 mixed transactions.');
  }
  const createdResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/test-runs' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Execute Experiment (100 Transactions)', exact: true }).click();
  const response = checkResponse(await createdResponse);
  const submitted = response.request().postDataJSON();
  assert.equal(submitted.transaction_count, 100);
  assert.equal(submitted.processing_mode, mode);
  const created = await response.json();
  let completed;
  for (let attempt = 0; attempt < 240; attempt++) {
    const run = await jsonGet(`/api/test-runs/${created.id}`);
    if (run.status === 'FAILED') throw new Error(`Demonstration failed: ${run.error_details}`);
    if (run.status === 'COMPLETED') { completed = run; break; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(completed, 'Experiment did not complete within 60 seconds');
  assert.equal(completed.processed_count, 100);
  assert(completed.metrics, 'Completed run is missing metrics');
  const transactions = await jsonGet(`/api/test-runs/${created.id}/transactions?page_size=10`);
  assert.equal(transactions.total, 100);
  // Also wait for the UI's own polling to render completion, not just the API.
  await page.getByText('Experiment Completed!', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByText('100 / 100', { exact: true }).waitFor({ state: 'visible' });
  runs.push({ request: submitted, result: completed, stored_transaction_count: transactions.total });
  if (completed.metrics.service_latencies.payment_avg_ms < effectiveConfig.base_payment_delay_ms) {
    measurementWarnings.push(`${mode} run ${completed.id}: reported payment mean ${completed.metrics.service_latencies.payment_avg_ms} ms is below configured simulated payment delay ${effectiveConfig.base_payment_delay_ms} ms. Screenshot preserves the actual application result; do not use it as validated performance evidence without investigating timing on this environment.`);
  }
  await capture(mode === 'sequential' ? '03a-sequential-results.png' : '03-load-test-results.png', page,
    `Actual ${mode} run ${completed.id}; COMPLETED, 100 processed and 100 stored. Not a scalability benchmark.`);
}

try {
  browser = await chromium.launch({ headless: process.env.SCREENSHOT_HEADED !== '1' });
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1,
    locale: 'en-IN', timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce', colorScheme: 'dark' });
  context.setDefaultTimeout(20000);
  // Block every UI write except the two bounded demonstration submissions.
  await context.route('**/api/**', async route => {
    const request = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
    const payload = request.postDataJSON();
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/comparisons'
        && runs.length === 2 && payload.test_run_ids?.length === 2
        && payload.test_run_ids.every(id => runs.some(run => run.result.id === id))) {
      return route.continue(); // read-only comparison, despite its POST method
    }
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/test-runs'
        && posts < 2 && payload.transaction_count === 100
        && ['sequential', 'concurrent'].includes(payload.processing_mode)) {
      posts++;
      return route.continue();
    }
    issues.push({ type: 'blocked-write', path: new URL(request.url()).pathname });
    return route.abort('blockedbyclient');
  });
  page = await context.newPage();
  page.on('pageerror', error => issues.push({ type: 'browser-error', message: error.message }));
  page.on('response', response => {
    if (new URL(response.url()).pathname.startsWith('/api/') && !response.ok()) {
      issues.push({ type: 'api-error', path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  assert.equal((await jsonGet('/api/test-runs')).length, 0, 'Refusing to populate an existing database');
  effectiveConfig = await jsonGet('/api/config');
  rates = await jsonGet('/api/fx/rates');
  openapi = await jsonGet('/openapi.json');

  await step(['00-overview-before-demo.png'], async () => {
    await withResponses(() => page.goto(frontend, { waitUntil: 'domcontentloaded' }), [['GET', '/api/dashboard/summary'], ['GET', '/api/test-runs']]);
    await page.getByRole('heading', { level: 1, name: /FinTech Load & Scalability Dashboard/ }).waitFor();
    await page.getByText(/No experiment runs recorded yet/).waitFor();
    await capture('00-overview-before-demo.png', page, 'Fresh isolated database; no experiments exist yet.');
  });
  await step(['02-run-load-test.png', '03a-sequential-results.png'], async () => {
    await navigate('Run Load Test', 'Configure & Launch Load Test Experiment');
    await demonstrate('sequential');
  });
  await step(['03-load-test-results.png'], () => demonstrate('concurrent'));

  const concurrent = runs.find(run => run.result.processing_mode === 'concurrent')?.result;
  const requireData = () => assert(concurrent, 'No completed concurrent demonstration; data-dependent capture skipped');
  await step(['01-overview-dashboard.png'], async () => {
    requireData();
    await navigate('Overview', /FinTech Load & Scalability Dashboard/, [['GET', '/api/dashboard/summary'], ['GET', '/api/test-runs']]);
    await page.getByRole('cell', { name: concurrent.name, exact: true }).waitFor();
    await capture('01-overview-dashboard.png', page, `${runs.length} genuine completed demonstration runs in isolated database.`);
  });
  await step(['04-performance-analytics.png', '04a-performance-run-details.png'], async () => {
    requireData();
    await navigate('Performance Analytics', 'Performance & Latency Analytics', [['GET', '/api/test-runs'], ['GET', '/api/analytics']]);
    await page.locator('.recharts-surface').first().waitFor();
    await capture('04-performance-analytics.png', page, 'Two 100-transaction demonstrations only; not a workload-scaling curve.');
    await page.locator('main select').selectOption(concurrent.id);
    await page.getByText('Payment Engine', { exact: true }).first().waitFor();
    await capture('04a-performance-run-details.png', page, `Service timings and outcomes for run ${concurrent.id}.`);
  });
  await step(['05-bottleneck-analysis.png'], async () => {
    requireData();
    await navigate('Bottleneck Analysis', 'Rule-Based Bottleneck Diagnostics & Mitigation', [['GET', '/api/test-runs'], ['GET', `/api/bottlenecks/${concurrent.id}`]]);
    await page.locator('main select').selectOption(concurrent.id);
    const details = await jsonGet(`/api/bottlenecks/${concurrent.id}`);
    assert(details.bottlenecks.length, 'No findings returned');
    await page.getByRole('heading', { name: details.bottlenecks[0].title, exact: true }).waitFor();
    await capture('05-bottleneck-analysis.png', page, 'Actual heuristic findings for the small concurrent demonstration; not proof of production bottlenecks.');
  });
  await step(['06-experiment-comparison.png'], async () => {
    assert.equal(runs.length, 2, 'Comparison requires two completed demonstrations');
    await navigate('Experiment Comparison', 'Before & After Experiment Comparison', [['GET', '/api/test-runs'], ['POST', '/api/comparisons']]);
    await page.locator('tbody tr').nth(1).waitFor();
    await capture('06-experiment-comparison.png', page, 'Unmodified application comparison; backend chooses baseline in DB result order. Single trials are not causal speedup evidence.');
  });
  await step(['07-fx-analytics.png'], async () => {
    requireData();
    await navigate('FX Analytics', 'Foreign Exchange (FX) & Cross-Border Analytics', [['GET', '/api/fx/analytics'], ['GET', '/api/fx/rates']]);
    await page.locator('main tbody tr').first().waitFor();
    await capture('07-fx-analytics.png', page, 'Illustrative seeded FX rates and real aggregate demo outcomes; calculator not edited.');
  });
  await step(['08-transaction-explorer.png'], async () => {
    requireData();
    await navigate('Transaction Explorer', 'Transaction-Level Explorer', [['GET', '/api/test-runs'], ['GET', `/api/test-runs/${concurrent.id}/transactions`]]);
    await page.locator('main select').first().selectOption(concurrent.id);
    await page.locator('tbody tr').nth(1).waitFor();
    await page.getByText('Loading transactions...', { exact: true }).waitFor({ state: 'hidden' });
    await capture('08-transaction-explorer.png', page, `Only generated CUST_ IDs and synthetic transactions from run ${concurrent.id}. The UI labels timings microseconds, but values are milliseconds.`);
  });
  await step(['09-system-configuration.png'], async () => {
    await navigate('System Configuration', 'Global System & Simulation Parameters', [['GET', '/api/config']]);
    await page.locator('main input').first().waitFor();
    await capture('09-system-configuration.png', page, 'Read-only capture; no settings or rates were saved/modified. Fee config propagation remains a documented implementation limitation.');
  });
  await step(['10-api-documentation.png'], async () => {
    const docs = await context.newPage();
    // FastAPI's /docs normally loads Swagger's JS/CSS from a CDN. Serve the
    // official installed assets locally so offline CDN access cannot fake a
    // missing backend. The HTML and OpenAPI schema still come from real FastAPI.
    await docs.route('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/**', async route => {
      const filename = new URL(route.request().url()).pathname.split('/').at(-1);
      if (!['swagger-ui.css', 'swagger-ui-bundle.js'].includes(filename)) return route.continue();
      await route.fulfill({ body: await readFile(join(here, 'node_modules/swagger-ui-dist', filename)),
        contentType: filename.endsWith('.js') ? 'application/javascript' : 'text/css' });
    });
    const schemaResponse = docs.waitForResponse(response => new URL(response.url()).pathname === '/openapi.json');
    checkResponse(await docs.goto(backend + '/docs', { waitUntil: 'domcontentloaded' }));
    const schema = await checkResponse(await schemaResponse).json();
    assert(schema.paths['/api/test-runs']);
    await docs.locator('.swagger-ui .opblock').first().waitFor();
    await capture('10-api-documentation.png', docs, 'Real backend /docs and /openapi.json; official Swagger JS/CSS served from isolated dev dependency to avoid CDN failures. No Try it out actions executed.');
    await docs.close();
  });
} catch (error) {
  fatal = error.message;
  console.error(fatal);
} finally {
  const browserVersion = browser?.version();
  await browser?.close();
  const evidence = { timestamp: new Date().toISOString(), timezone: 'Asia/Kolkata', viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1, fullPage: true, browser: browserVersion, frontend, backend,
    dataSource: 'New isolated SQLite database; two bounded UI submissions; no historical data imported',
    effectiveConfig, rates, entries, runs, issues, measurementWarnings, fatal };
  await writeFile(join(output, 'CAPTURE_RESULTS.json'), JSON.stringify(evidence, null, 2));
  if (openapi) await writeFile(join(output, 'OPENAPI.json'), JSON.stringify(openapi, null, 2));
  let index = '# Screenshot index\n\n';
  index += `Captured: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. Chromium ${browserVersion ?? 'not launched'}.\n\n`;
  index += 'Viewport: 1600 × 1000, device scale 1, normal 100% zoom. Full-page PNGs preserve all content, so heights vary. Original styling and actual UI text are retained.\n\n';
  index += 'Frontend navigation uses stateful tabs at the same root URL; tab names below are not invented routes. Results share the Load Test tab. URLs were ephemeral localhost services and are stopped after capture.\n\n';
  index += 'Data is generated only in a new isolated SQLite database (runtime/demo.db). No existing history is copied or edited. Two 100-transaction mixed demo trials use the same seed; no large workload is submitted. These are demonstration screenshots, not new validated scalability results. Metrics exclude network and some queue/persistence costs; see the project context for definitions. Missing JPY rates and existing FX/cache/fee/comparison limitations are preserved.\n\n';
  index += '| Page / state | Actual URL | Tab | Screenshot filename | Outcome / notes |\n|---|---|---|---|---|\n';
  for (const entry of entries) {
    index += `| ${entry.page} | ${entry.url} | ${entry.tab} | ${entry.status === 'CAPTURED' ? `[${entry.filename}](${entry.filename})` : entry.filename} | ${entry.status}: ${entry.note.replaceAll('\n', ' ').replaceAll('|', '/')} |\n`;
  }
  index += '\nRead CAPTURE_RESULTS.json for exact requests, completed run IDs/metrics, stored counts, screenshot dimensions/hashes and browser/API errors. No credentials, external user data or browser profiles are used; only synthetic customer IDs appear. Screenshots show actual implementation labels, including any wording inaccuracies.\n';
  if (fatal) index += `\nFatal issue: ${fatal}\n`;
  if (measurementWarnings.length) index += '\nMeasurement caveats (genuine application output, not a capture failure):\n\n' + measurementWarnings.map(warning => '- ' + warning).join('\n') + '\n';
  if (issues.length) index += '\nBrowser/API issues:\n\n' + issues.map(issue => '- ' + JSON.stringify(issue)).join('\n') + '\n';
  await writeFile(join(output, 'SCREENSHOT_INDEX.md'), index);
  const captured = entries.filter(entry => entry.status === 'CAPTURED').length;
  console.log(`Result: ${captured}/${entries.length} screenshots captured; ${issues.length} browser/API issues.`);
  process.exitCode = fatal || captured !== entries.length || issues.length ? 1 : 0;
}
