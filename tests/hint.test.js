import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, findHint, paintBrush } from '../src/puzzle/state.js';

const definition = { width: 2, height: 2, cells: [1, 2, 1, 2], palette: [{ id: 1, color: '#fff' }, { id: 2, color: '#000' }] };
test('hint finds an uncolored square only in the selected color and never paints', () => {
  const state = createState(definition, [true, false, false, false]);
  assert.equal(findHint(state, 1), 2);
  assert.equal(findHint(state, 2), 1);
  assert.deepEqual(state.progress, [true, false, false, false]);
  assert.equal(state.stroke.length, 0);
});
test('last remaining square is found, and finished colors have no hint', () => {
  const state = createState(definition, [true, true, true, false]);
  assert.equal(findHint(state, 2), 3);
  assert.equal(findHint(state, 1), -1);
  paintBrush(state, 3, 2, 0);
  assert.equal(findHint(state, 2), -1);
});
