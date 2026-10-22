import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, isNotImplementedText } from '../src/classify.mjs';

const pass = (id = 'a') => ({ id, pass: true, error: null, notImplemented: false });
const fail = (id = 'b', error = 'x: expected 1, got 2') => ({ id, pass: false, error, notImplemented: false });

test('missing when the API does not exist, whatever the checks say', () => {
  assert.equal(classify({ exists: false, checks: [] }), 'missing');
  assert.equal(classify({ exists: false, checks: [pass()] }), 'missing');
});

test('supported when it exists and every check passes', () => {
  assert.equal(classify({ exists: true, checks: [pass('a'), pass('b')] }), 'supported');
});

test('partial when some checks fail', () => {
  assert.equal(classify({ exists: true, checks: [pass('a'), fail('b')] }), 'partial');
});

test('stub when every check fails, even without a "not implemented" report', () => {
  assert.equal(classify({ exists: true, checks: [fail('a'), fail('b')] }), 'stub');
  assert.equal(classify({ exists: true, checks: [fail('a')] }), 'stub');
});

test('partial, not stub, as soon as one check works', () => {
  assert.equal(classify({ exists: true, checks: [pass('a'), fail('b'), fail('c')] }), 'partial');
});

test('stub when every check fails and the engine throws "not implemented"', () => {
  const ni = {
    id: 'a',
    pass: false,
    error: 'Error: Not implemented: HTMLFormElement.prototype.requestSubmit',
    notImplemented: true,
  };
  assert.equal(classify({ exists: true, checks: [ni, fail('b')] }), 'stub');
});

test('stub when checks pass but the engine logged "not implemented" for each', () => {
  const logged = { id: 'a', pass: true, error: null, notImplemented: true };
  assert.equal(classify({ exists: true, checks: [logged, { ...logged, id: 'b' }] }), 'stub');
});

test('partial when one check works and another is reported not implemented', () => {
  const logged = { id: 'b', pass: true, error: null, notImplemented: true };
  assert.equal(classify({ exists: true, checks: [pass('a'), logged] }), 'partial');
});

test('"not implemented" detection', () => {
  assert.ok(isNotImplementedText("Not implemented: Window's scrollTo() method"));
  assert.ok(isNotImplementedText('this feature is not yet implemented'));
  assert.ok(isNotImplementedText('Unsupported operation'));
  assert.ok(!isNotImplementedText('scrollY: expected 0, got 50'));
  assert.ok(!isNotImplementedText(undefined));
});
