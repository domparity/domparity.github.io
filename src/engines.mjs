// One adapter per engine. Each creates a window the way the engine's own
// documentation describes, with no polyfills. `pkg` is the npm package (or
// alias) to load, so several versions of one engine can be probed side by side
// (add "jsdom29": "npm:jsdom@29" to devDependencies and an entry to engines.json).

const HTML = '<!DOCTYPE html><html><head></head><body></body></html>';
const URL_ = 'http://localhost/';

export const adapters = {
  jsdom: {
    // pretendToBeVisual: true is what the Jest and Vitest jsdom environments pass.
    setup: `new JSDOM(html, { url: '${URL_}', pretendToBeVisual: true })`,
    async create(pkg) {
      const { JSDOM } = await import(pkg);
      const dom = new JSDOM(HTML, { url: URL_, pretendToBeVisual: true });
      return { window: dom.window, close: () => dom.window.close() };
    },
  },
  'happy-dom': {
    setup: `new Window({ url: '${URL_}' })`,
    async create(pkg) {
      const { Window } = await import(pkg);
      const window = new Window({ url: URL_ });
      return { window, close: () => window.happyDOM.close() };
    },
  },
  warpdom: {
    setup: `createWindow({ url: '${URL_}' })`,
    async create(pkg) {
      const { createWindow } = await import(pkg);
      const window = createWindow({ url: URL_ });
      return { window, close: () => window.close?.() };
    },
  },
  linkedom: {
    setup: 'parseHTML(html)',
    async create(pkg) {
      const { parseHTML } = await import(pkg);
      const window = parseHTML(HTML);
      return { window, close: () => {} };
    },
  },
};
