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

    // prevent default browser behaviors
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const preventDefault = (e: Event) => e.preventDefault();
        // prevent standard scroll
        container.addEventListener('wheel', preventDefault, { passive: false });
        // prevent touch defaults if needed
        container.addEventListener('touchstart', preventDefault, { passive: false });

        return () => {
            container.removeEventListener('wheel', preventDefault);
            container.removeEventListener('touchstart', preventDefault);
        };
    }, []);

    // gesture handling
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
                // zoom handled separately usually, but usegesture combines?
                // let's separate zoom logic manually for control.
                if (event.ctrlKey || event.metaKey) {
                    // zoom
                    const newScale = Math.min(Math.max(scale - event.deltaY * 0.001, minScale), maxScale);
                    setScale(newScale);
                } else {
                    // pan (scroll wheel)
                    setOffset(prev => ({ x: prev.x - event.deltaX, y: prev.y - event.deltaY }));
                }
            },
            onPinch: ({ offset: [s] }: { offset: [number, number] }) => {
                // touchpad zoom
                setScale(s);
            }
        },
        {
            target: containerRef,
            drag: {
                // filtertaps: true, 
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

    // manual wheel/zoom handler for precision if usegesture fails on 'wheel'
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
            if (el) el.removeeventlistener('wheel', handlewheel);
        }
    }, [scale, minscale, maxscale]);

    return (
        <div
            ref={containerRef}
            className={cn("w-full h-full overflow-hidden relative bg-[#050505] cursor-grab active:cursor-grabbing select-none", className)}
            onContextMenu={() => {
                // prevent default context menu on background to allow custom or just clean usage
                // but allow if shift key pressed?
            }}
        >
            {/* fixed header layer for alignment */}
            {header && (
                <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
                    {header}
                </div>
            )}

            {/* infinite content layer */}
            <div
                className="w-full h-full origin-top-left will-change-transform"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
                }}
            >
                {children}
            </div>

            {/* controls overlay (optional) */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
                <button onClick={() => setScale(1)} className="bg-muted/80 p-2 rounded-full hover:bg-muted text-xs">reset</button>
                <div className="bg-muted/80 px-2 py-1 rounded text-xs text-center">{Math.round(scale * 100)}%</div>
            </div>
        </div>
    );
}
