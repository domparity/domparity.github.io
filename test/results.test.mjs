import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildResults, SCHEMA_VERSION } from '../src/results.mjs';

const probes = [
  {
    id: 'thing',
    title: 'thing()',
    summary: 'Does a thing.',
    spec: 'https://example.org/#thing',
    global: 'thing',
    checks: [
      { id: 'one', description: 'One.', spec: 'https://example.org/#one', run() {} },
      { id: 'two', description: 'Two.', spec: 'https://example.org/#two', run() {} },
    ],
  },
];

const raw = [
  {
    engine: 'jsdom',
    package: 'jsdom',
    version: '30.1.3',
    results: {
      thing: {
        exists: true,
        sameAsNode: true,
        error: null,
        checks: [
          { id: 'one', pass: true, error: null, notImplemented: false },
          { id: 'two', pass: false, error: 'two: expected 1, got 2', notImplemented: false },
        ],
      },
    },
  },
  { engine: 'jsdom', package: 'jsdom29', version: '29.0.0', results: { thing: { exists: false, checks: [], error: null } } },
  { engine: 'linkedom', package: 'linkedom', version: null, crashed: 'boom', results: {} },
];

const out = buildResults({ probes, raw, setups: { jsdom: 'new JSDOM()' }, date: '2026-10-17T00:00:00.000Z', node: 'v22.23.3' });

test('engines are keyed by engine and version, so versions can sit side by side', () => {
  assert.equal(out.schema, SCHEMA_VERSION);
  assert.deepEqual(out.engines.map((e) => e.key), ['jsdom@30.1.3', 'jsdom@29.0.0', 'linkedom@unknown']);
  assert.equal(out.engines[0].setup, 'new JSDOM()');
  assert.equal(out.engines[2].crashed, 'boom');
});

test('per-engine results carry status, passed and failed checks with their error text', () => {
  const r = out.results.thing['jsdom@30.1.3'];
  assert.equal(r.status, 'partial');
  assert.deepEqual(r.passed, ['one']);
  assert.deepEqual(r.failed, [{ id: 'two', error: 'two: expected 1, got 2' }]);
  assert.equal(r.sameAsNode, true);
  assert.equal(out.results.thing['jsdom@29.0.0'].status, 'missing');
});

test('an engine that crashed is reported as missing with the reason', () => {
  assert.deepEqual(out.results.thing['linkedom@unknown'], {
    status: 'missing', exists: false, passed: [], failed: [], error: 'engine crashed',
  });
});

test('API metadata keeps the checks without their code', () => {
  assert.deepEqual(out.apis[0].checks[0], { id: 'one', description: 'One.', spec: 'https://example.org/#one' });
  assert.equal(out.apis[0].existsDescription, 'typeof window.thing is defined.');
});
