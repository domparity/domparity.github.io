import { ok, equal, sleep, until } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames';

export default {
  id: 'request-animation-frame',
  title: 'requestAnimationFrame()',
  summary: 'Schedules a callback before the next repaint.',
  spec: SPEC,
  exists: (w) => typeof w.requestAnimationFrame === 'function',
  checks: [
    {
      id: 'callback-timestamp',
      description: 'The callback runs (asynchronously) with a numeric timestamp.',
      spec: 'https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-animationframeprovider-requestanimationframe',
      async run(w) {
        let ts;
        const id = w.requestAnimationFrame((t) => (ts = t));
        equal(ts, undefined, 'callback ran synchronously; timestamp');
        ok(typeof id === 'number' && id > 0, `handle is not a positive number: ${id}`);
        await until(() => ts !== undefined, 1000, 'callback did not run');
        equal(typeof ts, 'number', 'typeof timestamp');
      },
    },
    {
      id: 'cancel',
      description: 'cancelAnimationFrame(handle) stops a scheduled callback from running.',
      spec: 'https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-animationframeprovider-cancelanimationframe',
      async run(w) {
        let ran = false;
        w.cancelAnimationFrame(w.requestAnimationFrame(() => (ran = true)));
        await sleep(100);
        equal(ran, false, 'cancelled callback ran');
      },
    },
  ],
};
