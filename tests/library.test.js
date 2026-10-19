import test from 'node:test';
import assert from 'node:assert/strict';
import { recentPuzzles } from '../src/puzzle/library.js';

test('home gets seven recent puzzles, collection retains all without changing input', () => {
  const records = Array.from({ length: 12 }, (_, i) => ({ id: i, updatedAt: i }));
  assert.deepEqual(recentPuzzles(records, 7).map((p) => p.id), [11, 10, 9, 8, 7, 6, 5]);
  assert.equal(recentPuzzles(records).length, 12);
  assert.equal(records[0].id, 0);
  assert.deepEqual(recentPuzzles([], 7), []);
});
