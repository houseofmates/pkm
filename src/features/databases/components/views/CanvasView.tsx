import { useRef, useState, useEffect } from 'react';
import { Canvas, Rect, Point } from 'fabric';
import { useCanvasLayout } from '@/hooks/use-canvas-layout';
import { CanvasCard } from '../canvas/CanvasCard';
import type { ViewProps } from '@/components/views/registry';
import { apiClient } from '@/lib/api-client';

// use simple resize observer hook if not available
function useDimensions(ref: React.RefObject<HTMLDivElement | null>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return dimensions;
}

export function CanvasView({ data: rows, collection, loading, config: _config }: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null);

  // fields - fetch them if not provided? viewprops doesn't have fields usually.
  // we can fetch fields inside here or rely on parent.
  // standard views usually fetch fields or use collection context.
  // let's fetch local fields for now to be safe.
  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => {
    if (!collection?.name) return;
    apiClient.get(`/collections/${collection.name}:listFields`).then(res => {
      // normalized response should put array directly on res.data
      setFields(Array.isArray(res.data) ? res.data : (res.data || []));
    });
  }, [collection?.name]);

  // layout
  const { layout, updateLayoutItem } = useCanvasLayout(collection?.name || '');

  // viewport
  const [_viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const { width, height } = useDimensions(containerRef);

  // init canvas
  useEffect(() => {
    if (!canvasEl.current || fabricCanvas) return;

    const canvas = new Canvas(canvasEl.current, {
      width: containerRef.current?.clientWidth || 800,
      height: containerRef.current?.clientHeight || 600,
      backgroundColor: '#090909',
      selection: true,
      preserveObjectStacking: true
    });

    // panning logic
    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      if (evt.altKey || evt.button === 1) {
        isDragging = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.defaultCursor = 'grabbing';
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (isDragging) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosX;
          vpt[5] += e.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = e.clientX;
          lastPosY = e.clientY;
          setViewport({ x: vpt[4], y: vpt[5], zoom: canvas.getZoom() });
        }
      }
    });

    canvas.on('mouse:up', () => {
      isDragging = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
    });

    // zoom logic
    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;

      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();

      setViewport({
        x: canvas.viewportTransform![4],
        y: canvas.viewportTransform![5],
        zoom
      });
    });

    // sync updates
    canvas.on('object:modified', (e: any) => {
      const obj = e.target as any;
      if (!obj || !obj.data?.id) return;
      const id = obj.data.id;
      updateLayoutItem(id, {
        x: obj.left,
        y: obj.top,
        width: obj.getScaledWidth(),
        height: obj.getScaledHeight(),
        scale: obj.scaleX
      });
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    }
  }, []);

  // resize
  useEffect(() => {
    if (fabricCanvas && width && height) {
      fabricCanvas.setDimensions({ width, height });
    }
  }, [fabricCanvas, width, height]);

  // sync rows
  useEffect(() => {
    if (!fabricCanvas || loading || !rows || rows.length === 0) return;

    rows.forEach((row, i) => {
      const exists = fabricCanvas.getObjects().find((o: any) => o.data?.id === row.id);
      const layoutItem = layout.items[row.id];

      // default grid
      const defaultX = (i % 4) * 350 + 50;
      const defaultY = Math.floor(i / 4) * 400 + 50;

      const x = layoutItem?.x ?? defaultX;
      const y = layoutItem?.y ?? defaultY;
      const w = layoutItem?.width ?? 300;
      const h = layoutItem?.height ?? 300; // Taller default for image cards

      if (!exists) {
        const rect = new Rect({
          left: x,
          top: y,
          width: w,
          height: h,
          fill: 'transparent',
          stroke: 'transparent',
          selectable: true,
          data: { id: row.id, ...row }
        });
        fabricCanvas.add(rect);
      } else {
        if (layoutItem && exists !== fabricCanvas.getActiveObject()) {
          exists.set({ left: x, top: y, width: w, height: h });
          exists.setCoords();
        }
        // update data ref
        exists.data = { id: row.id, ...row };
      }
    });
    fabricCanvas.requestRenderAll();

  }, [fabricCanvas, rows, layout, loading]);

  const handleCardUpdate = async (id: string, patch: any) => {
    if (!collection?.name) return;
    try {
      await apiClient.put(`/${collection.name}:update?filterByTk=${id}`, patch);
      // parent view should refresh automatically if using userecords or similar,
      // but manual refresh or optimistic ui might be needed depending on parent.
    } catch (e) {
      secureLogger.error("Failed to update row", e);
    }
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#090909]">
      <div ref={containerRef} className="w-full h-full relative">
        <canvas ref={canvasEl} />

        {/* react overlay layer */}
        {fabricCanvas && rows && rows.map(row => {
          const obj = fabricCanvas.getObjects().find((o: any) => o.data?.id === row.id);
          if (!obj) return null;

          const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const zoom = vpt[0];
          const panX = vpt[4];
          const panY = vpt[5];

          const objLeft = obj.left ?? 0;
          const objTop = obj.top ?? 0;
          const objWidth = (obj.width ?? 0) * (obj.scaleX ?? 1);
          const objHeight = (obj.height ?? 0) * (obj.scaleY ?? 1);

          const screenLeft = objLeft * zoom + panX;
          const screenTop = objTop * zoom + panY;
          const screenWidth = objWidth * zoom;
          const screenHeight = objHeight * zoom;

          if (
            screenLeft + screenWidth < 0 ||
            screenLeft > width ||
            screenTop + screenHeight < 0 ||
            screenTop > height
          ) return null;

          return (
            <div
              key={row.id}
              className="absolute pointer-events-none"
              style={{
                left: screenLeft,
                top: screenTop,
                width: screenWidth,
                height: screenHeight,
                transformOrigin: 'top left'
              }}
            >
              <CanvasCard
                data={row}
                collection={collection}
                layout={layout.items[row.id]}
                fields={fields}
                isSelected={fabricCanvas.getActiveObjects().includes(obj)}
                onUpdate={handleCardUpdate}
                className="pointer-events-auto h-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  )
}