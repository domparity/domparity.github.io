import { ok, equal, until } from '../src/assert.mjs';

const SPEC = 'https://drafts.csswg.org/resize-observer/#resize-observer-interface';

export default {
  id: 'resize-observer',
  title: 'ResizeObserver',
  summary: 'Reports changes to the size of observed elements.',
  spec: SPEC,
  exists: (w) => typeof w.ResizeObserver === 'function',
  checks: [
    {
      id: 'observe',
      description: 'new ResizeObserver(cb).observe(el) and disconnect() do not throw.',
      spec: 'https://drafts.csswg.org/resize-observer/#dom-resizeobserver-observe',
      run(w) {
        const el = w.document.body.appendChild(w.document.createElement('div'));
        const ro = new w.ResizeObserver(() => {});
        ro.observe(el);
        ro.disconnect();
      },
    },
    {
      id: 'initial-notification',
      description: 'Observing a connected element delivers an initial entry for it (browsers do this at the next rendering update).',
      spec: 'https://drafts.csswg.org/resize-observer/#intro',
      async run(w) {
        const el = w.document.body.appendChild(w.document.createElement('div'));
        const entries = [];
        const ro = new w.ResizeObserver((e) => entries.push(...e));
        ro.observe(el);
        await until(() => entries.length > 0, 500, 'no entry delivered');
        ok(entries[0].target === el, 'entry.target is not the element');
        ok(entries[0].contentRect && typeof entries[0].contentRect.width === 'number', 'entry.contentRect.width is not a number');
        ro.disconnect();
      },
    },
  ],
  workaround: 'Tests usually replace it with a stub class or the "resize-observer-polyfill" package.',
};
