import { useEdgelessStore } from '../../store';
import { useMemo } from 'react';

export function ConnectorElement({ element }: { element: any }) {
  const { elements, viewPort } = useEdgelessStore();
  const { connectorData } = element;

  const startNode = useMemo(() => elements.find((el) => el.id === connectorData?.startId), [elements, connectorData?.startId]);
  const endNode = useMemo(() => elements.find((el) => el.id === connectorData?.endId), [elements, connectorData?.endId]);

  if (!startNode || !endNode || !connectorData) return null;

  // calculate positions in screen coordinates
  // this component is rendered in a container that matches the viewport, so convert
  // element canvas coords into screen coords using viewPort (zoom + pan).
  const { zoom, x: panX, y: panY } = viewPort;

  const sx = startNode.x * zoom + panX + (startNode.width * zoom) / 2;
  const sy = startNode.y * zoom + panY + (startNode.height * zoom) / 2;

  const ex = endNode.x * zoom + panX + (endNode.width * zoom) / 2;
  const ey = endNode.y * zoom + panY + (endNode.height * zoom) / 2;

  const color = connectorData.strokeColor || 'var(--primary)';
  const strokeW = connectorData.strokeWidth || 2;

  return (
    <svg
      className="pointer-events-none overflow-visible"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1, // Behind nodes if possible (controlled by parent order usually)
      }}
    >
      <line
        x1={sx}
        y1={sy}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray="5,5"
        strokeLinecap="round"
      />
      <circle cx={sx} cy={sy} r={4} fill={color} />
      <circle cx={ex} cy={ey} r={4} fill={color} />
    </svg>
  );
}
