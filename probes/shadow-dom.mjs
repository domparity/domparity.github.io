import { ok, equal, until } from '../src/assert.mjs';

const SPEC = 'https://dom.spec.whatwg.org/#dom-element-attachshadow';

export default {
  id: 'shadow-dom',
  title: 'attachShadow() and <slot>',
  summary: 'Shadow trees and slot-based distribution of light-DOM children.',
  spec: SPEC,
  exists: (w) => typeof w.document.createElement('div').attachShadow === 'function',
  existsDescription: 'typeof element.attachShadow === "function".',
  checks: [
    {
      id: 'open-closed',
      description: 'attachShadow({ mode: "open" }) is exposed as element.shadowRoot; mode "closed" gives shadowRoot null.',
      spec: SPEC,
      run(w) {
        const a = w.document.createElement('div');
        const root = a.attachShadow({ mode: 'open' });
        ok(a.shadowRoot === root, 'open: shadowRoot is not the returned root');
        equal(root.mode, 'open', 'root.mode');
        const b = w.document.createElement('div');
        b.attachShadow({ mode: 'closed' });
        equal(b.shadowRoot, null, 'closed: shadowRoot');
      },
    },
    {
      id: 'slot-assignment',
      description: 'Named and default slots: assignedNodes() returns the matching light-DOM children and assignedSlot points back.',
      spec: 'https://dom.spec.whatwg.org/#find-slotables',
      run(w) {
        const host = w.document.body.appendChild(w.document.createElement('div'));
        host.innerHTML = '<span slot="title">T</span><p>body</p>';
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<slot name="title"></slot><slot></slot>';
        const [named, dflt] = root.querySelectorAll('slot');
        equal(named.assignedNodes().length, 1, 'named slot assignedNodes().length');
        ok(named.assignedNodes()[0] === host.firstChild, 'named slot got the wrong node');
        ok(host.querySelector('p').assignedSlot === dflt, 'p.assignedSlot is not the default slot');
      },
    },
    {
      id: 'encapsulation-and-retarget',
      description: 'document.querySelector does not see into the shadow tree, and an event from inside is retargeted to the host.',
      spec: 'https://dom.spec.whatwg.org/#retarget',
      run(w) {
        const host = w.document.body.appendChild(w.document.createElement('div'));
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<button class="inner-btn">x</button>';
        equal(w.document.querySelector('.inner-btn'), null, 'document.querySelector(".inner-btn")');
        let target;
        w.document.body.addEventListener('click', (e) => (target = e.target), { once: true });
        root.querySelector('button').dispatchEvent(new w.Event('click', { bubbles: true, composed: true }));
        ok(target === host, 'event.target seen by body is not the host');
      },
    },
    {
      id: 'slotchange',
      description: 'Adding a child that gets assigned to a slot fires "slotchange" on the slot.',
      spec: 'https://dom.spec.whatwg.org/#signal-a-slot-change',
      async run(w) {
        const host = w.document.body.appendChild(w.document.createElement('div'));
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<slot></slot>';
        let fired = false;
        root.querySelector('slot').addEventListener('slotchange', () => (fired = true));
        host.appendChild(w.document.createElement('span'));
        await until(() => fired, 500, '"slotchange" did not fire');
      },
    },
  ],
};
