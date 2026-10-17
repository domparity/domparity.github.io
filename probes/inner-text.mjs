import { equal } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute';

export default {
  id: 'inner-text',
  title: 'element.innerText',
  summary: 'The rendered text of an element (line breaks, hidden content left out) and a setter that turns newlines into <br>.',
  spec: SPEC,
  exists: (w) => 'innerText' in w.document.createElement('div'),
  existsDescription: '"innerText" in element.',
  checks: [
    {
      id: 'br-newline',
      description: 'For a connected <p>a<br>b</p>, innerText is "a\\nb".',
      spec: SPEC,
      run(w) {
        const p = w.document.body.appendChild(w.document.createElement('p'));
        p.innerHTML = 'a<br>b';
        equal(p.innerText, 'a\nb', 'innerText');
      },
    },
    {
      id: 'display-none-skipped',
      description: 'Text inside a display: none child is left out: <div>a<span style="display:none">b</span></div> gives "a".',
      spec: 'https://html.spec.whatwg.org/multipage/dom.html#rendered-text-collection-steps',
      run(w) {
        const d = w.document.body.appendChild(w.document.createElement('div'));
        d.innerHTML = 'a<span style="display:none">b</span>';
        equal(d.innerText, 'a', 'innerText');
      },
    },
    {
      id: 'setter-br',
      description: 'Setting innerText = "a\\nb" produces the children a, <br>, b.',
      spec: 'https://html.spec.whatwg.org/multipage/dom.html#set-the-inner-text-steps',
      run(w) {
        const d = w.document.createElement('div');
        d.innerText = 'a\nb';
        equal(d.innerHTML, 'a<br>b', 'innerHTML');
      },
    },
  ],
};
