import { equal } from '../src/assert.mjs';

const SPEC = 'https://drafts.csswg.org/cssom/#dom-window-getcomputedstyle';

export default {
  id: 'computed-style',
  title: 'getComputedStyle()',
  summary: 'Returns the computed values of all CSS properties of an element after the cascade and inheritance.',
  spec: SPEC,
  exists: (w) => typeof w.getComputedStyle === 'function',
  checks: [
    {
      id: 'stylesheet-rule',
      description: 'A rule from a <style> element applies: .hidden { display: none } gives display "none".',
      spec: 'https://drafts.csswg.org/css-cascade/#cascade',
      run(w) {
        const d = w.document;
        const style = d.head.appendChild(d.createElement('style'));
        style.textContent = '.hidden { display: none }';
        const el = d.body.appendChild(d.createElement('div'));
        el.className = 'hidden';
        equal(w.getComputedStyle(el).display, 'none', 'display');
      },
    },
    {
      id: 'inherited',
      description: 'An inherited property set on the parent (color: red) computes to "rgb(255, 0, 0)" on the child.',
      spec: 'https://drafts.csswg.org/css-cascade/#inheriting',
      run(w) {
        const d = w.document;
        const parent = d.body.appendChild(d.createElement('div'));
        parent.setAttribute('style', 'color: red');
        const child = parent.appendChild(d.createElement('span'));
        equal(w.getComputedStyle(child).color, 'rgb(255, 0, 0)', 'child color');
      },
    },
    {
      id: 'initial-and-default',
      description:
        'Values not set by the page use the initial or user-agent value: a <div> has display "block", a <span> has visibility "visible".',
      spec: 'https://drafts.csswg.org/css-cascade/#initial-value',
      run(w) {
        const d = w.document;
        const div = d.body.appendChild(d.createElement('div'));
        const span = d.body.appendChild(d.createElement('span'));
        equal(w.getComputedStyle(div).display, 'block', 'div display');
        equal(w.getComputedStyle(span).visibility, 'visible', 'span visibility');
      },
    },
  ],
};
