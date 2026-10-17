import { ok, equal, throwsNamed } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/structured-data.html#dom-structuredclone';

export default {
  id: 'structured-clone',
  title: 'structuredClone()',
  summary: 'Deep-copies a value with the structured clone algorithm (Maps, Dates, cycles, typed arrays).',
  spec: SPEC,
  global: 'structuredClone',
  exists: (w) => typeof w.structuredClone === 'function',
  checks: [
    {
      id: 'map-date-cycle',
      description: 'Clones a Map, a Date and a circular reference into new objects with the same contents.',
      spec: SPEC,
      run(w) {
        const src = { d: new Date(5), m: new Map([['k', 1]]) };
        src.self = src;
        const c = w.structuredClone(src);
        ok(c !== src && c.self === c, 'cycle not preserved');
        equal(c.d.getTime(), 5, 'Date value');
        equal(c.m.get('k'), 1, 'Map entry');
      },
    },
    {
      id: 'function-throws',
      description: 'Cloning a function throws a "DataCloneError" DOMException.',
      spec: 'https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal',
      run(w) {
        throwsNamed(() => w.structuredClone({ f() {} }), 'DataCloneError', 'structuredClone({ f })');
      },
    },
  ],
  workaround: 'Node.js has structuredClone as a global since 17. Under Jest\'s jsdom environment it is not copied in; assigning the Node global in a setup file (globalThis.structuredClone ??= ...) is common, or the core-js polyfill.',
};
