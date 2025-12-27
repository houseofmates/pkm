
import { useEffect, useState, useRef, useMemo } from 'react';
import type { ViewProps } from './registry';
import ForceGraph2D from 'react-force-graph-2d';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, RefreshCw } from 'lucide-react';

export function NetworkView({ data, collection, config }: ViewProps) {
    const graphRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Resize Observer
    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ w: width, h: height });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // Data Transformation
    // We need to find "Relation" fields to build links.
    // Nodes = Records
    // Links = Record[RelationField] -> OtherRecord

    // For V1 (robust but simple):
    // 1. All records in 'data' are Nodes.
    // 2. Scan relation fields. If a record points to another ID that exists in 'data', create a link.
    // NOTE: This only works for self-referencing or if we fetch related data. 
    // Pivot 4.0: "Interconnectivity".
    // If this is the "Headmates" collection, and they have "friends" relations (to Headmates), it works beautifully.

    const { nodes, links } = useMemo(() => {
        const nodes = data.map(r => ({
            id: r.id,
            name: r.title || r.name || `Record ${r.id}`,
            val: 1, // Size
            color: r.color || 'var(--primary)', // Allow record color override
            group: r.group // Optional grouping
        }));

        const links: any[] = [];
        const relationFields = collection.fields?.filter((f: any) => f.interface === 'linkToMany' || f.interface === 'linkToOne') || [];

        data.forEach(src => {
            relationFields.forEach((field: any) => {
                const target = src[field.name];
                if (!target) return;

                // Handle array (linkToMany) or single (linkToOne)
                const targets = Array.isArray(target) ? target : [target];

                targets.forEach((t: any) => {
                    // target t might be an object { id: ... } or just ID
                    const tId = typeof t === 'object' ? t.id : t;

                    // Check if target node exists in our dataset
                    // If not, maybe create a "ghost" node? For now, only internal links.
                    if (nodes.find(n => n.id === tId)) {
                        links.push({
                            source: src.id,
                            target: tId,
                            label: field.uiSchema?.title || field.name
                        });
                    }
                });
            });
        });

        return { nodes, links };
    }, [data, collection]);

    const isDark = document.documentElement.classList.contains('dark');

    return (
        <div ref={containerRef} className="h-full w-full relative bg-card rounded-lg border overflow-hidden">
            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <Button size="icon" variant="secondary" onClick={() => graphRef.current?.zoomIn()}><ZoomIn className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" onClick={() => graphRef.current?.zoomOut()}><ZoomOut className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" onClick={() => graphRef.current?.zoomToFit()}><Maximize className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" onClick={() => {
                    graphRef.current?.d3ReheatSimulation();
                    graphRef.current?.zoomToFit();
                }}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            {/* Graph Stats Overlay */}
            <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur p-2 rounded text-xs text-muted-foreground border pointer-events-none">
                {nodes.length} Nodes &bull; {links.length} Relations
            </div>

            {/* Force Graph */}
            {dimensions.w > 0 && (
                <ForceGraph2D
                    ref={graphRef}
                    width={dimensions.w}
                    height={dimensions.h}
                    graphData={{ nodes, links }}
                    nodeLabel="name"
                    nodeColor={(node: any) => isDark ? '#3b82f6' : '#2563eb'} // Default to primary blue
                    nodeRelSize={6}
                    linkColor={() => isDark ? '#ffffff33' : '#00000033'}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleSpeed={d => 0.005}
                    backgroundColor={isDark ? '#00000000' : '#ffffff00'} // Transparent to let card bg show
                    cooldownTicks={100}
                    onEngineStop={() => graphRef.current?.zoomToFit(400)}
                />
            )}

            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No data to visualize
                </div>
            )}
        </div>
    );
}
