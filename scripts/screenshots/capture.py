"""Own local screenshot services and an isolated database; preserve every prior run."""
import hashlib
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


def available_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def wait_for_service(url, child):
    for _ in range(200):
        if child.poll() is not None:
            raise RuntimeError(f'Service exited before ready: {url}; inspect service logs')
        try:
            with urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except (OSError, TimeoutError):
            pass
        time.sleep(0.15)
    raise RuntimeError(f'Service readiness timed out: {url}')


def main():
    stamp = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime('%Y%m%d-%H%M%S-%f-IST')
    output = ROOT / 'documentation_context' / 'screenshots' / stamp
    output.mkdir(parents=True, exist_ok=False)
    runtime = output / 'runtime'
    runtime.mkdir()
    historical = ROOT / 'fintech_analyzer.db'
    before = hashlib.sha256(historical.read_bytes()).hexdigest() if historical.exists() else None
    backend_port = available_port()
    frontend_port = available_port()
    while frontend_port == backend_port:
        frontend_port = available_port()
    backend = f'http://127.0.0.1:{backend_port}'
    frontend = f'http://127.0.0.1:{frontend_port}'
    node = os.environ.get('SCREENSHOT_NODE', 'node')
    vite = ROOT / 'frontend' / 'node_modules' / 'vite' / 'bin' / 'vite.js'
    processes = []
    logs = []
    errors = []
    code = 1
    env = dict(os.environ)
    env.update({
        'DATABASE_URL': 'sqlite:///' + (runtime / 'demo.db').as_posix(),
        'CORS_ORIGINS': json.dumps([frontend]), 'API_V1_STR': '/api',
        'BASE_PAYMENT_DELAY_MS': '5', 'BASE_FX_DELAY_MS': '8',
        'BASE_FRAUD_DELAY_MS': '6', 'BASE_NOTIFICATION_DELAY_MS': '12',
        'FRAUD_AMOUNT_THRESHOLD': '250000', 'FRAUD_VELOCITY_WINDOW_SECONDS': '60',
        'FRAUD_VELOCITY_MAX_TXNS': '5', 'FRAUD_PROBABILISTIC_RATE': '0.015',
        'DEFAULT_NOTIFICATION_WORKERS': '4', 'DEFAULT_MAX_CONCURRENCY': '50',
        'NOTIFICATION_QUEUE_MAX_SIZE': '50000',
        'VITE_API_BASE_URL': backend + '/api',
        'SCREENSHOT_FRONTEND_URL': frontend, 'SCREENSHOT_BACKEND_URL': backend,
        'SCREENSHOT_OUTPUT': str(output),
        'SCREENSHOT_ISOLATED': '1',
        'PYTHONPATH': str(ROOT),
    })

    def start(command, cwd, filename):
        log = (runtime / filename).open('w', encoding='utf-8')
        logs.append(log)
        child = subprocess.Popen(command, cwd=cwd, env=env, stdout=log,
                                 stderr=subprocess.STDOUT,
                                 creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0)
        processes.append(child)
        return child

    try:
        if not vite.is_file():
            raise RuntimeError('Frontend dependencies missing; run npm.cmd --prefix frontend ci')
        backend_process = start([sys.executable, '-m', 'uvicorn', 'backend.app.main:app',
                                 '--host', '127.0.0.1', '--port', str(backend_port), '--workers', '1'], runtime, 'backend.log')
        wait_for_service(backend + '/api/health', backend_process)
        frontend_process = start([node, str(vite), '--host', '127.0.0.1', '--port', str(frontend_port), '--strictPort'], ROOT / 'frontend', 'frontend.log')
        wait_for_service(frontend, frontend_process)
        result = subprocess.run([node, str(HERE / 'capture.mjs')], cwd=ROOT, env=env, timeout=300)
        code = result.returncode
    except Exception as error:
        errors.append(str(error))
        print(f'Capture failed: {error}', file=sys.stderr)
    finally:
        for child in reversed(processes):
            if child.poll() is None:
                try:
                    if os.name == 'nt':
                        child.send_signal(signal.CTRL_BREAK_EVENT)
                    else:
                        child.terminate()
                    child.wait(timeout=15)
                except Exception as error:
                    errors.append(f'Service shutdown: {error}')
                    child.kill()
                    child.wait(timeout=5)
        for log in logs:
            log.close()
        after = hashlib.sha256(historical.read_bytes()).hexdigest() if historical.exists() else None
        if before != after:
            errors.append('Historical database hash changed during capture; inspect external writers')
        preservation = {'historical_sha256_before': before, 'historical_sha256_after': after,
                        'unchanged': before == after, 'isolated_database': 'runtime/demo.db',
                        'frontend': frontend, 'backend': backend, 'errors': errors}
        (output / 'DATA_PRESERVATION.json').write_text(json.dumps(preservation, indent=2), encoding='utf-8')
        index = output / 'SCREENSHOT_INDEX.md'
        if not index.exists():
            index.write_text('# Screenshot index\n\nNo screenshots captured. Capture did not finish. Inspect runtime logs and DATA_PRESERVATION.json.\n', encoding='utf-8')
        with index.open('a', encoding='utf-8') as handle:
            handle.write(f'\nHistorical database unchanged: **{before == after}** (SHA-256 verified).\n')
            for error in errors:
                handle.write(f'\nLauncher issue: {error}\n')
        print(f'Screenshot folder: {output}')
        print(f'Index: {index}')
    return 1 if errors else code


if __name__ == '__main__':
    raise SystemExit(main())
