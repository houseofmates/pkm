import { useRef, useCallback, useEffect } from 'react';
import * as fabric from 'fabric';
import { useEdgelessStore } from '../store';

interface TouchGestureState {
  touches: Map<number, fabric.Point>;
  lastDistance: number;
  lastScale: number;
  isPinching: boolean;
  isPanning: boolean;
  lastPanTime: number;
  panVelocity: { x: number; y: number };
}

export function useTouchGestures(fabricCanvas: fabric.Canvas | null) {
  const gestureState = useRef<TouchGestureState>({
    touches: new Map(),
    lastDistance: 0,
    lastScale: 1,
    isPinching: false,
    isPanning: false,
    lastPanTime: 0,
    panVelocity: { x: 0, y: 0 }
  });

  const setViewport = useEdgelessStore((s) => s.setViewport);

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touches: Touch[]): fabric.Point => {
    if (touches.length === 0) return new fabric.Point(0, 0);

    const sum = touches.reduce((acc, touch) => ({
      x: acc.x + touch.clientX,
      y: acc.y + touch.clientY
    }), { x: 0, y: 0 });

    return new fabric.Point(sum.x / touches.length, sum.y / touches.length);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!fabricCanvas) return;

    e.preventDefault();
    const state = gestureState.current;
    const now = Date.now();

    // Track all touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch) {
        state.touches.set(touch.identifier, new fabric.Point(touch.clientX, touch.clientY));
      }
    }

    // Detect gesture type
    if (state.touches.size === 1) {
      // Single touch - potential pan
      state.isPanning = true;
      state.lastPanTime = now;
      state.panVelocity = { x: 0, y: 0 };
    } else if (state.touches.size === 2) {
      // Two touches - pinch zoom
      state.isPinching = true;
      state.isPanning = false;

      const touchArray = Array.from(state.touches.values());
      state.lastDistance = getDistance(
        e.touches[0] as Touch,
        e.touches[1] as Touch
      );
      state.lastScale = fabricCanvas.getZoom();
    }
  }, [fabricCanvas, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!fabricCanvas) return;

    e.preventDefault();
    const state = gestureState.current;
    const now = Date.now();

    // Update touch positions
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch) {
        state.touches.set(touch.identifier, new fabric.Point(touch.clientX, touch.clientY));
      }
    }

    if (state.isPinching && state.touches.size === 2) {
      // Pinch zoom
      const touches = Array.from(e.touches) as Touch[];
      const touch1 = touches[0];
      const touch2 = touches[1];
      if (touch1 && touch2) {
        const currentDistance = getDistance(touch1, touch2);
        const center = getCenter(touches);

        if (state.lastDistance > 0) {
          const scale = currentDistance / state.lastDistance;
          const newZoom = Math.max(0.1, Math.min(5.0, state.lastScale * scale));

          fabricCanvas.zoomToPoint(center, newZoom);
          fabricCanvas.requestRenderAll();
        }

        state.lastDistance = currentDistance;
      }
    } else if (state.isPanning && state.touches.size === 1) {
      // Pan gesture
      const touchArray = Array.from(state.touches.values());
      const touch = touchArray[0];
      const vpt = fabricCanvas.viewportTransform;

      if (vpt && touch) {
        // Calculate velocity for momentum
        if (state.lastPanTime > 0) {
          const dt = now - state.lastPanTime;
          if (dt > 0) {
            state.panVelocity = {
              x: (touch.x - (vpt[4] || 0)) / dt,
              y: (touch.y - (vpt[5] || 0)) / dt
            };
          }
        }

        vpt[4] = touch.x;
        vpt[5] = touch.y;
        fabricCanvas.requestRenderAll();
        state.lastPanTime = now;
      }
    }
  }, [fabricCanvas, getDistance, getCenter]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!fabricCanvas) return;

    e.preventDefault();
    const state = gestureState.current;

    // Remove ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch) {
        state.touches.delete(touch.identifier);
      }
    }

    // Apply momentum for pan gestures
    if (state.isPanning && state.touches.size === 0) {
      const vpt = fabricCanvas.viewportTransform;
      if (vpt && (Math.abs(state.panVelocity.x) > 0.5 || Math.abs(state.panVelocity.y) > 0.5)) {
        // Apply momentum
        const momentumX = state.panVelocity.x * 10;
        const momentumY = state.panVelocity.y * 10;

        let frame = 0;
        const maxFrames = 30;
        const friction = 0.92;

        const animateMomentum = () => {
          if (frame < maxFrames && fabricCanvas.viewportTransform) {
            const currentVpt = fabricCanvas.viewportTransform;
            currentVpt[4] += momentumX * Math.pow(friction, frame);
            currentVpt[5] += momentumY * Math.pow(friction, frame);

            fabricCanvas.requestRenderAll();
            frame++;

            if (frame < maxFrames) {
              requestAnimationFrame(animateMomentum);
            }
          }
        };

        requestAnimationFrame(animateMomentum);
      }
    }

    // Reset gesture state
    if (state.touches.size === 0) {
      state.isPinching = false;
      state.isPanning = false;
      state.lastDistance = 0;
      state.panVelocity = { x: 0, y: 0 };
      state.lastPanTime = 0;
    }
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const canvasElement = fabricCanvas.getElement();
    if (!canvasElement) return;

    // Add touch event listeners
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvasElement.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvasElement.removeEventListener('touchstart', handleTouchStart);
      canvasElement.removeEventListener('touchmove', handleTouchMove);
      canvasElement.removeEventListener('touchend', handleTouchEnd);
      canvasElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [fabricCanvas, handleTouchStart, handleTouchMove, handleTouchEnd]);
}