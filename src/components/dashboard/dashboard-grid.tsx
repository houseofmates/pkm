
import { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { WidgetWrapper } from './widget-wrapper';
import { COMPONENT_MAP, WidgetDefinition, WIDGET_TYPES } from './registry';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Save } from 'lucide-react';
import { toast } from 'sonner';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default Layout
const INITIAL_WIDGETS: WidgetDefinition[] = [
    { id: 'stat1', type: 'stat', title: 'Total Records', props: { title: 'Records', value: '1,240', trend: '+12%', trendUp: true }, grid: { x: 0, y: 0, w: 3, h: 2 } },
    { id: 'stat2', type: 'stat', title: 'Tasks Due', props: { title: 'Pending Tasks', value: '8', trend: '-2', trendUp: true }, grid: { x: 3, y: 0, w: 3, h: 2 } },
    { id: 'stat3', type: 'stat', title: 'Active Projects', props: { title: 'Projects', value: '4', trend: 'On Track', trendUp: true }, grid: { x: 6, y: 0, w: 3, h: 2 } },
    { id: 'activity1', type: 'activity', title: 'Recent Activity', props: {}, grid: { x: 9, y: 0, w: 3, h: 6 } },
    // Placeholder for chart
    { id: 'chart1', type: 'chart-line', title: 'Productivity Trend', props: {}, grid: { x: 0, y: 2, w: 9, h: 6 } },
];

export function DashboardGrid() {
    const [widgets, setWidgets] = useState<WidgetDefinition[]>(INITIAL_WIDGETS);
    const [isDraggable, setIsDraggable] = useState(true);

    // Save/Load Logic (Mock)
    useEffect(() => {
        const saved = localStorage.getItem('dashboard_layout');
        if (saved) {
            try {
                setWidgets(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load layout", e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('dashboard_layout', JSON.stringify(widgets));
        toast.success("Dashboard layout saved");
    };

    const handleLayoutChange = (layout: any[]) => {
        // Sync RGL layout back to our widget state
        const updatedWidgets = widgets.map(w => {
            const l = layout.find(item => item.i === w.id);
            if (l) {
                return { ...w, grid: { x: l.x, y: l.y, w: l.w, h: l.h } };
            }
            return w;
        });
        setWidgets(updatedWidgets);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const handleAddWidget = () => {
        // For now, just add a random stat widget
        const id = `new_${Date.now()}`;
        const newWidget: WidgetDefinition = {
            id,
            type: 'stat',
            title: 'New Widget',
            props: { title: 'New Widget', value: '0', trend: '---' },
            grid: { x: 0, y: Infinity, w: 3, h: 2 }
        };
        setWidgets(prev => [...prev, newWidget]);
    };

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* Dashboard Controls */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/80 backdrop-blur z-20">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsDraggable(!isDraggable)}>
                        {isDraggable ? 'Lock Layout' : 'Unlock Layout'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleAddWidget}>
                        <Plus className="h-4 w-4 mr-2" /> Add Widget
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                </div>
            </div>

            {/* Grid Canvas */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <ResponsiveGridLayout
                    className="layout"
                    layouts={{ lg: widgets.map(w => ({ i: w.id, ...w.grid })) }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={60} // Base row height
                    isDraggable={isDraggable}
                    isResizable={isDraggable}
                    draggableHandle=".drag-handle"
                    onLayoutChange={(layout) => handleLayoutChange(layout)}
                    margin={[16, 16]}
                >
                    {widgets.map(widget => {
                        const Component = COMPONENT_MAP[widget.type];
                        return (
                            <div key={widget.id}>
                                <WidgetWrapper
                                    title={widget.title}
                                    onRemove={() => handleRemoveWidget(widget.id)}
                                    editable={isDraggable}
                                >
                                    <Component {...widget.props} />
                                </WidgetWrapper>
                            </div>
                        )
                    })}
                </ResponsiveGridLayout>
            </div>
        </div>
    );
}
