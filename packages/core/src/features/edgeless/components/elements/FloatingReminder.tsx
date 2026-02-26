import React, { useEffect, useRef, useState } from 'react';
import { useEdgelessStore } from '../../store';

export const FloatingReminder = React.memo(function FloatingReminder({ element }: { element: any }) {
  const { title, deadline } = element.data;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ dx: 0.5, dy: 0.5 });
  const requestRef = useRef<number | undefined>(undefined);
  const updateElement = useEdgelessStore(state => state.updateElement);

  // calculate urgency
  const now = new Date().getTime();
  const due = deadline ? new Date(deadline).getTime() : now + 86400000;
  const hoursLeft = (due - now) / 3600000;

  // speed increases as deadline approaches
  const speed = Math.max(0.2, 5 - Math.max(0, hoursLeft / 24)); // Max speed 5, min 0.2

  useEffect(() => {
    // random start direction
    setVelocity({
      dx: (Math.random() - 0.5) * speed,
      dy: (Math.random() - 0.5) * speed
    });
  }, [speed]);

  useEffect(() => {
    const animate = () => {
      setPosition(prev => {
        const nextX = prev.x + velocity.dx;
        const nextY = prev.y + velocity.dy;

        // bounce locally within its "box" (which is the element size on canvas)
        // actually, drifting elements often want to drift across screen.
        // but we are rendered inside a absolute div positioned by the canvas.
        // to drift *across* limits, we'd need to update the canvas element position (x, y) in the store.
        // doing that every frame is expensive (zustand updates).
        // "float" usually implies local animation or overlay independent of canvas pan.
        // let's make it float relative to its anchor point in a radius.

        const bound = 50;
        if (Math.abs(nextX) > bound) setVelocity(v => ({ ...v, dx: -v.dx }));
        if (Math.abs(nextY) > bound) setVelocity(v => ({ ...v, dy: -v.dy }));

        return { x: nextX, y: nextY };
      });
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [velocity]);

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
