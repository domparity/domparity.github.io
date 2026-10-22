import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diffData, renderSummary, changelogEntry, prTitle } from '../scripts/diff-data.mjs';
import { addChangelogEntry, PACKAGES } from '../scripts/update.mjs';

const groups = { groups: [{ id: 'core', title: 'Test DOM core', specs: ['dom'] }, { id: 'other', title: 'Other', specs: ['gpu'] }] };

const api = { id: 'events', title: 'Events', checks: [{ id: 'a' }, { id: 'b' }] };

function results(versions, statuses) {
  const engines = Object.entries(versions).map(([engine, version]) => ({ key: `${engine}@${version}`, engine, package: engine, version }));
  const res = {};
  engines.forEach((e) => {
    const s = statuses[e.engine];
    res[e.key] = { status: s.status, passed: s.passed, failed: [] };
  });
  return { date: 'd', node: 'v22.23.3', engines, apis: [api], results: { events: res } };
}

function idl(versions, { webref = '1.0.0', specs }) {
  return {
    date: 'd',
    webref: { version: webref },
    browserSpecs: { version: '5.0.0' },
    engines: Object.entries(versions).map(([engine, version]) => ({ key: `${engine}@${version}`, engine, version })),
    specs,
  };
}

const domSpec = (status, codes) => ({ title: 'DOM', interfaces: { Node: { kind: 'interface', status, members: [['appendChild', 'o', codes]] } } });

function snapshot({ versions, statuses, specs, deps = {}, webref }) {
  return {
    results: results(versions, statuses),
    idl: idl(versions, { specs, webref }),
    devDependencies: { ...Object.fromEntries(Object.entries(versions)), ...deps },
  };
}

const sup = { status: 'supported', passed: ['a', 'b'] };
const base = snapshot({ versions: { warpdom: '1.0.0', jsdom: '30.0.0' }, statuses: { warpdom: sup, jsdom: sup }, specs: { dom: domSpec('PP', '11') } });

test('identical results: nothing changed', () => {
  const d = diffData({ old: base, new: structuredClone(base), groups });
  assert.equal(d.changed, false);
  assert.equal(d.resultsChanged, false);
});

test('a pure version bump with identical results is eligible for auto-merge', () => {
  const cur = snapshot({ versions: { warpdom: '1.0.1', jsdom: '30.0.0' }, statuses: { warpdom: sup, jsdom: sup }, specs: { dom: domSpec('PP', '11') } });
  const d = diffData({ old: base, new: cur, groups });
  assert.equal(d.changed, true);
  assert.equal(d.resultsChanged, false);
  assert.equal(d.autoMerge, true);
  assert.deepEqual(d.engines.find((e) => e.engine === 'warpdom'), { id: 'warpdom', engine: 'warpdom', from: '1.0.0', to: '1.0.1', added: false, crashed: false });
  assert.equal(prTitle(d, '2026-10-19'), 'Data update 2026-10-19: warpdom 1.0.1');
  const body = renderSummary(d, { date: '2026-10-19' });
  assert.match(body, /\| warpdom \| 1\.0\.0 → 1\.0\.1 \|/);
  assert.match(body, /\| jsdom \| 30\.0\.0 \(unchanged\) \|/);
  assert.match(body, /eligible for auto-merge/);
});

test('engines are matched by package, not by position or version', () => {
  const cur = snapshot({ versions: { jsdom: '30.0.0', warpdom: '1.0.0' }, statuses: { warpdom: sup, jsdom: sup }, specs: { dom: domSpec('PP', '11') } });
  assert.equal(diffData({ old: base, new: cur, groups }).changed, false);
});

test('featured status and check changes, per engine', () => {
  const cur = snapshot({
    versions: { warpdom: '1.0.0', jsdom: '30.1.0' },
    statuses: { warpdom: sup, jsdom: { status: 'partial', passed: ['a'] } },
    specs: { dom: domSpec('PP', '11') },
  });
  const d = diffData({ old: base, new: cur, groups });
  assert.deepEqual(d.featured.changes, [{ engine: 'jsdom', engineId: 'jsdom', api: 'events', title: 'Events', from: 'supported', to: 'partial', nowPass: [], nowFail: ['b'] }]);
  assert.equal(d.autoMerge, false);
  const body = renderSummary(d, { date: 'x' });
  assert.match(body, /\*\*jsdom\*\* \(30\.0\.0 → 30\.1\.0\)/);
  assert.match(body, /`events` Events: supported → \*\*partial\*\* \(now fails: `b`\)/);
  assert.match(body, /Not eligible for auto-merge \(results changed\)/);
});

test('Web IDL interface and member changes per engine', () => {
  const cur = snapshot({ versions: { warpdom: '1.0.0', jsdom: '30.0.0' }, statuses: { warpdom: sup, jsdom: sup }, specs: { dom: domSpec('P-', '10') } });
  const d = diffData({ old: base, new: cur, groups });
  assert.equal(d.idl.perEngine.length, 1);
  const e = d.idl.perEngine[0];
  assert.equal(e.engine, 'jsdom');
  assert.deepEqual(e.interfaces, [{ spec: 'dom', name: 'Node', from: 'P', to: '-' }]);
  assert.deepEqual(e.nowMissing.map((m) => m.name), ['appendChild']);
  assert.equal(d.autoMerge, false);
  const body = renderSummary(d, { date: 'x' });
  assert.match(body, /interface `Node` \(dom\): present → \*\*missing\*\*/);
  assert.match(body, /now missing: `Node.appendChild` \(dom\)/);
});

