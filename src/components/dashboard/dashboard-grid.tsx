
import { useState, useEffect } from 'react';
import { WidgetWrapper } from './widget-wrapper';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Save, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCollections } from '@/hooks/use-collections';
import {
    //    DropdownMenu...
} from "@/components/ui/dropdown-menu";

// We'll reuse the View Registry components to render the actual views!
import { VIEW_REGISTRY, ViewType, VIEW_OPTIONS } from '@/components/views/registry';
import { useAuth } from '@/contexts/auth-context';

type WidgetType = 'view'; // Simplified to just views for now
interface WidgetDefinition {
    id: string;
    type: WidgetType;
    title: string;
    collectionName: string;
    viewType: ViewType;
    grid: { w: number; h: number };
}

const INITIAL_WIDGETS: WidgetDefinition[] = [];

export function DashboardGrid() {
    const [widgets, setWidgets] = useState<WidgetDefinition[]>(INITIAL_WIDGETS);
    const { collections } = useCollections();
    const { client } = useAuth();

    // Data cache for widgets
    const [widgetData, setWidgetData] = useState<Record<string, { data: any[], loading: boolean }>>({});

    // Load layout
    useEffect(() => {
        const saved = localStorage.getItem('dashboard_layout_v2');
        if (saved) {
            try {
                setWidgets(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('dashboard_layout_v2', JSON.stringify(widgets));
        toast.success("Dashboard layout saved");
    };

    const handleAddWidget = (collectionName: string, viewType: ViewType) => {
        const col = collections.find(c => c.name === collectionName);
        const title = `${col?.title || collectionName} (${viewType})`;

        const newWidget: WidgetDefinition = {
            id: `w_${Date.now()}`,
            type: 'view',
            title,
            collectionName,
            viewType,
            grid: { w: 6, h: 4 } // Default half width, medium height
        };

        setWidgets(prev => [...prev, newWidget]);
        toast.success(`Added ${title}`);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    // Fetch data for widgets
    useEffect(() => {
        widgets.forEach(widget => {
            if (!widgetData[widget.id] && !widgetData[widget.id]?.loading) {
                // Fetch
                setWidgetData(prev => ({ ...prev, [widget.id]: { data: [], loading: true } }));

                client.listRecords(widget.collectionName).then(res => {
                    const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
                    setWidgetData(prev => ({ ...prev, [widget.id]: { data, loading: false } }));
                }).catch(err => {
                    console.error(err);
                    setWidgetData(prev => ({ ...prev, [widget.id]: { data: [], loading: false } }));
                });
            }
        });
    }, [widgets, client]);

    const [addMenuOpen, setAddMenuOpen] = useState(false);

    return (
        <div className="flex flex-col h-full bg-background/50" onClick={() => setAddMenuOpen(false)}>
            {/* Dashboard Controls */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/80 backdrop-blur z-20">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">Home Dashboard</h1>
                </div>
                <div className="flex items-center gap-2 relative">
                    {/* Native Dropdown Trigger */}
                    <Button
                        onClick={(e) => { e.stopPropagation(); setAddMenuOpen(!addMenuOpen); }}
                        variant={addMenuOpen ? "secondary" : "default"}
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add View
                    </Button>

                    {/* Native Dropdown Content */}
                    {addMenuOpen && (
                        <div
                            className="absolute top-full right-0 mt-2 w-64 bg-popover border rounded-md shadow-md z-50 max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Add Collection View
                            </div>

                            {collections.length === 0 && <div className="p-2 text-sm text-muted-foreground">No collections found</div>}

                            {collections.map(col => (
                                <div key={col.name} className="border-b last:border-0">
                                    <div className="px-2 py-1.5 text-sm font-medium flex items-center bg-muted/30">
                                        <Database className="mr-2 h-3 w-3 opacity-50" />
                                        {col.title || col.name}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 p-1">
                                        {VIEW_OPTIONS.map(view => (
                                            <button
                                                key={view.id}
                                                className="text-xs text-left px-2 py-1.5 hover:bg-muted rounded-sm transition-colors"
                                                onClick={() => {
                                                    handleAddWidget(col.name, view.id);
                                                    setAddMenuOpen(false);
                                                }}
                                            >
                                                + {view.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button size="sm" variant="outline" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" /> Save Layout
                    </Button>
                </div>
            </div>

            {/* Native CSS Grid - Auto Flow */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                {widgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground border-2 border-dashed rounded-xl m-8">
                        <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">Your Dashboard is Empty</h3>
                        <p>Add a view from your databases to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-[400px]">
                        {widgets.map(widget => {
                            const ViewComponent = VIEW_REGISTRY[widget.viewType];
                            const data = widgetData[widget.id]?.data || [];
                            const loading = widgetData[widget.id]?.loading;

                            return (
                                <div key={widget.id} className="col-span-1 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden relative group">
                                    {/* Widget Header */}
                                    <div className="flex items-center justify-between p-3 border-b bg-muted/40">
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            {widget.title}
                                            <span className="text-xs font-normal text-muted-foreground bg-background border px-1.5 py-0.5 rounded-full">
                                                {data.length}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleRemoveWidget(widget.id)}
                                        >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>

                                    {/* Widget Content */}
                                    <div className="flex-1 overflow-auto p-2 min-h-0">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-full">Loading...</div>
                                        ) : (
                                            <div className="h-full relative transform scale-[0.95] origin-top-left w-[105%]">
                                                {/* Scale down slightly to fit dense dashboards */}
                                                <ViewComponent
                                                    data={data}
                                                    collection={collections.find(c => c.name === widget.collectionName)}
                                                    loading={false}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
