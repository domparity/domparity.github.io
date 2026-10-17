import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdxText, mdxCode, renderApiPage, renderSidebar, renderWpt, BANNER } from '../website/scripts/generate.mjs';
import { parseSummary } from '../scripts/import-wpt.mjs';

const data = {
  date: '2026-10-17T12:00:00.000Z',
  node: 'v22.23.3',
  engines: [
    { key: 'a@1.0.0', engine: 'a', version: '1.0.0' },
    { key: 'b@2.0.0', engine: 'b', version: '2.0.0' },
  ],
  apis: [
    {
      id: 'zeta', title: 'Zeta <x>', summary: 'Has {braces}.', spec: 'https://example.org/z#s',
      existsDescription: null, nodeGlobal: 'zeta', workaround: 'Use `zeta-polyfill`.',
      checks: [{ id: 'c1', description: 'Returns <b>{}</b>.', spec: 'https://example.org/#c1' }],
    },
    { id: 'alpha', title: 'Alpha', summary: 'A.', spec: 'https://example.org/a', checks: [] },
  ],
  results: {
    zeta: {
      'a@1.0.0': { status: 'partial', passed: [], failed: [{ id: 'c1', error: 'got `{x}` <y>', logged: ['Not implemented: zeta'] }], error: null },
      'b@2.0.0': { status: 'missing', exists: false, passed: [], failed: [], error: null },
    },
  },
};

test('mdxText escapes markdown and JSX punctuation and flattens newlines', () => {
  assert.equal(mdxText('a <b> {c} *d* [e]\nf'), 'a \\<b\\> \\{c\\} \\*d\\* \\[e\\] f');
});

test('mdxCode fences around backticks', () => {
  assert.equal(mdxCode('plain'), '`plain`');
  assert.equal(mdxCode('has ` tick'), '``has ` tick``');
  assert.equal(mdxCode('`edge`'), '`` `edge` ``');
});

test('an API page has front matter, banner, every engine, failures and escaped text', () => {
  const page = renderApiPage(data.apis[0], data);
  assert.match(page, /^---\nid: zeta\ntitle: "Zeta <x>"\n/);
  assert.match(page, /slug: \/apis\/zeta\n/);
  assert.ok(page.includes(BANNER));
  assert.ok(page.includes('### a 1.0.0'));
  assert.ok(page.includes('<StatusBadge status="partial" />'));
  assert.ok(page.includes('### b 2.0.0'));
  assert.ok(page.includes("Not defined in this engine's window."));
  assert.ok(page.includes('Returns \\<b\\>\\{\\}\\</b\\>.'));
  assert.ok(page.includes('Result: ``got `{x}` <y>``'));
  assert.ok(page.includes('Logged by the engine: `Not implemented: zeta`'));
  assert.ok(page.includes('## Node.js globals'));
  assert.ok(page.includes('## Working around it in tests'));
  assert.ok(page.includes('Has \\{braces\\}.'));
});

test('no workaround section when there is no common workaround', () => {
  assert.ok(!renderApiPage(data.apis[1], { ...data, results: { alpha: {} } }).includes('Working around'));
});

test('the sidebar lists API pages by title', () => {
  assert.deepEqual(renderSidebar(data), ['apis/alpha', 'apis/zeta']);
});

test('WPT summary tables are parsed and rendered with the source and unmeasured engines', () => {
  const md = [
    '## warpdom', '', '| Directory | Files | Harness OK | All pass | Subtests | Passed | Pass rate | Score | Skipped |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    '| dom/abort/ | 6 | 6 | 6 | 37 | 37 | 100.0% | 100.0% | 0 |',
    '| dom/observable/ | 0 | 0 | 0 | 0 | 0 | - | - | 27 |',
    '| **Total** | 6 | 6 | 6 | 37 | 37 | 100.0% | 100.0% | 0 |',
    '', '## Side by side', '| Directory | Files |', '| dom/abort/ | 6 |',
  ].join('\n');
  const tables = parseSummary(md);
  assert.deepEqual(tables.warpdom, [
    { area: 'dom/abort', files: 6, filesAllPass: 6, subtests: 37, passed: 37 },
    { area: 'total', files: 6, filesAllPass: 6, subtests: 37, passed: 37 },
  ]);
  const page = renderWpt({
    source: { wptCommit: '87b5d13099c8', wptCommitUrl: 'https://x/', date: '2026-10-13', node: 'v22', file: 'f.md', repository: 'https://r', githubRun: '1', areas: ['dom'], notes: 'n' },
    engines: { warpdom: { measured: true, version: 'c1', areas: tables.warpdom }, linkedom: { measured: false, version: null, areas: null } },
  });
  assert.ok(page.includes('| `dom/abort` | 37 | 37 | 100.0% |'));
  assert.ok(page.includes('| **Total** | 37 | 37 | 100.0% |'));
  assert.ok(page.includes('- linkedom: not measured'));
  assert.ok(page.includes('87b5d13099'));
});

test('every engine section links to a prefilled "wrong result" issue', async () => {
  const { featuredReport, ISSUES_NEW } = await import('../website/scripts/generate.mjs');
  const page = renderApiPage(data.apis[0], data);
  assert.equal((page.match(/<ReportLink href=/g) ?? []).length, 2);
  assert.ok(page.includes("import ReportLink from '@site/src/components/ReportLink';"));
  const url = new URL(featuredReport(data.apis[0], { ...data.engines[0], setup: 'new A()' }, data.results.zeta['a@1.0.0'], data));
  assert.equal(`${url.origin}${url.pathname}`, ISSUES_NEW);
  assert.equal(url.searchParams.get('title'), 'Wrong result: Zeta <x> in a 1.0.0');
  const body = url.searchParams.get('body');
  assert.ok(body.includes('**Engine:** a 1.0.0 (window created with `new A()`)'));
  assert.ok(body.includes('### Check `c1`'));
  assert.ok(body.includes('**Expected (per the spec):** Returns <b>{}</b>.'));
  assert.ok(body.includes("**Observed:** `got '{x}' <y>`"));
  assert.ok(body.includes('**Logged by the engine:** `Not implemented: zeta`'));
  const missing = new URL(featuredReport(data.apis[0], data.engines[1], data.results.zeta['b@2.0.0'], data)).searchParams.get('body');
  assert.ok(missing.includes('**Observed:** not defined'));
});
