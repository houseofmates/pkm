import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

export type GestureHandlers = {
  onSingleTap?: (event: PointerEvent) => void;
  onDoubleTap?: (event: PointerEvent) => void;
  onLongPress?: (event: PointerEvent) => void;
  onContextMenu?: (event: PointerEvent) => void;
  onDragMove?: (event: PointerEvent) => void;
  onDragStart?: (event: PointerEvent) => void;
  onDragEnd?: (event: PointerEvent) => void;
  onTwoFingerTap?: (event: PointerEvent) => void;
  onThreeFingerTap?: (event: PointerEvent) => void;
  onEmptyTwoFingerTap?: (event: PointerEvent) => void;
};

export interface GestureManagerOptions {
  longPressMs?: number;
  doubleTapMs?: number;
  movementTolerance?: number;
  preventDefault?: boolean;
}

/**
 * Centralized gesture manager to normalize pointer/touch gestures across mobile & desktop.
 * Keeps refs to avoid rerenders during high-frequency pointer moves.
 */
export function useGestureManager(
  targetRef: MutableRefObject<HTMLElement | null>,
  handlers: GestureHandlers,
  options: GestureManagerOptions = {}
) {
  const {
    longPressMs = 350,
    doubleTapMs = 280,
    movementTolerance = 12,
    preventDefault = true,
  } = options;

  const stateRef = useRef({
    lastTap: 0,
    longPressTimer: 0 as unknown as ReturnType<typeof setTimeout>,
    isDragging: false,
    startX: 0,
    startY: 0,
    pointers: new Map<number, PointerEvent>(),
  });

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const clearLongPress = () => {
      if (stateRef.current.longPressTimer) {
        clearTimeout(stateRef.current.longPressTimer);
        stateRef.current.longPressTimer = 0 as unknown as ReturnType<typeof setTimeout>;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (preventDefault) event.preventDefault();
      stateRef.current.pointers.set(event.pointerId, event);
      stateRef.current.startX = event.clientX;
      stateRef.current.startY = event.clientY;
      stateRef.current.isDragging = false;

      clearLongPress();
      stateRef.current.longPressTimer = setTimeout(() => {
        handlers.onLongPress?.(event);
      }, longPressMs);

      handlers.onDragStart?.(event);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (preventDefault) event.preventDefault();
      const dx = event.clientX - stateRef.current.startX;
      const dy = event.clientY - stateRef.current.startY;
      const moved = Math.hypot(dx, dy) > movementTolerance;
      if (moved) {
        stateRef.current.isDragging = true;
        clearLongPress();
      }
      handlers.onDragMove?.(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (preventDefault) event.preventDefault();
      const now = performance.now();
      const wasDragging = stateRef.current.isDragging;
      clearLongPress();
      handlers.onDragEnd?.(event);

      // Multi-touch tap detection
      stateRef.current.pointers.delete(event.pointerId);
      const activePointers = [...stateRef.current.pointers.values()];
      if (!wasDragging) {
        if (event.pointerType === 'touch') {
          const touchCount = activePointers.length + 1; // include current lifting pointer
          if (touchCount === 2) {
            handlers.onTwoFingerTap?.(event);
          } else if (touchCount === 3) {
            handlers.onThreeFingerTap?.(event);
          }
        }

        const timeSinceLastTap = now - stateRef.current.lastTap;
        if (timeSinceLastTap < doubleTapMs) {
          handlers.onDoubleTap?.(event);
        } else {
          handlers.onSingleTap?.(event);
        }
        stateRef.current.lastTap = now;
      }
    };

    const handleContextMenu = (event: PointerEvent) => {
      event.preventDefault();
      handlers.onContextMenu?.(event);
    };

    target.addEventListener('pointerdown', handlePointerDown, { passive: !preventDefault });
    target.addEventListener('pointermove', handlePointerMove, { passive: !preventDefault });
    target.addEventListener('pointerup', handlePointerUp, { passive: !preventDefault });
    target.addEventListener('pointercancel', handlePointerUp, { passive: !preventDefault });
    target.addEventListener('contextmenu', handleContextMenu as any);

    return () => {
      clearLongPress();
      target.removeEventListener('pointerdown', handlePointerDown);
      target.removeEventListener('pointermove', handlePointerMove);
      target.removeEventListener('pointerup', handlePointerUp);
      target.removeEventListener('pointercancel', handlePointerUp);
      target.removeEventListener('contextmenu', handleContextMenu as any);
    };
  }, [doubleTapMs, handlers, longPressMs, movementTolerance, preventDefault, targetRef]);
}
