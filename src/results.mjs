import { classify, works } from './classify.mjs';
import { orderEngines } from './order.mjs';

export const SCHEMA_VERSION = 1;

// Combines probe metadata and the raw per-engine outcomes into the published
// data format (data/results.json). Engines are keyed "<engine>@<version>" so
// several versions of one engine can sit side by side. Engines are in the
// site's order (src/order.mjs) whatever order they were probed in.
export function buildResults({ probes, raw: unordered, setups, date, node }) {
  const raw = orderEngines(unordered);
  const engines = raw.map((r) => ({
    key: `${r.engine}@${r.version ?? 'unknown'}`,
    engine: r.engine,
    package: r.package,
    version: r.version,
    setup: setups[r.engine] ?? null,
    ...(r.crashed ? { crashed: r.crashed } : {}),
  }));

  const apis = probes.map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.summary,
    spec: p.spec,
    existsDescription: p.existsDescription ?? (p.global ? `typeof window.${p.global} is defined.` : null),
    nodeGlobal: p.global ?? null,
    workaround: p.workaround ?? null,
    interfaces: p.interfaces ?? [],
    checks: p.checks.map((c) => ({ id: c.id, description: c.description, spec: c.spec })),
  }));

  const results = {};
  for (const p of probes) {
    results[p.id] = {};
    raw.forEach((r, i) => {
      const o = r.results[p.id];
      const key = engines[i].key;
      if (!o) {
        results[p.id][key] = {
          status: 'missing',
          exists: false,
          passed: [],
          failed: [],
          error: r.crashed ? 'engine crashed' : 'not run',
        };
        return;
      }
      results[p.id][key] = {
        status: classify(o),
        exists: o.exists,
        ...(o.sameAsNode ? { sameAsNode: true } : {}),
        passed: o.checks.filter(works).map((c) => c.id),
        failed: o.checks
          .filter((c) => !works(c))
          .map((c) => ({
            id: c.id,
            error: c.error ?? (c.notImplemented ? 'passed, but the engine reported "not implemented"' : null),
            ...(c.notImplemented ? { notImplemented: true } : {}),
            ...(c.logged ? { logged: c.logged } : {}),
          })),
        error: o.error,
      };
    });
  }

  return { schema: SCHEMA_VERSION, date, node, engines, apis, results };
}
