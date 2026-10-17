// Child process: checks every interface and member of the IDL plan against one
// engine's window and writes the raw outcome as JSON.
//
//   node scripts/run-idl.mjs <engine> <package> <plan.json> <out.json>

import { writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { adapters } from '../src/engines.mjs';
import { probeWindow } from '../src/idl.mjs';
import { isNotImplementedText } from '../src/classify.mjs';

const [engine, pkg, planFile, out] = process.argv.slice(2);
const adapter = adapters[engine];
if (!adapter) throw new Error(`unknown engine ${engine}`);
const plan = JSON.parse(readFileSync(planFile, 'utf8'));

// Console output is captured, not printed (jsdom reports "not implemented"
// through its virtual console).
let captured = [];
for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
  console[method] = (...args) => captured.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
}
process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

const require = createRequire(import.meta.url);
const version = JSON.parse(readFileSync(require.resolve(`${pkg}/package.json`), 'utf8')).version;

const nodeGlobal = globalThis;
const { window, close } = await adapter.create(pkg);
const results = probeWindow(window, plan, {
  nodeGlobal,
  isNotImplemented: isNotImplementedText,
  captureLogs(fn) {
    captured = [];
    fn();
    return captured;
  },
});
try {
  await close();
} catch {}

writeFileSync(out, JSON.stringify({ engine, package: pkg, version, results }));
process.exit(0);
