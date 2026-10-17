// Adds the generated Coverage pages: one per spec and one per interface, built
// from ../data/idl.json at build time (nothing is written to the source tree).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { specPage, interfacePage, interfaceIndex, specPath, interfacePath } from '../scripts/coverage.mjs';

const BUCKET = 40;

export default function coveragePlugin(context) {
  return {
    name: 'domparity-coverage',
    async loadContent() {
      const read = (f) => JSON.parse(readFileSync(join(context.siteDir, '..', 'data', f), 'utf8'));
      return { idl: read('idl.json'), groups: read('spec-groups.json') };
    },
    async contentLoaded({ content: { idl, groups }, actions }) {
      const { createData, addRoute } = actions;
      for (const id of Object.keys(idl.specs)) {
        const data = await createData(`spec-${id}.json`, JSON.stringify(specPage(idl, id, groups)));
        addRoute({ path: specPath(id), component: '@site/src/components/coverage/SpecPage', modules: { page: data }, exact: true });
      }
      // Interface pages share data modules (BUCKET interfaces each): one module
      // per page would put ~1000 entries in the client's route registry, which
      // every page downloads. The page finds its interface by its path.
      const names = Object.keys(interfaceIndex(idl)).sort();
      for (let b = 0; b * BUCKET < names.length; b++) {
        const group = names.slice(b * BUCKET, (b + 1) * BUCKET);
        const data = await createData(`interfaces-${b}.json`, JSON.stringify(Object.fromEntries(group.map((n) => [n, interfacePage(idl, n)]))));
        for (const name of group) {
          addRoute({ path: interfacePath(name), component: '@site/src/components/coverage/InterfacePage', modules: { bucket: data }, exact: true });
        }
      }
    },
  };
}
