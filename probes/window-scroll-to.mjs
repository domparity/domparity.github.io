import { equal } from '../src/assert.mjs';

const SPEC = 'https://drafts.csswg.org/cssom-view/#dom-window-scrollto';

export default {
  id: 'window-scroll-to',
  title: 'window.scrollTo()',
  summary: 'Scrolls the viewport to a position.',
  spec: SPEC,
  exists: (w) => typeof w.scrollTo === 'function',
  checks: [
    {
      id: 'callable',
      description: 'scrollTo(0, 0) and scrollTo({ top: 0, behavior: "instant" }) return without error.',
      spec: SPEC,
      run(w) {
        w.scrollTo(0, 0);
        w.scrollTo({ top: 0, behavior: 'instant' });
      },
    },
    {
      id: 'scroll-position',
      description: 'With nothing to scroll, the position stays at 0: scrollX and scrollY are 0 after scrollTo(0, 50).',
      spec: 'https://drafts.csswg.org/cssom-view/#dom-window-scrolly',
      run(w) {
        w.scrollTo(0, 50);
        equal(w.scrollX, 0, 'scrollX');
        equal(w.scrollY, 0, 'scrollY');
      },
    },
  ],
  workaround: 'Tests commonly assign a no-op or a mock: window.scrollTo = () => {} (or vi.fn() / jest.fn()).',
};
