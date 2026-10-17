export type Status = 'supported' | 'partial' | 'stub' | 'missing';

export const STATUS: Record<Status, { label: string; symbol: string; meaning: string }> = {
  supported: { label: 'Supported', symbol: '✓', meaning: 'Exists and every check passes.' },
  partial: { label: 'Partial', symbol: '◐', meaning: 'Exists; some checks work, at least one does not.' },
  stub: { label: 'Stub', symbol: '○', meaning: 'Exists, but no check works (each fails, or the engine reports "not implemented").' },
  missing: { label: 'Missing', symbol: '✕', meaning: 'Not defined.' },
};
