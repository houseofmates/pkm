export interface TransformHandle {
  x: number;
  y: number;
  type: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';
}

export interface TransformState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // radians
  scaleX: number;
  scaleY: number;
}

export class TransformBox {
  state: TransformState;
  private isDragging = false;
  private dragHandle: TransformHandle['type'] | 'move' | null = null;
  private startMouse = { x: 0, y: 0 };
  private startState: TransformState | null = null;

  constructor(x: number, y: number, width: number, height: number) {
    this.state = { x, y, width, height, rotation: 0, scaleX: 1, scaleY: 1 };
  }

  getHandles(): TransformHandle[] {
    const { x, y, width: w, height: h } = this.state;
    return [
      { x, y, type: 'nw' },
      { x: x + w / 2, y, type: 'n' },
      { x: x + w, y, type: 'ne' },
      { x: x + w, y: y + h / 2, type: 'e' },
      { x: x + w, y: y + h, type: 'se' },
      { x: x + w / 2, y: y + h, type: 's' },
      { x, y: y + h, type: 'sw' },
      { x, y: y + h / 2, type: 'w' },
      { x: x + w / 2, y: y - 20, type: 'rotate' },
    ];
  }

  hitTest(mx: number, my: number): TransformHandle['type'] | 'move' | null {
    const handles = this.getHandles();
    for (const h of handles) {
      if (Math.abs(mx - h.x) < 8 && Math.abs(my - h.y) < 8) return h.type;
    }
    const { x, y, width: w, height: h } = this.state;
    if (mx >= x && mx <= x + w && my >= y && my <= y + h) return 'move';
    return null;
  }

  startDrag(mx: number, my: number) {
    const hit = this.hitTest(mx, my);
    if (!hit) return false;
    this.isDragging = true;
    this.dragHandle = hit;
    this.startMouse = { x: mx, y: my };
    this.startState = { ...this.state };
    return true;
  }

  drag(mx: number, my: number) {
    if (!this.isDragging || !this.startState) return;
    const dx = mx - this.startMouse.x;
    const dy = my - this.startMouse.y;

    switch (this.dragHandle) {
      case 'move':
        this.state.x = this.startState.x + dx;
        this.state.y = this.startState.y + dy;
        break;
      case 'se':
        this.state.width = Math.max(10, this.startState.width + dx);
        this.state.height = Math.max(10, this.startState.height + dy);
        break;
      case 'nw':
        this.state.x = this.startState.x + dx;
        this.state.y = this.startState.y + dy;
        this.state.width = Math.max(10, this.startState.width - dx);
        this.state.height = Math.max(10, this.startState.height - dy);
        break;
      case 'ne':
        this.state.y = this.startState.y + dy;
        this.state.width = Math.max(10, this.startState.width + dx);
        this.state.height = Math.max(10, this.startState.height - dy);
        break;
      case 'sw':
        this.state.x = this.startState.x + dx;
        this.state.width = Math.max(10, this.startState.width - dx);
        this.state.height = Math.max(10, this.startState.height + dy);
        break;
      case 'n':
        this.state.y = this.startState.y + dy;
        this.state.height = Math.max(10, this.startState.height - dy);
        break;
      case 's':
        this.state.height = Math.max(10, this.startState.height + dy);
        break;
      case 'w':
        this.state.x = this.startState.x + dx;
        this.state.width = Math.max(10, this.startState.width - dx);
        break;
      case 'e':
        this.state.width = Math.max(10, this.startState.width + dx);
        break;
      case 'rotate': {
        const cx = this.startState.x + this.startState.width / 2;
        const cy = this.startState.y + this.startState.height / 2;
        const startAngle = Math.atan2(this.startMouse.y - cy, this.startMouse.x - cx);
        const currentAngle = Math.atan2(my - cy, mx - cx);
        this.state.rotation = this.startState.rotation + (currentAngle - startAngle);
        break;
      }
    }
  }

  endDrag() {
    this.isDragging = false;
    this.dragHandle = null;
  }

  flipHorizontal() {
    this.state.scaleX *= -1;
  }

  flipVertical() {
    this.state.scaleY *= -1;
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    const { x, y, width: w, height: h, rotation } = this.state;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    // Marching ants border
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -time * 0.05;
    ctx.strokeStyle = '#f6b012';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Handles
    const handles = this.getHandles();
    ctx.setLineDash([]);
    handles.forEach(handle => {
      ctx.beginPath();
      if (handle.type === 'rotate') {
        // Draw rotation handle
        ctx.strokeStyle = '#f6b012';
        ctx.lineWidth = 1;
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(handle.x, handle.y);
        ctx.stroke();
        ctx.fillStyle = '#f6b012';
        ctx.arc(handle.x, handle.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#f6b012';
        ctx.lineWidth = 1.5;
        ctx.rect(handle.x - 4, handle.y - 4, 8, 8);
        ctx.fill();
        ctx.stroke();
      }
    });

    ctx.restore();
  }
}
