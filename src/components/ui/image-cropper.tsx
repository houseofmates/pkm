import { useState, useCallback, useRef, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number; // width/height, e.g., 1 for square
  shape?: 'rect' | 'round';
  previewWidth?: number;
  previewHeight?: number;
}

export function ImageCropper({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
  aspectRatio = 1,
  shape = 'rect',
  previewWidth = 200,
  previewHeight = 200
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // load image when file changes
  useEffect(() => {
  if (imageFile) {
  const reader = new FileReader();
  reader.onload = (e) => {
 setImageSrc(e.target?.result as string);
  };
  reader.readAsDataURL(imageFile);
  }
  }, [imageFile]);

  const handleMouseDown = (e: React.MouseEvent) => {
  setIsDragging(true);
  setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
  if (isDragging) {
  setPosition({
 x: e.clientX - dragStart.x,
 y: e.clientY - dragStart.y
  });
  }
  };

  const handleMouseUp = () => {
  setIsDragging(false);
  };

  const handleCrop = useCallback(async () => {
  if (!imageRef.current || !canvasRef.current) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = imageRef.current;
  const cropSize = Math.min(previewWidth, previewHeight);

  canvas.width = cropSize;
  canvas.height = cropSize / aspectRatio;

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // save context state
  ctx.save();

  // apply transformations
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // draw image centered with position offset
  const drawWidth = img.naturalWidth;
  const drawHeight = img.naturalHeight;
  const drawX = (canvas.width - drawWidth) / 2 + position.x;
  const drawY = (canvas.height - drawHeight) / 2 + position.y;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  // convert canvas to blob
  canvas.toBlob((blob) => {
  if (blob) {
 onCropComplete(blob);
 onClose();
  }
  }, 'image/png');
  }, [scale, rotation, position, aspectRatio, previewWidth, previewHeight, onCropComplete, onClose]);

  return (
  <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogPortal>
 <DialogPrimitive.Overlay
 className="fixed inset-0 z-[5000] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
 />
 <DialogPrimitive.Content
 className={cn(
 "fixed left-[50%] top-[50%] z-[5000] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-[#0a0a0a] p-6 shadow-lg duration-200",
 "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
 "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
 "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
 "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
 "sm:rounded-lg"
 )}
 onClick={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 >
 <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
 <X className="h-4 w-4 text-white" />
 <span className="sr-only">close</span>
 </DialogPrimitive.Close>

 <DialogHeader>
 <DialogTitle className="text-white">Crop Image</DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 {/* preview area */}
 <div
 className="relative bg-black/50 flex items-center justify-center overflow-hidden"
 style={{
   width: previewWidth,
   height: previewHeight,
   borderRadius: shape === 'round' ? '50%' : '8px',
   margin: '0 auto',
   cursor: isDragging ? 'grabbing' : 'grab'
 }}
 onMouseDown={handleMouseDown}
 onMouseMove={handleMouseMove}
 onMouseUp={handleMouseUp}
 onMouseLeave={handleMouseUp}
 >
 {imageSrc && (
   <>
   <img
   ref={imageRef}
   src={imageSrc}
   alt="Crop preview"
   style={{
  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  userSelect: 'none',
  pointerEvents: 'none'
   }}
   draggable={false}
   />
   <div
   className="absolute inset-0 border-2 border-[var(--primary)] pointer-events-none"
   style={{ borderRadius: shape === 'round' ? '50%' : '8px' }}
   />
   </>
 )}
 </div>

 {/* controls */}
 <div className="space-y-3 px-4">
 <div className="flex items-center gap-3">
   <ZoomOut className="w-4 h-4 text-white/50" />
   <Slider
   value={[scale]}
   onValueChange={(v) => setScale(v[0])}
   min={0.1}
   max={3}
   step={0.1}
   className="flex-1"
   />
   <ZoomIn className="w-4 h-4 text-white/50" />
   <span className="text-xs text-white/50 w-12">{scale.toFixed(1)}x</span>
 </div>

 <div className="flex items-center gap-3">
   <RotateCw className="w-4 h-4 text-white/50" />
   <Slider
   value={[rotation]}
   onValueChange={(v) => setRotation(v[0])}
   min={0}
   max={360}
   step={1}
   className="flex-1"
   />
   <span className="text-xs text-white/50 w-12">{rotation}°</span>
 </div>
 </div>

 <p className="text-xs text-white/40 text-center">
 Drag to reposition • Use sliders to zoom and rotate
 </p>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={onClose}>Cancel</Button>
 <Button onClick={handleCrop}>Crop & Upload</Button>
 </DialogFooter>

 {/* hidden canvas for processing */}
 <canvas ref={canvasRef} style={{ display: 'none' }} />
 </DialogPrimitive.Content>
  </DialogPortal>
  </Dialog>
  );
}
