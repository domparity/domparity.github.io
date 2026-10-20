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
  assert.ok(!page.includes('tuned'));
  const withCaveat = renderWpt({
    source: { wptCommit: '87b5d13099c8', wptCommitUrl: 'https://x/', date: '2026-10-13', node: 'v22', file: 'f.md', repository: 'https://r', githubRun: '1', areas: ['dom'], notes: 'n', caveat: 'warpdom was tuned on dom.' },
    engines: { warpdom: { measured: true, version: 'c1', areas: tables.warpdom } },
  });
  assert.ok(withCaveat.includes('\nwarpdom was tuned on dom.\n'));
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

test('a missing API says which existence test failed', () => {
  const api = { ...data.apis[0], existsDescription: 'X exists and x has go().' };
  const page = renderApiPage(api, data);
  assert.ok(page.includes("Missing: in this engine's window, this does not hold: X exists and x has go()."));
});

test('featured pages show Web IDL existence for the interfaces an API is about', async () => {
  const { idlLines } = await import('../website/scripts/generate.mjs');
  const idl = {
    engines: [{ key: 'a@1.0.0' }, { key: 'b@2.0.0' }],
    specs: {
      html: { interfaces: { HTMLThing: { kind: 'interface', status: 'P-', members: [['open', 'a', '11'], ['show', 'o', '10'], ['close', 'o', '00']] } } },
      other: { interfaces: { HTMLThing: { members: [['extra', 'o', '00']] } } },
    },
  };
  const api = { ...data.apis[0], interfaces: ['HTMLThing'] };
  assert.deepEqual(idlLines(api, 'a@1.0.0', idl), [
    'Web IDL existence ([coverage](/coverage)):', '',
    '- [HTMLThing](/coverage/interface/HTMLThing): interface present; 2 of 4 members present, missing: `close`, `extra`.', '',
  ]);
  assert.equal(idlLines(api, 'b@2.0.0', idl)[2], '- [HTMLThing](/coverage/interface/HTMLThing): interface not defined.');
  assert.deepEqual(idlLines(data.apis[1], 'a@1.0.0', idl), []);
  assert.ok(renderApiPage(api, data, idl).includes('interface present; 2 of 4 members present'));
});

test('the What changed page lists updates newest first, with version moves, status changes and Web IDL changes', async () => {
  const { renderChanges, dataDate } = await import('../website/scripts/generate.mjs');
  const changelog = {
    entries: [
      {
        date: '2026-10-19',
        engines: [{ engine: 'jsdom', from: '30.1.3', version: '30.2.0' }, { engine: 'linkedom', version: '0.18.13' }],
        packages: [{ package: '@webref/idl', from: '3.85.2', to: '3.86.0' }],
        featured: [{ engine: 'jsdom', api: 'zeta', title: 'Zeta <x>', from: 'partial', to: 'supported', nowPass: ['c1'], nowFail: [] }],
        apisAdded: [],
        apisRemoved: [],
        idl: [{ engine: 'jsdom', interfaces: 1, nowPresent: 2, nowMissing: 0, examples: { interfaces: [{ name: 'Foo', spec: 'dom', from: '-', to: 'P' }], nowPresent: ['Foo.a', 'Foo.b'], nowMissing: [] } }],
        specsAdded: [{ id: 'new-spec', title: 'New Spec', group: null }],
        specsRemoved: [],
        interfacesAdded: 3,
        interfacesRemoved: 0,
        membersAdded: 1,
        membersRemoved: 0,
      },
      { date: '2026-10-17', initial: true, note: 'First data.', engines: [{ engine: 'jsdom', version: '30.1.3' }] },
    ],
  };
  const page = renderChanges(changelog, { apiIds: new Set(['zeta']) });
  assert.match(page, /slug: \/changes\n/);
  assert.ok(page.includes(BANNER));
  assert.ok(page.indexOf('## 2026-10-19') < page.indexOf('## 2026-10-17'));
  assert.ok(page.includes('jsdom 30.1.3 → **30.2.0**, linkedom 0.18.13.'));
  assert.ok(page.includes('`@webref/idl` 3.85.2 → 3.86.0'));
  assert.ok(page.includes('- jsdom: [Zeta \\<x\\>](/apis/zeta): Partial → **Supported** (now passes `c1`)'));
  assert.ok(page.includes('1 interface changed status, 2 members now present, 0 now missing: `Foo` missing → present, `Foo.a` now present'));
  assert.ok(page.includes('New in the Web IDL: spec New Spec (not yet in a group); 3 interfaces added; 1 member added.'));
  assert.ok(page.includes('First data.'));
  // An API that no longer exists is not linked (the build fails on broken links).
  assert.ok(!renderChanges(changelog).includes('](/apis/zeta)'));
  const twice = renderChanges({ entries: [{ ...changelog.entries[1], date: '2026-10-17' }, changelog.entries[1]] });
  assert.ok(twice.includes('## 2026-10-17 (2)') && twice.includes('## 2026-10-17 (1)'));
  assert.match(page, /^---\nid: changes\ntitle: What changed\ndescription: "[^"\n]+"\nslug/);
  assert.equal(dataDate({ date: '2026-10-17T18:13:06Z' }, { date: '2026-10-18T01:00:00Z' }), '2026-10-18');
});
