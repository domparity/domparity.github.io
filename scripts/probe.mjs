// Runs every probe against every engine in engines.json, each engine in its own
// child process with a timeout, and writes data/results.json.

import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProbes } from '../src/probes.mjs';
import { adapters } from '../src/engines.mjs';
import { buildResults } from '../src/results.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const ENGINE_TIMEOUT_MS = 180_000;

const engines = JSON.parse(readFileSync(join(root, 'engines.json'), 'utf8'));
const probes = await loadProbes();
const tmp = mkdtempSync(join(tmpdir(), 'domparity-'));

function runEngine({ engine, package: pkg }) {
  const out = join(tmp, `${pkg}.json`);
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(root, 'scripts/run-engine.mjs'), engine, pkg, out],
      { cwd: root, timeout: ENGINE_TIMEOUT_MS, maxBuffer: 16 << 20 },
      (err, stdout, stderr) => {
        try {
          resolve(JSON.parse(readFileSync(out, 'utf8')));
        } catch {
          resolve({
            engine,
            package: pkg,
            version: null,
            crashed: (err && err.message) || stderr || 'no output',
            results: {},
          });
        }
      },
    );
  });
}

const raw = [];
for (const e of engines) {
  process.stdout.write(`probing ${e.package} ... `);
  const r = await runEngine(e);
  raw.push(r);
  console.log(r.crashed ? `crashed: ${r.crashed.split('\n')[0]}` : r.version);
}
rmSync(tmp, { recursive: true, force: true });

const results = buildResults({
  probes,
  raw,
  setups: Object.fromEntries(Object.entries(adapters).map(([k, a]) => [k, a.setup])),
  date: new Date().toISOString(),
  node: process.version,
});
writeFileSync(join(root, 'data/results.json'), JSON.stringify(results, null, 2) + '\n');
console.log('wrote data/results.json');
