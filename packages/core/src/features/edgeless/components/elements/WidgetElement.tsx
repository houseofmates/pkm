import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ClockWidget = lazy(() => import('@/features/widgets/ClockWidget').then(m => ({ default: m.ClockWidget })));
const N8nWidget = lazy(() => import('@/features/widgets/N8nWidget').then(m => ({ default: m.N8nWidget })));
const BiometricTracker = lazy(() => import('@/features/widgets/BiometricTracker'));
const NarrativeLog = lazy(() => import('@/features/widgets/NarrativeLog'));
const OptimizationDashboard = lazy(() => import('@/features/widgets/OptimizationDashboard'));
const CaptureWidget = lazy(() => import('@/features/widgets/CaptureWidget'));

interface WidgetElementProps {
    element: any;
}

export const WidgetElement = React.memo(function WidgetElement({ element }: WidgetElementProps) {
    const { widgetId, ...data } = element.data;

    const renderWidget = () => {
        switch (widgetId) {
            case 'clock':
                return <ClockWidget data={data} />;
            case 'n8n':
                return <N8nWidget data={data} />;
            case 'biometric':
                return <BiometricTracker data={data} />;
            case 'narrative':
                return <NarrativeLog data={data} />;
            case 'optimization':
                return <OptimizationDashboard data={data} />;
            case 'capture':
                return <CaptureWidget data={data} />;
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
        <div className="w-full h-full relative group">
            <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-xl border border-white/5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
                </div>
            }>
                {renderWidget()}
            </Suspense>

            {/* Interaction block - prevent clicks when not in interact mode (handled by EdgelessCanvas wrapper) */}
        </div>
    );
}, (prev, next) => prev.element === next.element)
