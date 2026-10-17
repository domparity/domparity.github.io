import { equal } from '../src/assert.mjs';

const SPEC = 'https://html.spec.whatwg.org/multipage/custom-elements.html';

let n = 0;
const name = (base) => `${base}-${++n}`;

export default {
  id: 'custom-elements',
  title: 'customElements.define() and lifecycle callbacks',
  interfaces: ['CustomElementRegistry'],
  summary: 'Autonomous custom elements: registration, upgrade and the connected, disconnected and attributeChanged callbacks.',
  spec: SPEC,
  exists: (w) => !!w.customElements && typeof w.customElements.define === 'function',
  existsDescription: 'window.customElements.define is a function.',
  checks: [
    {
      id: 'connected-disconnected',
      description: 'connectedCallback runs on insertion into the document and disconnectedCallback on removal.',
      spec: 'https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-reactions',
      run(w) {
        const log = [];
        const tag = name('x-life');
        w.customElements.define(tag, class extends w.HTMLElement {
          connectedCallback() { log.push('connected'); }
          disconnectedCallback() { log.push('disconnected'); }
        });
        const el = w.document.createElement(tag);
        w.document.body.appendChild(el);
        el.remove();
        equal(log.join(','), 'connected,disconnected', 'callbacks');
      },
    },
    {
      id: 'attribute-changed',
      description: 'attributeChangedCallback(name, old, new) runs for attributes listed in observedAttributes only.',
      spec: 'https://html.spec.whatwg.org/multipage/custom-elements.html#concept-custom-element-definition-observed-attributes',
      run(w) {
        const log = [];
        const tag = name('x-attr');
        w.customElements.define(tag, class extends w.HTMLElement {
          static get observedAttributes() { return ['size']; }
          attributeChangedCallback(n, o, v) { log.push(`${n}:${o}->${v}`); }
        });
        const el = w.document.createElement(tag);
        el.setAttribute('size', '1');
        el.setAttribute('other', 'x');
        el.setAttribute('size', '2');
        equal(log.join(','), 'size:null->1,size:1->2', 'callbacks');
      },
    },
    {
      id: 'upgrade',
      description: 'An element parsed before define() is upgraded when its definition arrives; whenDefined() and get() see it.',
      spec: 'https://html.spec.whatwg.org/multipage/custom-elements.html#upgrades',
      async run(w) {
        const tag = name('x-late');
        w.document.body.innerHTML = `<${tag}></${tag}>`;
        const el = w.document.body.firstChild;
        const defined = w.customElements.whenDefined(tag);
        class Late extends w.HTMLElement {
          constructor() { super(); this.upgraded = true; }
        }
        w.customElements.define(tag, Late);
        equal(el.upgraded, true, 'el.upgraded');
        equal(w.customElements.get(tag), Late, 'customElements.get()');
        await defined;
      },
    },
  ],
};
