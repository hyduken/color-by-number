export class HintMarker {
  constructor(viewport, canvas, width) {
    this.viewport = viewport;
    this.canvas = canvas;
    this.width = width;
    this.index = -1;
  }
  show(index) {
    this.clear();
    this.index = index;
    this.element = document.createElement('span');
    this.element.className = 'hint-marker';
    this.element.setAttribute('aria-hidden', 'true');
    this.viewport.append(this.element);
    this.update();
    this.viewport.scrollLeft = this.x - this.viewport.clientWidth / 2;
    this.viewport.scrollTop = this.y - this.viewport.clientHeight / 2;
    this.timer = setTimeout(() => this.clear(), 4500);
  }
  update() {
    if (!this.element) return;
    const side = this.canvas.getBoundingClientRect().width / this.width;
    this.x = this.canvas.offsetLeft + (this.index % this.width + 0.5) * side;
    this.y = this.canvas.offsetTop + (Math.floor(this.index / this.width) + 0.5) * side;
    Object.assign(this.element.style, {
      left: `${this.x}px`, top: `${this.y}px`,
      width: `${Math.max(side + 8, 24)}px`, height: `${Math.max(side + 8, 24)}px`,
    });
  }
  clear() {
    clearTimeout(this.timer);
    this.element?.remove();
    this.element = null;
    this.index = -1;
  }
}
