export function recentPuzzles(records, limit = Infinity) {
  return [...records].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}
