// Builds the plan for the automatic existence pass from Web IDL (@webref/idl):
// every interface and namespace exposed on Window, and every attribute,
// operation and constant on it, each attributed to the spec that defines it.
//
// The plan is plain data so the child process that probes one engine can read
// it from a file:
//
//   { specs: { <shortname>: { title, url } },
//     interfaces: [{ name, kind, spec, inherits, global, ctor, members: [
//       { name, kind, spec, on, unforgeable }
//     ] }] }
//
// member.kind: a(ttribute), o(peration), c(onstant), sa (static attribute),
// so (static operation), i (iterable/maplike/setlike member).
// member.on: where to look for it: "proto" (the interface prototype object,
// which covers the prototype chain), "object" (the interface or namespace
// object itself: constants, static members, namespace members) or "global"
// (the window itself, for Window's own members).

import { orderEngines } from './order.mjs';

export function extAttr(node, name) {
  return node.extAttrs?.find((a) => a.name === name) ?? null;
}

// The set of global names an [Exposed] extended attribute lists, "*" for all,
// or null when there is none.
export function exposure(node) {
  const a = extAttr(node, 'Exposed');
  if (!a || !a.rhs) return null;
  if (a.rhs.type === '*') return '*';
  if (a.rhs.type === 'identifier') return new Set([a.rhs.value]);
  if (a.rhs.type === 'identifier-list') return new Set(a.rhs.value.map((v) => v.value));
  return null;
}

export const onWindow = (exp) => exp === '*' || (exp instanceof Set && exp.has('Window'));

// Members that iterable<>, maplike<> and setlike<> declarations add.
export function declarationMembers(m) {
  if (m.type === 'iterable') {
    return m.async ? ['values', '@@asyncIterator'] : ['entries', 'keys', 'values', 'forEach', '@@iterator'];
  }
  if (m.type === 'async_iterable') return ['values', '@@asyncIterator'];
  if (m.type === 'maplike') {
    return [
      'size',
      'entries',
      'forEach',
      'get',
      'has',
      'keys',
      'values',
      '@@iterator',
      ...(m.readonly ? [] : ['set', 'delete', 'clear']),
    ];
  }
  if (m.type === 'setlike') {
    return [
      'size',
      'entries',
      'forEach',
      'has',
      'keys',
      'values',
      '@@iterator',
      ...(m.readonly ? [] : ['add', 'delete', 'clear']),
    ];
  }
  return [];
}

// The members (name + kind) one IDL member contributes; [] for anonymous
// special operations (indexed/named getters and setters), which add no
// property.
export function memberEntries(m) {
  if (m.type === 'const') return [{ name: m.name, kind: 'c' }];
  if (m.type === 'attribute') {
    const kind = m.special === 'static' ? 'sa' : 'a';
    return [{ name: m.name, kind }, ...(m.special === 'stringifier' ? [{ name: 'toString', kind: 'o' }] : [])];
  }
  if (m.type === 'operation') {
    if (m.special === 'stringifier') return [{ name: m.name || 'toString', kind: 'o' }];
    if (!m.name) return [];
    return [{ name: m.name, kind: m.special === 'static' ? 'so' : 'o' }];
  }
  return declarationMembers(m).map((name) => ({ name, kind: 'i' }));
}

// Whether a constructor exists in the IDL and can be called with no arguments.
function constructorInfo(defs) {
  // [HTMLConstructor] constructors (HTML elements) only work for custom
  // elements defined in the registry, so they are not tried.
  const ctors = defs.flatMap((d) =>
    d.members.filter((m) => m.type === 'constructor' && !extAttr(m, 'HTMLConstructor')),
  );
  if (!ctors.length) return null;
  return { noArgs: ctors.some((c) => c.arguments.every((a) => a.optional || a.variadic)) };
}

