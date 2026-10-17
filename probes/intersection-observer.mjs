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
      description:
        'A new observer has root null, rootMargin "0px 0px 0px 0px" and thresholds [0]. Intersection Observer §2.2: root is "null if none was provided"; rootMargin: "If no rootMargin was passed to the IntersectionObserver constructor, the value of this attribute is \'0px 0px 0px 0px\'"; §3.2.1 (initialize a new IntersectionObserver): "If thresholds is empty, append 0 to thresholds."',
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
      description:
        'Observing a connected element delivers an initial entry for it with an isIntersecting boolean, whether or not it intersects. Intersection Observer §3.2.2 (observe a target Element) registers it with "a previousThresholdIndex property set to -1"; §3.2.10 (update intersection observations) computes a thresholdIndex of 0 or more and "If thresholdIndex does not equal previousThresholdIndex … queue an IntersectionObserverEntry". HTML runs these steps in "update the rendering", and §3.4.2 forbids skipping that update while a target has had no entry yet.',
      spec: 'https://w3c.github.io/IntersectionObserver/#update-intersection-observations-algo',
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
