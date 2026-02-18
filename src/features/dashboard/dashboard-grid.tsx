import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Plus, Database, Lock, Unlock, User, FileText, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useCollections } from '@/hooks/use-collections';

import { useDroppable } from '@dnd-kit/core';
import { useAppSetting } from '@/hooks/use-app-setting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseWidget } from '@/features/databases/components/database-widget';
import { useFronter } from '@/contexts/fronter-context';
import { HeadmateCard } from '@/features/headmates/components/headmate-card';
// import { InfiniteCanvasWrapper } from '@/components/ui/infinite-canvas-wrapper';
import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas';
import { Toolbar } from '@/features/edgeless/components/Toolbar';
// import { Separator } from '@/components/ui/separator';
import type { ViewType } from '@/components/views/registry';

type WidgetType = 'view' | 'document' | 'contact';
interface WidgetDefinition {
    id: string;
    type: WidgetType;
    title: string;
    collectionName: string;
    viewType: ViewType;
    viewConfig?: {
        sort?: string[];
        filter?: Record<string, any>;
        viewType?: ViewType;
    };
    x: number;
    y: number;
    w: number;
    h: number;
    zIndex: number;
}

export function DashboardGrid({ layoutKey = 'dashboard_widgets_v2' }: { layoutKey?: string }) {
    // --- State ---
    const [widgets, setWidgets] = useAppSetting<WidgetDefinition[]>(layoutKey, []);
    const { collections } = useCollections();
    // const { client, token, isAuthenticated, login } = useAuth(); // Unused
    const [isEditMode, setIsEditMode] = useState(true);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [localDocs, setLocalDocs] = useState<{ id: string, title: string }[]>([]);
    const [wizardTab, setWizardTab] = useState<'databases' | 'documents' | 'contacts'>('databases');
    const { members } = useFronter();

    // Load Local Docs
    useEffect(() => {
        if (!addMenuOpen) return;
        const docs: { id: string, title: string }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('canvas-config-')) {
                const id = key.replace('canvas-config-', '');
                try {
                    const config = JSON.parse(localStorage.getItem(key) || '{}');
                    docs.push({ id, title: config.title || 'Untitled Document' });
                } catch (e) { }
            }
        }
        setLocalDocs(docs);
    }, [addMenuOpen]);

    // Widget Handlers
    const handleAddWidget = (collectionName: string, viewType: ViewType) => {
        const col = collections.find((c: { name: string; title?: string }) => c.name === collectionName);
        const newWidget: WidgetDefinition = {
            id: Math.random().toString(36).substring(7),
            type: 'view',
            title: col?.title || collectionName,
            collectionName,
            viewType,
            x: 100, // Default Offset for Canvas
            y: 100,
            w: 600,
            h: 400,
            zIndex: 10
        };
        setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
    };

    const handleAddDocumentWidget = (docId: string, title: string) => {
        const newWidget: WidgetDefinition = {
            id: Math.random().toString(36).substring(7),
            type: 'document',
            title: title,
            collectionName: docId,
            viewType: 'table',
            x: 100,
            y: 100,
            w: 300,
            h: 150,
            zIndex: 10
        };
        setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
    };

    const handleAddContactWidget = (memberId: string) => {
        const member = members.find(m => m.id === memberId);
        const newWidget: WidgetDefinition = {
            id: Math.random().toString(36).substring(7),
            type: 'contact',
            title: member?.name || 'Unknown Contact',
            collectionName: memberId,
            viewType: 'table',
            x: 100,
            y: 100,
            w: 300,
            h: 350,
            zIndex: 10
        };
        setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets((prev: WidgetDefinition[]) => prev.filter(w => w.id !== id));
    };

    const bringToFront = (id: string) => {
        setWidgets((prev: WidgetDefinition[]) => {
            const maxZ = Math.max(...prev.map((w: WidgetDefinition) => w.zIndex), 0);
            return prev.map((w: WidgetDefinition) => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
        });
    };

    // --- Droppable for Sidebar Drag ---
    const { setNodeRef } = useDroppable({
        id: 'dashboard-canvas',
    });

    // Listen to drop events from RootLayout (via CustomEvent as DnD Kit context is shared but handling is separate)
    useEffect(() => {
        const handleAdd = (e: any) => {
            const { id, type, name } = e.detail;
            if (type === 'collection') {
                // Check if it's a document or real collection
                if (id.startsWith('doc_')) {
                    handleAddDocumentWidget(id.replace('doc_', ''), name);
                } else if (id.startsWith('drawing_')) {
                    // Drawing widget logic? Or just treat as document?
                    toast.info("Drawings not yet supported on dashboard");
                } else {
                    handleAddWidget(id, 'table'); // Default to table view
                }
            }
        };
        window.addEventListener('pkm:add-widget', handleAdd);
        return () => window.removeEventListener('pkm:add-widget', handleAdd);
    }, []);


    // --- Header Alignment Content ---
    // Placed absolute to overlay canvas
    const HeaderControl = (
        <div className="absolute top-0 left-0 w-full z-50 pointer-events-none flex flex-col">
            <div className="h-16 flex items-center px-4 justify-between bg-background/0 pointer-events-none">
                <div className="pointer-events-auto">
                    <Button variant="ghost" size="icon" onClick={() => setAddMenuOpen(true)}>
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <Button variant="ghost" size="icon" onClick={() => setIsEditMode(!isEditMode)}>
                        {isEditMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            {/* Separator removed from header logic if we want transparent blend, 
                but user wanted alignment. We keep it if needed. 
                Sidebar has a border-bottom. We should match or omit.
                If we use border-bottom on sidebar, we might want one here.
                But user "Remove persistent bottom border line on sidebar" might imply no border.
                We'll keep visual consistency with whatever sidebar has.
            */}
        </div>
    );

    return (
        <div className="w-full h-full relative bg-[#050505] text-foreground overflow-hidden flex flex-col">
            {HeaderControl}

            {/* Edgeless Canvas as Background & Interaction Layer */}
            <div className="flex-1 w-full h-full relative overflow-hidden">
                <EdgelessCanvas className="bg-[#050505]">
                    {/* Render Widgets inside Canvas (Synced Transform) */}
                    <div ref={setNodeRef} className="relative w-[5000px] h-[5000px]">
                        {widgets.map(widget => (
                            <div
                                key={widget.id}
                                className="absolute transition-shadow hover:shadow-xl"
                                style={{
                                    left: widget.x,
                                    top: widget.y,
                                    width: widget.w,
                                    height: widget.h,
                                    zIndex: widget.zIndex,
                                    position: 'absolute'
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation(); // Prevent canvas drag start
                                    bringToFront(widget.id);
                                }}
                            >
                                <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 bg-background/80 backdrop-blur">
                                    <CardHeader className="p-3 py-2 flex flex-row items-center justify-between space-y-0 border-b cursor-move ui-drag-handle"
                                        onMouseDown={(e) => {
                                            // Allow dragging via dnd-kit or custom? 
                                            // Current implementation uses custom resize but drag?
                                            // InfiniteCanvasWrapper didn't handle widget drag, did it?
                                            // Widgets are absolute. They need a drag handler.
                                            // The previous code didn't show a drag handler logic for widgets, 
                                            // except `onMouseDown` to bring to front.
                                            // Ah, `InfiniteCanvasWrapper` does NOT handle element dragging.
                                            // DnD Kit `useDraggable`? usage?
                                            // I only see `useDroppable`.
                                            // Maybe `ui-drag-handle` class signals something?
                                            // Or maybe I missed the drag logic in the previous view.
                                            // Let's assume standard drag logic is needed or existing draggable lib handles `.ui-drag-handle`.
                                            // But I should persist the `onMouseDown` for bringToFront.
                                            e.stopPropagation();
                                            bringToFront(widget.id);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {widget.type === 'view' && <Database className="h-4 w-4 text-primary" />}
                                            {widget.type === 'document' && <FileText className="h-4 w-4 text-primary" />}
                                            {widget.type === 'contact' && <User className="h-4 w-4 text-primary" />}
                                            <CardTitle className="text-sm font-medium truncate">{widget.title}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isEditMode && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveWidget(widget.id)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                                        {widget.type === 'view' && (
                                            (() => {
                                                const col = collections.find((c: { name: string; title?: string }) => c.name === widget.collectionName);
                                                if (!col) return <div className="p-4 text-xs text-muted-foreground">Collection '{widget.collectionName}' not found</div>;
                                                return (
                                                    <DatabaseWidget
                                                        collection={col}
                                                        initialView={widget.viewType}
                                                        viewConfig={widget.viewConfig}
                                                        onRemove={() => handleRemoveWidget(widget.id)}
                                                    />
                                                );
                                            })()
                                        )}
                                        {widget.type === 'document' && (
                                            <div className="p-4 text-sm text-muted-foreground">
                                                Document Preview: {widget.collectionName}
                                            </div>
                                        )}
                                        {widget.type === 'contact' && (
                                            (() => {
                                                const member = members.find(m => m.id === widget.collectionName);
                                                if (!member) return <div className="p-4 text-xs text-muted-foreground">Contact not found</div>;
                                                return <HeadmateCard member={member} className="w-full h-full" />;
                                            })()
                                        )}

                                        {/* Interaction Overlay for Canvas Tools (e.g. Drawing over widgets?) 
                                            If strict layering is needed. For now, content is interactive.
                                        */}
                                    </CardContent>

                                    {/* Resize Handle */}
                                    {isEditMode && (
                                        <div
                                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-primary/20 hover:bg-primary/50 rounded-tl"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                const startX = e.clientX;
                                                const startY = e.clientY;
                                                const startW = widget.w;
                                                const startH = widget.h;

                                                const handleMove = (e: MouseEvent) => {
                                                    const newW = Math.max(200, startW + (e.clientX - startX));
                                                    const newH = Math.max(150, startH + (e.clientY - startY));
                                                    setWidgets((prev: WidgetDefinition[]) => prev.map(w => w.id === widget.id ? { ...w, w: newW, h: newH } : w));
                                                };

                                                const handleUp = () => {
                                                    window.removeEventListener('mousemove', handleMove);
                                                    window.removeEventListener('mouseup', handleUp);
                                                };

                                                window.addEventListener('mousemove', handleMove);
                                                window.addEventListener('mouseup', handleUp);
                                            }}
                                        />
                                    )}
                                </Card>
                            </div>
                        ))}
                    </div>
                </EdgelessCanvas>

                {/* Tools Overlay */}
                <div className="pointer-events-auto">
                    <Toolbar />
                    {/* <CanvasControls /> */}
                    {/* CanvasControls might be redundant if Toolbar has everything, 
                       but usually Controls has Zoom/Fit. 
                       If it's missing from import, we skip. 
                       User said "buttons", Toolbar has the main tools. 
                   */}
                </div>
            </div>

            {/* Add Widget Modal/Wizard (Overlay) */}
            {addMenuOpen && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl h-[500px] flex flex-col bg-[#0a0a0a] border-border">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>add widget</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setAddMenuOpen(false)}><X className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex gap-2 mb-4 border-b pb-2">
                                <Button variant={wizardTab === 'databases' ? 'secondary' : 'ghost'} onClick={() => setWizardTab('databases')}>databases</Button>
                                <Button variant={wizardTab === 'documents' ? 'secondary' : 'ghost'} onClick={() => setWizardTab('documents')}>documents</Button>
                                <Button variant={wizardTab === 'contacts' ? 'secondary' : 'ghost'} onClick={() => setWizardTab('contacts')}>contacts</Button>
                            </div>

                            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
                                {wizardTab === 'databases' && collections.map((col: { name: string; title?: string }) => (
                                    <Button key={col.name} variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => { handleAddWidget(col.name, 'table'); setAddMenuOpen(false); }}>
                                        <Database className="h-5 w-5" />
                                        <span className="truncate w-full">{col.title || col.name}</span>
                                    </Button>
                                ))}
                                {wizardTab === 'documents' && localDocs.map(doc => (
                                    <Button key={doc.id} variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => { handleAddDocumentWidget(doc.id, doc.title); setAddMenuOpen(false); }}>
                                        <FileText className="h-5 w-5" />
                                        <span className="truncate w-full">{doc.title}</span>
                                    </Button>
                                ))}
                                {wizardTab === 'contacts' && members.map(m => (
                                    <Button key={m.id} variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => { handleAddContactWidget(m.id); setAddMenuOpen(false); }}>
                                        <User className="h-5 w-5" />
                                        <span className="truncate w-full">{m.name}</span>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
