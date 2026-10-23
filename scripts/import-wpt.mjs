// Imports Web Platform Tests pass rates per area from warpdom's published WPT
// summary (a markdown file with one table per engine) into data/wpt.json.
//
//   node scripts/import-wpt.mjs <path to summary.md>
//
// The source run is described below; update SOURCE when importing a new run.

import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = {
  description:
    "Web Platform Tests run by warpdom's WPT workflow (wpt.yml) on GitHub-hosted runners at the newest WPT commit: the 17 areas a test DOM is expected to cover (21 jobs, encoding split in six), merged with the workflow's own merge and summary scripts.",
  repository: 'https://github.com/sonukapoor/warpdom',
  file: 'docs/research/data/wpt/ci-2026-10-19-9d1498b/summary.md',
  githubRun: '39189276229',
  wptCommit: '6cd3f1c39e2aec3d58f140aa0ff2991d79eb9991',
  wptCommitUrl: 'https://github.com/web-platform-tests/wpt/tree/6cd3f1c39e2aec3d58f140aa0ff2991d79eb9991',
  date: '2026-10-19',
  areas: [
    'dom',
    'domparsing',
    'html/dom',
    'css/cssom',
    'css/cssom-view',
    'html/semantics/forms',
    'html/semantics/interactive-elements',
    'url',
    'encoding',
    'encoding/streams',
    'FileAPI',
    'WebCryptoAPI',
    'hr-time',
    'user-timing',
    'resize-observer',
    'intersection-observer',
    'web-animations/interfaces',
  ],
  node: 'v22.23.3',
  caveat:
    "warpdom was worked on against the first four areas (dom, domparsing, html/dom and css/cssom; 87.4% vs jsdom 80.5% there in the 2026-10-13 run, GitHub Actions run 38427179332), so those are not an independent check of it. Neither engine implements WebCrypto's subtle, the resize and intersection observers or Web Animations, which keeps both totals low. The versions run here can be older than the probed versions on the other pages.",
  notes:
    'Subtests that the runner cannot run outside a browser (testdriver, tentative tests) are skipped for every engine alike. "Pass rate" is passed subtests / subtests; "score" averages the per-file pass fraction, so large files weigh less. Subtest counts can differ between engines when a test file stops early in one of them: the Subtests column is warpdom\'s, and each engine\'s rate is over its own count (jsdom stops early in several WebCryptoAPI files, so it has 176,171 subtests in total to warpdom\'s 186,857).',
};

// In the site's engine order (src/order.mjs).
const ENGINES = {
  warpdom: { version: 'commit 9d1498b (main, 2026-10-18, one commit after the 0.1.5 release)', measured: true },
  'happy-dom': { version: null, measured: false },
  jsdom: { version: '30.1.2', measured: true },
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
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim().replace(/\*\*/g, ''));
    const [area, files, , allPass, subtests, passed] = cells.map((c, i) => (i === 0 ? c : Number(c)));
    if (!subtests) continue;
    (out[engine] ??= []).push({
      area: area === 'Total' ? 'total' : area.replace(/\/$/, ''),
      files,
      filesAllPass: allPass,
      subtests,
      passed,
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tables = parseSummary(readFileSync(process.argv[2], 'utf8'));
  const engines = Object.fromEntries(
    Object.entries(ENGINES).map(([name, meta]) => [
      name,
      meta.measured ? { ...meta, areas: tables[name] } : { ...meta, areas: null, note: 'not measured' },
    ]),
  );
  const data = { license: 'CC BY 4.0', source: SOURCE, engines };
  writeFileSync(new URL('../data/wpt.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
  console.log('wrote data/wpt.json');
}
