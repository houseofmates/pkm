// operation log types for delta-based canvas storage
// each stroke, erase, or transform is recorded as an immutable operation

export type OpType = 'path' | 'erase' | 'transform' | 'delete' | 'layer-create' | 'layer-delete'

export interface PathOp {
  type: 'path'
  layerId: string
  pathData: unknown[] // fabricjs path commands
  stroke: string
  strokeWidth: number
  left: number
  top: number
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

export type DrawOp = PathOp | EraseOp | TransformOp | DeleteOp | LayerCreateOp | LayerDeleteOp

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
  state: unknown // full fabricjs canvas state
}

// apply an operation to a fabric canvas instance
export function applyOp(canvas: any, op: DrawOp): void {
  if (!canvas) return

  switch (op.type) {
    case 'path': {
      const path = new (window as any).fabric.Path(op.pathData, {
        stroke: op.stroke,
        strokeWidth: op.strokeWidth,
        fill: undefined,
        left: op.left,
        top: op.top,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      })
      path.set('data', { layerId: op.layerId })
      canvas.add(path)
      break
    }

    case 'erase': {
      // find target and replace or remove
      const target = canvas.getObjects().find((o: any) => o.data?.id === op.targetId)
      if (!target) return

      if (op.segmentsKept.length === 0) {
        canvas.remove(target)
      } else {
        // remove old, add new segments
        canvas.remove(target)
        for (const seg of op.segmentsKept) {
          const newPath = new (window as any).fabric.Path(seg, {
            stroke: target.stroke,
            strokeWidth: target.strokeWidth,
            fill: undefined,
          })
          newPath.set('data', { layerId: op.layerId, originalId: op.targetId })
          canvas.add(newPath)
        }
      }
      break
    }

    case 'transform': {
      const target = canvas.getObjects().find((o: any) => o.data?.id === op.targetId)
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
      const target = canvas.getObjects().find((o: any) => o.data?.id === op.targetId)
      if (target) canvas.remove(target)
      break
    }
  }

  canvas.requestRenderAll()
}

// replay oplog from checkpoint to reconstruct state
export async function replayOplog(
  canvas: any,
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
    applyOp(canvas, entry.op)
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
  const deletedTargets = new Set<string>();

  // Process from newest to oldest to preserve the latest state
  for (let i = ops.length - 1; i >= 0; i--) {
    const entry = ops[i];
    const op = entry.op;

    if (op.type === 'delete') {
      deletedTargets.add(op.targetId);
      result.unshift(entry); // Keep the delete op
      continue;
    }

    // Skip operations on deleted targets if they are erase or transform
    // Note: 'path' ops could technically be deleted, but they are creation ops.
    // If a path is deleted later, we STILL need the 'path' op to exist so that it can be applied and then deleted,
    // OR we could remove the 'path' op entirely if it was created and deleted in the same sync cycle.
    // To be safe and ensure correct ID mapping, we keep 'path' ops unless it's strictly a self-contained creation and deletion without syncing intermediate.
    // Let's optimize: if a target is deleted, any previous erase/transform for it is redundant.
    if ((op.type === 'transform' || op.type === 'erase') && deletedTargets.has(op.targetId)) {
      continue;
    }

    if (op.type === 'transform') {
      // Keep only the latest transform for a given target
      if (!processedTransforms.has(op.targetId)) {
        processedTransforms.add(op.targetId);
        result.unshift(entry);
      }
      continue;
    }

    // Keep all other operations
    result.unshift(entry);
  }

  return result;
}