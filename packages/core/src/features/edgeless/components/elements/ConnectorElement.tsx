import React, { useMemo } from 'react';
import { useElement, useViewport } from '../../store';

export const ConnectorElement = React.memo(function ConnectorElement({ element }: { element: any }) {
  const { connectorData } = element;

  // ── Granular subscriptions: only re-render when THIS specific connected node changes ──
  const startNode = useElement(connectorData?.startId || '');
  const endNode = useElement(connectorData?.endId || '');
  const viewPort = useViewport();

  if (!startNode || !endNode || !connectorData) return null;

  // calculate positions in screen coordinates
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
        zIndex: -1,
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
}, (prev, next) => prev.element === next.element);
