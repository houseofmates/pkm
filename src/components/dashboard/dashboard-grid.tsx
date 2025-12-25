
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Save, Database, Trash2, Move, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCollections } from '@/hooks/use-collections';
import { useCollections } from '@/hooks/use-collections';
import { VIEW_REGISTRY, VIEW_OPTIONS } from '@/components/views/registry';
import type { ViewType } from '@/components/views/registry';
import { useAuth } from '@/contexts/auth-context';
import { useDroppable } from '@dnd-kit/core';

type WidgetType = 'view';
interface WidgetDefinition {
    id: string;
    type: WidgetType;
    title: string;
    collectionName: string;
    viewType: ViewType;
    // Position and Size in Pixels
    x: number;
    y: number;
    w: number;
    h: number;
    zIndex: number;
}

const INITIAL_WIDGETS: WidgetDefinition[] = [];

export function DashboardGrid() {
    const [widgets, setWidgets] = useState<WidgetDefinition[]>(INITIAL_WIDGETS);
    const { collections } = useCollections();
    const { client } = useAuth();
    const [isEditMode, setIsEditMode] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Data cache
    const [widgetData, setWidgetData] = useState<Record<string, { data: any[], loading: boolean }>>({});

    useEffect(() => {
        const saved = localStorage.getItem('dashboard_layout_freeform');
        if (saved) {
            try {
                setWidgets(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('dashboard_layout_freeform', JSON.stringify(widgets));
        toast.success("canvas saved");
    };

    const handleAddWidget = (collectionName: string, viewType: ViewType) => {
        const col = collections.find(c => c.name === collectionName);
        const title = `${col?.title || collectionName} (${viewType})`;

        // Find a spot? Just center it for now or top-left offset
        const newWidget: WidgetDefinition = {
            id: `w_${Date.now()}`,
            type: 'view',
            title,
            collectionName,
            viewType,
            x: 50 + (widgets.length * 20),
            y: 50 + (widgets.length * 20),
            w: 400,
            h: 300,
            zIndex: widgets.length + 1
        };

        setWidgets(prev => [...prev, newWidget]);
        toast.success(`added ${title}`);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const bringToFront = (id: string) => {
        setWidgets(prev => {
            const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
            return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
        });
    };

    // Fetch data
    useEffect(() => {
        widgets.forEach(widget => {
            if (!widgetData[widget.id] && !widgetData[widget.id]?.loading) {
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

    // --- Drag & Resize Logic ---
    const [dragState, setDragState] = useState<{
        id: string,
        startX: number,
        startY: number,
        initialX: number,
        initialY: number,
        initialW: number,
        initialH: number,
        mode: 'move' | 'resize'
    } | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState) return;
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;

            setWidgets(prev => prev.map(w => {
                if (w.id !== dragState.id) return w;

                if (dragState.mode === 'move') {
                    return {
                        ...w,
                        x: dragState.initialX + deltaX,
                        y: dragState.initialY + deltaY
                    };
                } else {
                    return {
                        ...w,
                        w: Math.max(200, dragState.initialW + deltaX),
                        h: Math.max(150, dragState.initialH + deltaY)
                    };
                }
            }));
        };

        const handleMouseUp = () => {
            setDragState(null);
        };

        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState]);

    // --- Global Drop Listener ---
    const { setNodeRef, isOver } = useDroppable({
        id: 'dashboard-canvas',
    });

    useEffect(() => {
        const handleExternalDrop = (e: CustomEvent<{ collectionName: string }>) => {
            handleAddWidget(e.detail.collectionName, 'table'); // Default to table view
        };

        window.addEventListener('pkm:add-widget', handleExternalDrop as EventListener);
        return () => {
            window.removeEventListener('pkm:add-widget', handleExternalDrop as EventListener);
        };
    }, [widgets, collections]); // Re-bind if dependencies change, though handleAddWidget relies on current state? 
    // Actually handleAddWidget uses setWidgets(prev => ...), so it's safe.
    // But we need 'collections' to look up title.

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b bg-background z-50 shadow-sm h-16">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">canvas</h1>
                    {isOver && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">Drop to Add</span>}
                </div>
                <div className="flex items-center gap-2 relative">
                    <Button
                        variant={isEditMode ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsEditMode(!isEditMode)}
                        title={isEditMode ? "Lock Layout" : "Unlock Layout"}
                    >
                        {isEditMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>

                    <Button
                        onClick={(e) => { e.stopPropagation(); setAddMenuOpen(!addMenuOpen); }}
                        variant={addMenuOpen ? "secondary" : "default"}
                    >
                        <Plus className="h-4 w-4 mr-2" /> add view
                    </Button>

                    {addMenuOpen && (
                        <div
                            className="absolute top-full right-0 mt-2 w-64 bg-popover border rounded-md shadow-lg z-50 max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                add collection view
                            </div>

                            {collections.map(col => (
                                <div key={col.name} className="border-b last:border-0 border-border/50">
                                    <div className="px-2 py-1.5 text-sm font-medium flex items-center bg-muted/30">
                                        <Database className="mr-2 h-3 w-3 opacity-50" />
                                        {col.title || col.name}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 p-1">
                                        {VIEW_OPTIONS.map(view => (
                                            <button
                                                key={view.id}
                                                className="text-xs text-left px-2 py-1.5 hover:bg-muted rounded-sm transition-colors text-muted-foreground hover:text-foreground"
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
                        <Save className="h-4 w-4 mr-2" /> save
                    </Button>
                </div>
            </div>

            {/* Canvas Area */}
            <div
                ref={(node) => {
                    containerRef.current = node;
                    setNodeRef(node);
                }}
                className={`flex-1 relative bg-neutral-50/50 dark:bg-neutral-900/20 overflow-auto cursor-grab active:cursor-grabbing ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
                onClick={() => setAddMenuOpen(false)}
            >
                {/* Infinite Canvas Content */}
                <div className="min-w-[2000px] min-h-[2000px] relative">
                    {widgets.map(widget => {
                        const ViewComponent = VIEW_REGISTRY[widget.viewType];
                        const data = widgetData[widget.id]?.data || [];

                        return (
                            <div
                                key={widget.id}
                                className="absolute bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden group select-none transition-shadow hover:shadow-md"
                                style={{
                                    left: widget.x,
                                    top: widget.y,
                                    width: widget.w,
                                    height: widget.h,
                                    zIndex: widget.zIndex,
                                }}
                                onMouseDown={() => bringToFront(widget.id)}
                            >
                                {/* Header / Drag Handle */}
                                <div
                                    className={`flex items-center justify-between p-2 border-b bg-muted/10 cursor-move ${isEditMode ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity`}
                                    onMouseDown={(e) => {
                                        if (!isEditMode) return;
                                        e.preventDefault();
                                        setDragState({
                                            id: widget.id,
                                            startX: e.clientX,
                                            startY: e.clientY,
                                            initialX: widget.x,
                                            initialY: widget.y,
                                            initialW: widget.w,
                                            initialH: widget.h,
                                            mode: 'move'
                                        });
                                    }}
                                >
                                    <div className="font-medium text-xs flex items-center gap-2 text-muted-foreground">
                                        <Move className="h-3 w-3" />
                                        {widget.title}
                                    </div>
                                    {isEditMode && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveWidget(widget.id); }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-auto p-2">
                                    <ViewComponent
                                        data={data}
                                        collection={collections.find(c => c.name === widget.collectionName)}
                                        loading={false}
                                    />
                                </div>

                                {/* Resize Handle */}
                                {isEditMode && (
                                    <div
                                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setDragState({
                                                id: widget.id,
                                                startX: e.clientX,
                                                startY: e.clientY,
                                                initialX: widget.x,
                                                initialY: widget.y,
                                                initialW: widget.w,
                                                initialH: widget.h,
                                                mode: 'resize'
                                            });
                                        }}
                                    >
                                        <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

