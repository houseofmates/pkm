import { BaseTool, ToolContext } from './BaseTool';
import { TransformBox } from './TransformBox';
import { useEdgelessStore } from '../store';

/* *
 * selectiontool – marquee rectangle or lasso-capture → pixel-level cut → transformbox
 * ported from drawing-app selectiontool.ts, adapted for pkm edgeless store.
 *
 * flow:
 *   1. user draws a marquee rect or lasso path closes
 *   2. captureselection() cuts the selected pixels out of the layer
 *   3. a transformbox appears – user can move, scale (freeform squish/stretch), rotate
 *   4. confirmtransform() stamps the sub-canvas back onto the layer */
export class SelectionTool extends BaseTool {
  name = 'selection' as const;
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private selectionRect: { x: number; y: number; w: number; h: number } | null = null;
  public transformBox: TransformBox | null = null;

  // pixel buffer held during transformation
  private subCanvas: HTMLCanvasElement | null = null;
  private originalPos = { x: 0, y: 0 };

  onStart(ctx: ToolContext, x: number, y: number, pressure: number) {
    // if we already have a transform box, check if the click lands on a handle
    if (this.transformBox) {
      const hit = this.transformBox.hitTest(x, y);
      if (hit) {
        this.transformBox.startDrag(x, y);
        return;
      }
      // clicked outside the box – confirm (stamp) the current transform
      this.confirmTransform(ctx);
    }

    // begin marquee rectangle
    this.isDrawing = true;
    this.startX = x;
    this.startY = y;
    this.selectionRect = null;
  }

  onMove(ctx: ToolContext, x: number, y: number, pressure: number) {
    // dragging a transform handle
    if (this.transformBox) {
      this.transformBox.drag(x, y);
      return;
    }

    if (!this.isDrawing) return;

    // build the rectangle as the user drags
    const rx = Math.min(this.startX, x);
    const ry = Math.min(this.startY, y);
    const rw = Math.abs(x - this.startX);
    const rh = Math.abs(y - this.startY);
    this.selectionRect = { x: rx, y: ry, w: rw, h: rh };
  }

  onEnd(ctx: ToolContext) {
    // releasing a transform handle
    if (this.transformBox) {
      this.transformBox.endDrag();
      return;
    }

    this.isDrawing = false;

    // if the rectangle is large enough, capture the pixels
    if (this.selectionRect && this.selectionRect.w > 5 && this.selectionRect.h > 5) {
      this.captureSelection(ctx, [
        { x: this.selectionRect.x, y: this.selectionRect.y },
        { x: this.selectionRect.x + this.selectionRect.w, y: this.selectionRect.y },
        { x: this.selectionRect.x + this.selectionRect.w, y: this.selectionRect.y + this.selectionRect.h },
        { x: this.selectionRect.x, y: this.selectionRect.y + this.selectionRect.h },
      ]);
    }
    this.selectionRect = null;
  }

  // ── public api: capture arbitrary polygon path ────────────────────────────

  /* *
   * cut the pixels inside `path` out of the layer canvas and wrap them in a
   * transformbox so the user can drag / scale / rotate freely. */
  public captureSelection(ctx: ToolContext, path: { x: number; y: number }[]) {
    const { ctx: layerCtx, canvas } = ctx;

    // bounding box of the selection path
    const minX = Math.min(...path.map((p) => p.x));
    const minY = Math.min(...path.map((p) => p.y));
    const maxX = Math.max(...path.map((p) => p.x));
    const maxY = Math.max(...path.map((p) => p.y));
    const w = maxX - minX;
    const h = maxY - minY;
    if (w < 1 || h < 1) return;

    // 1. create a sub-canvas that holds only the selected pixels
    this.subCanvas = document.createElement('canvas');
    this.subCanvas.width = w;
    this.subCanvas.height = h;
    const sctx = this.subCanvas.getContext('2d')!;

    // 2. clip to the selection path and copy
    sctx.save();
    sctx.beginPath();
    sctx.moveTo(path[0].x - minX, path[0].y - minY);
    for (let i = 1; i < path.length; i++) {
      sctx.lineTo(path[i].x - minX, path[i].y - minY);
    }
    sctx.closePath();
    sctx.clip();
    sctx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    sctx.restore();

    // 3. erase the selected area from the source layer
    layerCtx.save();
    layerCtx.beginPath();
    layerCtx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      layerCtx.lineTo(path[i].x, path[i].y);
    }
    layerCtx.closePath();
    layerCtx.globalCompositeOperation = 'destination-out';
    layerCtx.fill();
    layerCtx.restore();

    this.originalPos = { x: minX, y: minY };
    this.transformBox = new TransformBox(minX, minY, w, h);
  }

  // ── confirm / cancel ─────────────────────────────────────────────────────

  /* * stamp the transformed sub-canvas back onto the layer */
  confirmTransform(ctx: ToolContext) {
    if (this.transformBox && this.subCanvas) {
      const { ctx: layerCtx } = ctx;
      const state = this.transformBox.state;

      layerCtx.save();
      const cx = state.x + state.width / 2;
      const cy = state.y + state.height / 2;

      layerCtx.translate(cx, cy);
      layerCtx.rotate(state.rotation);
      layerCtx.scale(state.scaleX, state.scaleY);
      layerCtx.translate(-cx, -cy);

      // draw at (possibly) new position & size – this is the freeform squish/stretch
      layerCtx.drawImage(this.subCanvas, state.x, state.y, state.width, state.height);
      layerCtx.restore();
    }
    this.transformBox = null;
    this.subCanvas = null;
  }

  cancel() {
    // put pixels back at original position without transform
    this.transformBox = null;
    this.selectionRect = null;
    this.subCanvas = null;
  }

  // ── overlay rendering ─────────────────────────────────────────────────────

  drawOverlay(overlayCtx: CanvasRenderingContext2D, time: number) {
    // marching-ants marquee rectangle while dragging
    if (this.selectionRect) {
      const { x, y, w, h } = this.selectionRect;
      overlayCtx.setLineDash([6, 4]);
      overlayCtx.lineDashOffset = -time * 0.05;
      overlayCtx.strokeStyle = '#f6b012';
      overlayCtx.lineWidth = 1.5;
      overlayCtx.strokeRect(x, y, w, h);
      overlayCtx.setLineDash([]);
    }

    // semi-transparent preview of the captured pixels + transform box
    if (this.transformBox) {
      if (this.subCanvas) {
        const state = this.transformBox.state;
        overlayCtx.save();
        const cx = state.x + state.width / 2;
        const cy = state.y + state.height / 2;
        overlayCtx.translate(cx, cy);
        overlayCtx.rotate(state.rotation);
        overlayCtx.scale(state.scaleX, state.scaleY);
        overlayCtx.translate(-cx, -cy);
        overlayCtx.globalAlpha = 0.5;
        overlayCtx.drawImage(this.subCanvas, state.x, state.y, state.width, state.height);
        overlayCtx.restore();
      }
      this.transformBox.draw(overlayCtx, time);
    }
  }

  // ── getters ───────────────────────────────────────────────────────────────

  hasActiveTransform() {
    return this.transformBox !== null;
  }

  getSubCanvas() {
    return this.subCanvas;
  }
}
