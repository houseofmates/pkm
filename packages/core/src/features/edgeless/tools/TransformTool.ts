import { BaseTool, ToolContext } from './BaseTool';

/**
 * TransformTool – apply move / scale / rotate to the entire active layer.
 * Ported from drawing-app TransformTool.ts.
 *
 * Usage:
 *   1. onStart → records initial pointer
 *   2. onMove → updates translation (or scale/rotation via modifier keys)
 *   3. onEnd → stops drag
 *   4. apply() → stamps the transformation onto the canvas pixels
 */
export class TransformTool extends BaseTool {
  name = 'transform-apply' as const;

  private x = 0;
  private y = 0;
  private scaleX = 1;
  private scaleY = 1;
  private rotation = 0;
  private activeHandle: 'move' | 'scale' | 'rotate' | null = null;
  private lastX = 0;
  private lastY = 0;

  onStart(_ctx: ToolContext, x: number, y: number, _pressure: number) {
    this.lastX = x;
    this.lastY = y;
    // Default to move; a future revision could detect handle proximity
    this.activeHandle = 'move';
  }

  onMove(ctx: ToolContext, x: number, y: number, _pressure: number) {
    if (!this.activeHandle) return;

    const dx = x - this.lastX;
    const dy = y - this.lastY;

    switch (this.activeHandle) {
      case 'move':
        this.x += dx;
        this.y += dy;
        break;
      case 'scale': {
        // Scale relative to center based on horizontal movement
        const factor = 1 + dx * 0.005;
        this.scaleX *= factor;
        this.scaleY *= factor;
        break;
      }
      case 'rotate': {
        // Rotation proportional to horizontal movement
        this.rotation += dx * 0.01;
        break;
      }
    }

    this.lastX = x;
    this.lastY = y;
    this.updatePreview(ctx);
  }

  onEnd(_ctx: ToolContext) {
    this.activeHandle = null;
  }

  /** Set the active interaction handle programmatically */
  setHandle(handle: 'move' | 'scale' | 'rotate') {
    this.activeHandle = handle;
  }

  /** Apply the accumulated transformation to the layer canvas pixels */
  apply(ctx: ToolContext) {
    const { ctx: layerCtx, canvas } = ctx;

    // Copy current pixels to a temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(canvas, 0, 0);

    // Clear and redraw with transformation
    layerCtx.clearRect(0, 0, canvas.width, canvas.height);
    layerCtx.save();
    layerCtx.translate(this.x, this.y);
    layerCtx.rotate(this.rotation);
    layerCtx.scale(this.scaleX, this.scaleY);
    layerCtx.drawImage(tempCanvas, 0, 0);
    layerCtx.restore();

    // Reset accumulators
    this.x = 0;
    this.y = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
  }

  /** Reset without applying */
  reset() {
    this.x = 0;
    this.y = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
    this.activeHandle = null;
  }

  private updatePreview(_ctx: ToolContext) {
    // In a live preview implementation, a ghost overlay would render here.
    // For now the transform is applied on confirmTransform / apply().
  }
}
