// Compares two versions of the data (data/results.json, data/idl.json and the
// devDependencies in package.json) and describes every change: engine and
// package versions, featured API status and check changes per engine, Web IDL
// interface and member changes per engine, specs, interfaces and members that
// @webref/idl added or removed (with their spec group), and specs that have no
// group yet in data/spec-groups.json.
//
// Used by scripts/update.mjs for the pull request body and data/changelog.json.
//
//   node scripts/diff-data.mjs [--base <git ref> | --old <checkout dir>] [--json]
//
// prints the summary of the working tree's data against the data at <ref>
// (default: HEAD) or in another checkout.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATUS_WORD = { supported: 'supported', partial: 'partial', stub: 'stub', missing: 'missing' };
const IFACE_WORD = { P: 'present', N: "present (Node.js's own global)", S: 'stub', '-': 'missing', '?': 'not probed' };
const MEMBER_WORD = { 1: 'present', 0: 'missing', '?': 'not probed' };

// An engine's identity across versions: its package (several versions of one
// engine are installed under different package names), else its name.
const engineId = (e) => e.package ?? e.engine;

function byId(engines) {
  const out = new Map();
  engines.forEach((e, i) => out.set(engineId(e), { ...e, index: i }));
  return out;
}

// spec -> interface -> member list, flattened to keys.
function idlIndex(idl) {
  const interfaces = new Map(); // "spec|Iface" -> { spec, name, status }
  const members = new Map(); // "spec|Iface|kind|name" -> { spec, iface, name, kind, codes }
  for (const [spec, s] of Object.entries(idl?.specs ?? {})) {
    for (const [name, i] of Object.entries(s.interfaces ?? {})) {
      if (i.status != null) interfaces.set(`${spec}|${name}`, { spec, name, status: i.status });
      for (const [m, kind, codes] of i.members ?? []) {
        members.set(`${spec}|${name}|${kind}|${m}`, { spec, iface: name, name: m, kind, codes });
      }
    }
  }
  return { interfaces, members };
}

const groupOf = (groups) => {
  const index = {};
  for (const g of groups?.groups ?? []) for (const id of g.specs) index[id] = { id: g.id, title: g.title };
  return (spec) => index[spec] ?? null;
};

function versionChanges(oldDeps = {}, newDeps = {}) {
  const names = [...new Set([...Object.keys(oldDeps), ...Object.keys(newDeps)])].sort();
  return names
    .filter((n) => oldDeps[n] !== newDeps[n])
    .map((n) => ({ package: n, from: oldDeps[n] ?? null, to: newDeps[n] ?? null }));
}

