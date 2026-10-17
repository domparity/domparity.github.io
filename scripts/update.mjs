// Brings the data up to date: installs the latest version of every engine and
// of the Web IDL sources, runs the featured probes and the existence pass (each
// engine in its own process), and compares the new data with the old.
//
// Nothing changed beyond dates: every file is restored and `changed=false`.
// Otherwise: data/changelog.json gets a new entry (newest first), the pull
// request body is written to --body, and the outcome goes to $GITHUB_OUTPUT
// (changed, auto_merge, title) for .github/workflows/update.yml.
//
//   node scripts/update.mjs [--body <file>] [--no-install] [--no-probe]
//                           [--base <git ref> | --old <checkout dir>] [--dry-run]
//
// --no-install / --no-probe skip those steps; --base / --old compare with other
// data than the working tree's before the run; --dry-run writes nothing but the
// body and restores every file.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffData, renderSummary, changelogEntry, prTitle, readData } from './diff-data.mjs';

export const PACKAGES = ['warpdom', 'happy-dom', 'jsdom', 'linkedom', '@webref/idl', 'browser-specs', 'webidl2'];
const FILES = ['data/results.json', 'data/idl.json', 'data/changelog.json', 'package.json', 'package-lock.json'];

// Newest first. Every update is compared with the data on main, so an entry
// is never a repeat of an earlier one, even on the same day.
export function addChangelogEntry(changelog, entry) {
  return { ...changelog, entries: [entry, ...(changelog?.entries ?? [])] };
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
}

const root = fileURLToPath(new URL('..', import.meta.url));

function main() {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  const flag = (name) => args.includes(name);
  const date = new Date().toISOString().slice(0, 10);

  const saved = Object.fromEntries(FILES.map((f) => [f, existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null]));
  const restore = () => {
    for (const [f, text] of Object.entries(saved)) if (text != null) writeFileSync(join(root, f), text);
  };
  const old = opt('--old') ? readData({ dir: opt('--old') }) : opt('--base') ? readData({ ref: opt('--base') }) : readData();

  try {
    if (!flag('--no-install')) run('npm', ['install', '--save-dev', '--save-exact', '--no-audit', '--no-fund', ...PACKAGES.map((p) => `${p}@latest`)]);
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
  const out = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);

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
  console.log(`${title}\nresults changed: ${diff.resultsChanged}; unclassified specs: ${diff.unclassified.length}; auto-merge: ${diff.autoMerge}`);
  out('changed', 'true');
  out('auto_merge', String(diff.autoMerge));
  out('title', title);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
