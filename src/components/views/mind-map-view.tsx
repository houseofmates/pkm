
import { useState, useEffect, useRef, useMemo } from 'react';
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RecordContextMenu } from '@/features/records/components/record-context-menu';
import { SmartField } from '@/components/fields/smart-field';

interface NodePosition {
    id: string;
    x: number;
    y: number;
}

export function MindMapView({ data, collection, config = {}, onConfigChange, onUpdateRecord, onDelete }: ViewProps) {
    if (!collection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm">loading mindmap metadata...</p>
                </div>
            </div>
        );
    }
    const [positions, setPositions] = useState<Record<string, NodePosition>>({});
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Load saved positions
    useEffect(() => {
        // In a real app, this would be saved in 'config' prop passed from parent
        // For now, we'll try to load from config or localStorage fallback
        const saved = config?.positions || localStorage.getItem(`mindmap_${collection.name}`);
        if (saved) {
            try {
                setPositions(typeof saved === 'string' ? JSON.parse(saved) : saved);
            } catch (e) {
                console.error("Failed to load positions", e);
            }
        } else {
            // Initial Auto-Layout (Grid)
            const initial: Record<string, NodePosition> = {};
            const cols = Math.ceil(Math.sqrt(data.length));
            data.forEach((record, i) => {
                initial[record.id] = {
                    id: record.id,
                    x: (i % cols) * 250 + 100,
                    y: Math.floor(i / cols) * 150 + 100
                };
            });
            setPositions(initial);
        }
    }, [data, collection.name, config]);

    const handleSave = () => {
        // Save to parent config if possible
        if (onConfigChange) {
            onConfigChange('positions', positions);
        }
        // Also local backup
        localStorage.setItem(`mindmap_${collection.name}`, JSON.stringify(positions));
        toast.success("Mind Map layout saved");
    };

    // Calculate Edges based on relations
    const edges = useMemo(() => {
        const links: { source: string; target: string; label: string }[] = [];
        const relationFields = collection.fields?.filter((f: any) => f.interface === 'linkToMany' || f.interface === 'linkToOne') || [];

        data.forEach(src => {
            relationFields.forEach((field: any) => {
                const target = src[field.name];
                if (!target) return;
                const targets = Array.isArray(target) ? target : [target];
                targets.forEach((t: any) => {
                    const tId = typeof t === 'object' ? t.id : t;
                    // Only draw if both exist in current view
                    if (data.find(d => d.id === tId)) {
                        links.push({ source: src.id, target: tId, label: field.uiSchema?.title });
                    }
                });
            });
        });
        return links;
    }, [data, collection]);

    // Node Drag Logic
    const [nodeDrag, setNodeDrag] = useState<{ id: string, startX: number, startY: number, initialX: number, initialY: number } | null>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (nodeDrag) {
            const dx = (e.clientX - nodeDrag.startX) / scale;
            const dy = (e.clientY - nodeDrag.startY) / scale;
            setPositions(prev => ({
                ...prev,
                [nodeDrag.id]: {
                    ...prev[nodeDrag.id],
                    x: nodeDrag.initialX + dx,
                    y: nodeDrag.initialY + dy
                }
            }));
            e.stopPropagation();
        } else if (isDraggingCanvas) {
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setNodeDrag(null);
        setIsDraggingCanvas(false);
    };

    return (
        <div
            className="h-full w-full relative bg-neutral-100 dark:bg-neutral-900 overflow-hidden cursor-grab active:cursor-grabbing"
            ref={containerRef}
            onMouseDown={(e) => {
                if (e.button === 0 && !nodeDrag) {
                    setIsDraggingCanvas(true);
                    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
                }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
                <Button size="icon" variant="secondary" onClick={() => setScale(s => Math.min(2, s + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" onClick={() => setScale(s => Math.max(0.2, s - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
                <Button size="icon" variant="default" onClick={handleSave}><Save className="h-4 w-4" /></Button>
            </div>

            {/* Canvas Content */}
            <div
                className="absolute origin-top-left transition-transform duration-75"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
                }}
            >
                {/* SVG Layer for Edges */}
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
                    {edges.map((edge, i) => {
                        const s = positions[edge.source];
                        const t = positions[edge.target];
                        if (!s || !t) return null;

                        // Center of nodes (assuming w=200, h=80 approx)
                        const sx = s.x + 100;
                        const sy = s.y + 40;
                        const tx = t.x + 100;
                        const ty = t.y + 40;

                        return (
                            <g key={i}>
                                <path
                                    d={`M ${sx} ${sy} C ${(sx + tx) / 2} ${sy}, ${(sx + tx) / 2} ${ty}, ${tx} ${ty}`}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    fill="none"
                                    className="text-muted-foreground/30"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Nodes */}
                {data.map(record => {
                    const pos = positions[record.id] || { x: 0, y: 0 };
                    const titleField = config.titleField
                        ? collection.fields?.find((f: any) => f.name === config.titleField)
                        : collection.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

                    const visibleFieldNames = config.visibleFields || [];
                    const visibleFields = collection?.fields?.filter((f: any) => visibleFieldNames.includes(f.name)) || [];

                    return (
                        <RecordContextMenu
                            key={record.id}
                            record={record}
                            collection={collection}
                            onUpdate={onUpdateRecord}
                            onDelete={onDelete}
                            titleField={titleField}
                            config={config}
                            onConfigChange={onConfigChange}
                        >
                            <div
                                className="absolute w-[200px] p-3 bg-card border rounded-lg shadow-sm hover:shadow-md hover:border-primary transition-colors cursor-move group select-none"
                                style={{
                                    left: pos.x,
                                    top: pos.y,
                                }}
                                onMouseDown={(e) => {
                                    if (e.button !== 0) return; // Only drag on left click
                                    e.stopPropagation();
                                    setNodeDrag({
                                        id: record.id,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        initialX: pos.x,
                                        initialY: pos.y
                                    });
                                }}
                            >
                                <div className="font-black text-base truncate flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
                                    <span className={`w-2 h-2 rounded-full shrink-0`} style={{ backgroundColor: record.color || 'var(--primary)' }} />
                                    <div className="flex-1 min-w-0">
                                        <SmartField
                                            value={record[titleField.name]}
                                            field={titleField}
                                            record={record}
                                            collectionName={collection.name}
                                            size="sm"
                                            onChange={(val) => onUpdateRecord?.(record.id, { [titleField.name]: val })}
                                            className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 font-black w-full"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 mt-2" onMouseDown={e => e.stopPropagation()}>
                                    {visibleFields.slice(0, 3).map((f: any) => (
                                        <div key={f.name} className="flex flex-col">
                                            <Label className="text-[9px] text-muted-foreground lowercase opacity-50">{f.uiSchema?.title || f.name}</Label>
                                            <SmartField
                                                value={record[f.name]}
                                                field={f}
                                                record={record}
                                                collectionName={collection.name}
                                                size="sm"
                                                onChange={(val) => onUpdateRecord?.(record.id, { [f.name]: val })}
                                                className="h-auto p-0 border-none bg-transparent hover:bg-muted/30 rounded px-1 text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </RecordContextMenu>
                    );
                })}
            </div>
        </div>
    );
}
