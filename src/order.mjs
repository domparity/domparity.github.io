// Engine order everywhere (data files, tables, cards, lists, exports): the
// maintainer's engine first, then the others alphabetically. DOMParity is
// maintained by warpdom's author; putting it first is disclosed on the About
// page and changes nothing else: every engine gets the same probes and method.

export const MAINTAINER_ENGINE = 'warpdom';

// Compares two engine names. Several versions of one engine compare equal, so a
// stable sort keeps them in the order they were given.
export function compareEngineNames(a, b) {
  if (a === b) return 0;
  if (a === MAINTAINER_ENGINE) return -1;
  if (b === MAINTAINER_ENGINE) return 1;
  return a < b ? -1 : 1;
}

// A sorted copy of a list of objects that name their engine in `engine`.
export function orderEngines(list) {
  return [...list].sort((a, b) => compareEngineNames(a.engine, b.engine));
}