test('new specs and interfaces from @webref/idl, with their group; unclassified specs block auto-merge', () => {
  const specs = {
    dom: { title: 'DOM', interfaces: { Node: { kind: 'interface', status: 'PP', members: [['appendChild', 'o', '11'], ['moveBefore', 'o', '10']] } } },
    gpu: { title: 'WebGPU', interfaces: { GPU: { kind: 'interface', status: '--', members: [] } } },
    'new-thing': { title: 'New Thing', interfaces: { Thing: { kind: 'interface', status: '-P', members: [] } } },
  };
  const cur = snapshot({ versions: { warpdom: '1.0.0', jsdom: '30.0.0' }, statuses: { warpdom: sup, jsdom: sup }, specs, webref: '1.1.0' });
  const d = diffData({ old: base, new: cur, groups });
  assert.deepEqual(d.idl.specsAdded.map((s) => [s.id, s.group?.id ?? null]), [['gpu', 'other'], ['new-thing', null]]);
  assert.deepEqual(d.idl.interfacesAdded.map((i) => [i.name, i.presentIn]), [['GPU', []], ['Thing', ['jsdom']]]);
  assert.deepEqual(d.idl.membersAdded.map((m) => [m.name, m.group.id, m.presentIn]), [['moveBefore', 'core', ['warpdom']]]);
  assert.deepEqual(d.unclassified, ['new-thing']);
  assert.equal(d.autoMerge, false);
  const body = renderSummary(d, { date: 'x' });
  assert.match(body, /`gpu` WebGPU: Other/);
  assert.match(body, /`new-thing` New Thing: \*\*unclassified\*\*/);
  assert.match(body, /`Thing` \(new-thing\): \*\*unclassified\*\*, defined in jsdom/);
  assert.match(body, /`Node.moveBefore` \(dom\): Test DOM core, defined in warpdom/);
  assert.match(body, /### Needs classification[\s\S]*- `new-thing`/);
  assert.match(body, /spec-groups\.test\.mjs` fails until they are added/);
  assert.match(body, /@webref\/idl 1\.0\.0 → 1\.1\.0/);
});

test('a package bump outside the engines (webidl2) counts as a change, with identical results', () => {
  const cur = structuredClone(base);
  cur.devDependencies.webidl2 = '25.0.0';
  const d = diffData({ old: base, new: cur, groups });
  assert.equal(d.changed, true);
  assert.equal(d.autoMerge, true);
  assert.match(renderSummary(d, { date: 'x' }), /`webidl2`: none → 25\.0\.0/);
});

test('long lists are capped and the body is limited in size', () => {
  const members = Array.from({ length: 500 }, (_, k) => [`m${k}`, 'a', '11']);
  const specs = { dom: { title: 'DOM', interfaces: { Node: { kind: 'interface', status: 'PP', members: [['appendChild', 'o', '11'], ...members] } } } };
  const cur = snapshot({ versions: { warpdom: '1.0.0', jsdom: '30.0.0' }, statuses: { warpdom: sup, jsdom: sup }, specs });
  const d = diffData({ old: base, new: cur, groups });
  const body = renderSummary(d, { date: 'x', max: 10 });
  assert.match(body, /Members added \(500\)/);
  assert.match(body, /- and 490 more/);
  assert.ok(renderSummary(d, { date: 'x', maxChars: 300 }).length < 450);
});

test('a changelog entry is compact; entries are added newest first', () => {
  const cur = snapshot({
    versions: { warpdom: '1.0.1', jsdom: '30.0.0' },
    statuses: { warpdom: { status: 'partial', passed: ['b'] }, jsdom: sup },
    specs: { dom: domSpec('PP', '11') },
  });
  const entry = changelogEntry(diffData({ old: base, new: cur, groups }), { date: '2026-10-19' });
  assert.equal(entry.date, '2026-10-19');
  assert.deepEqual(entry.engines, [{ engine: 'warpdom', from: '1.0.0', version: '1.0.1' }, { engine: 'jsdom', version: '30.0.0' }]);
  assert.deepEqual(entry.featured, [{ engine: 'warpdom', api: 'events', title: 'Events', from: 'supported', to: 'partial', nowPass: [], nowFail: ['a'] }]);
  let log = { description: 'd', entries: [{ date: '2026-10-12' }] };
  log = addChangelogEntry(log, entry);
  assert.equal(log.description, 'd');
  assert.deepEqual(log.entries.map((e) => e.date), ['2026-10-19', '2026-10-12']);
});

test('data/changelog.json is newest first and every entry has a date and engine versions', () => {
  const log = JSON.parse(readFileSync(new URL('../data/changelog.json', import.meta.url), 'utf8'));
  assert.ok(log.entries.length > 0);
  const dates = log.entries.map((e) => e.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
  for (const e of log.entries) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(e.engines.length > 0 && e.engines.every((x) => x.engine && x.version));
  }
});

test('the update installs every engine and the Web IDL sources', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  // Formatting and lint tools are dev dependencies the update leaves alone.
  const tools = ['eslint', 'prettier', 'typescript-eslint'];
  const sources = Object.keys(pkg.devDependencies).filter((name) => !tools.includes(name));
  assert.deepEqual([...PACKAGES].sort(), sources.sort());
  const engines = JSON.parse(readFileSync(new URL('../engines.json', import.meta.url), 'utf8'));
  for (const e of engines) assert.ok(PACKAGES.includes(e.package), e.package);
});
