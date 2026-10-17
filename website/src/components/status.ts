export type Status = 'supported' | 'partial' | 'stub' | 'missing';

export const STATUS: Record<Status, { label: string; symbol: string; meaning: string }> = {
  supported: { label: 'Supported', symbol: '✓', meaning: 'Exists and every check passes.' },
  partial: { label: 'Partial', symbol: '◐', meaning: 'Exists; at least one check fails.' },
  stub: { label: 'Stub', symbol: '○', meaning: 'Exists, but the engine reports it as not implemented and no check works.' },
  missing: { label: 'Missing', symbol: '✕', meaning: 'Not defined.' },
};
