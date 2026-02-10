import { useEdgelessStore } from '../../store';
import { useMemo } from 'react';

export function ConnectorElement({ element }: { element: any }) {
    const { elements, viewPort } = useEdgelessStore();
    const { connectorData } = element;

    const startNode = useMemo(() => elements.find((el) => el.id === connectorData?.startId), [elements, connectorData?.startId]);
    const endNode = useMemo(() => elements.find((el) => el.id === connectorData?.endId), [elements, connectorData?.endId]);

    if (!startNode || !endNode || !connectorData) return null;

    // Calculate positions in SCREEN coordinates
    // The render loop in EdgelessCanvas usually handles the per-element transform,
    // but for a linker that spans two objects, we need absolute canvas coordinates.
    // However, EdgelessCanvas renders elements relative to the container.
    // We should probably render this SVG relative to the global container (0,0) with width/height 100%.
    // BUT, the map loop in EdgelessCanvas wants to wrap us.
    // We will handle the wrapper special case in EdgelessCanvas.
    // Here we just calculate the SVG path assuming we are in a container that covers the viewport (or the whole canvas universe).

    // Actually, to keep it simple with zoom/pan:
    // If we place this component at 0,0 of the container, we can use the same logic as other elements:
    // x * zoom + panX

    const { zoom, x: panX, y: panY } = viewPort;

    const sx = startNode.x * zoom + panX + (startNode.width * zoom) / 2;
    const sy = startNode.y * zoom + panY + (startNode.height * zoom) / 2;

    const ex = endNode.x * zoom + panX + (endNode.width * zoom) / 2;
    const ey = endNode.y * zoom + panY + (endNode.height * zoom) / 2;

    const color = connectorData.strokeColor || 'var(--primary)';
    const width = connectorData.strokeWidth || 2;

    return (
        <svg
            className="pointer-events-none overflow-visible"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1 // Behind nodes if possible (controlled by parent order usually)
            }}
        >
            <line
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke={color}
                strokeWidth={width}
                strokeDasharray="5,5"
                strokeLinecap="round"
            />
            {/* Arrowhead or endpoint decoration could go here */}
            <circle cx={sx} cy={sy} r={4} fill={color} />
            <circle cx={ex} cy={ey} r={4} fill={color} />
        </svg>
    );
}
