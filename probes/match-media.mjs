import { ok, equal } from '../src/assert.mjs';

const SPEC = 'https://drafts.csswg.org/cssom-view/#dom-window-matchmedia';

export default {
  id: 'match-media',
  title: 'window.matchMedia()',
  interfaces: ['MediaQueryList'],
  summary: 'Evaluates a media query and returns a MediaQueryList that reports changes.',
  spec: SPEC,
  exists: (w) => typeof w.matchMedia === 'function',
  checks: [
    {
      id: 'all-matches',
      description: 'matchMedia("all").matches is true and matchMedia("not all").matches is false.',
      spec: 'https://drafts.csswg.org/cssom-view/#dom-mediaquerylist-matches',
      run(w) {
        equal(w.matchMedia('all').matches, true, 'matchMedia("all").matches');
        equal(w.matchMedia('not all').matches, false, 'matchMedia("not all").matches');
      },
    },
    {
      id: 'media-query-list',
      description: 'The result has a serialized .media and supports addEventListener("change", ...).',
      spec: 'https://drafts.csswg.org/cssom-view/#mediaquerylist',
      run(w) {
        const mql = w.matchMedia('(min-width: 100px)');
        equal(mql.media, '(min-width: 100px)', 'media');
        equal(typeof mql.addEventListener, 'function', 'typeof addEventListener');
        mql.addEventListener('change', () => {});
      },
    },
  ],
  workaround: 'A common pattern is to define window.matchMedia in a setup file with a function returning { matches: false, media, addEventListener() {}, removeEventListener() {} } (shown in the Jest documentation).',
};
