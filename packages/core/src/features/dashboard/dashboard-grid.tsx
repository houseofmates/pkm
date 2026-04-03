import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Plus, Database, Lock, Unlock, User, FileText, X, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useCollections, useCollection } from '@/hooks/use-collections';

import { useDroppable } from '@dnd-kit/core';
import { useAppSetting } from '@/hooks/use-app-setting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseWidget } from '@/features/databases/components/database-widget';
import { useFronter } from '@/contexts/fronter-context';
import { HeadmateCard } from '@/features/headmates/components/headmate-card';
import { storageManager } from '@/lib/storage-manager';
import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas';
import { Toolbar } from '@/features/edgeless/components/Toolbar';
import type { ViewType } from '@/components/views/registry';
import { useDrawing } from '@/hooks/use-drawing';
import { updateDrawingMeta } from '@/features/edgeless/storage';
import { secureLogger } from '@/lib/secure-logger';
import { useEdgelessStore } from '@/features/edgeless/store';
import type { Collection } from '@/hooks/use-collections';

// Wrapper component to fetch full collection details with fields
function CollectionWidgetWrapper({ collectionName, initialView, viewConfig, onRemove }: { 
  collectionName: string; 
  initialView: ViewType; 
  viewConfig?: any; 
  onRemove: () => void;
}) {
  const { data: collection, loading } = useCollection(collectionName);
  
  if (loading) {
    return <div className="p-4 text-xs text-muted-foreground">loading collection...</div>;
  }
  
  if (!collection) {
    return <div className="p-4 text-xs text-muted-foreground">collection '{collectionName}' not found</div>;
  }
  
  return <DatabaseWidget collection={collection} initialView={initialView} viewConfig={viewConfig} onRemove={onRemove} />;
}

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

const makeId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);

