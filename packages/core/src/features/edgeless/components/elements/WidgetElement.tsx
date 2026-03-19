import React, { lazy, Suspense, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useEdgelessStore } from '../../store';

const ClockWidget = lazy(() => import('@/features/widgets/ClockWidget').then(m => ({ default: m.ClockWidget })));
const N8nWidget = lazy(() => import('@/features/widgets/N8nWidget').then(m => ({ default: m.N8nWidget })));
const BiometricTracker = lazy(() => import('@/features/widgets/BiometricTracker').then(m => ({ default: m.BiometricTracker })));
const NarrativeLog = lazy(() => import('@/features/widgets/NarrativeLog').then(m => ({ default: m.NarrativeLog })));
const OptimizationDashboard = lazy(() => import('@/features/widgets/OptimizationDashboard').then(m => ({ default: m.OptimizationDashboard })));
const CaptureWidget = lazy(() => import('@/features/widgets/CaptureWidget'));
const CreateCaptureWidget = lazy(() => import('@/features/widgets/CreateCaptureWidget'));
const HygieneTracker = lazy(() => import('@/features/widgets/HygieneTracker').then(m => ({ default: m.HygieneTracker })));
const DatabaseViewWidget = lazy(() => import('@/features/widgets/DatabaseViewWidget').then(m => ({ default: m.DatabaseViewWidget })));

interface WidgetElementProps {
    element: any;
}

export const WidgetElement = React.memo(function WidgetElement({ element }: WidgetElementProps) {
    const { widgetId, ...data } = element.data;
    const updateElement = useEdgelessStore((s: any) => s.updateElement);

    const handleDataUpdate = useCallback((patch: Record<string, any>) => {
        updateElement(element.id, { data: { ...element.data, ...patch } });
    }, [element.id, element.data, updateElement]);

    const handleResizePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        if (element.locked) return;
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = element.width;
        const startH = element.height;

        const handleMove = (move: PointerEvent) => {
            const newW = Math.max(160, startW + (move.clientX - startX));
            const newH = Math.max(120, startH + (move.clientY - startY));
            updateElement(element.id, { width: newW, height: newH });
        };

        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
    };

    const renderWidget = () => {
        switch (widgetId) {
            case 'clock':
                return <ClockWidget data={data} />;
            case 'n8n':
                return <N8nWidget data={data} />;
            case 'biometric':
                return <BiometricTracker data={data} onUpdate={handleDataUpdate} />;
            case 'narrative':
                return <NarrativeLog data={data} onUpdate={handleDataUpdate} />;
            case 'optimization':
                return <OptimizationDashboard data={data} onUpdate={handleDataUpdate} />;
            case 'capture':
                return <CaptureWidget data={data} onUpdate={handleDataUpdate} />;
            case 'create_capture':
                return <CreateCaptureWidget data={data} onUpdate={handleDataUpdate} />;
            case 'hygiene':
                return <HygieneTracker data={data} />;
            case 'embed-nocobase':
                return <DatabaseViewWidget data={{ ...data, _elementId: element.id }} />;
            default:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 border border-dashed border-white/20 rounded-xl text-[10px] text-muted-foreground lowercase">
                        <span>unknown widget type</span>
                        <span className="opacity-50">{widgetId}</span>
                    </div>
                );
        }
    };

    return (
        <div className="w-full h-full relative group pointer-events-auto">
            <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-xl border border-white/5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
                </div>
            }>
                {renderWidget()}
            </Suspense>

            {/* resize handle */}
            <div
                className="absolute bottom-1 right-1 w-4 h-4 rounded bg-white/10 hover:bg-white/20 cursor-se-resize"
                onPointerDown={handleResizePointerDown}
            />
        </div>
    );
}, (prev, next) => prev.element === next.element);
