// Brings the data up to date: installs the latest version of every engine and
// of the Web IDL sources, runs the featured probes and the existence pass (each
// engine in its own process), and compares the new data with the old.
//
// Nothing changed beyond dates: every file is restored and `changed=false`.
// Otherwise: data/changelog.json gets a new entry (newest first), the pull
// request body is written to --body, and the outcome goes to $GITHUB_OUTPUT
// (changed, auto_merge, title) for .github/workflows/update.yml.
//
//   node scripts/update.mjs [--body <file>] [--engines-only] [--pending <git ref>]
//                           [--no-install] [--no-probe]
//                           [--base <git ref> | --old <checkout dir>] [--dry-run]
//   node scripts/update.mjs --check [--ref <git ref>] [--exit-code]
//
// --engines-only installs only the latest engines (engines.json) and keeps
// @webref/idl, browser-specs and webidl2 as they are (the daily run; the weekly
// run updates everything). --pending <ref> carries over the package versions an
// unmerged update branch at <ref> brought in (unless main changed them since),
// so that rebuilding the branch from main keeps them, and the branch's edits of
// data/spec-groups.json (spec classifications) likewise. --no-install / --no-probe
// skip those steps; --base / --old compare with other data than the working
// tree's before the run; --dry-run writes nothing but the body and restores
// every file.
//
// --check asks the npm registry for the latest version of every engine and
// compares it with the versions recorded in the data (at <ref>, default the
// working tree). It prints the engines that changed and writes `changed` and
// `engines` to $GITHUB_OUTPUT; with --exit-code it exits 78 when none changed.

import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffData, renderSummary, changelogEntry, prTitle, readData } from './diff-data.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

export const ENGINE_PACKAGES = JSON.parse(readFileSync(join(root, 'engines.json'), 'utf8')).map((e) => e.package);
export const PACKAGES = [...ENGINE_PACKAGES, '@webref/idl', 'browser-specs', 'webidl2'];
const FILES = [
  'data/results.json',
  'data/idl.json',
  'data/changelog.json',
  'data/spec-groups.json',
  'package.json',
  'package-lock.json',
];
// Files edited by hand on an update branch (spec classifications) that a
// rebuild from main carries over, unless main changed them since.
const CARRIED = ['data/spec-groups.json'];

// Newest first. Every update is compared with the data on main and the update
// branch is rebuilt from main each time, so an entry describes everything the
// update brings and is never a repeat of an earlier one, even when the pull
// request is updated several times before it is merged.
export function addChangelogEntry(changelog, entry) {
  return { ...changelog, entries: [entry, ...(changelog?.entries ?? [])] };
}

// Every version recorded for each engine package, from data/results.json,
// data/idl.json and package.json: { package: Set(versions) }.
export function recordedVersions(data, engines = JSON.parse(readFileSync(join(root, 'engines.json'), 'utf8'))) {
  const out = Object.fromEntries(engines.map((e) => [e.package, new Set()]));
  const add = (pkg, v) => pkg in out && v && out[pkg].add(v);
  for (const e of data.results?.engines ?? [])
    add(e.package ?? engines.find((x) => x.engine === e.engine)?.package, e.version);
  for (const e of data.idl?.engines ?? [])
    add(e.package ?? engines.find((x) => x.engine === e.engine)?.package, e.version);
  for (const pkg of Object.keys(out)) add(pkg, data.devDependencies?.[pkg]);
  return out;
}

// The engines whose latest version is not the (only) version recorded.
export function changedEngines(recorded, latest) {
  return Object.keys(recorded)
    .filter((pkg) => latest[pkg] && (recorded[pkg].size !== 1 || !recorded[pkg].has(latest[pkg])))
    .map((pkg) => ({ package: pkg, from: [...recorded[pkg]].join(', ') || null, to: latest[pkg] }));
}

// Three-way merge of devDependencies: the versions an unmerged update branch
// brought in (branch differs from the merge base) that main has not changed
// since (main equals the merge base). { package: version }.
export function pendingVersions({ base = {}, branch = {}, main = {} }) {
  const out = {};
  for (const [pkg, v] of Object.entries(branch)) {
    if (v !== base[pkg] && main[pkg] === base[pkg] && v !== main[pkg]) out[pkg] = v;
  }
  return out;
}

// What `npm install` gets: the latest of every package (or of the engines
// only), plus the pending versions of the packages not installed at latest.
export function installSpecs({ enginesOnly = false, pending = {} } = {}) {
  const latest = enginesOnly ? ENGINE_PACKAGES : PACKAGES;
  const pins = Object.entries(pending).filter(([p]) => PACKAGES.includes(p) && !latest.includes(p));
  return [...pins.map(([p, v]) => `${p}@${v}`), ...latest.map((p) => `${p}@latest`)];
}

