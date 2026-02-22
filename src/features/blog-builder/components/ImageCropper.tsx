import React, { useState, useRef, useCallback } from 'react';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File;
  onCropComplete: (blob: Blob) => void;
  aspectRatio?: number;
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
  const [imageUrl, setImageUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleCrop = useCallback(() => {
    // Simple implementation - just return the original file as blob
    // A full implementation would use a canvas cropping library
    if (imageFile) {
      onCropComplete(imageFile);
    }
  }, [imageFile, onCropComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60000] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-[var(--primary)] lowercase">crop image</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {imageUrl && (
            <div 
              className="relative overflow-hidden bg-black/50 rounded-lg"
              style={{ 
                width: previewWidth, 
                height: previewHeight,
                borderRadius: shape === 'round' ? '50%' : '8px'
              }}
            >
              <img 
                src={imageUrl} 
                alt="crop preview" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <p className="text-white/50 text-sm text-center">
            image cropping is simplified in this version. the full image will be used.
          </p>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 hover:text-white transition-colors"
          >
            cancel
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 bg-[var(--primary)] text-black rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Check size={16} />
            apply
          </button>
        </div>
      </div>
    </div>
  );
}
