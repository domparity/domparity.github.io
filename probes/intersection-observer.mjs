import { ok, equal, until } from '../src/assert.mjs';

const SPEC = 'https://w3c.github.io/IntersectionObserver/#intersection-observer-interface';

export default {
  id: 'intersection-observer',
  title: 'IntersectionObserver',
  summary: 'Reports when observed elements enter or leave the viewport or a root element.',
  spec: SPEC,
  exists: (w) => typeof w.IntersectionObserver === 'function',
  checks: [
    {
      id: 'defaults',
      description: 'A new observer has root null, rootMargin "0px 0px 0px 0px" and thresholds [0].',
      spec: 'https://w3c.github.io/IntersectionObserver/#dom-intersectionobserver-intersectionobserver',
      run(w) {
        const io = new w.IntersectionObserver(() => {});
        equal(io.root, null, 'root');
        equal(io.rootMargin, '0px 0px 0px 0px', 'rootMargin');
        equal(Array.from(io.thresholds || []).join(','), '0', 'thresholds');
        io.disconnect();
      },
    },
    {
      id: 'initial-notification',
      description: 'Observing a connected element delivers an initial entry for it with an isIntersecting boolean.',
      spec: 'https://w3c.github.io/IntersectionObserver/#dom-intersectionobserver-observe',
      async run(w) {
        const el = w.document.body.appendChild(w.document.createElement('div'));
        const entries = [];
        const io = new w.IntersectionObserver((e) => entries.push(...e));
        io.observe(el);
        await until(() => entries.length > 0, 500, 'no entry delivered');
        ok(entries[0].target === el, 'entry.target is not the element');
        equal(typeof entries[0].isIntersecting, 'boolean', 'typeof entry.isIntersecting');
        io.disconnect();
      },
    },
  ],
  workaround: 'Tests usually replace it with a mock class (for example the "react-intersection-observer/test-utils" helpers or a hand-written stub).',
};