export function DashboardGrid({ layoutKey = 'dashboard_widgets_v2' }: { layoutKey?: string }) {
    const [widgets, setWidgets] = useAppSetting<WidgetDefinition[]>(layoutKey, []);
    const { collections } = useCollections();
    const [isEditMode, setIsEditMode] = useState(true);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [localDocs, setLocalDocs] = useState<{ id: string, title: string }[]>([]);
    const [wizardTab, setWizardTab] = useState<'databases' | 'documents' | 'contacts'>('databases');
    const { members } = useFronter();
    const [homeDrawingId, setHomeDrawingId, drawingIdLoading] = useAppSetting<string | null>('dashboard_home_drawing_id', null);
    const {
        loading: canvasLoading,
        saving: canvasSaving,
        syncStatus: canvasSyncStatus,
        handleForceSync,
    } = useDrawing(homeDrawingId || undefined);

    const isChatOpen = useEdgelessStore((s) => s.isChatOpen);
    const setChatOpen = useEdgelessStore((s) => s.setChatOpen);

    useEffect(() => {
        if (!addMenuOpen) return;
        const docs: { id: string, title: string }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('canvas-config-')) {
                const id = key.replace('canvas-config-', '');
                try {
                    const config = JSON.parse(storageManager.getItem(key) || '{}');
                    docs.push({ id, title: config.title || 'Untitled Document' });
                } catch (e) { secureLogger.warn('Failed to parse document config:', e); }
            }
        }
        setLocalDocs(docs);
    }, [addMenuOpen]);

    useEffect(() => {
        if (drawingIdLoading) return;
        if (homeDrawingId) return;
        let cancelled = false;
        const ensureDrawingId = async () => {
            try {
                const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `dashboard-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                await updateDrawingMeta(newId, { title: 'home canvas', syncState: 'pending' });
                if (!cancelled) setHomeDrawingId(newId);
            } catch (error) {
                secureLogger.error('failed to initialize dashboard drawing', error);
                toast.error('failed to initialize dashboard canvas');
            }
        };
        ensureDrawingId();
        return () => { cancelled = true; };
    }, [drawingIdLoading, homeDrawingId, setHomeDrawingId]);

    const handleAddWidget = (collectionName: string, viewType: ViewType) => {
        const col = collections.find((c: { name: string; title?: string }) => c.name === collectionName);
        const newWidget: WidgetDefinition = {
            id: makeId(),
            type: 'view',
            title: col?.title || collectionName,
            collectionName,
            viewType,
            x: 100,
            y: 100,
            w: 600,
            h: 400,
            zIndex: 10
        };
        setWidgets((prev: WidgetDefinition[]) => [...prev, newWidget]);
    };

    const handleAddDocumentWidget = (docId: string, title: string) => {
        const newWidget: WidgetDefinition = {
            id: makeId(),
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
            id: makeId(),
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

    const handleWidgetPointerDown = useCallback((event: React.PointerEvent<HTMLElement>, widget: WidgetDefinition) => {
        if (event.button !== 0) return;
        bringToFront(widget.id);
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-widget-action="true"]')) return;
        if (!isEditMode) return;
        event.preventDefault();
        event.stopPropagation();
        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startY = event.clientY;
        const initialX = widget.x;
        const initialY = widget.y;
        const body = document.body;
        const previousUserSelect = body.style.userSelect;
        body.style.userSelect = 'none';
        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId !== pointerId) return;
            moveEvent.preventDefault();
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            setWidgets((prev: WidgetDefinition[]) =>
                prev.map((w) => w.id === widget.id ? { ...w, x: initialX + deltaX, y: initialY + deltaY } : w)
            );
        };
        const handlePointerUp = (upEvent: PointerEvent) => {
            if (upEvent.pointerId !== pointerId) return;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            body.style.userSelect = previousUserSelect;
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }, [bringToFront, isEditMode, setWidgets]);

    const { setNodeRef } = useDroppable({ id: 'dashboard-canvas' });

    useEffect(() => {
        const handleAdd = (e: any) => {
            const { id, type, name } = e.detail;
            if (type === 'collection') {
                if (id.startsWith('doc_')) {
                    handleAddDocumentWidget(id.replace('doc_', ''), name);
                } else if (id.startsWith('drawing_')) {
                    toast.info("drawings not yet supported on dashboard");
                } else {
                    handleAddWidget(id, 'table');
                }
            }
        };
        window.addEventListener('pkm:add-widget', handleAdd);
        return () => window.removeEventListener('pkm:add-widget', handleAdd);
    }, []);

    const headerControl = (
        <div className="absolute top-0 left-0 w-full z-50 pointer-events-none flex flex-col">
            <div className="h-16 flex items-center px-4 justify-between bg-background/0 pointer-events-none">
                <div className="pointer-events-auto">
                    <Button variant="ghost" size="icon" onClick={() => setAddMenuOpen(true)}>
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setChatOpen(true)}
                        className={isChatOpen ? 'text-primary' : 'text-zinc-400'}
                        title="Open Wilson Chat"
                    >
                        <MessageCircle className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditMode(!isEditMode)}>
                        {isEditMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                    <div className="text-[10px] lowercase text-zinc-400 flex items-center gap-2">
                        <span>{canvasSyncStatus}</span>
                        {canvasSaving && <span className="text-zinc-500">· saving…</span>}
                        {homeDrawingId && canvasSyncStatus !== 'synced' && (
                            <button onClick={handleForceSync} className="text-[#f6b012] hover:underline">sync now</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full relative bg-[#050505] text-foreground overflow-hidden flex flex-col">
            {headerControl}
            <div className="flex-1 w-full h-full relative overflow-hidden">
                <EdgelessCanvas key={homeDrawingId || 'home-canvas-placeholder'} className="bg-[#050505]">
                    <div ref={setNodeRef} className="relative w-[5000px] h-[5000px]">
                        {widgets.map(widget => (
                            <div
                                key={widget.id}
                                className="absolute transition-shadow hover:shadow-xl"
                                style={{ left: widget.x, top: widget.y, width: widget.w, height: widget.h, zIndex: widget.zIndex, position: 'absolute' }}
                                onPointerDown={(e) => { e.stopPropagation(); handleWidgetPointerDown(e, widget); }}
                            >
                                <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 bg-background/80 backdrop-blur">
                                    <CardHeader className="p-3 py-2 flex flex-row items-center justify-between space-y-0 border-b cursor-move ui-drag-handle select-none" onPointerDown={(e) => handleWidgetPointerDown(e, widget)}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {widget.type === 'view' && <Database className="h-4 w-4 text-primary" />}
                                            {widget.type === 'document' && <FileText className="h-4 w-4 text-primary" />}
                                            {widget.type === 'contact' && <User className="h-4 w-4 text-primary" />}
                                            <CardTitle className="text-sm font-medium truncate">{widget.title}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isEditMode && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" data-widget-action="true" onClick={() => handleRemoveWidget(widget.id)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                                        {widget.type === 'view' && (
                                            <CollectionWidgetWrapper 
                                                collectionName={widget.collectionName} 
                                                initialView={widget.viewType} 
                                                viewConfig={widget.viewConfig} 
                                                onRemove={() => handleRemoveWidget(widget.id)} 
                                            />
                                        )}
                                        {widget.type === 'document' && <div className="p-4 text-sm text-muted-foreground">document preview: {widget.collectionName}</div>}
                                        {widget.type === 'contact' && (() => {
                                            const member = members.find(m => m.id === widget.collectionName);
                                            if (!member) return <div className="p-4 text-xs text-muted-foreground">contact not found</div>;
                                            return <HeadmateCard member={member} collection={undefined} className="w-full h-full" />;
                                        })()}
                                    </CardContent>
                                    {isEditMode && (
                                        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-primary/20 hover:bg-primary/50 rounded-tl"
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
                {(!homeDrawingId || canvasLoading || drawingIdLoading) && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center text-xs text-white lowercase">initializing canvas…</div>
                )}
                <div className="pointer-events-auto"><Toolbar /></div>
            </div>
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