export function diffData({ old, new: cur, groups }) {
  const group = groupOf(groups);

  // Engines: versions, added and removed (featured data is authoritative).
  const oldEngines = byId(old.results?.engines ?? []);
  const newEngines = byId(cur.results?.engines ?? []);
  const engines = [];
  for (const [id, e] of newEngines) {
    const o = oldEngines.get(id);
    engines.push({ id, engine: e.engine, from: o ? o.version : null, to: e.version, added: !o, crashed: !!e.crashed });
  }
  for (const [id, o] of oldEngines) {
    if (!newEngines.has(id)) engines.push({ id, engine: o.engine, from: o.version, to: null, removed: true });
  }

  const packages = versionChanges(old.devDependencies, cur.devDependencies);
  const node =
    old.results?.node !== cur.results?.node ? { from: old.results?.node ?? null, to: cur.results?.node ?? null } : null;

  // Featured APIs.
  const oldApis = new Map((old.results?.apis ?? []).map((a) => [a.id, a]));
  const newApis = new Map((cur.results?.apis ?? []).map((a) => [a.id, a]));
  const apisAdded = [...newApis.values()].filter((a) => !oldApis.has(a.id)).map(({ id, title }) => ({ id, title }));
  const apisRemoved = [...oldApis.values()].filter((a) => !newApis.has(a.id)).map(({ id, title }) => ({ id, title }));
  const checksChanged = [];
  for (const [id, a] of newApis) {
    const o = oldApis.get(id);
    if (!o) continue;
    const before = new Set(o.checks.map((c) => c.id));
    const after = new Set(a.checks.map((c) => c.id));
    const added = [...after].filter((c) => !before.has(c));
    const removed = [...before].filter((c) => !after.has(c));
    if (added.length || removed.length) checksChanged.push({ api: id, title: a.title, added, removed });
  }
  const featured = [];
  for (const [id, e] of newEngines) {
    const o = oldEngines.get(id);
    if (!o) continue;
    for (const [apiId, api] of newApis) {
      if (!oldApis.has(apiId)) continue;
      const before = old.results.results?.[apiId]?.[o.key];
      const after = cur.results.results?.[apiId]?.[e.key];
      if (!before || !after) continue;
      const passedBefore = new Set(before.passed ?? []);
      const passedAfter = new Set(after.passed ?? []);
      const known = new Set(oldApis.get(apiId).checks.map((c) => c.id));
      const nowPass = [...passedAfter].filter((c) => !passedBefore.has(c) && known.has(c));
      const nowFail = api.checks
        .map((c) => c.id)
        .filter((c) => known.has(c) && passedBefore.has(c) && !passedAfter.has(c));
      if (before.status !== after.status || nowPass.length || nowFail.length) {
        featured.push({
          engine: e.engine,
          engineId: id,
          api: apiId,
          title: api.title,
          from: before.status,
          to: after.status,
          nowPass,
          nowFail,
        });
      }
    }
  }

  // Web IDL existence pass.
  const oldIdlEngines = byId(old.idl?.engines ?? []);
  const newIdlEngines = byId(cur.idl?.engines ?? []);
  const oldIdx = idlIndex(old.idl);
  const newIdx = idlIndex(cur.idl);
  const perEngine = [];
  for (const [id, e] of newIdlEngines) {
    const o = oldIdlEngines.get(id);
    if (!o) continue;
    const interfaces = [];
    const nowPresent = [];
    const nowMissing = [];
    const other = [];
    for (const [k, i] of newIdx.interfaces) {
      const before = oldIdx.interfaces.get(k);
      if (!before) continue;
      const a = before.status[o.index] ?? '?';
      const b = i.status[e.index] ?? '?';
      if (a !== b) interfaces.push({ spec: i.spec, name: i.name, from: a, to: b });
    }
    for (const [k, m] of newIdx.members) {
      const before = oldIdx.members.get(k);
      if (!before) continue;
      const a = before.codes[o.index] ?? '?';
      const b = m.codes[e.index] ?? '?';
      if (a === b) continue;
      const item = { spec: m.spec, iface: m.iface, name: m.name, kind: m.kind, from: a, to: b };
      if (a === '0' && b === '1') nowPresent.push(item);
      else if (a === '1' && b === '0') nowMissing.push(item);
      else other.push(item);
    }
    if (interfaces.length || nowPresent.length || nowMissing.length || other.length) {
      perEngine.push({ engine: e.engine, engineId: id, interfaces, nowPresent, nowMissing, other });
    }
  }

  const oldSpecs = old.idl?.specs ?? {};
  const newSpecs = cur.idl?.specs ?? {};
  const specsAdded = Object.keys(newSpecs)
    .filter((s) => !(s in oldSpecs))
    .map((s) => ({ id: s, title: newSpecs[s].title, url: newSpecs[s].url ?? null, group: group(s) }));
  const specsRemoved = Object.keys(oldSpecs)
    .filter((s) => !(s in newSpecs))
    .map((s) => ({ id: s, title: oldSpecs[s].title }));
  const newNames = (cur.idl?.engines ?? []).map((e) => e.engine);
  const presentIn = (codes, isPresent) => newNames.filter((_, k) => isPresent(codes[k]));
  const interfacesAdded = [...newIdx.interfaces.values()]
    .filter((i) => !oldIdx.interfaces.has(`${i.spec}|${i.name}`))
    .map((i) => ({
      spec: i.spec,
      name: i.name,
      group: group(i.spec),
      presentIn: presentIn(i.status, (c) => c === 'P' || c === 'N' || c === 'S'),
    }));
  const interfacesRemoved = [...oldIdx.interfaces.values()]
    .filter((i) => !newIdx.interfaces.has(`${i.spec}|${i.name}`))
    .map((i) => ({ spec: i.spec, name: i.name }));
  const membersAdded = [...newIdx.members]
    .filter(([k]) => !oldIdx.members.has(k))
    .map(([, m]) => ({
      spec: m.spec,
      iface: m.iface,
      name: m.name,
      kind: m.kind,
      group: group(m.spec),
      presentIn: presentIn(m.codes, (c) => c === '1'),
    }));
  const membersRemoved = [...oldIdx.members]
    .filter(([k]) => !newIdx.members.has(k))
    .map(([, m]) => ({ spec: m.spec, iface: m.iface, name: m.name, kind: m.kind }));

  const unclassified = Object.keys(newSpecs)
    .filter((s) => !group(s))
    .sort();

  const versionsChanged = engines.some((e) => e.from !== e.to) || packages.length > 0 || !!node;
  const resultsChanged =
    engines.some((e) => e.added || e.removed || e.crashed) ||
    apisAdded.length + apisRemoved.length + checksChanged.length + featured.length + perEngine.length > 0 ||
    specsAdded.length + specsRemoved.length + interfacesAdded.length + interfacesRemoved.length > 0 ||
    membersAdded.length + membersRemoved.length > 0;
  return {
    engines,
    packages,
    node,
    webref: { from: old.idl?.webref?.version ?? null, to: cur.idl?.webref?.version ?? null },
    browserSpecs: { from: old.idl?.browserSpecs?.version ?? null, to: cur.idl?.browserSpecs?.version ?? null },
    featured: { apisAdded, apisRemoved, checksChanged, changes: featured },
    idl: { perEngine, specsAdded, specsRemoved, interfacesAdded, interfacesRemoved, membersAdded, membersRemoved },
    unclassified,
    versionsChanged,
    resultsChanged,
    // Anything worth a commit: dates and timings alone are not.
    changed: versionsChanged || resultsChanged || unclassified.length > 0,
    // Pure version bumps with identical results and every spec classified.
    autoMerge: !resultsChanged && unclassified.length === 0,
  };
}

