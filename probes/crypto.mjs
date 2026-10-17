import { ok, equal } from '../src/assert.mjs';

const SPEC = 'https://w3c.github.io/webcrypto/#Crypto-method-getRandomValues';

export default {
  id: 'crypto',
  title: 'crypto.getRandomValues() / randomUUID()',
  interfaces: ['Crypto'],
  summary: 'Cryptographically strong random bytes and random version 4 UUIDs.',
  spec: SPEC,
  global: 'crypto',
  exists: (w) => !!w.crypto && typeof w.crypto.getRandomValues === 'function',
  checks: [
    {
      id: 'get-random-values',
      description: 'getRandomValues(array) fills the array and returns the same array.',
      spec: SPEC,
      run(w) {
        const a = new Uint8Array(64);
        ok(w.crypto.getRandomValues(a) === a, 'did not return the same array');
        ok(a.some((x) => x !== 0), 'array still all zeros');
      },
    },
    {
      id: 'random-uuid',
      description: 'randomUUID() returns a lowercase version 4 UUID string.',
      spec: 'https://w3c.github.io/webcrypto/#Crypto-method-randomUUID',
      run(w) {
        equal(typeof w.crypto.randomUUID, 'function', 'typeof crypto.randomUUID');
        const u = w.crypto.randomUUID();
        ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u), `not a v4 UUID: ${u}`);
      },
    },
  ],
  workaround: 'Node.js has a Web Crypto global (globalThis.crypto) since 19; a setup file can assign it to the test global.',
};
