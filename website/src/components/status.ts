export type Status = 'supported' | 'partial' | 'stub' | 'missing';

export const STATUS: Record<Status, { label: string; symbol: string; meaning: string }> = {
  supported: { label: 'Supported', symbol: '✓', meaning: 'Exists and every check passes.' },
  partial: { label: 'Partial', symbol: '◐', meaning: 'Exists; some checks work, at least one does not.' },
  stub: {
    label: 'Stub',
    symbol: '○',
    meaning: 'Exists, but no check works (each fails, or the engine reports "not implemented").',
  },
  missing: { label: 'Missing', symbol: '✕', meaning: 'Not defined.' },
};

// Existence pass (data/idl.json) codes.
export type IdlStatus = 'present' | 'node' | 'stub' | 'missing' | 'unknown';

export const IDL_INTERFACE: Record<string, { status: IdlStatus; label: string; symbol: string; meaning: string }> = {
  P: { status: 'present', label: 'Present', symbol: '✓', meaning: 'Defined on the window.' },
  N: {
    status: 'node',
    label: 'Node.js',
    symbol: '⬢',
    meaning: "Defined, but it is Node.js's own global (the very same object), not the engine's.",
  },
  S: { status: 'stub', label: 'Stub', symbol: '○', meaning: 'Defined, but constructing it reports "not implemented".' },
  '-': { status: 'missing', label: 'Missing', symbol: '✕', meaning: 'Not defined on the window.' },
  '?': { status: 'unknown', label: 'Not probed', symbol: '?', meaning: 'The engine was not probed (it crashed).' },
};

export const IDL_MEMBER: Record<string, { status: IdlStatus; label: string; symbol: string; meaning: string }> = {
  '1': { status: 'present', label: 'yes', symbol: '✓', meaning: 'Defined where Web IDL puts it.' },
  '0': { status: 'missing', label: 'no', symbol: '✕', meaning: 'Not defined.' },
  '?': { status: 'unknown', label: '?', symbol: '?', meaning: 'Not probed.' },
};

export const MEMBER_KIND: Record<string, string> = {
  a: 'attribute',
  o: 'method',
  c: 'constant',
  sa: 'static attribute',
  so: 'static method',
  i: 'iteration',
};
