// Tiny helpers for probe checks. A check passes when it returns without
// throwing; a thrown error's message becomes the failure text.

export class CheckFailed extends Error {}

export function ok(condition, message) {
  if (!condition) throw new CheckFailed(message);
}

export function equal(actual, expected, what) {
  if (actual !== expected) {
    throw new CheckFailed(`${what}: expected ${show(expected)}, got ${show(actual)}`);
  }
}

export function throwsNamed(fn, name, what) {
  try {
    fn();
  } catch (e) {
    if (e && e.name === name) return;
    throw new CheckFailed(`${what}: expected ${name}, got ${e && e.name}: ${e && e.message}`);
  }
  throw new CheckFailed(`${what}: expected ${name}, nothing was thrown`);
}

// Resolves once predicate() is truthy, or rejects after `ms`.
export async function until(predicate, ms, what) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (predicate()) return;
    await sleep(10);
  }
  throw new CheckFailed(`${what} (waited ${ms} ms)`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function show(v) {
  if (typeof v === 'string') return JSON.stringify(v);
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}
