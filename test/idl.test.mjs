import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'webidl2';
import { buildPlan, probeWindow, interfaceCode, buildIdlData, formatIdlData, memberEntries, specMetaFrom } from '../src/idl.mjs';

const parsed = {
  dom: parse(`
    [Exposed=*] interface EventTarget { constructor(); undefined addEventListener(DOMString type, EventListener? cb); };
    [Exposed=Window] interface Node : EventTarget {
      const unsigned short ELEMENT_NODE = 1;
      readonly attribute DOMString nodeName;
      Node appendChild(Node node);
      Node appendChild(Node node, boolean twice);
    };
    [Exposed=Window] interface Element : Node { DOMString? getAttribute(DOMString name); };
    interface mixin ParentNode { readonly attribute unsigned long childElementCount; };
    Element includes ParentNode;
    [Exposed=Window] interface NodeList { getter Node? item(unsigned long index); iterable<Node>; };
    [Exposed=Worker] interface WorkerOnly { attribute long x; };
    [Exposed=Window, LegacyNoInterfaceObject] interface Hidden { attribute long y; };
    [Exposed=Window] interface Event { constructor(DOMString type); [LegacyUnforgeable] readonly attribute boolean isTrusted; };
    [Exposed=Window] callback interface NodeFilter { const unsigned short FILTER_ACCEPT = 1; unsigned short acceptNode(Node n); };
    callback interface NoConstants { undefined handleEvent(Event e); };
  `),
  html: parse(`
    [Global=Window, Exposed=Window] interface Window : EventTarget { readonly attribute Window self; };
    interface mixin GlobalEventHandlers { attribute EventHandler onclick; };
    Window includes GlobalEventHandlers;
    [Exposed=Window] interface HTMLElement : Element { [HTMLConstructor] constructor(); attribute DOMString title; };
    partial interface Element { [Exposed=Worker] attribute long workerThing; };
    [Exposed=(Window,Worker)] namespace CSS { boolean supports(DOMString c); };
    [Exposed=Window] interface URL { constructor(USVString url); static boolean canParse(USVString url); stringifier attribute USVString href; };
  `),
  cssom: parse(`partial interface Element { undefined scrollTo(); }; partial interface mixin ParentNode { undefined fancy(); };`),
};

const plan = buildPlan(parsed);
const byName = Object.fromEntries(plan.interfaces.map((i) => [i.name, i]));
const names = (i) => byName[i].members.map((m) => `${m.kind}:${m.name}@${m.spec}`);

test('the plan keeps what is exposed on Window and drops the rest', () => {
  assert.deepEqual(Object.keys(byName).sort(), ['CSS', 'Element', 'Event', 'EventTarget', 'HTMLElement', 'Node', 'NodeFilter', 'NodeList', 'URL', 'Window']);
  assert.equal(byName.CSS.kind, 'namespace');
  assert.equal(byName.NodeFilter.kind, 'callback');
  assert.deepEqual(Object.keys(plan.specs), ['cssom', 'dom', 'html']);
});

test('members come from partials and mixins, each attributed to the spec that defines it', () => {
  assert.deepEqual(names('Element'), ['o:getAttribute@dom', 'o:scrollTo@cssom', 'o:fancy@cssom', 'a:childElementCount@dom']);
  assert.equal(byName.Element.inherits, 'Node');
  assert.equal(byName.Element.spec, 'dom');
});

test('overloads count once; constants and statics are looked up on the interface object', () => {
  assert.deepEqual(names('Node'), ['c:ELEMENT_NODE@dom', 'a:nodeName@dom', 'o:appendChild@dom']);
  assert.equal(byName.Node.members[0].on, 'object');
  assert.equal(byName.Node.members[1].on, 'proto');
  assert.deepEqual(byName.URL.members.map((m) => `${m.kind}:${m.name}:${m.on}`), ['so:canParse:object', 'a:href:proto', 'o:toString:proto']);
});

test('iterable declarations add their methods; anonymous getters add nothing', () => {
  assert.deepEqual(names('NodeList'), ['o:item@dom', 'i:entries@dom', 'i:keys@dom', 'i:values@dom', 'i:forEach@dom', 'i:@@iterator@dom']);
  assert.deepEqual(memberEntries({ type: 'operation', name: '', special: 'getter' }), []);
  assert.deepEqual(memberEntries({ type: 'setlike', readonly: true }).map((e) => e.name), ['size', 'entries', 'forEach', 'has', 'keys', 'values', '@@iterator']);
});

test("Window's own members are looked up on the window itself", () => {
  assert.equal(byName.Window.global, true);
  assert.deepEqual(byName.Window.members.map((m) => `${m.name}:${m.on}`), ['self:global', 'onclick:global']);
});

test('constructors: no-argument ones are tried, [HTMLConstructor] and required arguments are not', () => {
  assert.deepEqual(byName.EventTarget.ctor, { noArgs: true });
  assert.deepEqual(byName.Event.ctor, { noArgs: false });
  assert.equal(byName.HTMLElement.ctor, null);
  assert.equal(byName.Event.members[0].unforgeable, true);
});

