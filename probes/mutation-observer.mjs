import { ok, equal, sleep } from '../src/assert.mjs';

const SPEC = 'https://dom.spec.whatwg.org/#interface-mutationobserver';

export default {
  id: 'mutation-observer',
  title: 'MutationObserver',
  summary: 'Reports changes to the DOM tree (children, attributes, text) as batched records.',
  spec: SPEC,
  exists: (w) => typeof w.MutationObserver === 'function',
  checks: [
    {
      id: 'child-list-async',
      description: 'An appendChild() is reported asynchronously (not during the call) as one "childList" record.',
      spec: 'https://dom.spec.whatwg.org/#queue-a-mutation-observer-compound-microtask',
      async run(w) {
        const d = w.document;
        const records = [];
        const mo = new w.MutationObserver((r) => records.push(...r));
        mo.observe(d.body, { childList: true });
        d.body.appendChild(d.createElement('p'));
        equal(records.length, 0, 'records delivered synchronously');
        await sleep(20);
        equal(records.length, 1, 'records after a task');
        equal(records[0].type, 'childList', 'record type');
        equal(records[0].addedNodes.length, 1, 'addedNodes.length');
        mo.disconnect();
      },
    },
    {
      id: 'attribute-old-value',
      description: 'With attributeOldValue, an attribute change record carries attributeName and oldValue.',
      spec: 'https://dom.spec.whatwg.org/#dom-mutationobserverinit-attributeoldvalue',
      async run(w) {
        const el = w.document.createElement('div');
        el.setAttribute('title', 'a');
        const records = [];
        const mo = new w.MutationObserver((r) => records.push(...r));
        mo.observe(el, { attributes: true, attributeOldValue: true });
        el.setAttribute('title', 'b');
        await sleep(20);
        equal(records.length, 1, 'records');
        equal(records[0].attributeName, 'title', 'attributeName');
        equal(records[0].oldValue, 'a', 'oldValue');
        mo.disconnect();
      },
    },
    {
      id: 'take-records',
      description: 'takeRecords() returns pending records synchronously and empties the queue.',
      spec: 'https://dom.spec.whatwg.org/#dom-mutationobserver-takerecords',
      async run(w) {
        const el = w.document.createElement('div');
        let calls = 0;
        const mo = new w.MutationObserver(() => calls++);
        mo.observe(el, { childList: true });
        el.appendChild(w.document.createElement('span'));
        equal(mo.takeRecords().length, 1, 'takeRecords().length');
        await sleep(20);
        equal(calls, 0, 'callback calls after takeRecords()');
        mo.disconnect();
      },
    },
  ],
};
