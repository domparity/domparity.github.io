import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordedVersions, changedEngines, pendingVersions, installSpecs, ENGINE_PACKAGES, PACKAGES } from '../scripts/update.mjs';

const engines = [
  { engine: 'warpdom', package: 'warpdom' },
  { engine: 'jsdom', package: 'jsdom' },
];

const data = (warpdom, jsdom, { idlWarpdom = warpdom } = {}) => ({
  results: { engines: [{ engine: 'warpdom', package: 'warpdom', version: warpdom }, { engine: 'jsdom', package: 'jsdom', version: jsdom }] },
  idl: { engines: [{ engine: 'warpdom', version: idlWarpdom }, { engine: 'jsdom', version: jsdom }] },
  devDependencies: { warpdom, jsdom, '@webref/idl': '3.0.0' },
});

test('check: nothing changed when every engine is at its latest version', () => {
  const rec = recordedVersions(data('1.0.0', '30.0.0'), engines);
  assert.deepEqual(changedEngines(rec, { warpdom: '1.0.0', jsdom: '30.0.0' }), []);
});

test('check: reports only the engines with a new version', () => {
  const rec = recordedVersions(data('1.0.0', '30.0.0'), engines);
  assert.deepEqual(changedEngines(rec, { warpdom: '1.0.1', jsdom: '30.0.0' }), [{ package: 'warpdom', from: '1.0.0', to: '1.0.1' }]);
});

test('check: data that disagrees between results.json and idl.json counts as changed', () => {
  const rec = recordedVersions(data('1.0.1', '30.0.0', { idlWarpdom: '1.0.0' }), engines);
  assert.deepEqual(changedEngines(rec, { warpdom: '1.0.1', jsdom: '30.0.0' }), [{ package: 'warpdom', from: '1.0.1, 1.0.0', to: '1.0.1' }]);
});

test('check: a new engine with no data yet counts as changed', () => {
  const rec = recordedVersions(data('1.0.0', '30.0.0'), [...engines, { engine: 'linkedom', package: 'linkedom' }]);
  assert.deepEqual(changedEngines(rec, { warpdom: '1.0.0', jsdom: '30.0.0', linkedom: '0.18.0' }), [{ package: 'linkedom', from: null, to: '0.18.0' }]);
});

test('engines-only installs the latest engines and keeps the Web IDL sources', () => {
  assert.deepEqual(installSpecs({ enginesOnly: true }), ENGINE_PACKAGES.map((p) => `${p}@latest`));
  assert.deepEqual(installSpecs(), PACKAGES.map((p) => `${p}@latest`));
  assert.ok(!installSpecs({ enginesOnly: true }).some((s) => /webref|browser-specs|webidl2/.test(s)));
});

test('pending versions from an unmerged update branch are kept unless main changed them', () => {
  const base = { warpdom: '1.0.0', '@webref/idl': '3.0.0', 'browser-specs': '5.0.0', webidl2: '24.0.0' };
  const branch = { warpdom: '1.0.1', '@webref/idl': '3.1.0', 'browser-specs': '5.1.0', webidl2: '24.0.0' };
  const main = { warpdom: '1.0.0', '@webref/idl': '3.0.0', 'browser-specs': '5.2.0', webidl2: '24.0.0' };
  const pending = pendingVersions({ base, branch, main });
  assert.deepEqual(pending, { warpdom: '1.0.1', '@webref/idl': '3.1.0' });
  // Engines are installed at latest anyway; the Web IDL source keeps its pending version.
  assert.deepEqual(installSpecs({ enginesOnly: true, pending }), ['@webref/idl@3.1.0', ...ENGINE_PACKAGES.map((p) => `${p}@latest`)]);
  // A full update installs everything at latest; nothing is pinned.
  assert.deepEqual(installSpecs({ pending }), PACKAGES.map((p) => `${p}@latest`));
});

test('no pending versions when the branch is already merged into main', () => {
  const v = { warpdom: '1.0.1', '@webref/idl': '3.1.0' };
  assert.deepEqual(pendingVersions({ base: v, branch: v, main: v }), {});
});

test('an update rebuilt from main adds one changelog entry describing the whole change', async () => {
  const { diffData, changelogEntry } = await import('../scripts/diff-data.mjs');
  const { addChangelogEntry } = await import('../scripts/update.mjs');
  const main = data('1.0.0', '30.0.0');
  const mainLog = { entries: [{ date: '2026-10-12' }] };
  // First run: warpdom 1.0.1. Second run, before the merge: jsdom 30.0.1 too.
  // Each run starts from main's data and changelog, so the second replaces the first.
  let log;
  for (const [w, j, date] of [['1.0.1', '30.0.0', '2026-10-18'], ['1.0.1', '30.0.1', '2026-10-19']]) {
    log = addChangelogEntry(mainLog, changelogEntry(diffData({ old: main, new: data(w, j), groups: {} }), { date }));
  }
  assert.deepEqual(log.entries.map((e) => e.date), ['2026-10-19', '2026-10-12']);
  assert.deepEqual(log.entries[0].engines, [{ engine: 'warpdom', from: '1.0.0', version: '1.0.1' }, { engine: 'jsdom', from: '30.0.0', version: '30.0.1' }]);
});
