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

// Overall and per-spec counts. Members are counted in the spec that defines
// them; an interface is counted in the spec that defines it (not its partials).
export function summarize(idl) {
  const n = idl.engines.length;
  const specs = [];
  let allIfaces = [];
  let allMembers = [];
  for (const [id, spec] of Object.entries(idl.specs)) {
    const ifaces = Object.values(spec.interfaces);
    const statuses = ifaces.filter((i) => i.status).map((i) => i.status);
    const members = ifaces.flatMap(memberCodes);
    allIfaces = allIfaces.concat(statuses);
    allMembers = allMembers.concat(members);
    specs.push({
      id,
      slug: specSlug(id),
      title: spec.title,
      url: spec.url,
      interfaces: statuses.length,
      members: members.length,
      interfacesPresent: count(statuses, n, ifacePresent),
      membersPresent: count(members, n, memberPresent),
    });
  }
  specs.sort((a, b) => b.members - a.members || a.title.localeCompare(b.title));
  return {
    date: idl.date,
    node: idl.node,
    webref: idl.webref,
    browserSpecs: idl.browserSpecs,
    engines: engineList(idl),
    totals: {
      specs: specs.length,
      interfaces: allIfaces.length,
      members: allMembers.length,
      interfacesPresent: count(allIfaces, n, ifacePresent),
      membersPresent: count(allMembers, n, memberPresent),
      nodeGlobals: count(allIfaces, n, (c) => c === 'N'),
      stubs: count(allIfaces, n, (c) => c === 'S'),
    },
    specs,
  };
}

// Where each interface is defined (spec id), for links and inheritance chains.
export function interfaceIndex(idl) {
  const index = {};
  for (const [id, spec] of Object.entries(idl.specs)) {
    for (const [name, iface] of Object.entries(spec.interfaces)) if (iface.status) index[name] = { spec: id, inherits: iface.inherits ?? null, kind: iface.kind };
  }
  return index;
}

export function specPage(idl, id) {
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
    totals: {
      interfaces: interfaces.filter((i) => i.definedHere).length,
      members: members.length,
      interfacesPresent: count(interfaces.filter((i) => i.status).map((i) => i.status), n, ifacePresent),
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
  for (let p = own.inherits; p && chain.length < 20; p = index[p]?.inherits) chain.push({ name: p, linked: !!index[p] });
  const groups = [];
  for (const [id, spec] of Object.entries(idl.specs)) {
    const members = spec.interfaces[name]?.members;
    if (members?.length) groups.push({ spec: { id, title: spec.title, url: spec.url }, members });
  }
  // The defining spec first, then the others by title.
  groups.sort((a, b) => (a.spec.id === own.spec ? -1 : b.spec.id === own.spec ? 1 : a.spec.title.localeCompare(b.spec.title)));
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
