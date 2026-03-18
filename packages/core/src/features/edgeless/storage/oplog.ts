// operation log types for delta-based canvas storage
// each stroke, erase, or transform is recorded as an immutable operation

import type { Canvas as FabricCanvas, Object as FabricObject, Image as FabricImage } from 'fabric'
import { secureLogger } from '@/lib/secure-logger'

export type OpType = 'path' | 'erase' | 'transform' | 'delete' | 'layer-create' | 'layer-delete' | 'bitmap-replace'

export interface PathOp {
  type: 'path'
  layerId: string
  pathData: unknown[] // fabricjs path commands
  stroke: string
  strokeWidth: number
  left: number
  top: number
  targetId: string
}

export interface EraseOp {
  type: 'erase'
  targetId: string // id of path/element being erased
  layerId: string
  segmentsKept: unknown[][] // new path segments after erase
}

export interface TransformOp {
  type: 'transform'
  targetId: string
  layerId: string
  matrix: {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
  }
  position: { x: number; y: number }
  scale: { x: number; y: number }
  angle: number
}

export interface DeleteOp {
  type: 'delete'
  targetId: string
  layerId: string
}

export interface LayerCreateOp {
  type: 'layer-create'
  layerId: string
  name: string
}

export interface LayerDeleteOp {
  type: 'layer-delete'
  layerId: string
}

export interface BitmapReplaceOp {
  type: 'bitmap-replace'
  targetId: string
  layerId: string
  dataUrl: string
  width: number
  height: number
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  opacity?: number
}

export type DrawOp = PathOp | EraseOp | TransformOp | DeleteOp | LayerCreateOp | LayerDeleteOp | BitmapReplaceOp

export interface OpLogEntry {
  id: string // client-generated uuid: drawingId-timestamp-random
  drawingId: string
  timestamp: number
  op: DrawOp
  synced: boolean
  serverAckedAt?: number
}

export interface CanvasCheckpoint {
  id: string
  drawingId: string
  timestamp: number
  state: string | Record<string, any> // full fabricjs canvas state
}

/**
 * Apply a single oplog operation to a fabric canvas instance.
 *
 * This is intentionally low-level and avoids replaying the entire canvas
 * snapshot for each step; instead we mutate the canvas in-place.
 */
export async function applyOp(canvas: FabricCanvas | null, op: DrawOp): Promise<void> {
  if (!canvas) return

  const fabricRef = (window as unknown as { fabric?: typeof import('fabric') }).fabric

  switch (op.type) {
    case 'path': {
      const path = new (fabricRef as any).Path(op.pathData, {
        stroke: op.stroke,
        strokeWidth: op.strokeWidth,
        fill: undefined,
        left: op.left,
        top: op.top,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      })
      path.set('data', { id: op.targetId, layerId: op.layerId })
      canvas.add(path)
      break
    }

    case 'erase': {
      // find target and replace or remove
      const target = canvas.getObjects().find(
        (o) => (o as any).data?.id === op.targetId
      ) as (FabricObject & { data?: { id?: string } }) | undefined
      if (!target) return

      if (op.segmentsKept.length === 0) {
        canvas.remove(target)
      } else {
        // remove old, add new segments
        canvas.remove(target)
        for (const seg of op.segmentsKept) {
          const newPath = new (fabricRef as any).Path(seg, {
            stroke: (target as any).stroke,
            strokeWidth: (target as any).strokeWidth,
            fill: undefined,
          })
          newPath.set('data', { layerId: op.layerId, originalId: op.targetId })
          canvas.add(newPath)
        }
      }
      break
    }

    case 'transform': {
      const target = canvas.getObjects().find(
        (o) => (o as any).data?.id === op.targetId
      ) as (FabricObject & { data?: { id?: string } }) | undefined
      if (!target) return
      target.set({
        left: op.position.x,
        top: op.position.y,
        scaleX: op.scale.x,
        scaleY: op.scale.y,
        angle: op.angle,
      })
      target.setCoords()
      break
    }

    case 'delete': {
      const target = canvas.getObjects().find(
        (o) => (o as any).data?.id === op.targetId
      ) as (FabricObject & { data?: { id?: string } }) | undefined
      if (target) canvas.remove(target)
      break
    }

    case 'bitmap-replace': {
      if (!fabricRef?.Image) break

      const removeExisting = () => {
        const existing = canvas.getObjects().find(
          (o) => (o as any).data?.id === op.targetId
        ) as (FabricObject & { data?: { id?: string } }) | undefined
        if (existing) canvas.remove(existing)
      }

      const addImage = (img: FabricImage) => {
        removeExisting()
        img.set({
          left: op.left,
          top: op.top,
          originX: 'left',
          originY: 'top',
          scaleX: op.scaleX,
          scaleY: op.scaleY,
          angle: op.angle,
          opacity: op.opacity ?? 1,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          perPixelTargetFind: true,
        })
        img.set('data', { id: op.targetId, layerId: op.layerId })
        canvas.add(img)
      }

      try {
        const img = await fabricRef.Image.fromURL(op.dataUrl)
        if (img) addImage(img)
      } catch (err) {
        secureLogger.error('Failed to load bitmap replacement:', err)
      }
      break
    }
  }

  if (canvas.requestRenderAll) {
    canvas.requestRenderAll()
  }
}

