import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEdgelessStore } from '../store';
import { LassoTool, BrushTool, EraserTool, SelectionTool, TransformBox } from '../tools';

interface DrawingCanvasProps {
  className?: string;
  width?: number;
  height?: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  className = '',
  width,
  height,
}) => {
  const [canvasSize, setCanvasSize] = useState({
    width: width || (typeof window !== 'undefined' ? window.innerWidth : 800),
    height: height || (typeof window !== 'undefined' ? window.innerHeight : 600)
  });
  
  // Update canvas size when props change
  useEffect(() => {
    if (width || height) {
      setCanvasSize({
        width: width || (typeof window !== 'undefined' ? window.innerWidth : 800),
        height: height || (typeof window !== 'undefined' ? window.innerHeight : 600)
      });
    }
  }, [width, height]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const activeTool = useEdgelessStore((s) => s.activeTool);
  const penWidth = useEdgelessStore((s) => s.penWidth);
  const penColor = useEdgelessStore((s) => s.penColor);
  const penOpacity = useEdgelessStore((s) => s.penOpacity);
  const eraserWidth = useEdgelessStore((s) => s.eraserWidth);
  const eraserOpacity = useEdgelessStore((s) => s.eraserOpacity);
  const pressureEnabled = useEdgelessStore((s) => s.pressureEnabled);
  const viewPort = useEdgelessStore((s) => s.viewPort);
  const setViewport = useEdgelessStore((s) => s.setViewport);
  const mode = useEdgelessStore((s) => s.mode);
  
  // Tool instances
  const lassoRef = useRef(new LassoTool());
  const brushRef = useRef(new BrushTool());
  const eraserRef = useRef(new EraserTool());
  const selectionRef = useRef(new SelectionTool());
  const transformBoxRef = useRef<TransformBox | null>(null);
  
  // State refs
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  
  // Track container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect) {
        setCanvasSize({
          width: width || entry.contentRect.width,
          height: height || entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [width, height]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(canvasSize.width * dpr));
    canvas.height = Math.max(1, Math.floor(canvasSize.height * dpr));
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  }, [canvasSize.width, canvasSize.height]);
  
  // Get pointer position in canvas coordinates
  const getPointerPos = useCallback((e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 1 };
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewPort.x) / viewPort.zoom;
    const y = (e.clientY - rect.top - viewPort.y) / viewPort.zoom;
    
    // If pressure is disabled, always return full pressure
    if (!pressureEnabled) {
      return { x, y, pressure: 1 };
    }
    
    let pressure = (e as any).pressure ?? 1;
    if (e.pointerType === 'mouse') {
      pressure = e.buttons > 0 ? 1 : 0;
    }
    
    return { x, y, pressure };
  }, [viewPort, pressureEnabled]);
  
  // Animation loop for overlays (lasso, transform box)
  const animate = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    timeRef.current += 16;
    
    // Clear and redraw base
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // Apply viewport transform
    ctx.save();
    ctx.translate(viewPort.x, viewPort.y);
    ctx.scale(viewPort.zoom, viewPort.zoom);
    
    // Draw lasso overlay
    if (activeTool === 'lasso') {
      lassoRef.current.drawOverlay(ctx, timeRef.current);
    }
    
    // Draw selection tool overlay (marquee + transform box preview)
    if (activeTool === 'selection') {
      selectionRef.current.drawOverlay(ctx, timeRef.current);
    }
    
    // Draw transform box
    if (transformBoxRef.current && activeTool === 'transform') {
      transformBoxRef.current.draw(ctx, timeRef.current);
    }
    
    ctx.restore();
    
    if (activeTool === 'lasso' || activeTool === 'transform' || activeTool === 'selection') {
      rafIdRef.current = requestAnimationFrame(animate);
    }
  }, [activeTool, viewPort]);
  
  // Start/stop animation based on tool
  useEffect(() => {
    if (activeTool === 'lasso' || activeTool === 'transform' || activeTool === 'selection') {
      rafIdRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [activeTool, animate]);
  
  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.setPointerCapture(e.pointerId);
    const pos = getPointerPos(e);
    lastPosRef.current = { x: pos.x, y: pos.y };
    
    // Spacebar pan or hand tool
    if (e.button === 1 || activeTool === 'hand' || (e.shiftKey && activeTool !== 'text')) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - viewPort.x, y: e.clientY - viewPort.y };
      return;
    }
    
    isDrawingRef.current = true;
    
    const toolCtx = {
      canvas: canvas,
      ctx: ctxRef.current!,
      activeLayer: null,
    };
    
    switch (activeTool) {
      case 'lasso':
        lassoRef.current.onStart(toolCtx, pos.x, pos.y, pos.pressure);
        break;
        
      case 'pen': {
        // Use BrushTool for proper dab-spacing, pressure curve, and smoothing
        const brush = brushRef.current;
        brush.size = penWidth;
        ctxRef.current!.globalAlpha = penOpacity / 100;
        ctxRef.current!.fillStyle = penColor;
        ctxRef.current!.strokeStyle = penColor;
        brush.onStart(toolCtx, pos.x, pos.y, pos.pressure);
        break;
      }
        
      case 'eraser':
        eraserRef.current.onStart(toolCtx, pos.x, pos.y, pos.pressure);
        break;
      
      case 'selection':
        selectionRef.current.onStart(toolCtx, pos.x, pos.y, pos.pressure);
        break;
        
      case 'transform':
        // Check if clicking on an existing selection
        if (!transformBoxRef.current) {
          transformBoxRef.current = new TransformBox(pos.x - 50, pos.y - 50, 100, 100);
        }
        const hit = transformBoxRef.current.startDrag(pos.x, pos.y);
        if (!hit) {
          transformBoxRef.current = new TransformBox(pos.x - 50, pos.y - 50, 100, 100);
          transformBoxRef.current.startDrag(pos.x, pos.y);
        }
        break;
    }
  }, [activeTool, getPointerPos, viewPort, penWidth, penColor, penOpacity, eraserWidth, eraserOpacity, pressureEnabled]);
  
  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    
    // Pan handling
    if (isPanningRef.current) {
      setViewport({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
        zoom: viewPort.zoom,
      });
      return;
    }
    
    if (!isDrawingRef.current) return;
    
    const toolCtx = {
      canvas: canvasRef.current!,
      ctx: ctxRef.current!,
      activeLayer: null,
    };
    
    switch (activeTool) {
      case 'lasso':
        lassoRef.current.onMove(toolCtx, pos.x, pos.y, pos.pressure);
        break;
        
      case 'pen':
        brushRef.current.onMove(toolCtx, pos.x, pos.y, pos.pressure);
        break;
        
      case 'eraser':
        eraserRef.current.onMove(toolCtx, pos.x, pos.y, pos.pressure);
        break;
      
      case 'selection':
        selectionRef.current.onMove(toolCtx, pos.x, pos.y, pos.pressure);
        break;
        
      case 'transform':
        if (transformBoxRef.current) {
          transformBoxRef.current.drag(pos.x, pos.y);
        }
        break;
    }
    
    lastPosRef.current = { x: pos.x, y: pos.y };
  }, [activeTool, getPointerPos, viewPort, setViewport]);
  
  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    
    isDrawingRef.current = false;
    isPanningRef.current = false;
    
    const toolCtx = {
      canvas: canvasRef.current!,
      ctx: ctxRef.current!,
      activeLayer: null,
    };
    
    switch (activeTool) {
      case 'lasso':
        lassoRef.current.onEnd(toolCtx);
        // If lasso just closed, capture the selection for freeform transform
        if (lassoRef.current.getIsClosed()) {
          const points = lassoRef.current.getPoints();
          if (points.length >= 3) {
            selectionRef.current.captureSelection(toolCtx, points);
            // Switch to selection tool so the user can drag / scale / stretch
            useEdgelessStore.getState().setTool('selection');
          }
          lassoRef.current.reset();
        }
        break;
        
      case 'pen':
        brushRef.current.onEnd();
        // Reset composite operation and alpha after each stroke
        ctxRef.current!.globalAlpha = 1;
        ctxRef.current!.globalCompositeOperation = 'source-over';
        break;
        
      case 'eraser':
        eraserRef.current.onEnd(toolCtx);
        break;
      
      case 'selection':
        selectionRef.current.onEnd(toolCtx);
        break;
        
      case 'transform':
        if (transformBoxRef.current) {
          transformBoxRef.current.endDrag();
        }
        break;
    }
  }, [activeTool]);
  
  // Handle double click to close lasso or confirm selection
  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'lasso' && !lassoRef.current.getIsClosed()) {
      lassoRef.current.confirm();
    }
    if (activeTool === 'selection' && selectionRef.current.hasActiveTransform()) {
      const canvas = canvasRef.current;
      if (canvas && ctxRef.current) {
        selectionRef.current.confirmTransform({
          canvas,
          ctx: ctxRef.current,
          activeLayer: null,
        });
      }
    }
  }, [activeTool]);
  
  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewPort.zoom * zoomFactor));
    
    // Zoom towards mouse position
    const zoomRatio = newZoom / viewPort.zoom;
    const newX = mouseX - (mouseX - viewPort.x) * zoomRatio;
    const newY = mouseY - (mouseY - viewPort.y) * zoomRatio;
    
    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [viewPort, setViewport]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to confirm lasso
      if (e.key === 'Enter' && activeTool === 'lasso') {
        lassoRef.current.confirm();
      }
      
      // Enter to confirm selection transform (stamp pixels)
      if (e.key === 'Enter' && activeTool === 'selection' && selectionRef.current.hasActiveTransform()) {
        const canvas = canvasRef.current;
        if (canvas && ctxRef.current) {
          selectionRef.current.confirmTransform({
            canvas,
            ctx: ctxRef.current,
            activeLayer: null,
          });
        }
      }
      
      // Escape to cancel selection
      if (e.key === 'Escape' && activeTool === 'selection') {
        selectionRef.current.cancel();
      }
      
      // Backspace to remove last lasso point
      if (e.key === 'Backspace' && activeTool === 'lasso') {
        const points = lassoRef.current.getPoints();
        if (points.length > 1) {
          points.pop();
        }
      }
      
      // Delete to clear transform box
      if (e.key === 'Delete' && activeTool === 'transform') {
        transformBoxRef.current = null;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);
  
  const shouldCapture = mode === 'draw' && ['pen', 'eraser', 'lasso', 'selection', 'transform'].includes(activeTool);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        pointerEvents: shouldCapture ? 'auto' : 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{
          transform: `translate(${viewPort.x}px, ${viewPort.y}px) scale(${viewPort.zoom})`,
          transformOrigin: '0 0',
        }}
      />
    </div>
  );
};
