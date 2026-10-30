"""Build source-derived API/schema references from saved, verified local evidence."""
import json
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
CONTEXT = ROOT / 'documentation_context'
EVIDENCE = CONTEXT / 'evidence'


def block(value):
    return '```json\n' + json.dumps(value, indent=2, ensure_ascii=False) + '\n```\n'


def main():
    schema = json.loads((EVIDENCE / 'openapi.json').read_text(encoding='utf-8'))
    checks = json.loads((EVIDENCE / 'http-verification.json').read_text(encoding='utf-8'))
    notes = {
        '/': 'Welcome/version/docs metadata. Does not test database readiness.',
        '/api/health': 'Liveness only: healthy/service/version. No database or worker readiness probe.',
        '/api/dashboard/summary': 'Counts all stored transactions (including failed/flagged), all/completed experiments; returns metrics/bottlenecks from latest completed run and newest QUEUED/RUNNING run or null.',
        '/api/config': 'GET returns selected settings. PUT accepts an arbitrary JSON object, recognizes fraud_amount_threshold, default_fx_fee_pct, base_fx_delay_ms and base_notification_delay_ms, and ignores other keys. Updates are process-local and reset on restart. The fee setting does not reach PaymentEngine conversion. Values have no dedicated typed/range validation; invalid values may cause 500 or later job failure.',
        '/api/fx/rates': 'GET returns every rate including inactive entries; reseeds defaults only if empty. PUT upserts the source/destination pair. Its strings/rate are not constrained to supported codes/positive values. Rows include id, source_currency, destination_currency, rate, is_active and updated_at. Default cache behavior can bypass edited/deactivated database rates.',
        '/api/fx/analytics': 'Aggregates all stored international/domestic records. FX success is non-null rate, not final SUCCESS. P95 uses sorted index int(n*0.95), unlike interpolated run percentiles. Empty data yields zero counts/latencies and 100% FX success rate.',
        '/api/test-runs': 'GET lists newest created runs with skip/limit. POST stores QUEUED, returns HTTP 200 (not 202), schedules an in-process background task and may respond before completion. An observed RUNNING experiment gives 409, but QUEUED/atomic admission is not protected. Submitting runs does not directly accept custom transaction lists. Service config objects are arbitrary dictionaries; zero notification workers can hang processing.',
        '/api/test-runs/{run_id}': 'Retrieves run response model. Missing run: 404 detail "Test run not found". The response does not expose config_snapshot even though the database stores it.',
        '/api/test-runs/{run_id}/status': 'Returns id/status/progress/processed_count/transaction_count/metrics/bottlenecks/error_details. Missing run: 404.',
        '/api/test-runs/{run_id}/transactions': 'Filters by status, tx_type and customer_id substring (case-insensitive SQL ILIKE translation); returns total/page/page_size/items. Orders by started_at descending. Unknown run returns empty page rather than 404. TransactionResponse omits created_at/started_at although persisted.',
        '/api/analytics': 'Chronological completed runs only; maps count/mode/concurrency and throughput, response/service latency, success rate and queue peaks to flat chart fields. Does not calculate new performance trials.',
        '/api/bottlenecks/{run_id}': 'Returns test_run_id/test_run_name/bottlenecks (empty list when absent); missing run: 404.',
        '/api/comparisons': 'Retrieves matching IDs without ordering; the first DB result becomes baseline. Missing IDs are silently omitted if at least two remain; fewer than two results gives 400. No completed-status/equal-configuration enforcement. Positive throughput_improvement_pct = (TPS-baseline)/baseline*100; positive latency_reduction_pct = (baseline-latency)/baseline*100. Zero denominator gives zero; rounded to two decimals.',
        '/api/exports/{run_id}': 'Returns text/csv attachment test_run_<id>.csv, all records for one run; no records gives 404 detail "No transactions found for this run". CSV columns: transaction_id,test_run_id,customer_id,type,source_currency,dest_currency,original_amount,exchange_rate,converted_amount,fx_fee,status,fraud_flagged,fraud_reason,total_duration_ms,payment_duration_ms,fraud_duration_ms,fx_duration_ms,error_message,completed_at. Built in memory.',
        '/api/exports/all/excel': 'Returns application/vnd.openxmlformats-officedocument.spreadsheetml.sheet attachment Experimental_Results.xlsx. Workbook sheets: Test Summary and FX Analysis, completed runs only; no transaction sheet. Empty completed history still produces headers. Built in memory.',
    }
    text = '# API reference\n\nSource: `backend/app/api/routes.py`, `schemas/schemas.py` and `main.py`; generated OpenAPI saved from the locally running application on 30 October 2026. Default API prefix `/api`. No authentication, authorization headers or direct frontend database access are implemented. All URLs below are paths, not deployed URLs.\n\n'
    text += 'Most successful JSON routes return HTTP 200. Pydantic/query validation produces 422 with a `detail` list; explicit errors use `{"detail": "message"}`. Unhandled errors may return 500; no global custom error envelope exists. Datetimes are naive UTC strings. Numeric financial transaction fields are strings. Synthetic services do not call real FX/payment/notification providers. Examples below are actual local HTTP responses from a disposable database, not historical benchmarks; UUIDs/timestamps vary.\n\n'
    text += 'Interactive docs: GET `/docs`; schema: GET `/openapi.json`; alternate documentation: GET `/redoc`. Framework docs endpoints are not business APIs. Examples of health, schema and docs retrieval are saved in HTTP evidence.\n\n'
    for path, operations in schema['paths'].items():
        for method, operation in operations.items():
            if method not in ('get', 'post', 'put', 'delete', 'patch'):
                continue
            text += f'## {method.upper()} `{path}`\n\n{notes.get(path, operation.get("summary", ""))}\n\n'
            parameters = operation.get('parameters', [])
            if parameters:
                text += '| Parameter | Location | Required | Type / default / constraints |\n|---|---|---|---|\n'
                for parameter in parameters:
                    text += f'| {parameter["name"]} | {parameter["in"]} | {parameter.get("required", False)} | `{json.dumps(parameter["schema"])}` |\n'
                text += '\n'
            else:
                text += 'Parameters: none.\n\n'
            body = operation.get('requestBody')
            if body:
                text += 'Request body (JSON; schema references are fully listed below):\n\n' + block(body)
            else:
                text += 'Request body: none.\n\n'
            text += 'Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):\n\n' + block(operation.get('responses', {}))
            matched = None
            for example in checks['examples']:
                candidate = example['path'].split('?')[0]
                parts, template = candidate.split('/'), path.split('/')
                if len(parts) == len(template) and all(a == b or (b.startswith('{') and b.endswith('}')) for a,b in zip(parts, template)) and example['method'].lower() == method and example['status'] == 200:
                    matched = example
                    break
            if matched:
                text += f'Observed request: `{matched["method"]} {matched["path"]}`\n\n'
                if matched['request'] is not None:
                    text += block(matched['request'])
                text += 'Observed response:\n\n' + block(matched['response'])
                if '/exports/' in path:
                    text += 'The JSON above summarizes response headers/bytes for this binary/text download; the endpoint itself returns file content, not that JSON object.\n\n'
            text += '\n'
    text += '## Complete request and response model definitions\n\nThese are the actual OpenAPI component schemas, including defaults, required fields, bounds, nullability and referenced validation errors. Generic service-config dictionaries deliberately do not specify supported-key validation.\n\n'
    for name, model in schema['components']['schemas'].items():
        text += f'### {name}\n\n' + block(model) + '\n'
    text += '## Nested service configuration recognized by the runner\n\nThese keys are read from dictionaries, not declared/validated nested Pydantic models. Omitted values fall back to settings.\n\n| Object | Recognized keys | Defaults |\n|---|---|---|\n| fraud_config | amount_threshold, velocity_window_seconds, velocity_max_txns, probabilistic_rate, base_latency_ms | 250000, 60, 5, 0.015, 6 ms |\n| fx_config | use_cache, base_latency_ms | true, 8 ms |\n| notification_config | num_workers, base_latency_ms | 4, 12 ms |\n\nDefault settings may be overridden in environment/process. DEFAULT_MAX_CONCURRENCY appears in GET config, but omitted POST concurrency_limit uses the schema literal 50. BenchmarkSuiteRequest and ExchangeRateUpdate models exist but have no corresponding suite/patch endpoint. No cancellation, deletion, external payment submission or report/PDF API exists.\n'
    (CONTEXT / 'API_REFERENCE.md').write_text(text, encoding='utf-8')

    with sqlite3.connect((ROOT / 'fintech_analyzer.db').resolve().as_uri() + '?mode=ro', uri=True) as connection:
        connection.row_factory = sqlite3.Row
        text = '# Database schema\n\nInspected read-only on 30 October 2026 against the tracked `fintech_analyzer.db` and compared with SQLAlchemy models in `backend/app/models/`. SQLite schema below is actual stored schema, not an assumed relational design.\n\n'
        text += '## Initialization and persistence\n\n`core/database.py` creates a synchronous SQLAlchemy engine with `pool_pre_ping=True`; SQLite sets `check_same_thread=False`. SessionLocal uses autocommit=False and autoflush=False. Default URL `sqlite:///./fintech_analyzer.db` resolves relative to process working directory. `main.py` imports models, calls `Base.metadata.create_all` at import, then seeds seven default rates only when the rate table is empty. GET rates also seeds when empty. There are no Alembic scripts or migrations; create_all does not alter existing columns. No explicit SQLite PRAGMA foreign_keys=ON, WAL configuration, retry policy or retention is configured.\n\n'
        text += 'Table primary/foreign keys and indexes are declared below. Foreign-key declarations do not prove SQLite enforcement: connection setup does not enable it. No ORM relationship/cascade objects are defined. Business statuses/currency enums are strings, not database CHECK constraints. Defaults/timestamps mostly come from SQLAlchemy Python-side defaults and therefore may appear null in SQLite server-default metadata.\n\n'
        text += '```mermaid\nerDiagram\n  test_runs ||--o{ transactions : test_run_id\n  test_runs ||--o{ notification_events : test_run_id\n  transactions ||--o{ notification_events : transaction_id\n```\n\n`exchange_rates` is an independent lookup table; transaction exchange_rate is a stored financial snapshot string, not a foreign key.\n\n'
        for table in ('test_runs', 'transactions', 'exchange_rates', 'notification_events'):
            text += f'## {table}\n\n| Column | SQLite type | NOT NULL | Primary key ordinal | Server default |\n|---|---|---|---|---|\n'
            for row in connection.execute(f'pragma table_info("{table}")'):
                text += f'| {row["name"]} | {row["type"]} | {bool(row["notnull"])} | {row["pk"]} | {row["dflt_value"]} |\n'
            text += '\nForeign keys:\n\n' + block([dict(row) for row in connection.execute(f'pragma foreign_key_list("{table}")')])
            indexes = []
            for row in connection.execute(f'pragma index_list("{table}")'):
                index = dict(row)
                index['columns'] = [dict(item) for item in connection.execute('pragma index_info("' + row['name'] + '")')]
                indexes.append(index)
            text += 'Indexes/unique constraints:\n\n' + block(indexes)
            text += 'Actual DDL:\n\n```sql\n' + connection.execute('select sql from sqlite_master where type="table" and name=?', (table,)).fetchone()[0] + ';\n```\n\n'
        text += '## Storage semantics and model defaults\n\nTestRun.id and Transaction.id are UUID strings assigned by application code. ExchangeRate.id is an autoincrement integer. NotificationEvent.id is a string primary key with no generated default; the current worker never inserts records.\n\nTestRun requires id/name/transaction_count; schema validation controls input bounds. Python defaults: QUEUED, mixed, concurrent, concurrency=50, intl_percentage=50, seed=42, UTC created_at, progress=0, processed_count=0. Config_snapshot stores only supplied service dictionaries, not full effective defaults/rates/environment; API response omits this column. Metrics and bottlenecks are JSON blobs (not normalized metric tables). started_at/completed_at/error_details are optional.\n\nTransaction financial fields original_amount/exchange_rate/converted_amount/fx_fee are VARCHAR(30), preserving the Decimal output representation; unlike the misleading source comment, these are not floating point columns. Required original_amount, customer/type/currencies and test_run_id have no DB-level positivity/currency validity constraints. Defaults: PENDING, fraud_flagged=false, created_at UTC, durations=0. Optional result/risk/error fields use nullable columns. Normal engine results overwrite status/timestamps/timings. notification_duration_ms remains 0 in the current pipeline.\n\nExchangeRate enforces unique (source_currency,destination_currency) with uq_pair; rate is FLOAT and non-null, not exact Decimal storage. Python defaults: is_active=true and updated_at UTC, with onupdate timestamp. No positive-rate or supported-code DB checks exist.\n\nNotificationEvent defaults: QUEUED, queued_at UTC, wait_time_ms=0 and processing_time_ms=0. worker_id/processed_at/error_message are nullable. Its foreign keys link run and transaction, but there is no enforced uniqueness for one event per transaction. The historical table has zero rows.\n\nRuns are inserted QUEUED before work, updated RUNNING/progress periodically, and finally COMPLETED with metrics/findings after processing. Engine persists transactions in separate committed batches of 1,000 after timed processing/drain. This is not a single atomic experiment write; interruption can produce partial records/stale status. Failure handler writes FAILED/error_details where possible but lacks robust DB rollback/recovery. Rate upserts commit immediately. PUT system config changes memory, not a database config table.\n\nThe tracked audit contains 13 runs and 10,360 transactions, with counts matching each run; see database_audit.json. No schema or benchmark data was changed by this audit. SQLite is writable on hosting only when its parent directory is writable. Default Render storage is ephemeral; runtime rows do not survive filesystem replacement. Persistent disk or a separately planned PostgreSQL migration is needed for durable hosting. Concurrent writers can contend because SQLite serializes writes. See DEPLOYMENT.md for operational constraints and backup/transfer choices.\n'
        (CONTEXT / 'DATABASE_SCHEMA.md').write_text(text, encoding='utf-8')

    audit = json.loads((EVIDENCE / 'database_audit.json').read_text(encoding='utf-8'))
    table = '| Run ID | Name | UTC created_at | Tx | Seed | Mode / concurrency | Payment TPS | Mean ms | P95 ms |\n|---|---|---|---|---|---|---|---|---|\n'
    for run in audit['runs']:
        metrics = run['metrics']
        table += f'| {run["id"]} | {run["name"]} | {run["created_at"]} | {run["transaction_count"]} | {run["random_seed"]} | {run["processing_mode"]} / {run["concurrency_limit"]} | {metrics["throughput_tps"]} | {metrics["avg_response_time_ms"]} | {metrics["p95_response_time_ms"]} |\n'
    testing = CONTEXT / 'TESTING_AND_RESULTS.md'
    content = testing.read_text(encoding='utf-8')
    if '<!-- HISTORICAL_RESULTS -->' in content:
        testing.write_text(content.replace('<!-- HISTORICAL_RESULTS -->', table), encoding='utf-8')
    excluded = {'.git', 'node_modules', 'venv', '.venv', '__pycache__', '.pytest_cache', 'dist'}
    inventory = sorted(str(path.relative_to(ROOT)).replace('\\', '/') for path in ROOT.rglob('*')
                       if path.is_file() and not excluded.intersection(path.relative_to(ROOT).parts)
                       and path.suffix not in {'.db', '.pyc'} and 'documentation_context/evidence' not in path.as_posix())
    (EVIDENCE / 'source_inventory.txt').write_text('\n'.join(inventory) + '\n', encoding='utf-8')
    print('Generated API_REFERENCE.md, DATABASE_SCHEMA.md, historical results table and source inventory')


if __name__ == '__main__':
    main()
