import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const venv = resolve(root, process.platform === 'win32' ? 'venv/Scripts/python.exe' : 'venv/bin/python');
const python = process.env.SCREENSHOT_PYTHON || (existsSync(venv) ? venv : (process.platform === 'win32' ? 'python' : 'python3'));
const result = spawnSync(python, [resolve(here, 'capture.py')], {
  cwd: root, stdio: 'inherit', env: { ...process.env, SCREENSHOT_NODE: process.execPath },
});
if (result.error) console.error(`Cannot start Python: ${result.error.message}. Set SCREENSHOT_PYTHON to your backend interpreter.`);
process.exitCode = result.status ?? 1;
