import { useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEdgelessStore } from '../store';
import { LassoTool } from '../tools';

/**
 * useDrawingTools – manages lasso drawing and marquee selection.
 *
 * - Lasso: custom overlay drawing. On close, selects fabric objects inside
 *   the lasso polygon, then switches to transform tool for native fabric
 *   controls (scale, rotate, skew).
 * - Selection: draws a marquee rectangle on overlay. On release, selects
 *   fabric objects within the rect, then switches to transform tool.
 * - Transform: does nothing here – fabric handles everything natively.
 */
export function useDrawingTools(canvas: fabric.Canvas | null, pushHistoryAction?: (action: any) => void) {
  const activeTool = useEdgelessStore((s) => s.activeTool);
  const viewPort = useEdgelessStore((s) => s.viewPort);
  const setViewport = useEdgelessStore((s) => s.setViewport);

  const lassoRef = useRef(new LassoTool());
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);

  // Marquee state for selection tool
  const marqueeRef = useRef<{
    startX: number; startY: number;
    x: number; y: number; w: number; h: number;
  } | null>(null);

  // ── Overlay canvas for lasso / marquee visualization ──────────────────────
  useEffect(() => {
    if (!canvas) return;
    if (overlayCanvasRef.current) overlayCanvasRef.current.remove();

    const overlay = document.createElement('canvas');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1000';
    overlay.width = canvas.width || window.innerWidth;
    overlay.height = canvas.height || window.innerHeight;

    const wrapper = canvas.wrapperEl;
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(overlay);
    }
    overlayCanvasRef.current = overlay;
    return () => { overlay.remove(); };
  }, [canvas]);

  // ── Animation loop for lasso / marquee overlay ────────────────────────────
  const animate = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    timeRef.current += 16;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.save();
    ctx.translate(viewPort.x, viewPort.y);
    ctx.scale(viewPort.zoom, viewPort.zoom);

    if (activeTool === 'lasso') {
      lassoRef.current.drawOverlay(ctx, timeRef.current);
    }
    if (activeTool === 'selection' && marqueeRef.current) {
      const { x, y, w, h } = marqueeRef.current;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -timeRef.current * 0.05;
      ctx.strokeStyle = '#f6b012';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
    ctx.restore();

    if (activeTool === 'lasso' || activeTool === 'selection') {
      rafIdRef.current = requestAnimationFrame(animate);
    }
  }, [activeTool, viewPort]);

  useEffect(() => {
    if (activeTool === 'lasso' || activeTool === 'selection') {
      rafIdRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
      // Clear overlay when switching away
      const overlay = overlayCanvasRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
    };
  }, [activeTool, animate]);

  // ── Helper: select fabric objects inside a polygon → switch to transform ──
  const selectObjectsInPolygon = useCallback((points: { x: number; y: number }[]) => {
    if (!canvas || points.length < 3) return;
    const toSelect: fabric.FabricObject[] = [];
    // The lasso points are in world-space (de-panned, de-zoomed).
    // getBoundingRect() returns canvas-pixel coords WITH viewport transform.
    // Convert bounding rect points to world-space for the containment check.
    const vpt = canvas.viewportTransform;
    const zoom = vpt ? vpt[0] : 1;
    const panX = vpt ? vpt[4] : 0;
    const panY = vpt ? vpt[5] : 0;
    for (const obj of canvas.getObjects()) {
      if ((obj as any).globalCompositeOperation === 'destination-out') continue;
      const b = obj.getBoundingRect();
      // Convert all corners + center to world-space
      const testPoints = [
        { x: (b.left - panX) / zoom, y: (b.top - panY) / zoom },
        { x: (b.left + b.width - panX) / zoom, y: (b.top - panY) / zoom },
        { x: (b.left + b.width - panX) / zoom, y: (b.top + b.height - panY) / zoom },
        { x: (b.left - panX) / zoom, y: (b.top + b.height - panY) / zoom },
        { x: (b.left + b.width / 2 - panX) / zoom, y: (b.top + b.height / 2 - panY) / zoom },
      ];
      if (testPoints.some(p => isPointInPolygon(p.x, p.y, points))) {
        toSelect.push(obj);
      }
    }
    if (toSelect.length > 0) {
      const sel = toSelect.length === 1
        ? toSelect[0]
        : new fabric.ActiveSelection(toSelect, { canvas });
      canvas.setActiveObject(sel);
      canvas.requestRenderAll();
      useEdgelessStore.getState().setTool('transform');
    }
  }, [canvas]);

  // ── Helper: select fabric objects inside a rect → switch to transform ─────
  const selectObjectsInRect = useCallback((rx: number, ry: number, rw: number, rh: number) => {
    if (!canvas || rw < 5 || rh < 5) return;
    const toSelect: fabric.FabricObject[] = [];
    // The marquee rect is in world-space. Convert bounding rects to match.
    const vpt = canvas.viewportTransform;
    const zoom = vpt ? vpt[0] : 1;
    const panX = vpt ? vpt[4] : 0;
    const panY = vpt ? vpt[5] : 0;
    for (const obj of canvas.getObjects()) {
      if ((obj as any).globalCompositeOperation === 'destination-out') continue;
      const b = obj.getBoundingRect();
      const cx = (b.left + b.width / 2 - panX) / zoom;
      const cy = (b.top + b.height / 2 - panY) / zoom;
      if (cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh) {
        toSelect.push(obj);
      }
    }
    if (toSelect.length > 0) {
      const sel = toSelect.length === 1
        ? toSelect[0]
        : new fabric.ActiveSelection(toSelect, { canvas });
      canvas.setActiveObject(sel);
      canvas.requestRenderAll();
      useEdgelessStore.getState().setTool('transform');
    }
  }, [canvas]);

  // Eraser state refs (persist across effect re-runs)
  const eraserPointsRef = useRef<{x: number, y: number}[]>([]);
  const lastEraserPosRef = useRef<{x: number, y: number} | null>(null);

  // ── Pointer events – intercept for lasso, selection, and eraser tools ─────
  useEffect(() => {
    if (!canvas) return;
    if (activeTool !== 'lasso' && activeTool !== 'selection' && activeTool !== 'eraser') return;

    const upperCanvas = canvas.upperCanvasEl as HTMLCanvasElement;
    if (!upperCanvas) return;

    const getPos = (e: PointerEvent) => {
      const rect = upperCanvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - viewPort.x) / viewPort.zoom,
        y: (e.clientY - rect.top - viewPort.y) / viewPort.zoom,
      };
    };

    // ── Eraser helpers ──
    const drawEraserSegment = (from: {x: number, y: number}, to: {x: number, y: number}) => {
      const lowerCtx = (canvas as any).getContext() as CanvasRenderingContext2D;
      if (!lowerCtx) return;
      const dpr = (canvas as any).getRetinaScaling?.() || window.devicePixelRatio || 1;
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const ew = useEdgelessStore.getState().eraserWidth;

      lowerCtx.save();
      lowerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lowerCtx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
      lowerCtx.globalCompositeOperation = 'destination-out';
      lowerCtx.globalAlpha = 1;
      lowerCtx.beginPath();
      lowerCtx.moveTo(from.x, from.y);
      lowerCtx.lineTo(to.x, to.y);
      lowerCtx.lineWidth = ew;
      lowerCtx.lineCap = 'round';
      lowerCtx.lineJoin = 'round';
      lowerCtx.strokeStyle = 'rgba(0,0,0,1)';
      lowerCtx.stroke();
      lowerCtx.restore();
    };

    const finalizeEraserStroke = (points: {x: number, y: number}[]) => {
      if (points.length === 0) return;
      const ew = useEdgelessStore.getState().eraserWidth;

      // Build path string from world-space points
      let pathStr = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathStr += ` L ${points[i].x} ${points[i].y}`;
      }
      if (points.length === 1) {
        pathStr += ` L ${points[0].x + 0.01} ${points[0].y}`;
      }

      const eraserPath = new fabric.Path(pathStr, {
        stroke: 'rgba(0,0,0,1)',
        strokeWidth: ew,
        fill: '',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        globalCompositeOperation: 'destination-out',
        selectable: false,
        evented: false,
        borderScaleFactor: 1.5,
        decimate: 1.5,
      } as any);

      // Add to canvas (suppress render) and fire path:created for rasterization
      const saved = canvas.renderOnAddRemove;
      canvas.renderOnAddRemove = false;
      canvas.add(eraserPath);
      canvas.renderOnAddRemove = saved;
      canvas.fire('path:created', { path: eraserPath });
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 1 || e.shiftKey) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - viewPort.x, y: e.clientY - viewPort.y };
        return;
      }
      if (e.button !== 0) return;
      const pos = getPos(e);
      isDrawingRef.current = true;
      upperCanvas.setPointerCapture(e.pointerId);

      if (activeTool === 'lasso') {
        const ctx = { canvas: overlayCanvasRef.current!, ctx: overlayCanvasRef.current!.getContext('2d')!, activeLayer: null };
        lassoRef.current.onStart(ctx, pos.x, pos.y, 1);
      } else if (activeTool === 'eraser') {
        eraserPointsRef.current = [pos];
        lastEraserPosRef.current = pos;
        drawEraserSegment(pos, pos);
      } else {
        marqueeRef.current = { startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, w: 0, h: 0 };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPanningRef.current) {
        setViewport({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y, zoom: viewPort.zoom });
        return;
      }
      if (!isDrawingRef.current) return;
      const pos = getPos(e);
      if (activeTool === 'lasso') {
        const ctx = { canvas: overlayCanvasRef.current!, ctx: overlayCanvasRef.current!.getContext('2d')!, activeLayer: null };
        lassoRef.current.onMove(ctx, pos.x, pos.y, 1);
      } else if (activeTool === 'eraser') {
        const lastPos = lastEraserPosRef.current || pos;
        drawEraserSegment(lastPos, pos);
        eraserPointsRef.current.push(pos);
        lastEraserPosRef.current = pos;
      } else if (marqueeRef.current) {
        const sx = marqueeRef.current.startX, sy = marqueeRef.current.startY;
        marqueeRef.current.x = Math.min(sx, pos.x);
        marqueeRef.current.y = Math.min(sy, pos.y);
        marqueeRef.current.w = Math.abs(pos.x - sx);
        marqueeRef.current.h = Math.abs(pos.y - sy);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      isPanningRef.current = false;
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      try { upperCanvas.releasePointerCapture(e.pointerId); } catch { /* ignore pointer capture errors */ }

      if (activeTool === 'lasso') {
        const ctx = { canvas: overlayCanvasRef.current!, ctx: overlayCanvasRef.current!.getContext('2d')!, activeLayer: null };
        lassoRef.current.onEnd(ctx);
        if (lassoRef.current.getIsClosed()) {
          selectObjectsInPolygon(lassoRef.current.getPoints());
          lassoRef.current.reset();
        }
      } else if (activeTool === 'eraser') {
        finalizeEraserStroke(eraserPointsRef.current);
        eraserPointsRef.current = [];
        lastEraserPosRef.current = null;
      } else if (marqueeRef.current) {
        const { x, y, w, h } = marqueeRef.current;
        selectObjectsInRect(x, y, w, h);
        marqueeRef.current = null;
      }
    };

    const handleDoubleClick = () => {
      if (activeTool === 'lasso' && !lassoRef.current.getIsClosed()) {
        lassoRef.current.confirm();
        if (lassoRef.current.getIsClosed()) {
          selectObjectsInPolygon(lassoRef.current.getPoints());
          lassoRef.current.reset();
        }
      }
    };

    upperCanvas.addEventListener('pointerdown', handlePointerDown);
    upperCanvas.addEventListener('pointermove', handlePointerMove);
    upperCanvas.addEventListener('pointerup', handlePointerUp);
    upperCanvas.addEventListener('pointercancel', handlePointerUp);
    upperCanvas.addEventListener('dblclick', handleDoubleClick);
    return () => {
      upperCanvas.removeEventListener('pointerdown', handlePointerDown);
      upperCanvas.removeEventListener('pointermove', handlePointerMove);
      upperCanvas.removeEventListener('pointerup', handlePointerUp);
      upperCanvas.removeEventListener('pointercancel', handlePointerUp);
      upperCanvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [activeTool, canvas, viewPort, setViewport, selectObjectsInPolygon, selectObjectsInRect]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTool === 'lasso') {
        if (e.key === 'Enter') {
          lassoRef.current.confirm();
          if (lassoRef.current.getIsClosed()) {
            selectObjectsInPolygon(lassoRef.current.getPoints());
            lassoRef.current.reset();
          }
        }
        if (e.key === 'Backspace' || e.key === 'Escape') {
          lassoRef.current.reset();
        }
      }
      // Delete selected objects in transform mode
      if (activeTool === 'transform' && canvas) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const active = canvas.getActiveObject();
          if (active) {
            let objsToRemove: fabric.Object[] = [];
            if (active instanceof fabric.ActiveSelection) {
              objsToRemove = active.getObjects();
              objsToRemove.forEach(o => canvas.remove(o));
            } else {
              objsToRemove = [active];
              canvas.remove(active);
            }
            if (pushHistoryAction && objsToRemove.length > 0) {
              objsToRemove.forEach(obj => {
                pushHistoryAction({ type: 'remove', obj });
              });
            }
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }
        }
        if (e.key === 'Escape') {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, canvas, selectObjectsInPolygon, pushHistoryAction]);

  return { lasso: lassoRef.current };
}

// ── Geometry helper ─────────────────────────────────────────────────────────
function isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
