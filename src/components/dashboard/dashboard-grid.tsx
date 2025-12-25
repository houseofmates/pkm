
import { useState, useEffect } from 'react';
import { WidgetWrapper } from './widget-wrapper';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Save, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { toast } from 'sonner';

// Simplified types since we aren't using the registry complex types yet
type WidgetType = 'stat' | 'chart-line' | 'chart-bar' | 'activity' | 'quick-add';
interface WidgetDefinition {
    id: string;
    type: WidgetType;
    title: string;
    props: any;
    grid: { x: number; y: number; w: number; h: number };
    // We will map w/h to col-span and row-span
}

const INITIAL_WIDGETS: WidgetDefinition[] = [
    { id: 'stat1', type: 'stat', title: 'Total Records', props: { title: 'Records', value: '1,240', trend: '+12%', trendUp: true }, grid: { x: 0, y: 0, w: 3, h: 2 } },
    { id: 'stat2', type: 'stat', title: 'Tasks Due', props: { title: 'Pending Tasks', value: '8', trend: '-2', trendUp: true }, grid: { x: 3, y: 0, w: 3, h: 2 } },
    { id: 'stat3', type: 'stat', title: 'Active Projects', props: { title: 'Projects', value: '4', trend: 'On Track', trendUp: true }, grid: { x: 6, y: 0, w: 3, h: 2 } },
    { id: 'activity1', type: 'activity', title: 'Recent Activity', props: {}, grid: { x: 9, y: 0, w: 3, h: 6 } },
    { id: 'chart1', type: 'chart-line', title: 'Productivity Trend', props: { type: 'line' }, grid: { x: 0, y: 2, w: 9, h: 6 } },
];

export function DashboardGrid() {
    const [widgets, setWidgets] = useState<WidgetDefinition[]>(INITIAL_WIDGETS);

    // Simple Grid Rendering Logic
    // We assume 12 columns total

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* Dashboard Controls */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/80 backdrop-blur z-20">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info("Drag & Drop coming in update (React 19 Support)")}>
                        Unlock Layout
                    </Button>
                    <Button size="sm" onClick={() => toast.success("Layout Saved")}>
                        <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                </div>
            </div>

            {/* Native CSS Grid */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-4 auto-rows-[minmax(100px,auto)]">
                    {widgets.map(widget => {
                        // Map standard 12-col grid logic to Tailwind classes
                        const colSpan = widget.grid.w === 3 ? 'col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-3'
                            : widget.grid.w === 6 ? 'col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-6'
                                : widget.grid.w === 9 ? 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-9'
                                    : 'col-span-full';

                        const rowSpan = widget.grid.h > 4 ? 'row-span-2' : 'row-span-1';

                        return (
                            <div key={widget.id} className={`${colSpan} ${rowSpan} min-h-[140px]`}>
                                <WidgetWrapper
                                    title={widget.title}
                                    onRemove={() => { }}
                                    editable={false}
                                >
                                    <NativeWidgetRenderer widget={widget} />
                                </WidgetWrapper>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

// Simple Renderer to avoid complex Registry for now
function NativeWidgetRenderer({ widget }: { widget: WidgetDefinition }) {
    if (widget.type === 'stat') {
        const { value, trend, trendUp } = widget.props;
        return (
            <div className="flex flex-col h-full justify-center">
                <div className="text-3xl font-bold">{value}</div>
                <div className={`flex items-center text-sm ${trendUp ? 'text-green-500' : 'text-red-500'} mt-1`}>
                    {trendUp ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                    {trend}
                </div>
            </div>
        );
    }

    if (widget.type === 'chart-line') {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-accent/10 rounded">
                [Native Chart Placeholder]
            </div>
        );
    }

    if (widget.type === 'activity') {
        return (
            <div className="flex flex-col gap-2 p-2">
                <div className="flex items-center gap-2 text-sm border-b pb-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span>Edited "Project Alpha"</span>
                    <span className="ml-auto text-xs text-muted-foreground">2m</span>
                </div>
                <div className="flex items-center gap-2 text-sm border-b pb-2">
                    <Plus className="h-4 w-4 text-green-500" />
                    <span>Created "New Task"</span>
                    <span className="ml-auto text-xs text-muted-foreground">1h</span>
                </div>
            </div>
        );
    }

    return <div>Unknown Widget</div>;
}
