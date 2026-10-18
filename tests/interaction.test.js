import test from "node:test";
import assert from "node:assert/strict";
import { bindInteraction } from "../src/renderer/interaction.js";

test("extra fingers during a pinch do not paint, and painting resumes after release", () => {
  const handlers = new Map();
  const canvas = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 160 }),
    focus() {},
    setPointerCapture() {},
  };
  const filled = [];
  bindInteraction({
    canvas,
    viewport: { scrollLeft: 0, scrollTop: 0 },
    renderer: { definition: { width: 16 } },
    fill: (i) => filled.push(i),
    finish() {},
    zoom: () => 1,
    isPanning: () => false,
    announce() {},
  });
  const down = (id, x) =>
    handlers.get("pointerdown")({
      pointerId: id,
      pointerType: "touch",
      clientX: x,
      clientY: x,
      preventDefault() {},
    });
  const up = (id) => handlers.get("pointerup")({ pointerId: id });
  down(1, 15);
  down(2, 55);
  down(3, 95);
  assert.deepEqual(filled, [17]);
  up(3);
  up(2);
  up(1);
  down(4, 95);
  assert.deepEqual(filled, [17, 153]);
});
