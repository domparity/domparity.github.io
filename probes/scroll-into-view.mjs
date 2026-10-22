const SPEC = 'https://drafts.csswg.org/cssom-view/#dom-element-scrollintoview';

export default {
  id: 'scroll-into-view',
  title: 'element.scrollIntoView()',
  summary: "Scrolls the element's ancestors so the element becomes visible.",
  spec: SPEC,
  exists: (w) => typeof w.document.createElement('div').scrollIntoView === 'function',
  existsDescription: 'typeof element.scrollIntoView === "function".',
  checks: [
    {
      id: 'callable',
      description:
        'scrollIntoView(), scrollIntoView(false) and scrollIntoView({ block: "center", behavior: "smooth" }) return without error.',
      spec: SPEC,
      run(w) {
        const el = w.document.body.appendChild(w.document.createElement('div'));
        el.scrollIntoView();
        el.scrollIntoView(false);
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
    },
  ],
  workaround: 'Tests commonly assign a no-op in a setup file: Element.prototype.scrollIntoView = function () {}.',
};