// replay oplog from checkpoint to reconstruct state
export async function replayOplog(
  canvas: FabricCanvas,
  checkpoint: CanvasCheckpoint | undefined,
  ops: OpLogEntry[]
): Promise<void> {
  // clear canvas
  canvas.clear()
  canvas.backgroundColor = '#050505'

  // load checkpoint if exists
  if (checkpoint?.state) {
    await new Promise<void>((resolve) => {
      canvas.loadFromJSON(checkpoint.state, () => {
        canvas.requestRenderAll()
        resolve()
      })
    })
  }

  // resolve conflicts and compact before applying
  const resolvedOps = resolveConflicts(ops)
  const compactedOps = compactOplog(resolvedOps)

  // apply ops in order
  for (const entry of compactedOps) {
    await applyOp(canvas, entry.op)
  }
}

/**
 * Deterministically resolves conflicts between concurrent operations.
 * Implements Last-Write-Wins (LWW) based on timestamp.
 * In case of a tie (same timestamp), it falls back to string comparison of the operation ID.
 */
export function resolveConflicts(ops: OpLogEntry[]): OpLogEntry[] {
  return [...ops].sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    // Tie-breaker: sort by ID to ensure deterministic ordering across all clients
    return a.id.localeCompare(b.id);
  });
}

/**
 * Compacts an array of operations by removing redundant intermediate states.
 * - Keeps only the latest TransformOp for a given targetId.
 * - Removes TransformOp and EraseOp that precede a DeleteOp for the same targetId.
 * 
 * Assumes the input `ops` array is already sorted chronologically (e.g., via resolveConflicts).
 */
export function compactOplog(ops: OpLogEntry[]): OpLogEntry[] {
  const result: OpLogEntry[] = [];
  const processedTransforms = new Set<string>();
  const terminalTargets = new Set<string>(); // Targets that are deleted or fully replaced

  // Process from newest to oldest to preserve the latest state
  for (let i = ops.length - 1; i >= 0; i--) {
    const entry = ops[i];
    const op = entry.op;

    if (op.type === 'delete' || op.type === 'bitmap-replace') {
      const targetId = (op as any).targetId
      // If we see a delete or replacement, any previous operations for this target are redundant
      if (!terminalTargets.has(targetId)) {
        terminalTargets.add(targetId);
        result.unshift(entry);
      }
      continue;
    }

    // Skip operations on deleted or replaced targets
    if ('targetId' in op && terminalTargets.has((op as any).targetId)) {
      continue;
    }

    if (op.type === 'transform') {
      const targetId = op.targetId
      // Keep only the latest transform for a given target
      if (!processedTransforms.has(targetId)) {
        processedTransforms.add(targetId);
        result.unshift(entry);
      }
      continue;
    }

    // Keep all other operations (path, layer-create, etc.)
    result.unshift(entry);
  }

  return result;
}