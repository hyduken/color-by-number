export class PuzzleCanvas {
  constructor(canvas, definition, progress = []) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.definition = definition;
    this.progress = progress;
    this.selected = 0;
    this.focus = -1;
    this.hint = false;
    this.bad = -1;
  }
  resize(size) {
    this.size = size;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.canvas.height = Math.round(size * ratio);
    this.canvas.style.width = this.canvas.style.height = `${size}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }
  draw() {
    this.definition.cells.forEach((_, i) => this.drawCell(i));
  }
  drawCell(index) {
    const { width, cells, palette } = this.definition;
    const ctx = this.ctx,
      side = this.size / width;
    const x = (index % width) * side,
      y = Math.floor(index / width) * side;
    const filled = this.progress[index] || this.hint;
    ctx.fillStyle = filled
      ? palette[cells[index] - 1].color
      : index === this.bad
        ? "#f7ceca"
        : cells[index] === this.selected
          ? "#f4e4af"
          : "#fcfbf7";
    ctx.fillRect(x, y, side + 0.25, side + 0.25);
    if (!filled) {
      ctx.strokeStyle = "#dedbd3";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, side, side);
      ctx.fillStyle = cells[index] === this.selected ? "#614924" : "#77726e";
      ctx.font = `${cells[index] === this.selected ? 700 : 500} ${side * 0.4}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cells[index], x + side / 2, y + side / 2 + 0.5);
    }
    if (index === this.focus) {
      ctx.strokeStyle = "#573e74";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, side - 3, side - 3);
    }
  }
}
