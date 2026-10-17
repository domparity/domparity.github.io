// Turns one engine's raw probe outcome into a status.
//
//   missing    the API is not defined (or checking for it threw)
//   supported  it exists and every check passes
//   stub       it exists, but no check works: each one fails, or the engine
//              reports "not implemented" (thrown or logged) while it runs
//   partial    it exists, at least one check works and at least one does not
//
// A "check" here is { id, pass, error, notImplemented }. A check works when it
// passes and the engine did not report "not implemented" while it ran (jsdom,
// for example, logs that for window.scrollTo and otherwise does nothing).

export const STATUSES = ['supported', 'partial', 'stub', 'missing'];

const NOT_IMPLEMENTED = /not (yet )?implemented|not supported|unsupported/i;

export function isNotImplementedText(text) {
  return typeof text === 'string' && NOT_IMPLEMENTED.test(text);
}

export function classify({ exists, checks = [] }) {
  if (!exists) return 'missing';
  const notWorking = checks.filter((c) => !works(c));
  if (notWorking.length === 0) return 'supported';
  // An API that exists but does none of what the checks ask is a stub, whether
  // or not the engine says so (an observer that never delivers an entry and
  // reports nothing is as much a stub as one that logs "not implemented").
  if (notWorking.length === checks.length) return 'stub';
  return 'partial';
}

export function works(check) {
  return check.pass && !check.notImplemented;
}
