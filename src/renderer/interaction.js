import { cellAt, lineCells } from "./geometry.js";

export function bindInteraction({
  canvas,
  viewport,
  renderer,
  fill,
  finish,
  zoom,
  isPanning,
  announce,
}) {
  const pointers = new Map();
  let last = -1,
    previous,
    gesture;
  const indexAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    return cellAt(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      renderer.definition.width,
    );
  };
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    previous = { x: event.clientX, y: event.clientY };
    if (pointers.size === 2) {
      finish();
      last = -1;
      const [a, b] = [...pointers.values()];
      gesture = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoom() };
    } else if (pointers.size === 1 && !gesture && !isPanning()) {
      last = indexAt(event);
      fill(last);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      zoom(
        (gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
          Math.max(1, gesture.distance),
      );
      return;
    }
    if (isPanning()) {
      viewport.scrollLeft -= event.clientX - previous.x;
      viewport.scrollTop -= event.clientY - previous.y;
    } else if (!gesture) {
      const index = indexAt(event);
      if (index !== last) {
        (last < 0
          ? [index]
          : lineCells(last, index, renderer.definition.width)
        ).forEach(fill);
        last = index;
      }
    }
    previous = { x: event.clientX, y: event.clientY };
  });
  const release = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    finish();
    last = -1;
    if (!pointers.size) gesture = null;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener("keydown", (event) => {
    const width = renderer.definition.width;
    const moves = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -width,
      ArrowDown: width,
    };
    if (event.key in moves) {
      event.preventDefault();
      renderer.focus = Math.max(
        0,
        Math.min(
          width * width - 1,
          Math.max(0, renderer.focus) + moves[event.key],
        ),
      );
      renderer.draw();
      const x = renderer.focus % width,
        y = Math.floor(renderer.focus / width);
      announce(
        `Row ${y + 1}, column ${x + 1}, color ${renderer.definition.cells[renderer.focus]}${renderer.progress[renderer.focus] ? ", filled" : ""}.`,
      );
      const side = renderer.size / width;
      viewport.scrollLeft = Math.max(0, x * side - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, y * side - viewport.clientHeight / 2);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      fill(Math.max(0, renderer.focus));
      finish();
    }
  });
  canvas.addEventListener("blur", () => {
    renderer.focus = -1;
    renderer.draw();
  });
}
