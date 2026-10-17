// Child process: runs every probe against one engine and writes the raw
// outcome as JSON to the file given as the last argument. A fresh window is
// created for every check so checks cannot affect each other.
//
//   node scripts/run-engine.mjs <engine> <package> <out.json>

import { writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { adapters } from '../src/engines.mjs';
import { loadProbes } from '../src/probes.mjs';
import { isNotImplementedText } from '../src/classify.mjs';

const [engine, pkg, out] = process.argv.slice(2);
const adapter = adapters[engine];
if (!adapter) throw new Error(`unknown engine ${engine}`);

const CHECK_TIMEOUT_MS = 3000;

// Engines report unimplemented features in different ways: by throwing, or by
// logging (jsdom's virtual console forwards "Not implemented: ..." to
// console.error). Console output during a check is captured, not printed.
let captured = [];
for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
  console[method] = (...args) => captured.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
}
process.on('unhandledRejection', (e) => captured.push(`unhandled rejection: ${e && e.message}`));
process.on('uncaughtException', (e) => captured.push(`uncaught exception: ${e && e.message}`));

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => (timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms))),
  ]).finally(() => clearTimeout(timer));
}

function errorText(e) {
  if (e == null) return String(e);
  return e.name && e.name !== 'Error' && e.name !== 'CheckFailed' ? `${e.name}: ${e.message}` : String(e.message ?? e);
}

async function inWindow(fn) {
  const { window, close } = await adapter.create(pkg);
  try {
    return await withTimeout(Promise.resolve().then(() => fn(window)), CHECK_TIMEOUT_MS);
  } finally {
    try {
      await close();
    } catch {}
  }
}

const require = createRequire(import.meta.url);
const version = JSON.parse(readFileSync(require.resolve(`${pkg}/package.json`), 'utf8')).version;

const results = {};
for (const probe of await loadProbes()) {
  const r = { exists: false, sameAsNode: false, checks: [], error: null, console: [] };
  captured = [];
  try {
    r.exists = !!(await inWindow((w) => {
      const exists = probe.exists(w);
      if (exists && probe.global) r.sameAsNode = w[probe.global] === globalThis[probe.global];
      return exists;
    }));
  } catch (e) {
    r.error = errorText(e);
  }
  if (r.exists) {
    for (const check of probe.checks) {
      captured = [];
      const c = { id: check.id, pass: false, error: null, notImplemented: false };
      try {
        await inWindow((w) => check.run(w));
        c.pass = true;
      } catch (e) {
        c.error = errorText(e);
      }
      // Wait a moment so asynchronous "not implemented" reports land in this check.
      await new Promise((resolve) => setTimeout(resolve, 5));
      const logged = captured.filter(isNotImplementedText);
      c.notImplemented = isNotImplementedText(c.error) || logged.length > 0;
      if (logged.length) c.logged = [...new Set(logged)].slice(0, 3);
      r.checks.push(c);
    }
  }
  results[probe.id] = r;
}

writeFileSync(out, JSON.stringify({ engine, package: pkg, version, results }));
process.exit(0);
