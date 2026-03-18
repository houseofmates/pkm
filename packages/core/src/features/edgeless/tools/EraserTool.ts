import { BaseTool, ToolContext } from './BaseTool';
import { useEdgelessStore } from '../store';

export class EraserTool extends BaseTool {
  name = 'eraser' as const;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  onStart(ctx: ToolContext, x: number, y: number, pressure: number) {
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    ctx.ctx.globalCompositeOperation = 'destination-out';
    ctx.ctx.globalAlpha = 1;
  }

  onMove(ctx: ToolContext, x: number, y: number, pressure: number) {
    if (!this.isDrawing) return;

    const store = useEdgelessStore.getState();
    const size = store.eraserWidth || 20;
    const effectiveSize = size * Math.max(0.1, pressure);

    // Don't save/restore here - keep destination-out mode for continuous erasing
    ctx.ctx.globalCompositeOperation = 'destination-out';
    ctx.ctx.globalAlpha = 1;
    ctx.ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.ctx.beginPath();
    ctx.ctx.moveTo(this.lastX, this.lastY);
    ctx.ctx.lineTo(x, y);
    ctx.ctx.lineWidth = effectiveSize;
    ctx.ctx.lineCap = 'round';
    ctx.ctx.lineJoin = 'round';
    ctx.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  }

  onEnd(ctx: ToolContext) {
    this.isDrawing = false;
    ctx.ctx.globalCompositeOperation = 'source-over';
  }
}
