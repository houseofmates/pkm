import { useEffect, useRef, useState } from 'react';
import { useEdgelessStore } from '../../store';

export function FloatingReminder({ element }: { element: any }) {
    const { title, deadline } = element.data;
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [velocity, setVelocity] = useState({ dx: 0.5, dy: 0.5 });
    const requestRef = useRef<number>();
    const updateElement = useEdgelessStore(state => state.updateElement);

    // Calculate Urgency
    const now = new Date().getTime();
    const due = deadline ? new Date(deadline).getTime() : now + 86400000;
    const hoursLeft = (due - now) / 3600000;

    // Speed increases as deadline approaches
    const speed = Math.max(0.2, 5 - Math.max(0, hoursLeft / 24)); // Max speed 5, min 0.2

    useEffect(() => {
        // Random start direction
        setVelocity({
            dx: (Math.random() - 0.5) * speed,
            dy: (Math.random() - 0.5) * speed
        });
    }, [speed]);

    useEffect(() => {
        const animate = () => {
            setPosition(prev => {
                let nextX = prev.x + velocity.dx;
                let nextY = prev.y + velocity.dy;

                // Bounce locally within its "box" (which is the element size on canvas)
                // Actually, drifting elements often want to drift across screen.
                // But we are rendered inside a absolute div positioned by the Canvas.
                // To drift *across* limits, we'd need to update the Canvas Element position (x, y) in the store.
                // Doing that every frame is expensive (Zustand updates).
                // "Float" usually implies local animation or overlay independent of canvas pan.
                // Let's make it float relative to its anchor point in a radius.

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
        // Pop animation then delete
        updateElement(element.id, { data: { ...element.data, done: true } });
        // In real app, remove from list or mark done
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
}
