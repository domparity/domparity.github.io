// The automatic existence pass: builds the plan from @webref/idl, runs every
// engine in engines.json in its own child process with a timeout, and writes
// data/idl.json.

import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlan, specMetaFrom, buildIdlData, formatIdlData } from '../src/idl.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const ENGINE_TIMEOUT_MS = 180_000;

const { parseAll } = require('@webref/idl');
const version = (p) => JSON.parse(readFileSync(require.resolve(`${p}/package.json`), 'utf8')).version;

const plan = buildPlan(await parseAll(), specMetaFrom(require('browser-specs')));
const engines = JSON.parse(readFileSync(join(root, 'engines.json'), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'domparity-idl-'));
const planFile = join(tmp, 'plan.json');
writeFileSync(planFile, JSON.stringify(plan));

function runEngine({ engine, package: pkg }) {
  const out = join(tmp, `${pkg}.json`);
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(root, 'scripts/run-idl.mjs'), engine, pkg, planFile, out],
      { cwd: root, timeout: ENGINE_TIMEOUT_MS, maxBuffer: 16 << 20 },
      (err, stdout, stderr) => {
        try {
          resolve(JSON.parse(readFileSync(out, 'utf8')));
        } catch {
          resolve({ engine, package: pkg, version: null, crashed: (err && err.message) || stderr || 'no output', results: {} });
        }
      },
    );
  });
}

const raw = [];
for (const e of engines) {
  process.stdout.write(`idl pass: ${e.package} ... `);
  const r = await runEngine(e);
  raw.push(r);
  console.log(r.crashed ? `crashed: ${r.crashed.split('\n')[0]}` : r.version);
}
rmSync(tmp, { recursive: true, force: true });

const data = buildIdlData({
  plan,
  raw,
  date: new Date().toISOString(),
  node: process.version,
  webref: { package: '@webref/idl', version: version('@webref/idl') },
  browserSpecs: { package: 'browser-specs', version: version('browser-specs') },
});
writeFileSync(join(root, 'data/idl.json'), formatIdlData(data));
const n = plan.interfaces.length;
const m = plan.interfaces.reduce((s, i) => s + i.members.length, 0);
console.log(`wrote data/idl.json: ${Object.keys(plan.specs).length} specs, ${n} interfaces, ${m} members`);