async function latestVersion(pkg) {
  const res = await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2f')}/latest`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`npm registry: ${pkg}: HTTP ${res.status}`);
  return (await res.json()).version;
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
}

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const out = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);

async function check(args, opt) {
  const ref = opt('--ref');
  const recorded = recordedVersions(ref ? readData({ ref }) : readData());
  const latest = Object.fromEntries(await Promise.all(ENGINE_PACKAGES.map(async (p) => [p, await latestVersion(p)])));
  const changed = changedEngines(recorded, latest);
  for (const p of ENGINE_PACKAGES) {
    const c = changed.find((x) => x.package === p);
    console.log(`${p}: ${c ? `${c.from ?? 'none'} -> ${c.to}` : `${latest[p]} (unchanged)`}`);
  }
  console.log(
    changed.length
      ? `New engine version: ${changed.map((c) => `${c.package} ${c.to}`).join(', ')}`
      : 'No new engine version',
  );
  out('changed', String(changed.length > 0));
  out('engines', changed.map((c) => `${c.package}@${c.to}`).join(' '));
  if (!changed.length && args.includes('--exit-code')) process.exitCode = 78;
}

function update(args, opt, flag) {
  const date = new Date().toISOString().slice(0, 10);

  const saved = Object.fromEntries(
    FILES.map((f) => [f, existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null]),
  );
  const restore = () => {
    for (const [f, text] of Object.entries(saved)) if (text != null) writeFileSync(join(root, f), text);
  };
  // The data to compare with: a directory, a git ref, or the committed data.
  let old;
  if (opt('--old')) old = readData({ dir: opt('--old') });
  else if (opt('--base')) old = readData({ ref: opt('--base') });
  else old = readData();

  let pending = {};
  if (opt('--pending')) {
    const ref = opt('--pending');
    pending = pendingVersions({
      base: readData({ ref: git('merge-base', 'HEAD', ref) }).devDependencies,
      branch: readData({ ref }).devDependencies,
      main: readData().devDependencies,
    });
    console.log(
      `Pending from ${ref}: ${
        Object.entries(pending)
          .map(([p, v]) => `${p}@${v}`)
          .join(', ') || 'none'
      }`,
    );
    const base = git('merge-base', 'HEAD', ref);
    for (const f of CARRIED) {
      const at = (r) => {
        try {
          return git('show', `${r}:${f}`);
        } catch {
          return null;
        }
      };
      const b = at(base),
        branch = at(ref),
        main = at('HEAD');
      if (branch != null && branch !== b && main === b) {
        writeFileSync(join(root, f), branch + '\n');
        console.log(`Carried over from ${ref}: ${f}`);
      }
    }
  }

  try {
    if (!flag('--no-install')) {
      run('npm', [
        'install',
        '--save-dev',
        '--save-exact',
        '--no-audit',
        '--no-fund',
        ...installSpecs({ enginesOnly: flag('--engines-only'), pending }),
      ]);
    }
    if (!flag('--no-probe')) {
      run('npm', ['run', 'probe']);
      run('npm', ['run', 'probe-idl']);
    }
  } catch (e) {
    restore();
    throw e;
  }

  const groups = JSON.parse(readFileSync(join(root, 'data/spec-groups.json'), 'utf8'));
  const diff = diffData({ old, new: readData(), groups });

  if (!diff.changed) {
    restore();
    console.log('No version or result changed: nothing to do.');
    out('changed', 'false');
    return;
  }

  const title = prTitle(diff, date);
  const body = renderSummary(diff, { date });
  if (opt('--body')) writeFileSync(opt('--body'), body);
  else console.log(`\n${body}`);

  if (flag('--dry-run')) restore();
  else {
    const file = join(root, 'data/changelog.json');
    const changelog = JSON.parse(saved['data/changelog.json'] ?? '{"entries":[]}');
    writeFileSync(file, JSON.stringify(addChangelogEntry(changelog, changelogEntry(diff, { date })), null, 2) + '\n');
  }
  console.log(
    `${title}\nresults changed: ${diff.resultsChanged}; unclassified specs: ${diff.unclassified.length}; auto-merge: ${diff.autoMerge}`,
  );
  out('changed', 'true');
  out('auto_merge', String(diff.autoMerge));
  out('title', title);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  const flag = (name) => args.includes(name);
  if (flag('--check')) await check(args, opt);
  else update(args, opt, flag);
}