test('interface codes', () => {
  assert.equal(interfaceCode({ defined: false }), '-');
  assert.equal(interfaceCode({ defined: true }), 'P');
  assert.equal(interfaceCode({ defined: true, sameAsNode: true }), 'N');
  assert.equal(interfaceCode({ defined: true, notImplemented: true }), 'S');
});

// A fake engine window: some interfaces, a Node.js global, a stub constructor
// that logs "not implemented", and an unforgeable member on instances only.
function fakeWindow() {
  class EventTarget {
    constructor() {
      logs.push('Not implemented: EventTarget');
    }
    addEventListener() {}
  }
  class Node extends EventTarget {
    appendChild() {}
    get nodeName() {
      throw new Error('getters must not be called');
    }
  }
  Node.ELEMENT_NODE = 1;
  class Element extends Node {
    getAttribute() {}
  }
  class Event {
    constructor() {
      this.isTrusted = false;
    }
  }
  const nodeGlobal = { URL: class URL {} };
  const logs = [];
  const window = { EventTarget, Node, Element, Event, URL: nodeGlobal.URL, self: null, CSS: { supports() {} } };
  window.self = window;
  return { window, nodeGlobal, logs };
}

test('probing a window: present, missing, Node.js globals, stubs and unforgeable members', () => {
  const { window, nodeGlobal, logs } = fakeWindow();
  const r = probeWindow(window, plan, {
    nodeGlobal,
    isNotImplemented: (t) => typeof t === 'string' && /not implemented/i.test(t),
    captureLogs(fn) {
      logs.length = 0;
      fn();
      return [...logs];
    },
  });
  assert.equal(r.EventTarget.code, 'S');
  assert.equal(r.EventTarget.ctorError, 'Not implemented: EventTarget');
  assert.deepEqual(r.Node, { code: 'P', members: '111' });
  assert.deepEqual(r.Element, { code: 'P', members: '1000' });
  assert.equal(r.Event.members, '1');
  assert.equal(r.URL.code, 'N');
  assert.equal(r.URL.members, '000');
  assert.equal(r.HTMLElement.code, '-');
  assert.equal(r.HTMLElement.members, '0');
  assert.deepEqual(r.Window, { code: '-', members: '10' });
  assert.deepEqual(r.CSS, { code: 'P', members: '1' });
});

test('a window that answers reads but not `in` (a proxy) still has its members', () => {
  const { window, nodeGlobal } = fakeWindow();
  const proxy = new Proxy(window, { has: () => false });
  const r = probeWindow(proxy, plan, { nodeGlobal, construct: false });
  assert.equal(r.Window.members, '10');
  assert.equal(r.CSS.members, '1');
});

test('data/idl.json groups by spec, then interface, with one code per engine', () => {
  const { window, nodeGlobal } = fakeWindow();
  const raw = [
    { engine: 'a', version: '1.0.0', results: probeWindow(window, plan, { nodeGlobal, construct: false }) },
    { engine: 'b', version: null, crashed: 'boom', results: {} },
  ];
  const data = buildIdlData({ plan, raw, date: 'd', node: 'v22', webref: { version: '1' }, browserSpecs: { version: '2' } });
  assert.deepEqual(data.engines.map((e) => e.key), ['a@1.0.0', 'b@unknown']);
  const el = data.specs.dom.interfaces.Element;
  assert.equal(el.status, 'P?');
  assert.equal(el.inherits, 'Node');
  assert.deepEqual(el.members, [['getAttribute', 'o', '1?'], ['childElementCount', 'a', '0?']]);
  assert.deepEqual(data.specs.cssom.interfaces.Element, { members: [['scrollTo', 'o', '0?'], ['fancy', 'o', '0?']] });
  assert.equal(data.specs.cssom.interfaces.Element.status, undefined);
  const text = formatIdlData(data);
  assert.deepEqual(JSON.parse(text), data);
  assert.ok(text.includes('["getAttribute", "o", "1?"]'));
});

test('spec titles come from browser-specs, by shortname, series or alias', () => {
  const meta = specMetaFrom([
    { shortname: 'dom', title: 'DOM Standard', nightly: { url: 'https://dom.spec.whatwg.org/' }, organization: 'WHATWG', series: { shortname: 'dom' } },
    { shortname: 'css-foo-2', title: 'CSS Foo 2', url: 'https://x/', series: { shortname: 'css-foo' } },
    { shortname: 'webusb', title: 'WebUSB', url: 'https://u/' },
  ]);
  assert.equal(meta('dom').title, 'DOM Standard');
  assert.equal(meta('css-foo').url, 'https://x/');
  assert.equal(meta('usb').title, 'WebUSB');
  assert.deepEqual(meta('nope'), { title: 'nope', url: null, org: null });
});
