import React, { useEffect, useRef, useState } from 'react';
import { useEdgelessStore } from '../../store';

export const FloatingReminder = React.memo(function FloatingReminder({ element }: { element: any }) {
  const { title, deadline } = element.data;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const requestRef = useRef<number | undefined>(undefined);
  const velocityRef = useRef({ dx: 0.5, dy: 0.5 });
  const updateElement = useEdgelessStore(state => state.updateElement);

  // calculate urgency
  const now = new Date().getTime();
  const due = deadline ? new Date(deadline).getTime() : now + 86400000;
  const hoursLeft = (due - now) / 3600000;

  // speed increases as deadline approaches
  const speed = Math.max(0.2, 5 - Math.max(0, hoursLeft / 24)); // Max speed 5, min 0.2

  // initialize velocity with random start direction (only once on mount)
  useEffect(() => {
    velocityRef.current = {
      dx: (Math.random() - 0.5) * speed,
      dy: (Math.random() - 0.5) * speed
    };
  }, [speed]);

  useEffect(() => {
    const animate = () => {
      setPosition(prev => {
        const nextX = prev.x + velocityRef.current.dx;
        const nextY = prev.y + velocityRef.current.dy;

        // bounce locally within its "box" (which is the element size on canvas)
        const bound = 50;
        if (Math.abs(nextX) > bound) {
          velocityRef.current = { ...velocityRef.current, dx: -velocityRef.current.dx };
        }
        if (Math.abs(nextY) > bound) {
          velocityRef.current = { ...velocityRef.current, dy: -velocityRef.current.dy };
        }

        return { x: nextX, y: nextY };
      });
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  const handleDismiss = () => {
    // pop animation then delete
    updateElement(element.id, { data: { ...element.data, done: true } });
    // in real app, remove from list or mark done
  };

  if (element.data.done) return null;

  return (
    <div
      className="absolute p-4 backdrop-blur-md bg-white/5 border border-white/20 rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer hover:bg-white/10 transition-colors select-none group"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        minWidth: '200px'
      }}
      onClick={handleDismiss}
    >
      <div className={`text-sm font-medium ${hoursLeft < 3 ? 'text-red-400 animate-pulse' : 'text-white/80'}`}>
        {title}
      </div>
      {deadline && (
        <div className="text-xs text-white/40 mt-1 font-mono">
          {hoursLeft > 0 ? `${Math.floor(hoursLeft)}h left` : 'OVERDUE'}
        </div>
      )}

      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-black rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs font-bold">
        ✕
      </div>
    </div>
  );
}, (prev: any, next: any) => prev.element === next.element)
