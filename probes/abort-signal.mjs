import { ok, equal, until } from '../src/assert.mjs';

const SPEC = 'https://dom.spec.whatwg.org/#interface-abortcontroller';

export default {
  id: 'abort-signal',
  title: 'AbortController / AbortSignal.timeout()',
  interfaces: ['AbortController', 'AbortSignal'],
  summary: 'Cancels asynchronous work through a signal; AbortSignal.timeout() and any() create signals that abort on their own.',
  spec: SPEC,
  global: 'AbortController',
  exists: (w) => typeof w.AbortController === 'function' && typeof w.AbortSignal === 'function',
  checks: [
    {
      id: 'abort-reason',
      description: 'abort() fires "abort" and sets signal.reason to an "AbortError" DOMException.',
      spec: 'https://dom.spec.whatwg.org/#dom-abortcontroller-abort',
      run(w) {
        const c = new w.AbortController();
        let fired = false;
        c.signal.addEventListener('abort', () => (fired = true));
        c.abort();
        ok(c.signal.aborted, 'signal.aborted is false');
        ok(fired, '"abort" event did not fire');
        equal(c.signal.reason && c.signal.reason.name, 'AbortError', 'reason.name');
      },
    },
    {
      id: 'timeout',
      description: 'AbortSignal.timeout(10) aborts with a "TimeoutError" DOMException.',
      spec: 'https://dom.spec.whatwg.org/#dom-abortsignal-timeout',
      async run(w) {
        equal(typeof w.AbortSignal.timeout, 'function', 'typeof AbortSignal.timeout');
        const s = w.AbortSignal.timeout(10);
        await until(() => s.aborted, 1000, 'signal never aborted');
        equal(s.reason && s.reason.name, 'TimeoutError', 'reason.name');
      },
    },
    {
      id: 'any',
      description: 'AbortSignal.any([a, b]) aborts when one of its inputs aborts, with that reason.',
      spec: 'https://dom.spec.whatwg.org/#dom-abortsignal-any',
      run(w) {
        equal(typeof w.AbortSignal.any, 'function', 'typeof AbortSignal.any');
        const a = new w.AbortController();
        const b = new w.AbortController();
        const s = w.AbortSignal.any([a.signal, b.signal]);
        b.abort('why');
        ok(s.aborted, 'combined signal not aborted');
        equal(s.reason, 'why', 'reason');
      },
    },
  ],
};