// parsed: { <spec shortname>: webidl2 AST } (as from @webref/idl parseAll()).
// specMeta: (shortname) => { title, url }.
export function buildPlan(parsed, specMeta = (s) => ({ title: s, url: null })) {
  const mains = new Map(); // name -> { def, spec }
  const partials = new Map(); // name -> [{ def, spec }]
  const mixins = new Map(); // mixin name -> [{ def, spec }]
  const includes = new Map(); // target -> [mixin]

  for (const spec of Object.keys(parsed).sort()) {
    for (const def of parsed[spec]) {
      if (def.type === 'includes') {
        const list = includes.get(def.target) ?? [];
        if (!list.includes(def.includes)) list.push(def.includes);
        includes.set(def.target, list);
        continue;
      }
      if (def.type === 'interface mixin') {
        const list = mixins.get(def.name) ?? [];
        list.push({ def, spec });
        mixins.set(def.name, list);
        continue;
      }
      if (def.type !== 'interface' && def.type !== 'namespace' && def.type !== 'callback interface') continue;
      if (!def.partial && !mains.has(def.name)) mains.set(def.name, { def, spec });
      else {
        const list = partials.get(def.name) ?? [];
        list.push({ def, spec });
        partials.set(def.name, list);
      }
    }
  }

  const specs = {};
  const interfaces = [];
  for (const [name, { def, spec }] of [...mains].sort(([a], [b]) => a.localeCompare(b))) {
    const exp = exposure(def);
    if (!onWindow(exp)) continue;
    if (extAttr(def, 'LegacyNoInterfaceObject')) continue;
    if (def.type === 'callback interface' && !def.members.some((m) => m.type === 'const')) continue;

    const kind = def.type === 'namespace' ? 'namespace' : def.type === 'callback interface' ? 'callback' : 'interface';
    const global = extAttr(def, 'Global') && onWindow(exposure(def)) && name === 'Window';
    const members = [];
    const seen = new Set();
    const add = (m, memberSpec) => {
      if (m.type === 'constructor') return;
      const unforgeable = !!extAttr(m, 'LegacyUnforgeable');
      for (const e of memberEntries(m)) {
        const statik = e.kind === 'c' || e.kind === 'sa' || e.kind === 'so';
        const key = `${statik ? 'static ' : ''}${e.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const on = kind === 'namespace' || statik ? 'object' : global ? 'global' : 'proto';
        members.push({
          name: e.name,
          kind: e.kind,
          spec: memberSpec,
          on,
          ...(unforgeable ? { unforgeable: true } : {}),
        });
        specs[memberSpec] ??= specMeta(memberSpec);
      }
    };
    // Exposure of a member: its own [Exposed], else its container's, else the interface's.
    const exposed = (m, container) => {
      const own = exposure(m);
      if (own) return onWindow(own);
      const c = container ? exposure(container) : null;
      return c ? onWindow(c) : true;
    };

    const own = [{ def, spec }, ...(partials.get(name) ?? [])];
    for (const part of own) {
      for (const m of part.def.members) if (exposed(m, part.def)) add(m, part.spec);
    }
    for (const mixinName of includes.get(name) ?? []) {
      for (const part of mixins.get(mixinName) ?? []) {
        for (const m of part.def.members) if (exposed(m, part.def)) add(m, part.spec);
      }
    }

    specs[spec] ??= specMeta(spec);
    interfaces.push({
      name,
      kind,
      spec,
      inherits: def.inheritance ?? null,
      ...(global ? { global: true } : {}),
      ctor: kind === 'interface' ? constructorInfo(own.map((p) => p.def)) : null,
      members,
    });
  }

  const sortedSpecs = Object.fromEntries(
    Object.keys(specs)
      .sort()
      .map((s) => [s, specs[s]]),
  );
  return { specs: sortedSpecs, interfaces };
}

// Webref file names that browser-specs knows under another shortname.
const SPEC_ALIASES = {
  bluetooth: 'web-bluetooth',
  'bluetooth-scanning': 'web-bluetooth-scanning',
  hid: 'webhid',
  usb: 'webusb',
};

// Spec titles and URLs from browser-specs, by shortname or series shortname.
export function specMetaFrom(browserSpecs) {
  const by = new Map();
  for (const s of browserSpecs) {
    if (!by.has(s.shortname)) by.set(s.shortname, s);
    if (s.series?.shortname && !by.has(s.series.shortname)) by.set(s.series.shortname, s);
  }
  return (shortname) => {
    const s = by.get(shortname) ?? by.get(SPEC_ALIASES[shortname]);
    return s
      ? { title: s.title, url: s.nightly?.url ?? s.url ?? null, org: s.organization ?? null }
      : { title: shortname, url: null, org: null };
  };
}

// ---------------------------------------------------------------------------
// Probing (black box): looks things up on one engine's window.

// Interface codes: P present, N present but it is Node.js's own global (the
// very same object), S present but a stub (constructing it with no arguments
// throws or logs "not implemented"), - missing.
// Member codes: 1 present, 0 missing.
export const INTERFACE_CODES = {
  P: 'present',
  N: "present: Node.js's own global",
  S: 'present, but a stub: new X() reports "not implemented"',
  '-': 'missing',
};

export function interfaceCode({ defined, sameAsNode = false, notImplemented = false }) {
  if (!defined) return '-';
  if (notImplemented) return 'S';
  return sameAsNode ? 'N' : 'P';
}

const safe = (fn) => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

// Object.prototype and Function.prototype (of any realm) do not count: every
// object "has" toString through them.
function isBuiltinRoot(o) {
  const parent = Object.getPrototypeOf(o);
  if (parent === null) return true;
  return typeof o === 'function' && Object.getPrototypeOf(parent) === null && !Object.hasOwn(o, 'prototype');
}

function has(target, name) {
  if (target == null || (typeof target !== 'object' && typeof target !== 'function')) return false;
  const key = name === '@@iterator' ? Symbol.iterator : name === '@@asyncIterator' ? Symbol.asyncIterator : name;
  return (
    safe(() => {
      if (!(key in target)) return false;
      for (let o = target; o !== null; o = Object.getPrototypeOf(o)) {
        if (Object.getOwnPropertyDescriptor(o, key)) return !isBuiltinRoot(o);
      }
      return true; // a proxy that answers `in` without a descriptor
    }) === true
  );
}

function readable(target, name) {
  if (name.startsWith('@@')) return false;
  return safe(() => target[name] !== undefined) === true;
}

// Sample instances for [LegacyUnforgeable] members, which live on instances
// rather than on the prototype.
function sampleInstance(window, iface) {
  if (iface === 'Document') return safe(() => window.document);
  if (iface === 'Location') return safe(() => window.location);
  if (iface === 'Event') return safe(() => new window.Event('x'));
  return undefined;
}

// Checks every interface and member of the plan on `window`. `nodeGlobal` is
// the Node.js global object, to tell the engine's own objects from Node's.
// `isNotImplemented(text)` decides whether an error or log line reports a
// missing implementation; `captureLogs(fn)` runs fn and returns the console
// lines it produced (the child process captures console output).
// Returns { <interface name>: { code, members: "0101...", ctorError? } }.
export function probeWindow(
  window,
  plan,
  { nodeGlobal = globalThis, isNotImplemented = () => false, captureLogs = (fn) => (fn(), []), construct = true } = {},
) {
  const out = {};
  for (const iface of plan.interfaces) {
    const value = safe(() => window[iface.name]);
    const defined = value !== undefined && value !== null;
    const sameAsNode = defined && value === safe(() => nodeGlobal[iface.name]);
    const proto = defined && typeof value === 'function' ? safe(() => value.prototype) : undefined;
    let members = '';
    for (const m of iface.members) {
      let found = false;
      // The window and namespace objects may be proxies that answer reads but
      // not `in` (linkedom's window does), so a defined value counts too.
      // Prototype members are not read: their getters throw on the prototype.
      if (m.on === 'global') found = has(window, m.name) || readable(window, m.name);
      else if (defined && m.on === 'object') found = has(value, m.name) || readable(value, m.name);
      else if (defined) found = has(proto, m.name);
      if (!found && m.unforgeable) found = has(sampleInstance(window, iface.name), m.name);
      members += found ? '1' : '0';
    }
    const r = { code: interfaceCode({ defined, sameAsNode }), members };
    if (construct && defined && !sameAsNode && iface.ctor?.noArgs && typeof value === 'function') {
      let error = null;
      const logs = captureLogs(() => {
        try {
          new value();
        } catch (e) {
          error =
            e && e.message !== undefined
              ? `${e.name && e.name !== 'Error' ? `${e.name}: ` : ''}${e.message}`
              : String(e);
        }
      });
      const reported = isNotImplemented(error) || logs.some(isNotImplemented);
      if (error) r.ctorError = error.slice(0, 200);
      else if (reported) r.ctorError = logs.find(isNotImplemented).slice(0, 200);
      r.code = interfaceCode({ defined, sameAsNode, notImplemented: reported });
    }
    out[iface.name] = r;
  }
  return out;
}

export const IDL_SCHEMA_VERSION = 1;

// One member per line keeps diffs of data/idl.json readable.
export function formatIdlData(data) {
  return (
    JSON.stringify(data, null, 1).replace(/\[\s+("(?:[^"\\]|\\.)*"),\s+("[^"]*"),\s+("[^"]*")\s+\]/g, '[$1, $2, $3]') +
    '\n'
  );
}

// Combines the plan and each engine's raw outcome into data/idl.json:
//   specs.<shortname> = { title, url, org, interfaces: { <name>: {
//     kind, inherits,          (only in the spec that defines the interface)
//     status: "PP-N",          (one interface code per engine, same order as `engines`)
//     ctor: { <engine key>: "error text" },
//     members: [[name, kind, "1101"], ...]   (one member code per engine)
//   } } }
// "?" in a code string means the engine was not probed (it crashed).
export function buildIdlData({ plan, raw: unordered, date, node, webref, browserSpecs }) {
  const raw = orderEngines(unordered); // the site's engine order (src/order.mjs)
  const engines = raw.map((r) => ({
    key: `${r.engine}@${r.version ?? 'unknown'}`,
    engine: r.engine,
    version: r.version,
    ...(r.crashed ? { crashed: r.crashed } : {}),
  }));
  const specs = {};
  for (const [s, meta] of Object.entries(plan.specs)) specs[s] = { ...meta, interfaces: {} };
  const entry = (spec, name) => (specs[spec].interfaces[name] ??= {});

  for (const iface of plan.interfaces) {
    const outcomes = raw.map((r) => r.results?.[iface.name]);
    const own = entry(iface.spec, iface.name);
    own.kind = iface.kind;
    if (iface.inherits) own.inherits = iface.inherits;
    own.status = outcomes.map((o) => (o ? o.code : '?')).join('');
    const ctor = {};
    outcomes.forEach((o, i) => o?.ctorError && (ctor[engines[i].key] = o.ctorError));
    if (Object.keys(ctor).length) own.ctor = ctor;
    iface.members.forEach((m, j) => {
      const e = entry(m.spec, iface.name);
      (e.members ??= []).push([m.name, m.kind, outcomes.map((o) => (o ? (o.members[j] ?? '?') : '?')).join('')]);
    });
  }
  // Specs whose IDL adds nothing exposed on Window are dropped by the plan already.
  return {
    schema: IDL_SCHEMA_VERSION,
    license: 'CC BY 4.0',
    date,
    node,
    webref,
    browserSpecs,
    engines,
    codes: {
      interface: { ...INTERFACE_CODES, '?': 'not probed' },
      member: { 1: 'present', 0: 'missing', '?': 'not probed' },
    },
    memberKinds: {
      a: 'attribute',
      o: 'operation',
      c: 'constant',
      sa: 'static attribute',
      so: 'static operation',
      i: 'iterable, maplike or setlike member',
    },
    note: 'Existence only: present means the name is defined where Web IDL puts it, not that it behaves as the standard says.',
    specs,
  };
}
