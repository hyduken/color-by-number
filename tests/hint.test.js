import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, findHints, paintBrush } from '../src/puzzle/state.js';

const definition = { width: 2, height: 2, cells: [1, 2, 1, 2], palette: [{ id: 1, color: '#fff' }, { id: 2, color: '#000' }] };
test('hint finds all uncolored squares only in the selected color and never paints', () => {
  const state = createState(definition, [true, false, false, false]);
  assert.deepEqual(findHints(state, 1), [2]);
  assert.deepEqual(findHints(state, 2), [1, 3]);
  assert.deepEqual(state.progress, [true, false, false, false]);
  assert.equal(state.stroke.length, 0);
});
test('last remaining square is found, and finished colors have no hint', () => {
  const state = createState(definition, [true, true, true, false]);
  assert.deepEqual(findHints(state, 2), [3]);
  assert.deepEqual(findHints(state, 1), []);
  paintBrush(state, 3, 2, 0);
  assert.deepEqual(findHints(state, 2), []);
});

test('a full 128×128 picture includes every remaining matching square', () => {
  const definition = { width: 128, height: 128, cells: Array(16384).fill(1), palette: [{ id: 1, color: '#fff' }] };
  const state = createState(definition);
  assert.equal(findHints(state, 1).length, 16384);
  paintBrush(state, 0, 1, 0);
  const remaining = findHints(state, 1);
  assert.equal(remaining.length, 16383);
  assert.equal(remaining[0], 1);
  assert.equal(remaining.at(-1), 16383);
});
