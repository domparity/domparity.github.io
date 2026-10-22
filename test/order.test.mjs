import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAINTAINER_ENGINE, compareEngineNames, orderEngines } from '../src/order.mjs';
import { buildResults } from '../src/results.mjs';
import { buildIdlData } from '../src/idl.mjs';

const EXPECTED = ['warpdom', 'happy-dom', 'jsdom', 'linkedom'];
const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));

test("the maintainer's engine first, then alphabetical", () => {
  assert.equal(MAINTAINER_ENGINE, 'warpdom');
  assert.deepEqual(['linkedom', 'jsdom', 'warpdom', 'happy-dom'].sort(compareEngineNames), EXPECTED);
  assert.deepEqual(['b', 'a', 'warpdom'].sort(compareEngineNames), ['warpdom', 'a', 'b']);
});

test('several versions of one engine keep their given order', () => {
  const list = [
    { engine: 'jsdom', v: 30 },
    { engine: 'warpdom', v: 1 },
    { engine: 'jsdom', v: 29 },
  ];
  assert.deepEqual(
    orderEngines(list).map((e) => `${e.engine}${e.v}`),
    ['warpdom1', 'jsdom30', 'jsdom29'],
  );
});

test('generated data is in that order whatever order the engines ran in', () => {
  const raw = ['linkedom', 'jsdom', 'warpdom', 'happy-dom'].map((engine) => ({
    engine,
    package: engine,
    version: '1',
    results: {},
  }));
  const results = buildResults({ probes: [], raw, setups: {}, date: 'd', node: 'v22' });
  assert.deepEqual(
    results.engines.map((e) => e.engine),
    EXPECTED,
  );
  const plan = {
    specs: { s: { title: 'S', url: null } },
    interfaces: [{ name: 'X', kind: 'interface', spec: 's', members: [{ name: 'm', kind: 'a', spec: 's' }] }],
  };
  const codes = { linkedom: '-', jsdom: 'P', warpdom: 'N', 'happy-dom': 'S' };
  const idlRaw = raw.map((r) => ({
    ...r,
    results: { X: { code: codes[r.engine], members: r.engine === 'warpdom' ? '1' : '0' } },
  }));
  const idl = buildIdlData({ plan, raw: idlRaw, date: 'd', node: 'v22', webref: {}, browserSpecs: {} });
  assert.deepEqual(
    idl.engines.map((e) => e.engine),
    EXPECTED,
  );
  assert.equal(idl.specs.s.interfaces.X.status, 'NSP-');
  assert.deepEqual(idl.specs.s.interfaces.X.members, [['m', 'a', '1000']]);
});

test('the committed engine list and data files are in that order', () => {
  assert.deepEqual(
    read('engines.json').map((e) => e.engine),
    EXPECTED,
  );
  assert.deepEqual(
    read('data/results.json').engines.map((e) => e.engine),
    EXPECTED,
  );
  assert.deepEqual(
    read('data/idl.json').engines.map((e) => e.engine),
    EXPECTED,
  );
  assert.deepEqual(Object.keys(read('data/wpt.json').engines), EXPECTED);
  for (const r of Object.values(read('data/results.json').results)) {
    assert.deepEqual(
      Object.keys(r).map((k) => k.split('@')[0]),
      EXPECTED,
    );
  }
});
