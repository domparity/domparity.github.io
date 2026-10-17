// Imports Web Platform Tests pass rates per area from warpdom's published WPT
// summary (a markdown file with one table per engine) into data/wpt.json.
//
//   node scripts/import-wpt.mjs <path to summary.md>
//
// The source run is described below; update SOURCE when importing a new run.

import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = {
  description:
    "Web Platform Tests run by warpdom's WPT workflow (wpt.yml) on GitHub-hosted runners; the four area jobs' results merged with the workflow's own merge and summary scripts.",
  repository: 'https://github.com/sonukapoor/warpdom',
  file: 'docs/research/data/wpt/ci-2026-10-13-208ad49/summary.md',
  githubRun: '38427179332',
  wptCommit: '87b5d13099c8bc2f9047ce1d29c963a3e0a246f6',
  wptCommitUrl: 'https://github.com/web-platform-tests/wpt/tree/87b5d13099c8bc2f9047ce1d29c963a3e0a246f6',
  date: '2026-10-13',
  areas: ['css/cssom', 'dom', 'domparsing', 'html/dom'],
  node: 'v22.23.3',
  notes:
    'Subtests that the runner cannot run outside a browser (testdriver, tentative tests) are skipped for every engine alike. "Pass rate" is passed subtests / subtests; "score" averages the per-file pass fraction, so large files weigh less. Subtest counts can differ slightly between engines when a test file stops early in one of them.',
};

const ENGINES = {
  warpdom: { version: 'commit 8630317 (2026-10-13, before the 0.1.0 release)', measured: true },
  jsdom: { version: '30.1.2', measured: true },
  'happy-dom': { version: null, measured: false },
  linkedom: { version: null, measured: false },
};

export function parseSummary(md) {
  const out = {};
  let engine = null;
  for (const line of md.split('\n')) {
    const h = line.match(/^## (\S+)\s*$/);
    if (h) {
      engine = h[1] in ENGINES ? h[1] : null;
      continue;
    }
    if (!engine || !line.startsWith('|') || line.includes('---') || line.includes('Directory')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/\*\*/g, ''));
    const [area, files, , allPass, subtests, passed] = cells.map((c, i) => (i === 0 ? c : Number(c)));
    if (!subtests) continue;
    (out[engine] ??= []).push({ area: area === 'Total' ? 'total' : area.replace(/\/$/, ''), files, filesAllPass: allPass, subtests, passed });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tables = parseSummary(readFileSync(process.argv[2], 'utf8'));
  const engines = Object.fromEntries(
    Object.entries(ENGINES).map(([name, meta]) => [name, meta.measured ? { ...meta, areas: tables[name] } : { ...meta, areas: null, note: 'not measured' }]),
  );
  const data = { license: 'CC BY 4.0', source: SOURCE, engines };
  writeFileSync(new URL('../data/wpt.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
  console.log('wrote data/wpt.json');
}
