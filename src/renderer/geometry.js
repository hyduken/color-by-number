export function cellAt(x, y, size, grid) {
  if (x < 0 || y < 0 || x >= size || y >= size) return -1;
  return Math.floor((y / size) * grid) * grid + Math.floor((x / size) * grid);
}
export function lineCells(from, to, width) {
  if (from < 0 || to < 0) return [];
  let x = from % width,
    y = Math.floor(from / width);
  const tx = to % width,
    ty = Math.floor(to / width);
  const dx = Math.abs(tx - x),
    dy = -Math.abs(ty - y),
    sx = x < tx ? 1 : -1,
    sy = y < ty ? 1 : -1;
  let error = dx + dy;
  const result = [];
  while (true) {
    result.push(y * width + x);
    if (x === tx && y === ty) break;
    const twice = error * 2;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }
  return result;
}

export function fitGrid(width, height) {
  return Math.max(1, Math.min(width - 32, height - 32));
}
