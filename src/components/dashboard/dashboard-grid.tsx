
import { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { WidgetWrapper } from './widget-wrapper';
// import { COMPONENT_MAP, WidgetDefinition, WIDGET_TYPES, WidgetType } from './registry';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ResponsiveGridLayout = WidthProvider(Responsive);

// Define types locally for now to avoid registry import
type WidgetType = 'stat' | 'chart-line' | 'chart-bar' | 'activity' | 'quick-add';
interface WidgetDefinition {
    id: string;
    type: WidgetType;
    title: string;
    props: any;
    grid: { x: number; y: number; w: number; h: number };
}

// Default Layout
const INITIAL_WIDGETS: WidgetDefinition[] = [
    { id: 'stat1', type: 'stat', title: 'Total Records', props: { title: 'Records', value: '1,240', trend: '+12%', trendUp: true }, grid: { x: 0, y: 0, w: 3, h: 2 } },
];

export function DashboardGrid() {
    const [widgets, setWidgets] = useState<WidgetDefinition[]>(INITIAL_WIDGETS);
    const [isDraggable, setIsDraggable] = useState(true);

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* Dashboard Controls */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/80 backdrop-blur z-20">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">Dashboard (Safe Imports)</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsDraggable(!isDraggable)}>
                        {isDraggable ? 'Lock Layout' : 'Unlock Layout'}
                    </Button>
                    <Button variant="outline" size="sm">
                        Mock Add
                    </Button>
                    <Button size="sm">
                        <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                </div>
            </div>


            <div className="p-4">
                <div className="p-4 border border-blue-500 mb-4">
                    <h2 className="text-xl font-bold">RGL DISABLED</h2>
                    <p>Testing DropdownMenu below:</p>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button>Open Menu</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>Item 1</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* <ResponsiveGridLayout
                    className="layout"
                    layouts={{ lg: widgets.map(w => ({ i: w.id, ...w.grid })) }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={60}
                    isDraggable={isDraggable}
                    isResizable={isDraggable}
                    width={1200} // Force width for test
                >
                    <div key="stat1" className="bg-card border p-4">
                        Test Widget
                    </div>
                </ResponsiveGridLayout> */}
            </div>
        </div>
    );
}
