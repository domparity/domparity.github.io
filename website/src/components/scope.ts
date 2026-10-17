import idl from '../data/idl-summary.json';

// What a coverage number is out of: one spec group (data/spec-groups.json) or
// every spec ("all").
export type ScopeId = string;
export const DEFAULT_SCOPE = 'core';
export const ALL = 'all';

type Totals = (typeof idl)['totals'];

export function coverageScope(id: ScopeId): { id: ScopeId; title: string; noun: string; reason: string | null; totals: Totals } {
  const g = idl.groups.find((x) => x.id === id);
  if (!g) return { id: ALL, title: 'All web APIs', noun: 'web API', reason: null, totals: idl.totals };
  // "Test DOM core" -> "test-DOM-core members"; other titles in lower case.
  const noun = g.id === 'core' ? 'test-DOM-core' : g.title.toLowerCase();
  return { id: g.id, title: g.title, noun, reason: g.reason, totals: g as unknown as Totals };
}

export const SCOPES: ScopeId[] = [...idl.groups.map((g) => g.id), ALL];
