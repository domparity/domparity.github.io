# domparity

A "can I use" for test DOMs: which web platform APIs work, and how, in the DOM
implementations JavaScript unit tests run on: happy-dom, jsdom, linkedom and
warpdom.

Maintained by Sonu Kapoor, who is also the author of
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
- `data/wpt.json`: Web Platform Tests pass rates per area for warpdom and jsdom,
  imported from warpdom's published WPT summary with `npm run import-wpt --
  <summary.md>`; the source run (WPT commit, date, engine versions) is recorded
  in the file. happy-dom and linkedom are "not measured".

## Run

Node.js >= 22.12.

```sh
npm install
npm run probe        # writes data/results.json
npm test             # status classification, results format, site generator

cd website
npm install
npm run build        # generates the API pages from ../data, then builds website/build
npx docusaurus serve # serves website/build at http://localhost:3000
```

## Site

`website/` is a Docusaurus site. `website/scripts/generate.mjs` (run by
`prebuild` and `prestart`) writes `docs/apis/*.mdx`, `docs/wpt.mdx`,
`sidebars.generated.json` and copies of the data into `src/data/` and
`static/data/`. These generated files are git-ignored and must not be edited by
hand. The home page table is a React component (`src/components/ResultsTable.tsx`).
`.github/workflows/deploy.yml` builds and deploys it to GitHub Pages
(https://domparity.github.io) on push to main.

## Adding an API

1. Add `probes/<id>.mjs` exporting `{ id, title, summary, spec, exists(window),
   checks: [{ id, description, spec, run(window) }] }`, plus optionally
   `existsDescription`, `global` (the name of a global Node.js also defines) and
   `workaround` (only when a common, neutral workaround exists). A check passes
   when `run` returns or resolves; helpers are in `src/assert.mjs`.
2. Use only the window passed in (`window.document`, `new window.Event()`, ...),
   and check behavior the standard specifies and a browser shows, not one
   engine's behavior.
3. `npm run probe`, look at the new entries in `data/results.json`, then
   `npm run build` in `website/`.

## License

Code: MIT (`LICENSE`). Data in `data/`: CC BY 4.0 (`data/LICENSE`).
