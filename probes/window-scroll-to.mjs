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
      description:
        'scrollTo(0, 0) and scrollTo({ top: 0, behavior: "instant" }) return without error. CSSOM View §4 (Extensions to the Window Interface): scrollTo() "must act as if the scroll() method was invoked with the same arguments", which takes (x, y) or a ScrollToOptions dictionary; "instant" is a ScrollBehavior value (§3.2).',
      spec: SPEC,
      run(w) {
        w.scrollTo(0, 0);
        w.scrollTo({ top: 0, behavior: 'instant' });
      },
    },
    {
      id: 'scroll-position',
      description:
        'With nothing to scroll (an empty document), scrollX and scrollY are 0 after scrollTo(0, 50). CSSOM View §4, scroll() method steps: "If the viewport has downward overflow direction, let y be max(0, min(y, viewport scrolling area height - viewport height))". The viewport scrolling area (§2) of an empty document is the initial containing block, as tall as the viewport, so y becomes 0, and the next steps end the call because the position equals the current one. scrollY "must return the y-coordinate … of the top of the viewport, or zero if there is no viewport", so 0 either way.',
      spec: 'https://drafts.csswg.org/cssom-view/#dom-window-scroll',
      run(w) {
        w.scrollTo(0, 50);
        equal(w.scrollX, 0, 'scrollX');
        equal(w.scrollY, 0, 'scrollY');
      },
    },
  ],
  workaround: 'Tests commonly assign a no-op or a mock: window.scrollTo = () => {} (or vi.fn() / jest.fn()).',
};
