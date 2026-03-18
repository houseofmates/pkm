import { BaseTool, ToolContext } from './BaseTool';

export class LassoTool extends BaseTool {
  name = 'lasso' as const;
  private points: { x: number; y: number }[] = [];
  private isDrawing = false;
  private isClosed = false;
  // indicator when pointer is close to start
  private nearStart = false;
  private SNAP_RADIUS = 10; // pixels

  onStart(ctx: ToolContext, x: number, y: number, pressure: number) {
    // If already closed, start a brand new selection
    if (this.isClosed) {
      this.reset();
    }

    this.isDrawing = true;

    // Allow multi-stroke lasso: if points already exist and selection not closed, resume
    if (this.points.length === 0) {
      this.points = [{ x, y }];
    } else {
      // Check if tapping/clicking near the start point → close the lasso
      const start = this.points[0];
      if (start && this.points.length >= 3) {
        const distToStart = Math.hypot(x - start.x, y - start.y);
        if (distToStart <= this.SNAP_RADIUS) {
          this.nearStart = true;
          this.confirm();
          return;
        }
      }
      const last = this.points[this.points.length - 1];
      // If the new start is far from the last point, append a new anchor to continue
      if (!last || Math.hypot(last.x - x, last.y - y) > 1) {
        this.points.push({ x, y });
      }
    }
  }

  onMove(ctx: ToolContext, x: number, y: number, pressure: number) {
    if (!this.isDrawing || this.isClosed) return;

    // Throttle point addition to avoid excessive points
    const last = this.points[this.points.length - 1];
    if (last) {
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist < 2) return; // decreased threshold for smoother capture
    }

    this.points.push({ x, y });

    // Detect proximity to starting point and mark for snap/auto-close
    const start = this.points[0];
    if (start && this.points.length > 8) {
      const distToStart = Math.hypot(x - start.x, y - start.y);
      this.nearStart = distToStart <= this.SNAP_RADIUS;
      // If user moves over the start while still drawing, auto-confirm to close
      if (this.nearStart) {
        this.confirm();
      }
    }
  }

  onEnd(ctx: ToolContext) {
    // Keep the points (allow user to resume later). Auto-close if pointer ended near the start.
    this.isDrawing = false;
    if (this.nearStart && this.points.length >= 3) {
      this.confirm();
    }
  }

  /** Call this when user presses Enter or taps confirm */
  confirm(): { x: number; y: number }[] | null {
    if (this.points.length < 3) return null;
    if (!this.isClosed) {
      this.isClosed = true;
      // Close the path by appending the first point
      this.points.push({ ...this.points[0] });
    }
    return this.points;
  }

  reset() {
    this.points = [];
    this.isDrawing = false;
    this.isClosed = false;
    this.nearStart = false;
  }

  getPoints() {
    return this.points;
  }

  getIsClosed() {
    return this.isClosed;
  }

  drawOverlay(overlayCtx: CanvasRenderingContext2D, time: number) {
    if (this.points.length < 2) return;

    overlayCtx.save();
    overlayCtx.setLineDash([6, 4]);
    overlayCtx.lineDashOffset = -time * 0.05;
    overlayCtx.strokeStyle = '#f6b012';
    overlayCtx.lineWidth = 1.5;

    overlayCtx.beginPath();
    overlayCtx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      overlayCtx.lineTo(this.points[i].x, this.points[i].y);
    }

    if (this.isClosed) {
      overlayCtx.closePath();
      overlayCtx.fillStyle = 'rgba(246, 176, 18, 0.05)';
      overlayCtx.fill();
    }

    overlayCtx.stroke();

    // Draw small snap indicator at the start point so user can easily close selection
    const start = this.points[0];
    if (start) {
      overlayCtx.beginPath();
      overlayCtx.arc(start.x, start.y, Math.max(4, Math.min(8, this.SNAP_RADIUS / 1.6)), 0, Math.PI * 2);
      overlayCtx.fillStyle = this.nearStart ? 'rgba(246,176,18,0.95)' : 'rgba(246,176,18,0.18)';
      overlayCtx.fill();
      overlayCtx.lineWidth = 1;
      overlayCtx.strokeStyle = 'rgba(0,0,0,0.2)';
      overlayCtx.stroke();
    }

    overlayCtx.setLineDash([]);
    overlayCtx.restore();
  }
}