// ---------------------------------------------------------------- rendering

const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';
const memberName = (m) => `${m.iface}.${m.name.startsWith('@@') ? `[Symbol.${m.name.slice(2)}]` : m.name}`;
const groupText = (g) => (g ? g.title : '**unclassified**');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const presence = (x) => (x.presentIn?.length ? `, defined in ${x.presentIn.join(', ')}` : ', defined in no engine');
const versionText = (from, to) => (from === to ? `${to} (unchanged)` : `${from ?? 'none'} → ${to ?? 'none'}`);

// A list of at most `max` lines, then "and N more".
function capped(items, render, max) {
  const lines = items.slice(0, max).map((x) => `- ${render(x)}`);
  if (items.length > max) lines.push(`- and ${items.length - max} more`);
  return lines;
}

export function prTitle(diff, date) {
  const bumps = diff.engines.filter((e) => e.from !== e.to && e.from && e.to).map((e) => `${e.engine} ${e.to}`);
  const tools = diff.packages
    .filter((p) => !diff.engines.some((e) => e.id === p.package))
    .map((p) => `${p.package} ${p.to}`);
  const parts = [...bumps, ...tools];
  return `Data update ${date}${parts.length ? `: ${parts.join(', ')}` : ''}`;
}

export function renderSummary(diff, { date, max = 40, maxChars = 60000 } = {}) {
  const L = [];
  L.push(`## Data update ${date}`, '');
  L.push('| Engine | Version |', '|---|---|');
  for (const e of diff.engines) {
    const note = e.added ? ' (new engine)' : e.removed ? ' (removed)' : e.crashed ? ' (crashed while probing)' : '';
    L.push(`| ${e.engine} | ${versionText(e.from, e.to)}${note} |`);
  }
  L.push('');
  const tools = diff.packages.filter((p) => !diff.engines.some((e) => e.id === p.package));
  if (tools.length)
    L.push('Other packages:', '', ...tools.map((p) => `- ${code(p.package)}: ${versionText(p.from, p.to)}`), '');
  if (diff.node) L.push(`Node.js: ${versionText(diff.node.from, diff.node.to)}`, '');

  // Featured.
  const f = diff.featured;
  L.push('### Featured checks', '');
  if (!f.changes.length && !f.apisAdded.length && !f.apisRemoved.length && !f.checksChanged.length) {
    L.push('No status or check changed for any engine.', '');
  } else {
    for (const a of f.apisAdded) L.push(`- New API: ${code(a.id)} ${a.title}`);
    for (const a of f.apisRemoved) L.push(`- Removed API: ${code(a.id)} ${a.title}`);
    for (const c of f.checksChanged) {
      L.push(
        `- ${code(c.api)}: checks ${[...c.added.map((x) => `added ${code(x)}`), ...c.removed.map((x) => `removed ${code(x)}`)].join(', ')}`,
      );
    }
    const engines = [...new Set(f.changes.map((c) => c.engine))];
    for (const name of engines) {
      const e = diff.engines.find((x) => x.engine === name);
      L.push('', `**${name}** (${versionText(e?.from, e?.to)})`, '');
      for (const c of f.changes.filter((x) => x.engine === name)) {
        const parts = [];
        if (c.nowPass.length) parts.push(`now passes: ${c.nowPass.map(code).join(', ')}`);
        if (c.nowFail.length) parts.push(`now fails: ${c.nowFail.map(code).join(', ')}`);
        const move =
          c.from === c.to
            ? `still ${STATUS_WORD[c.to] ?? c.to}`
            : `${STATUS_WORD[c.from] ?? c.from} → **${STATUS_WORD[c.to] ?? c.to}**`;
        L.push(`- ${code(c.api)} ${c.title}: ${move}${parts.length ? ` (${parts.join('; ')})` : ''}`);
      }
    }
    L.push('');
  }

  // Web IDL per engine.
  const i = diff.idl;
  L.push('### Web IDL existence pass', '');
  if (!i.perEngine.length) L.push('No interface or member changed for any engine.', '');
  for (const e of i.perEngine) {
    const v = diff.engines.find((x) => x.engine === e.engine);
    L.push(
      `**${e.engine}** (${versionText(v?.from, v?.to)}): ${plural(e.interfaces.length, 'interface')} changed status, ${plural(e.nowPresent.length, 'member')} now present, ${e.nowMissing.length} now missing${e.other.length ? `, ${plural(e.other.length, 'other change')}` : ''}`,
      '',
    );
    L.push(
      ...capped(
        e.interfaces,
        (x) => `interface ${code(x.name)} (${x.spec}): ${IFACE_WORD[x.from]} → **${IFACE_WORD[x.to]}**`,
        max,
      ),
    );
    L.push(...capped(e.nowPresent, (x) => `now present: ${code(memberName(x))} (${x.spec})`, max));
    L.push(...capped(e.nowMissing, (x) => `now missing: ${code(memberName(x))} (${x.spec})`, max));
    L.push(
      ...capped(
        e.other,
        (x) => `${code(memberName(x))} (${x.spec}): ${MEMBER_WORD[x.from]} → ${MEMBER_WORD[x.to]}`,
        max,
      ),
    );
    L.push('');
  }

  // Web IDL plan (from @webref/idl).
  const planChanges =
    i.specsAdded.length +
    i.specsRemoved.length +
    i.interfacesAdded.length +
    i.interfacesRemoved.length +
    i.membersAdded.length +
    i.membersRemoved.length;
  L.push(
    `### New and removed web APIs (@webref/idl ${versionText(diff.webref.from, diff.webref.to)}, browser-specs ${versionText(diff.browserSpecs.from, diff.browserSpecs.to)})`,
    '',
  );
  if (!planChanges) L.push('No spec, interface or member was added or removed.', '');
  else {
    if (i.specsAdded.length)
      L.push(
        `Specs added (${i.specsAdded.length}):`,
        '',
        ...capped(i.specsAdded, (s) => `${code(s.id)} ${s.title}: ${groupText(s.group)}`, max),
        '',
      );
    if (i.specsRemoved.length)
      L.push(
        `Specs removed (${i.specsRemoved.length}):`,
        '',
        ...capped(i.specsRemoved, (s) => `${code(s.id)} ${s.title}`, max),
        '',
      );
    if (i.interfacesAdded.length)
      L.push(
        `Interfaces added (${i.interfacesAdded.length}):`,
        '',
        ...capped(i.interfacesAdded, (x) => `${code(x.name)} (${x.spec}): ${groupText(x.group)}${presence(x)}`, max),
        '',
      );
    if (i.interfacesRemoved.length)
      L.push(
        `Interfaces removed (${i.interfacesRemoved.length}):`,
        '',
        ...capped(i.interfacesRemoved, (x) => `${code(x.name)} (${x.spec})`, max),
        '',
      );
    if (i.membersAdded.length)
      L.push(
        `Members added (${i.membersAdded.length}):`,
        '',
        ...capped(
          i.membersAdded,
          (x) => `${code(memberName(x))} (${x.spec}): ${groupText(x.group)}${presence(x)}`,
          max,
        ),
        '',
      );
    if (i.membersRemoved.length)
      L.push(
        `Members removed (${i.membersRemoved.length}):`,
        '',
        ...capped(i.membersRemoved, (x) => `${code(memberName(x))} (${x.spec})`, max),
        '',
      );
  }

  if (diff.unclassified.length) {
    L.push(
      '### Needs classification',
      '',
      `These specs are not in ${code('data/spec-groups.json')} yet. Add each one to a group on this branch before merging; ${code('test/spec-groups.test.mjs')} fails until they are added.`,
      '',
      ...diff.unclassified.map((s) => `- ${code(s)}`),
      '',
    );
  }

  L.push('### Review', '');
  if (diff.autoMerge)
    L.push('Pure version bumps with identical results and every spec classified: eligible for auto-merge.', '');
  else {
    const why = [];
    if (diff.resultsChanged) why.push('results changed');
    if (diff.unclassified.length)
      why.push(`${diff.unclassified.length} unclassified spec${diff.unclassified.length > 1 ? 's' : ''}`);
    L.push(`Not eligible for auto-merge (${why.join(', ')}): needs the maintainer's review.`, '');
  }

  let text = L.join('\n');
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n\n… (truncated; run \`node scripts/diff-data.mjs --base main\` on this branch for the full list)\n`;
  }
  return text;
}

