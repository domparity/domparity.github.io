import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarize,
  specPage,
  interfacePage,
  searchRows,
  specPath,
  interfacePath,
  memberAnchor,
} from '../website/scripts/coverage.mjs';

const idl = {
  date: '2026-10-17T00:00:00.000Z',
  node: 'v22.23.3',
  webref: { version: '1' },
  browserSpecs: { version: '2' },
  engines: [
    { key: 'a@1', engine: 'a', version: '1' },
    { key: 'b@2', engine: 'b', version: '2' },
  ],
  specs: {
    dom: {
      title: 'DOM',
      url: 'https://dom/',
      interfaces: {
        Node: { kind: 'interface', status: 'PN', members: [['appendChild', 'o', '11']] },
        Element: {
          kind: 'interface',
          inherits: 'Node',
          status: 'P-',
          ctor: { 'a@1': 'TypeError: Illegal constructor' },
          members: [
            ['closest', 'o', '10'],
            ['id', 'a', '10'],
          ],
        },
      },
    },
    'CSSOM-View': {
      title: 'CSSOM View',
      url: null,
      interfaces: { Element: { members: [['scrollIntoView', 'o', '10']] } },
    },
    webgl: {
      title: 'WebGL',
      url: null,
      interfaces: { WebGLThing: { kind: 'interface', status: '--', members: [['draw', 'o', '00']] } },
    },
  },
};

test('summary: totals per engine; members count in the spec that defines them', () => {
  const s = summarize(idl);
  assert.deepEqual(s.totals, {
    specs: 3,
    interfaces: 3,
    members: 5,
    interfacesPresent: [2, 1],
    membersPresent: [4, 1],
    nodeGlobals: [0, 1],
    stubs: [0, 0],
  });
  const view = s.specs.find((x) => x.id === 'CSSOM-View');
  assert.deepEqual(view, {
    id: 'CSSOM-View',
    slug: 'cssom-view',
    title: 'CSSOM View',
    url: null,
    group: null,
    interfaces: 0,
    members: 1,
    interfacesPresent: [0, 0],
    membersPresent: [1, 0],
  });
  assert.equal(s.specs[0].id, 'dom');
});

test('summary and spec pages by group', () => {
  const groups = {
    groups: [
      { id: 'core', title: 'Core', reason: 'r', specs: ['dom', 'CSSOM-View'] },
      { id: 'gfx', title: 'Graphics', reason: 'r', specs: ['webgl'] },
    ],
  };
  const s = summarize(idl, groups);
  assert.deepEqual(
    s.groups.map((g) => [g.id, g.specs, g.interfaces, g.members, g.membersPresent]),
    [
      ['core', 2, 2, 4, [4, 1]],
      ['gfx', 1, 1, 1, [0, 0]],
    ],
  );
  assert.equal(s.specs.find((x) => x.id === 'webgl').group, 'gfx');
  assert.equal(specPage(idl, 'webgl', groups).group, 'Graphics');
  assert.equal(specPage(idl, 'webgl').group, null);
});

test('spec page: interfaces defined here and partials added to interfaces from elsewhere', () => {
  const p = specPage(idl, 'CSSOM-View');
  assert.equal(p.interfaces.length, 1);
  assert.deepEqual(p.interfaces[0], {
    name: 'Element',
    definedHere: false,
    definedIn: 'dom',
    definedInTitle: 'DOM',
    kind: 'interface',
    status: null,
    members: [['scrollIntoView', 'o', '10']],
    membersPresent: [1, 0],
  });
  const dom = specPage(idl, 'dom');
  assert.deepEqual(
    dom.interfaces.map((i) => i.name),
    ['Element', 'Node'],
  );
  assert.deepEqual(dom.totals, { interfaces: 2, members: 3, interfacesPresent: [2, 1], membersPresent: [3, 1] });
});

test('interface page: members from every spec, the defining spec first, inheritance both ways', () => {
  const p = interfacePage(idl, 'Element');
  assert.deepEqual(
    p.groups.map((g) => g.spec.id),
    ['dom', 'CSSOM-View'],
  );
  assert.deepEqual(p.chain, [{ name: 'Node', linked: true }]);
  assert.deepEqual(interfacePage(idl, 'Node').children, ['Element']);
  assert.equal(p.ctor['a@1'], 'TypeError: Illegal constructor');
  assert.equal(p.status, 'P-');
});

test('search rows, paths and anchors', () => {
  const rows = searchRows(idl);
  assert.deepEqual(rows[0], ['Node', '', 'dom', 'PN']);
  assert.ok(rows.some((r) => r[0] === 'Element' && r[1] === 'scrollIntoView' && r[2] === 'CSSOM-View'));
  assert.equal(rows.length, 3 + 5);
  assert.equal(specPath('CSSOM-View'), '/coverage/spec/cssom-view');
  assert.equal(interfacePath('Element'), '/coverage/interface/Element');
  assert.equal(memberAnchor('@@iterator'), 'm-__iterator');
});
