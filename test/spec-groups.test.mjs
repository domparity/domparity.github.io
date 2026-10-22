import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkGroups, summarize } from '../website/scripts/coverage.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const idl = read('idl.json');
const groups = read('spec-groups.json');

test('every spec in data/idl.json is in exactly one group, and every grouped spec exists', () => {
  assert.deepEqual(checkGroups(idl, groups), { ungrouped: [], unknown: [], duplicated: [] });
});

test('groups have an id, a title and a reason; "Test DOM core" comes first (the default)', () => {
  assert.deepEqual(
    groups.groups.map((g) => g.id),
    ['core', 'rendering', 'media', 'platform', 'other'],
  );
  assert.equal(groups.groups[0].title, 'Test DOM core');
  for (const g of groups.groups) {
    assert.ok(g.title && g.reason.length > 40, g.id);
    assert.ok(g.specs.length > 0, g.id);
  }
});

test('the core group has the specs unit tests rely on, and none of the graphics or device ones', () => {
  const core = new Set(groups.groups[0].specs);
  for (const id of [
    'dom',
    'html',
    'cssom',
    'cssom-view',
    'uievents',
    'pointerevents',
    'url',
    'fetch',
    'xhr',
    'SVG',
    'wai-aria',
  ])
    assert.ok(core.has(id), id);
  for (const id of ['webgl1', 'webgl2', 'webgpu', 'webaudio', 'webrtc', 'payment-request', 'usb', 'notifications'])
    assert.ok(!core.has(id), id);
});

test('group totals add up to the totals over all specs', () => {
  const s = summarize(idl, groups);
  for (const key of ['specs', 'interfaces', 'members']) {
    assert.equal(
      s.groups.reduce((n, g) => n + g[key], 0),
      s.totals[key],
      key,
    );
  }
  s.engines.forEach((_, i) => {
    assert.equal(
      s.groups.reduce((n, g) => n + g.membersPresent[i], 0),
      s.totals.membersPresent[i],
    );
  });
  assert.ok(s.specs.every((spec) => spec.group));
});
