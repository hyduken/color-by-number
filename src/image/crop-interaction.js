export function bindCropInteraction({ canvas, source, settings, onChange }) {
  const pointers = new Map();
  let gesture;
  const midpoint = () => {
    const points = [...pointers.values()];
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      distance: points.length === 2
        ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
        : 0,
    };
  };
  const rebase = () => {
    if (!pointers.size) { gesture = null; return; }
    const point = midpoint();
    const bounds = canvas.getBoundingClientRect();
    const side = Math.min(source.width, source.height) / settings.zoom;
    gesture = {
      bounds, distance: point.distance, zoom: settings.zoom,
      anchorX: (source.width - side) * settings.x / 100 + (point.x - bounds.left) / bounds.width * side,
      anchorY: (source.height - side) * settings.y / 100 + (point.y - bounds.top) / bounds.height * side,
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    if ((event.pointerType === 'mouse' && event.button !== 0) || pointers.size >= 2) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebase();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const point = midpoint();
    const zoom = Math.max(1, Math.min(3, gesture.distance
      ? gesture.zoom * point.distance / gesture.distance : gesture.zoom));
    const side = Math.min(source.width, source.height) / zoom;
    const left = gesture.anchorX - (point.x - gesture.bounds.left) / gesture.bounds.width * side;
    const top = gesture.anchorY - (point.y - gesture.bounds.top) / gesture.bounds.height * side;
    onChange({
      zoom,
      x: source.width === side ? 50 : Math.max(0, Math.min(100, left / (source.width - side) * 100)),
      y: source.height === side ? 50 : Math.max(0, Math.min(100, top / (source.height - side) * 100)),
    });
  });
  const release = (event) => {
    if (pointers.delete(event.pointerId)) rebase();
  };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, release);
}