// The compact entry data/changelog.json keeps for the site's "What changed" page.
export function changelogEntry(diff, { date, examples = 20 } = {}) {
  const pick = (list, fn) => list.slice(0, examples).map(fn);
  return {
    date,
    engines: diff.engines
      .filter((e) => !e.removed)
      .map((e) =>
        e.from === e.to ? { engine: e.engine, version: e.to } : { engine: e.engine, from: e.from, version: e.to },
      ),
    packages: diff.packages.filter((p) => !diff.engines.some((e) => e.id === p.package)),
    featured: diff.featured.changes.map(({ engine, api, title, from, to, nowPass, nowFail }) => ({
      engine,
      api,
      title,
      from,
      to,
      nowPass,
      nowFail,
    })),
    apisAdded: diff.featured.apisAdded,
    apisRemoved: diff.featured.apisRemoved,
    idl: diff.idl.perEngine.map((e) => ({
      engine: e.engine,
      interfaces: e.interfaces.length,
      nowPresent: e.nowPresent.length,
      nowMissing: e.nowMissing.length,
      examples: {
        interfaces: pick(e.interfaces, (x) => ({ name: x.name, spec: x.spec, from: x.from, to: x.to })),
        nowPresent: pick(e.nowPresent, memberName),
        nowMissing: pick(e.nowMissing, memberName),
      },
    })),
    specsAdded: diff.idl.specsAdded.map(({ id, title, group }) => ({ id, title, group: group?.id ?? null })),
    specsRemoved: diff.idl.specsRemoved.map(({ id }) => id),
    interfacesAdded: diff.idl.interfacesAdded.length,
    interfacesRemoved: diff.idl.interfacesRemoved.length,
    membersAdded: diff.idl.membersAdded.length,
    membersRemoved: diff.idl.membersRemoved.length,
  };
}

