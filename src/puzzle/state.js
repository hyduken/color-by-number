export function createState(definition, progress) {
  if (
    !definition ||
    definition.cells.length !== definition.width * definition.height ||
    !definition.cells.length ||
    !definition.cells.every((id) => definition.palette.some((p) => p.id === id))
  )
    throw new Error("This puzzle could not be opened.");
  return {
    definition,
    progress:
      progress?.length === definition.cells.length
        ? Array.from(progress, (v) => v === true)
        : definition.cells.map(() => false),
    undo: [],
    redo: [],
    stroke: [],
  };
}
export function paint(state, index, color) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= state.progress.length ||
    state.progress[index] ||
    state.definition.cells[index] !== color
  )
    return false;
  state.progress[index] = true;
  state.stroke.push(index);
  return true;
}
export function endStroke(state) {
  if (!state.stroke.length) return;
  state.undo.push({ indices: state.stroke, value: true });
  state.stroke = [];
  state.redo = [];
}
export function undo(state) {
  endStroke(state);
  const action = state.undo.pop();
  if (!action) return;
  action.indices.forEach((i) => {
    state.progress[i] = !action.value;
  });
  state.redo.push(action);
}
export function redo(state) {
  const action = state.redo.pop();
  if (!action) return;
  action.indices.forEach((i) => {
    state.progress[i] = action.value;
  });
  state.undo.push(action);
}
export function reset(state) {
  endStroke(state);
  const indices = state.progress.flatMap((filled, i) => (filled ? [i] : []));
  if (!indices.length) return;
  indices.forEach((i) => {
    state.progress[i] = false;
  });
  state.undo.push({ indices, value: false });
  state.redo = [];
}
export function summary(state) {
  const filled = state.progress.filter(Boolean).length;
  const remaining = Object.fromEntries(
    state.definition.palette.map((p) => [p.id, 0]),
  );
  state.definition.cells.forEach((id, i) => {
    if (!state.progress[i]) remaining[id]++;
  });
  return {
    filled,
    total: state.progress.length,
    percent: Math.floor((filled / state.progress.length) * 100),
    complete: filled === state.progress.length,
    remaining,
  };
}
