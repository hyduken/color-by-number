import test from "node:test";
import assert from "node:assert/strict";
import { quantize } from "../src/image/quantize.js";
import {
  createState,
  paint,
  endStroke,
  undo,
  redo,
  reset,
  summary,
} from "../src/puzzle/state.js";
import { cellAt, lineCells } from "../src/renderer/geometry.js";

function pixels(width, height, color) {
  return {
    width,
    height,
    data: Uint8ClampedArray.from(
      Array.from({ length: width * height }, (_, i) => color(i)).flat(),
    ),
  };
}
for (const [name, source] of [
  ["single color", pixels(16, 16, () => [210, 60, 35, 255])],
  ["transparent", pixels(24, 24, () => [0, 0, 0, 0])],
  ["tiny", pixels(1, 1, () => [10, 30, 60, 255])],
  [
    "large",
    pixels(256, 256, (i) => [i % 256, (i * 7) % 256, (i * 13) % 256, 255]),
  ],
]) {
  test(`quantizes ${name} with valid cells and bounded palette`, () => {
    const result = quantize(source, 6);
    assert.equal(result.cells.length, source.width * source.height);
    assert.ok(result.palette.length > 0 && result.palette.length <= 6);
    assert.ok(
      result.cells.every((id) => result.palette.some((p) => p.id === id)),
    );
    if (name === "transparent")
      assert.equal(result.palette[0].color, "#ffffff");
    if (name === "single color") assert.equal(result.palette.length, 1);
  });
}
test("quantisation is deterministic and does not mutate source", () => {
  const source = pixels(32, 32, (i) => [i % 256, (i * 3) % 256, 100, 255]);
  const before = source.data.slice();
  assert.deepEqual(quantize(source, 8), quantize(source, 8));
  assert.deepEqual(source.data, before);
});
test("invalid processing inputs fail clearly", () => {
  assert.throws(() => quantize({ width: 1, height: 1, data: [] }, 6));
  assert.throws(() =>
    quantize(
      pixels(1, 1, () => [0, 0, 0, 255]),
      0,
    ),
  );
});
const definition = {
  width: 2,
  height: 2,
  cells: [1, 2, 1, 2],
  palette: [
    { id: 1, color: "#ff0000" },
    { id: 2, color: "#ffffff" },
  ],
};
test("matching cells paint, incorrect and out-of-range attempts do not", () => {
  const state = createState(definition);
  assert.equal(paint(state, 1, 1), false);
  assert.equal(paint(state, -1, 1), false);
  assert.equal(paint(state, 4, 1), false);
  assert.equal(paint(state, 0, 1), true);
  assert.equal(paint(state, 0, 1), false);
  assert.equal(summary(state).filled, 1);
});
test("undo and redo restore entire strokes and new painting discards redo", () => {
  const state = createState(definition);
  paint(state, 0, 1);
  paint(state, 2, 1);
  endStroke(state);
  undo(state);
  assert.equal(summary(state).filled, 0);
  redo(state);
  assert.equal(summary(state).filled, 2);
  undo(state);
  paint(state, 1, 2);
  endStroke(state);
  redo(state);
  assert.equal(summary(state).filled, 1);
});
test("completion and restoring serialised progress", () => {
  const state = createState(definition);
  definition.cells.forEach((id, i) => paint(state, i, id));
  endStroke(state);
  assert.equal(summary(state).percent, 100);
  assert.equal(summary(state).complete, true);
  const restored = createState(
    JSON.parse(JSON.stringify(definition)),
    JSON.parse(JSON.stringify(state.progress)),
  );
  assert.equal(summary(restored).complete, true);
  reset(restored);
  assert.equal(summary(restored).filled, 0);
  undo(restored);
  assert.equal(summary(restored).complete, true);
});
test("invalid saved progress starts safely", () => {
  assert.deepEqual(createState(definition, [true]).progress, [
    false,
    false,
    false,
    false,
  ]);
});
test("pointer boundaries and interpolated drags do not wrap across rows", () => {
  assert.equal(cellAt(-1, 4, 20, 2), -1);
  assert.equal(cellAt(20, 4, 20, 2), -1);
  assert.equal(cellAt(19, 19, 20, 2), 3);
  assert.deepEqual(lineCells(0, 15, 4), [0, 5, 10, 15]);
  assert.deepEqual(lineCells(3, 4, 4), [3, 2, 5, 4]);
});

test("fit respects both width and height on short desktop and narrow screens", async () => {
  const { fitGrid } = await import("../src/renderer/geometry.js");
  assert.equal(fitGrid(820, 435), 403);
  assert.equal(fitGrid(378, 537), 346);
  assert.equal(fitGrid(1200, 1000), 660);
});

test("partial transparency composites against white before quantisation", () => {
  const result = quantize(
    pixels(1, 1, () => [255, 0, 0, 128]),
    6,
  );
  assert.equal(result.palette[0].color, "#ff7f7f");
});
