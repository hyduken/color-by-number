import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, paintBrush, endStroke, undo, redo } from '../src/puzzle/state.js';

function picture(width = 16) {
  return createState({ width, height: width, cells: Array(width * width).fill(1), palette: [{ id: 1, color: '#ff0000' }, { id: 2, color: '#0000ff' }] });
}
test('medium brush paints a circular area and a single-square brush stays precise', () => {
  const state = picture();
  assert.equal(paintBrush(state, 8 * 16 + 8, 1, 3).length, 29);
  assert.equal(state.progress[8 * 16 + 11], true);
  assert.equal(state.progress[11 * 16 + 11], false);
  const precise = picture();
  assert.deepEqual(paintBrush(precise, 24, 1, 0), [24]);
});
test('brush clips at corners without wrapping into other rows', () => {
  const state = picture();
  assert.deepEqual(paintBrush(state, 15, 1, 1), [14, 15, 31]);
  assert.equal(state.progress[16], false);
  assert.equal(paintBrush(state, -1, 1, 3).length, 0);
  assert.equal(paintBrush(state, 256, 1, 3).length, 0);
});
test('brush only paints matching cells, even when its centre has another number', () => {
  const state = picture(5);
  state.definition.cells[12] = 2;
  assert.deepEqual(paintBrush(state, 12, 1, 1), [7, 11, 13, 17]);
  assert.equal(state.progress[12], false);
  assert.deepEqual(paintBrush(state, 12, 1, 1), []);
});
test('overlapping brush stamps undo and redo as a single stroke', () => {
  const state = picture();
  paintBrush(state, 120, 1, 3);
  paintBrush(state, 121, 1, 3);
  const painted = [...state.progress];
  endStroke(state);
  assert.equal(state.undo.length, 1);
  assert.equal(new Set(state.undo[0].indices).size, state.undo[0].indices.length);
  undo(state);
  assert.equal(state.progress.some(Boolean), false);
  redo(state);
  assert.deepEqual(state.progress, painted);
});
