// Turns one engine's raw probe outcome into a status.
//
//   missing    the API is not defined (or checking for it threw)
//   supported  it exists and every check passes
//   stub       it exists, no check works, and the engine itself says the
//              feature is not implemented (thrown or logged)
//   partial    it exists and at least one check does not work
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
  if (notWorking.length === checks.length && checks.some((c) => c.notImplemented)) return 'stub';
  return 'partial';
}

export function works(check) {
  return check.pass && !check.notImplemented;
}