// ---------------------------------------------------------------- CLI

const root = fileURLToPath(new URL('..', import.meta.url));

// The data at a git ref ({ ref }), in another checkout ({ dir }), or in this
// working tree ({}). A file that does not exist there reads as null.
export function readData({ ref = null, dir = root } = {}) {
  const read = (f) => {
    try {
      const text = ref
        ? execFileSync('git', ['show', `${ref}:${f}`], {
            cwd: root,
            encoding: 'utf8',
            maxBuffer: 64 << 20,
            stdio: ['ignore', 'pipe', 'ignore'],
          })
        : readFileSync(join(dir, f), 'utf8');
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
  return {
    results: read('data/results.json'),
    idl: read('data/idl.json'),
    devDependencies: read('package.json')?.devDependencies ?? {},
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  const old = opt('--old') ? readData({ dir: opt('--old') }) : readData({ ref: opt('--base') ?? 'HEAD' });
  const groups = JSON.parse(readFileSync(join(root, 'data/spec-groups.json'), 'utf8'));
  const diff = diffData({ old, new: readData(), groups });
  if (args.includes('--json')) console.log(JSON.stringify(diff, null, 2));
  else console.log(renderSummary(diff, { date: new Date().toISOString().slice(0, 10), maxChars: Infinity }));
}
