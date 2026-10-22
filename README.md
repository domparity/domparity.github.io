# domparity

A "can I use" for test DOMs: which web platform APIs work, and how, in the DOM
implementations JavaScript unit tests run on: warpdom, happy-dom, jsdom and
linkedom.

Maintained by [Sonu Kapoor](https://sonukapoor.com), who is also the author of
[warpdom](https://github.com/sonukapoor/warpdom). Because of that, the method
is the same for every engine, the probes and data are open, and the results
show where each engine, warpdom included, fails or deviates.

## Method

- Each engine gets a small adapter (`src/engines.mjs`) that creates a window
  the way the engine documents it, with no polyfills.
- Each API has a probe in `probes/`: how to tell whether it **exists**, and one
  to four **checks**, each a tiny test of what the standards say a browser does,
  with a one-line description and a spec link.
- `npm run probe` runs every engine in its own child process with a timeout
  (`scripts/run-engine.mjs`); every check gets a fresh window and a 3 second
  limit. Errors are caught, console output is captured, and "not implemented"
  reports (thrown or logged) are recorded.
- Status per engine (`src/classify.mjs`):
  - **supported**: exists and every check passes
  - **partial**: exists, at least one check works and at least one fails (the
    data says which)
  - **stub**: exists, but no check works: each fails, or the engine reports
    "not implemented" while it runs
  - **missing**: not defined
- Black box only: no engine's source code is read to write the probes.
- Engine order (`src/order.mjs`): the maintainer's engine (warpdom) first, then
  the others alphabetically, in every table, card, list and data file. Next to
  warpdom's name, tables and cards say "maintainer's engine" with a link to the
  About page. Nothing else differs between engines.

On top of these hand-written behavior probes (the "featured" layer), an
automatic **existence pass** covers the whole platform:

- `npm run probe-idl` (`scripts/probe-idl.mjs`, `src/idl.mjs`) reads the Web IDL
  of every spec in [@webref/idl](https://www.npmjs.com/package/@webref/idl)
  (spec titles and links from [browser-specs](https://www.npmjs.com/package/browser-specs))
  and lists every interface and namespace exposed on Window, with every
  attribute, operation and constant on it, including partial interfaces and
  mixins, each attributed to the spec that defines it. Window's own members
  are looked up on the window itself, constants and static members on the
  interface object, everything else on the interface prototype (which covers
  the prototype chain); `[LegacyUnforgeable]` members also on a sample
  instance. Members of `iterable`, `maplike` and `setlike` declarations are
  included; members inherited from `Object.prototype` do not count.
- Each engine runs in its own child process (`scripts/run-idl.mjs`) with a
  timeout. Interface status: present, present but Node.js's own global (the
  very same object), stub (calling a constructor that takes no arguments
  throws or logs "not implemented"; other constructor errors are recorded),
  or missing. Member status: present or missing.
- **Existence is not behavior.** A member that is present can still be a no-op
  or wrong; only the featured checks test behavior.
- Spec groups (`data/spec-groups.json`): every spec is in one group, by what it
  matters for in unit tests: Test DOM core, Rendering and graphics, Media and
  devices, Platform and app, Other. Coverage numbers default to Test DOM core
  and say which group they are out of; `test/spec-groups.test.mjs` fails when a
  spec in `data/idl.json` has no group. When `npm run probe-idl` brings in a new
  spec, add it to a group.

Results describe the engine's window. Test runners may add Node.js globals
(structuredClone, TextEncoder, crypto, ...) on top; where the window's value is
Node.js's own global the data marks it `sameAsNode`.

## Data

- `data/results.json`: engine versions and how each window was created, probe
  date, Node.js version, API metadata (checks, spec links, workarounds) and per
  API per engine: status, passed checks, failed checks with error text. Engines
  are keyed `<engine>@<version>`, so several versions of one engine can be
  added (install an alias such as `"jsdom29": "npm:jsdom@29"` and add
  `{ "engine": "jsdom", "package": "jsdom29" }` to `engines.json`).
- `data/idl.json`: the existence pass, grouped spec → interface → member, with
  the engine versions, the @webref/idl and browser-specs versions, and a legend
  of the one-character codes (one character per engine, in `engines` order).
- `data/spec-groups.json`: the spec groups, with a reason per group.
- `data/changelog.json`: what changed in each automatic update, newest first
  (see Automatic updates).
- `data/wpt.json`: Web Platform Tests pass rates per area for warpdom and jsdom,
  imported from warpdom's published WPT summary with `npm run import-wpt --
  <summary.md>`; the source run (WPT commit, date, engine versions) is recorded
  in the file. happy-dom and linkedom are "not measured".

## Run

Node.js 22.13 or later in 22.x, or 24 and later.

```sh
npm install
npm run probe        # writes data/results.json
npm run probe-idl    # writes data/idl.json
npm test             # status classification, results format, site generator
npm run format       # Prettier (CI runs npm run format:check)
npm run lint         # ESLint readability rules, such as no nested ternaries

cd website
npm install
npm run build        # generates the API pages from ../data, then builds website/build
npx docusaurus serve # serves website/build at http://localhost:3000
```

## Automatic updates

`.github/workflows/update.yml` keeps the data current through a single pull
request from the branch `auto/update`. It runs:

- **daily at 05:41 UTC: engine check.** `node scripts/update.mjs --check` asks
  the npm registry for the latest warpdom, happy-dom, jsdom and linkedom and
  compares them with the versions recorded in `data/results.json`,
  `data/idl.json` and `package.json` (on the open update branch if there is
  one, else on main). When none changed, the run ends within seconds with "No
  new engine version" in the run summary: no install, no probes. Otherwise it
  runs an **engines-only** update (`--engines-only`): only the engines are
  installed at their latest version; @webref/idl, browser-specs and webidl2
  stay as they are, so daily runs do not churn on spec changes.
- **Mondays at 06:23 UTC: full update**, the engines and @webref/idl,
  browser-specs and webidl2.
- on demand: `gh workflow run update.yml -R domparity/domparity.github.io
  [-f mode=auto|engines|full]` (default `auto`: the engine check, then an
  engines-only update if an engine changed; `full`: the full update);
- on a `repository_dispatch` of type `engine-release` (for engine release
  workflows, e.g. warpdom's): the engine check and an engines-only update.

An update:

1. `npm ci`, then `node scripts/update.mjs` (`npm run update`): installs the
   latest packages (exact versions), runs `npm run probe` and `npm run
   probe-idl`, and compares the new data with the data on main
   (`scripts/diff-data.mjs`). If an update pull request is open, the package
   versions its branch brought in are installed too (`--pending <ref>`, unless
   main changed them since), so an engines-only run keeps a Web IDL update the
   branch already has. When nothing but dates changed, every file is restored
   and the run ends (an open update pull request that main has caught up with
   is closed).
2. Otherwise it appends an entry to `data/changelog.json` (newest first; the
   site's What changed page at `/changes` is generated from it) and writes the
   pull request body: per engine, the version change and every status change
   (featured APIs and checks between supported, partial, stub and missing; Web
   IDL interfaces and members now present or missing), the specs, interfaces
   and members @webref/idl added or removed with their spec group, and every
   spec not yet in `data/spec-groups.json` under "Needs classification".
3. `npm test` and the site build run in the same workflow, because a pull
   request opened with the workflow's `GITHUB_TOKEN` starts no other workflow.
   Their outcome is in the pull request body. A new, unclassified spec makes
   `test/spec-groups.test.mjs` fail on purpose: add it to a group on the
   branch before merging.
4. The data is committed on top of main to `auto/update` and force-pushed.
   If the pull request from `auto/update` is open, its title and body are
   updated (assignee and reviewer stay); otherwise a pull request into main is
   opened, assigned to sonukapoor with a review request from sonukapoor (the
   body also @mentions sonukapoor, in case the review request is refused).
   Merging it pushes to main, and `deploy.yml` deploys the site.

Because the branch is rebuilt from main on every run and compared with main,
the pull request body always describes the whole difference between main and
the branch, and the branch carries exactly one changelog entry for the
cumulative change, however often it was updated before the merge. A spec
classification added by hand to `data/spec-groups.json` on `auto/update` is
carried over to the rebuilt branch (unless main changed that file since);
other commits pushed by hand to `auto/update` are replaced by the next update
run.

The pull request body also says whether an update would be eligible for
auto-merge: pure version bumps with identical results and every spec
classified. The workflow does not merge anything itself; every update is
reviewed.

Requirements: the workflow needs `contents: write` and `pull-requests: write`
(set in the workflow), and the organization and repository setting **Allow
GitHub Actions to create and approve pull requests** (Settings > Actions >
General) must be on, or opening the pull request fails (the branch is still
pushed and the body is in the run summary).

To see what an update would say without running it: `node scripts/diff-data.mjs
--base <git ref>` compares the working tree's data with the data at a commit,
and `--old <dir>` with another checkout's.

## Site

`website/` is a Docusaurus site. `website/scripts/generate.mjs` (run by
`prebuild` and `prestart`) writes `docs/apis/*.mdx`, `docs/wpt.mdx`,
`sidebars.generated.json` and copies of the data into `src/data/` and
`static/data/`. These generated files are git-ignored and must not be edited by
hand. The home page table is a React component (`src/components/ResultsTable.tsx`).
The Coverage pages (one per spec and one per interface, about 1,300) are added
at build time by `website/plugins/coverage.mjs` from `data/idl.json`, using the
page models in `website/scripts/coverage.mjs`. The palette is defined once, as
CSS variables at the top of `website/src/css/custom.css`.
`.github/workflows/deploy.yml` builds and deploys it to GitHub Pages
(https://domparity.github.io) on push to main.

## Adding an API

1. Add `probes/<id>.mjs` exporting `{ id, title, summary, spec, exists(window),
   checks: [{ id, description, spec, run(window) }] }`, plus optionally
   `existsDescription`, `interfaces` (the Web IDL interfaces the API is about;
   the API page then shows which of their members each engine defines),
   `global` (the name of a global Node.js also defines) and
   `workaround` (only when a common, neutral workaround exists). A check passes
   when `run` returns or resolves; helpers are in `src/assert.mjs`.
2. Use only the window passed in (`window.document`, `new window.Event()`, ...),
   and check behavior the standard specifies and a browser shows, not one
   engine's behavior.
3. `npm run probe`, look at the new entries in `data/results.json`, then
   `npm run build` in `website/`.

## License

Code: MIT (`LICENSE`). Data in `data/`: CC BY 4.0 (`data/LICENSE`).
