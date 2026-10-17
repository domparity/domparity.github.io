import { ok, equal } from '../src/assert.mjs';

const SPEC = 'https://drafts.csswg.org/selectors-4/#relational';

function fixture(w) {
  const root = w.document.body.appendChild(w.document.createElement('section'));
  root.innerHTML = '<div id="a"><span class="x"></span></div><div id="b"><p><span class="x"></span></p></div><div id="c"></div>';
  return root;
}

export default {
  id: 'css-has',
  title: 'CSS :has() in selectors',
  summary: 'The relational pseudo-class: matches an element when a relative selector matches something around it.',
  spec: SPEC,
  exists(w) {
    try {
      w.document.querySelector(':has(*)');
      return true;
    } catch {
      return false;
    }
  },
  existsDescription: 'document.querySelector(":has(*)") does not throw a SyntaxError.',
  checks: [
    {
      id: 'descendant',
      description: 'querySelectorAll("div:has(.x)") matches both divs that contain a .x descendant.',
      spec: SPEC,
      run(w) {
        const root = fixture(w);
        equal(Array.from(root.querySelectorAll('div:has(.x)'), (e) => e.id).join(','), 'a,b', 'matched ids');
      },
    },
    {
      id: 'child-combinator',
      description: 'querySelectorAll("div:has(> .x)") matches only the div with a .x child.',
      spec: SPEC,
      run(w) {
        const root = fixture(w);
        equal(Array.from(root.querySelectorAll('div:has(> .x)'), (e) => e.id).join(','), 'a', 'matched ids');
      },
    },
    {
      id: 'matches-closest',
      description: 'element.matches(":has(.x)") and element.closest(":has(> p)") use :has() as well.',
      spec: 'https://dom.spec.whatwg.org/#dom-element-closest',
      run(w) {
        const root = fixture(w);
        ok(root.querySelector('#a').matches(':has(.x)'), '#a.matches(":has(.x)") is false');
        const inner = root.querySelector('#b .x');
        equal(inner.closest(':has(> p)')?.id, 'b', 'closest(":has(> p)").id');
      },
    },
  ],
};
