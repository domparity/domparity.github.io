import { equal } from '../src/assert.mjs';

const SPEC = 'https://encoding.spec.whatwg.org/#interface-textencoder';

export default {
  id: 'text-encoder',
  title: 'TextEncoder / TextDecoder',
  summary: 'Encodes strings to UTF-8 bytes and decodes bytes back to strings.',
  spec: SPEC,
  global: 'TextEncoder',
  exists: (w) => typeof w.TextEncoder === 'function' && typeof w.TextDecoder === 'function',
  checks: [
    {
      id: 'encode-utf8',
      description: 'new TextEncoder().encode("é") returns the UTF-8 bytes [195, 169].',
      spec: 'https://encoding.spec.whatwg.org/#dom-textencoder-encode',
      run(w) {
        const bytes = new w.TextEncoder().encode('é');
        equal(Array.from(bytes).join(','), '195,169', 'encoded bytes');
      },
    },
    {
      id: 'decode-utf8',
      description: 'new TextDecoder().decode() turns [195, 169] back into "é".',
      spec: 'https://encoding.spec.whatwg.org/#dom-textdecoder-decode',
      run(w) {
        equal(new w.TextDecoder().decode(new Uint8Array([195, 169])), 'é', 'decoded string');
      },
    },
  ],
  workaround: 'Node.js has TextEncoder and TextDecoder as globals (also in the "util" module); a setup file can assign them to the test global.',
};
