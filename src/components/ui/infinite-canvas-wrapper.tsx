import { useRef, useState, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { cn } from '@/lib/utils';

interface InfiniteCanvasWrapperProps {
    children: React.ReactNode;
    className?: string;
    initialScale?: number;
    minScale?: number;
    maxScale?: number;
    header?: React.ReactNode; // Content to stay fixed at the top (for alignment)
}

export function InfiniteCanvasWrapper({
    children,
    className,
    initialScale = 1,
    minScale = 0.1,
    maxScale = 5,
    header
}: InfiniteCanvasWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(initialScale);

    // Prevent default browser behaviors
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const preventDefault = (e: Event) => e.preventDefault();
        // Prevent standard scroll
        container.addEventListener('wheel', preventDefault, { passive: false });
        // Prevent touch defaults if needed
        container.addEventListener('touchstart', preventDefault, { passive: false });

        return () => {
            container.removeEventListener('wheel', preventDefault);
            container.removeEventListener('touchstart', preventDefault);
        };
    }, []);

    // Gesture Handling
    useGesture(
        {
            onDrag: ({ offset: [ox, oy], down, event }) => {
                const target = event.target as HTMLElement;
                const isInteractive = target.closest('button, input, textarea, a, .no-pan');

                if (isInteractive) return;

                setOffset({ x: ox, y: oy });
                document.body.style.cursor = down ? 'grabbing' : 'grab';
            },
            onWheel: ({ event }: { event: WheelEvent }) => {
                // Zoom handled separately usually, but useGesture combines?
                // Let's separate Zoom Logic manually for control.
                if (event.ctrlKey || event.metaKey) {
                    // Zoom
                    const newScale = Math.min(Math.max(scale - event.deltaY * 0.001, minScale), maxScale);
                    setScale(newScale);
                } else {
                    // Pan (Scroll Wheel)
                    setOffset(prev => ({ x: prev.x - event.deltaX, y: prev.y - event.deltaY }));
                }
            },
            onPinch: ({ offset: [s] }: { offset: [number, number] }) => {
                // Touchpad zoom
                setScale(s);
            }
        },
        {
            target: containerRef,
            drag: {
                // filterTaps: true, 
                from: () => [offset.x, offset.y],
                pointer: { buttons: [1, 2, 4] } // Allow Left(1), Right(2), Middle(4). Re-evaluate Right usually context menu.
            },
            wheel: {
                from: () => [offset.x, offset.y],
                eventOptions: { passive: false }
            },
            pinch: { scaleBounds: { min: minScale, max: maxScale }, modifierKey: null }
        }
    );

    // Manual Wheel/Zoom Handler for precision if useGesture fails on 'wheel'
    useEffect(() => {
        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                const zoomIntensity = 0.001;
                const newScale = Math.min(Math.max(scale + (-event.deltaY * zoomIntensity), minScale), maxScale);
                setScale(newScale);
            } else {
                setOffset(prev => ({ x: prev.x - event.deltaX, y: prev.y - event.deltaY }));
            }
        };

        const el = containerRef.current;
        if (el) {
            el.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (el) el.removeEventListener('wheel', handleWheel);
        }
    }, [scale, minScale, maxScale]);

    return (
        <div
            ref={containerRef}
            className={cn("w-full h-full overflow-hidden relative bg-[#050505] cursor-grab active:cursor-grabbing select-none", className)}
            onContextMenu={() => {
                // Prevent default context menu on background to allow custom or just clean usage
                // But allow if shift key pressed?
            }}
        >
            {/* Fixed Header Layer for Alignment */}
            {header && (
                <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
                    {header}
                </div>
            )}

            {/* Infinite Content Layer */}
            <div
                className="w-full h-full origin-top-left will-change-transform"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
                }}
            >
                {children}
            </div>

            {/* Controls Overlay (Optional) */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
                <button onClick={() => setScale(1)} className="bg-muted/80 p-2 rounded-full hover:bg-muted text-xs">reset</button>
                <div className="bg-muted/80 px-2 py-1 rounded text-xs text-center">{Math.round(scale * 100)}%</div>
            </div>
        </div>
    );
}
