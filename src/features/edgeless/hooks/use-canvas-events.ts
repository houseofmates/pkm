import { useEffect, useCallback } from 'react';
import { useEdgelessStore } from '../store';

export function useCanvasEvents() {
  const { addElement, viewPort } = useEdgelessStore();

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
  // prevent default paste (text) if we handle it
  // we'll let normal inputs handle paste naturally if focused
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
  return;
  }

  e.preventDefault();
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
  // 1. handle images (screenshots, file copies)
  if (item.type.startsWith('image/')) {
 const blob = item.getAsFile();
 if (blob) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const src = event.target?.result as string;
 createImageElement(src);
 };
 reader.readAsDataURL(blob);
 }
 return; // prioritize image if mixed
  }

  // 2. handle text (links, image urls)
  if (item.type === 'text/plain') {
 item.getAsString(async (text) => {
 await processTextContent(text);
 });
  }
  }
  }, [viewPort]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
  // don't intercept internal drags (like nodes moving) if managed by fabric
  // but do intercept drop from outside or records
  // check if datatransfer has files or specific types
  if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('text/uri-list')) {
  e.preventDefault();
  e.stopPropagation();

  const x = e.clientX;
  const y = e.clientY;

  // handle files
  if (e.dataTransfer.files?.length > 0) {
 for (const file of e.dataTransfer.files) {
 if (file.type.startsWith('image/')) {
 const reader = new FileReader();
 reader.onload = (event) => {
   const src = event.target?.result as string;
   createImageElement(src, x, y);
 };
 reader.readAsDataURL(file);
 }
 }
 return;
  }

  // handle links / text (uri list often has the image url if dragged from browser)
  const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
  if (text) {
 await processTextContent(text, x, y);
  }
  }
  }, [viewPort]);

  // --- helpers ---

  const createImageElement = (src: string, x?: number, y?: number) => {
  // default to center if no coords
  const { x: vx, y: vy, zoom } = viewPort;

  // if x,y provided (drop), map to canvas space
  // logic: (screenx - panx) / zoom
  const canvasX = x !== undefined ? (x - vx) / zoom : (-vx / zoom) + (window.innerWidth / 2 / zoom);
  const canvasY = y !== undefined ? (y - vy) / zoom : (-vy / zoom) + (window.innerHeight / 2 / zoom);

  // pre-load image to get dimensions? for now assume standard
  const img = new Image();
  img.onload = () => {
  // scale down if massive
  let width = img.width;
  let height = img.height;
  const maxSize = 500;
  if (width > maxSize || height > maxSize) {
 const ratio = width / height;
 if (width > height) {
 width = maxSize;
 height = maxSize / ratio;
 } else {
 height = maxSize;
 width = maxSize * ratio;
 }
  }

  addElement({
 type: 'image',
 x: canvasX,
 y: canvasY,
 width,
 height,
 data: { src, url: src }
  });
  };
  img.src = src;
  };

  const processTextContent = async (text: string, x?: number, y?: number) => {
  const trimmed = text.trim();

  // 1. is image url?
  if (trimmed.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || trimmed.includes('images.unsplash.com') || trimmed.includes('media.giphy.com')) {
  createImageElement(trimmed, x, y);
  return;
  }

  // 2. is youtube/spotify?
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('spotify.com')) {
  createEmbedElement(trimmed, 'media', x, y);
  return;
  }

  // 3. is shopping (amazon/steam)? - "the harpoon"
  if (trimmed.includes('amazon.com') || trimmed.includes('steampowered.com')) {
  createShoppingCard(trimmed, x, y);
  return;
  }

  // 4. fallback: create link card with void glyph logic
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
  try {
 // try basic fetch? no, cors will block.
 // just assume glyph logic inside createlinkelement or formatting here.
 createLinkElement(trimmed, x, y);
  } catch (e) {
 createLinkElement(trimmed, x, y);
  }
  }
  };

  const createShoppingCard = (url: string, x?: number, y?: number) => {
  const { x: vx, y: vy, zoom } = viewPort;
  const canvasX = x !== undefined ? (x - vx) / zoom : (-vx / zoom) + (window.innerWidth / 2 / zoom);
  const canvasY = y !== undefined ? (y - vy) / zoom : (-vy / zoom) + (window.innerHeight / 2 / zoom);

  let service = 'generic';
  if (url.includes('amazon')) service = 'amazon';
  if (url.includes('steam')) service = 'steam';

  // void glyph fallback for title
  let title = 'Wishlist Item';
  try {
  const domain = new URL(url).hostname.replace('www.', '');
  title = `[${domain.toUpperCase()}] Item`;
  } catch (e) { }

  addElement({
  type: 'shopping-card',
  x: canvasX,
  y: canvasY,
  width: 280,
  height: 320,
  data: {
 url,
 service,
 status: 'desire',
 price: 'CHECK PRICE',
 title
  }
  });
  };

  const createEmbedElement = (url: string, service: string, x?: number, y?: number) => {
  const { x: vx, y: vy, zoom } = viewPort;
  const canvasX = x !== undefined ? (x - vx) / zoom : (-vx / zoom) + (window.innerWidth / 2 / zoom);
  const canvasY = y !== undefined ? (y - vy) / zoom : (-vy / zoom) + (window.innerHeight / 2 / zoom);

  addElement({
  type: 'embed',
  x: canvasX,
  y: canvasY,
  width: 400,
  height: 225, // 16:9
  data: { url, service }
  });
  };

  const createLinkElement = (url: string, x?: number, y?: number) => {
  const { x: vx, y: vy, zoom } = viewPort;
  const canvasX = x !== undefined ? (x - vx) / zoom : (-vx / zoom) + (window.innerWidth / 2 / zoom);
  const canvasY = y !== undefined ? (y - vy) / zoom : (-vy / zoom) + (window.innerHeight / 2 / zoom);

  addElement({
  type: 'link-card',
  x: canvasX,
  y: canvasY,
  width: 300,
  height: 100,
  data: { url, title: url, description: '' }
  });
  };

  useEffect(() => {
  window.addEventListener('paste', handlePaste);
  return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return { handleDrop };
}
