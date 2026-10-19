export class HintMarker {
  constructor(viewport, canvas, width) {
    Object.assign(this, { viewport, canvas, width });
    this.indices = new Set();
  }
  show(indices) {
    this.clear();
    if (!indices.length) return;
    this.indices = new Set(indices);
    this.element = document.createElement('canvas');
    this.element.className = 'hint-overlay';
    this.element.setAttribute('aria-hidden', 'true');
    this.viewport.append(this.element);
    this.started = performance.now();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.update();
    this.timer = setTimeout(() => this.clear(), 4500);
    if (!this.reducedMotion) this.frame = requestAnimationFrame((time) => this.animate(time));
  }
  update() {
    if (!this.element) return;
    const size = this.canvas.getBoundingClientRect().width;
    this.side = size / this.width;
    this.element.width = this.element.height = Math.ceil(size);
    Object.assign(this.element.style, {
      left: `${this.canvas.offsetLeft}px`, top: `${this.canvas.offsetTop}px`,
      width: `${size}px`, height: `${size}px`,
    });
    this.draw(0);
  }
  draw(phase) {
    if (!this.element) return;
    const ctx = this.element.getContext('2d');
    ctx.clearRect(0, 0, this.element.width, this.element.height);
    const radius = Math.max(2, this.side * 0.3) + phase * Math.max(6, this.side * 0.8);
    ctx.beginPath();
    for (const index of this.indices) {
      const x = (index % this.width + 0.5) * this.side;
      const y = (Math.floor(index / this.width) + 0.5) * this.side;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.globalAlpha = 1 - phase * 0.8;
    ctx.strokeStyle = '#fffdf6'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.strokeStyle = '#77519d'; ctx.lineWidth = 1.8; ctx.stroke();
  }
  animate(time) {
    if (!this.element) return;
    // One overlay, capped at 30fps, also handles single-color 128×128 pictures.
    if (!this.lastFrame || time - this.lastFrame >= 32) {
      this.draw(((time - this.started) % 1300) / 1300);
      this.lastFrame = time;
    }
    this.frame = requestAnimationFrame((next) => this.animate(next));
  }
  remove(indices) {
    for (const index of indices) this.indices.delete(index);
    if (!this.indices.size) this.clear();
    else if (this.reducedMotion) this.draw(0);
  }
  clear() {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.frame);
    this.element?.remove();
    this.element = null;
    this.indices = new Set();
    this.lastFrame = 0;
  }
}
