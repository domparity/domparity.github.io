// Turns data/idl.json (the existence pass) into what the Coverage pages show:
// a summary (per engine, per spec), one page model per spec and one per
// interface. Pure functions, used by generate.mjs and plugins/coverage.mjs.

// Interface codes that count as "present".
export const PRESENT = new Set(['P', 'N', 'S']);

export const specSlug = (id) => id.toLowerCase();
export const specPath = (id) => `/coverage/spec/${specSlug(id)}`;
export const interfacePath = (name) => `/coverage/interface/${name}`;
export const memberAnchor = (name) => `m-${name.replace(/[^A-Za-z0-9_-]/g, '_')}`;

const engineList = (idl) => idl.engines.map(({ key, engine, version }) => ({ key, engine, version }));

function count(codesList, n, isPresent) {
  const out = Array(n).fill(0);
  for (const codes of codesList) for (let i = 0; i < n; i++) if (isPresent(codes[i])) out[i]++;
  return out;
}

const memberCodes = (iface) => (iface.members ?? []).map((m) => m[2]);
const ifacePresent = (c) => PRESENT.has(c);
const memberPresent = (c) => c === '1';

// Spec shortname -> group id, from data/spec-groups.json.
export function groupIndex(groups) {
  const index = {};
  for (const g of groups?.groups ?? []) for (const id of g.specs) index[id] = g.id;
  return index;
}

// Specs in data/idl.json without a group, and grouped specs that are not in
// it (or are in two groups). Both lists are empty when the file is complete.
export function checkGroups(idl, groups) {
  const seen = new Map();
  for (const g of groups.groups) for (const id of g.specs) seen.set(id, [...(seen.get(id) ?? []), g.id]);
  return {
    ungrouped: Object.keys(idl.specs).filter((id) => !seen.has(id)),
    unknown: [...seen.keys()].filter((id) => !(id in idl.specs)),
    duplicated: [...seen].filter(([, g]) => g.length > 1).map(([id]) => id),
  };
}

function tally(specs, n) {
  let ifaces = [];
  let members = [];
  for (const spec of specs) {
    const list = Object.values(spec.interfaces);
    ifaces = ifaces.concat(list.filter((i) => i.status).map((i) => i.status));
    members = members.concat(list.flatMap(memberCodes));
  }
  return {
    specs: specs.length,
    interfaces: ifaces.length,
    members: members.length,
    interfacesPresent: count(ifaces, n, ifacePresent),
    membersPresent: count(members, n, memberPresent),
    nodeGlobals: count(ifaces, n, (c) => c === 'N'),
    stubs: count(ifaces, n, (c) => c === 'S'),
  };
}

// Overall, per-group and per-spec counts. Members are counted in the spec that
// defines them; an interface is counted in the spec that defines it (not its
// partials). `groups` is data/spec-groups.json.
export function summarize(idl, groups = { groups: [] }) {
  const n = idl.engines.length;
  const groupOf = groupIndex(groups);
  const specs = [];
  for (const [id, spec] of Object.entries(idl.specs)) {
    const t = tally([spec], n);
    specs.push({
      id,
      slug: specSlug(id),
      title: spec.title,
      url: spec.url,
      group: groupOf[id] ?? null,
      interfaces: t.interfaces,
      members: t.members,
      interfacesPresent: t.interfacesPresent,
      membersPresent: t.membersPresent,
    });
  }
  specs.sort((a, b) => b.members - a.members || a.title.localeCompare(b.title));
  return {
    date: idl.date,
    node: idl.node,
    webref: idl.webref,
    browserSpecs: idl.browserSpecs,
    engines: engineList(idl),
    totals: tally(Object.values(idl.specs), n),
    groups: groups.groups.map((g) => ({
      id: g.id,
      title: g.title,
      reason: g.reason,
      ...tally(
        g.specs.filter((id) => id in idl.specs).map((id) => idl.specs[id]),
        n,
      ),
    })),
    specs,
  };
}

// Where each interface is defined (spec id), for links and inheritance chains.
export function interfaceIndex(idl) {
  const index = {};
  for (const [id, spec] of Object.entries(idl.specs)) {
    for (const [name, iface] of Object.entries(spec.interfaces))
      if (iface.status) index[name] = { spec: id, inherits: iface.inherits ?? null, kind: iface.kind };
  }
  return index;
}

export function specPage(idl, id, groups = { groups: [] }) {
  const spec = idl.specs[id];
  const n = idl.engines.length;
  const index = interfaceIndex(idl);
  const interfaces = Object.entries(spec.interfaces)
    .map(([name, i]) => ({
      name,
      definedHere: !!i.status,
      definedIn: i.status ? null : (index[name]?.spec ?? null),
      definedInTitle: i.status ? null : (idl.specs[index[name]?.spec]?.title ?? null),
      kind: i.kind ?? index[name]?.kind ?? 'interface',
      status: i.status ?? null,
      members: i.members ?? [],
      membersPresent: count(memberCodes(i), n, memberPresent),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const members = interfaces.flatMap((i) => i.members.map((m) => m[2]));
  return {
    engines: engineList(idl),
    date: idl.date,
    spec: { id, title: spec.title, url: spec.url },
    group: groups.groups.find((g) => g.specs.includes(id))?.title ?? null,
    totals: {
      interfaces: interfaces.filter((i) => i.definedHere).length,
      members: members.length,
      interfacesPresent: count(
        interfaces.filter((i) => i.status).map((i) => i.status),
        n,
        ifacePresent,
      ),
      membersPresent: count(members, n, memberPresent),
    },
    interfaces,
  };
}

export function interfacePage(idl, name) {
  const index = interfaceIndex(idl);
  const own = index[name];
  const def = idl.specs[own.spec].interfaces[name];
  const chain = [];
  for (let p = own.inherits; p && chain.length < 20; p = index[p]?.inherits)
    chain.push({ name: p, linked: !!index[p] });
  const groups = [];
  for (const [id, spec] of Object.entries(idl.specs)) {
    const members = spec.interfaces[name]?.members;
    if (members?.length) groups.push({ spec: { id, title: spec.title, url: spec.url }, members });
  }
  // The defining spec first, then the others by title.
  groups.sort((a, b) =>
    a.spec.id === own.spec ? -1 : b.spec.id === own.spec ? 1 : a.spec.title.localeCompare(b.spec.title),
  );
  const children = Object.entries(index)
    .filter(([, v]) => v.inherits === name)
    .map(([k]) => k)
    .sort();
  return {
    engines: engineList(idl),
    date: idl.date,
    webref: idl.webref,
    name,
    kind: own.kind,
    spec: { id: own.spec, title: idl.specs[own.spec].title, url: idl.specs[own.spec].url },
    status: def.status,
    ctor: def.ctor ?? null,
    chain,
    children,
    groups,
  };
}

// Flat rows for client-side search: [interface, member or "", spec id, codes].
export function searchRows(idl) {
  const rows = [];
  for (const [id, spec] of Object.entries(idl.specs)) {
    for (const [name, i] of Object.entries(spec.interfaces)) {
      if (i.status) rows.push([name, '', id, i.status]);
      for (const [m, , codes] of i.members ?? []) rows.push([name, m, id, codes]);
    }
  }
  return rows;
}
