import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Download, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrawingWidgetProps {
  title?: string;
}

export function DrawingWidget({ title = 'quick sketch' }: DrawingWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#f6b012');
  const [brushSize, setBrushSize] = useState(3);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPointerPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.setPointerCapture(e.pointerId);
    const pos = getPointerPos(e);
    lastPosRef.current = pos;
    setIsDrawing(true);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
      ctx.globalAlpha = 1;
    }
  }, [tool, color, brushSize, getPointerPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const pos = getPointerPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  }, [isDrawing, getPointerPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const downloadImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `sketch-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-1">
          <Button
            variant={tool === 'pen' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setTool('pen')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={tool === 'eraser' ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setTool('eraser')}
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          {['#f6b012', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#000000'].map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              className={`w-4 h-4 rounded-full border border-white/10 ${color === c && tool === 'pen' ? 'ring-1 ring-primary' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearCanvas}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadImage}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative min-h-0 bg-[#0a0a0a]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      
      {/* Brush size slider */}
      <div className="p-2 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 lowercase">size</span>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-[10px] text-zinc-400 w-4">{brushSize}</span>
        </div>
      </div>
    </div>
  );
}
