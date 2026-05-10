import { toast } from 'sonner';
import type { OpLogEntry, DrawOp } from '@/features/edgeless/storage/oplog';
import { resolveConflicts } from '@/features/edgeless/storage/oplog';

export interface ConflictEvent {
  id: string;
  drawingId: string;
  timestamp: number;
  localOps: OpLogEntry[];
  remoteOps: OpLogEntry[];
  resolution: 'local-wins' | 'remote-wins' | 'manual';
  resolvedAt?: number;
  diff?: ConflictDiff;
}

export interface ConflictDiff {
  added: OpLogEntry[];
  removed: OpLogEntry[];
  modified: { local: OpLogEntry; remote: OpLogEntry }[];
}

class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private conflicts: Map<string, ConflictEvent> = new Map();
  private listeners: Set<(conflict: ConflictEvent) => void> = new Set();

  static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  /**
   * Detect conflicts between local and remote operations
   */
  async detectConflicts(
    localOps: OpLogEntry[],
    remoteOps: OpLogEntry[],
    drawingId: string
  ): Promise<ConflictEvent[]> {
    const conflicts: ConflictEvent[] = [];

    // Group operations by targetId to identify conflicts
    const localByTarget = this.groupByTarget(localOps);
    const remoteByTarget = this.groupByTarget(remoteOps);

    const allTargets = new Set([...localByTarget.keys(), ...remoteByTarget.keys()]);

    for (const targetId of allTargets) {
      const localTargetOps = localByTarget.get(targetId) || [];
      const remoteTargetOps = remoteByTarget.get(targetId) || [];

      if (this.hasConflictingOperations(localTargetOps, remoteTargetOps)) {
        const conflict: ConflictEvent = {
          id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          drawingId,
          timestamp: Date.now(),
          localOps: localTargetOps,
          remoteOps: remoteTargetOps,
          resolution: 'manual',
          diff: this.calculateDiff(localTargetOps, remoteTargetOps)
        };

        conflicts.push(conflict);
        this.conflicts.set(conflict.id, conflict);
        this.notifyListeners(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Auto-resolve conflicts using last-write-wins strategy
   */
  async autoResolve(conflictId: string): Promise<OpLogEntry[]> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    // Combine all operations and let the existing conflict resolution handle it
    const allOps = [...conflict.localOps, ...conflict.remoteOps];
    const resolved = resolveConflicts(allOps);

    // Update conflict
    conflict.resolution = 'remote-wins'; // Last-write-wins typically favors remote
    conflict.resolvedAt = Date.now();

    // Show notification
    this.showConflictNotification(conflict);

    this.notifyListeners(conflict);
    return resolved;
  }

  /**
   * Manually resolve conflict with user choice
   */
  async manualResolve(
    conflictId: string,
    resolution: 'local-wins' | 'remote-wins'
  ): Promise<OpLogEntry[]> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const resolvedOps = resolution === 'local-wins'
      ? resolveConflicts([...conflict.remoteOps, ...conflict.localOps])
      : resolveConflicts([...conflict.localOps, ...conflict.remoteOps]);

    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();

    this.showConflictNotification(conflict);
    this.notifyListeners(conflict);

    return resolvedOps;
  }

  /**
   * Get all unresolved conflicts
   */
  getUnresolvedConflicts(): ConflictEvent[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolvedAt);
  }

  /**
   * Get conflict by ID
   */
  getConflict(id: string): ConflictEvent | undefined {
    return this.conflicts.get(id);
  }

  /**
   * Subscribe to conflict events
   */
  subscribe(listener: (conflict: ConflictEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private groupByTarget(ops: OpLogEntry[]): Map<string, OpLogEntry[]> {
    const groups = new Map<string, OpLogEntry[]>();

    for (const op of ops) {
      const targetId = this.getTargetId(op.op);
      if (!targetId) continue;

      if (!groups.has(targetId)) {
        groups.set(targetId, []);
      }
      groups.get(targetId)!.push(op);
    }

    return groups;
  }

  private getTargetId(op: DrawOp): string | null {
    switch (op.type) {
      case 'path':
      case 'erase':
      case 'transform':
      case 'delete':
      case 'bitmap-replace':
      case 'element-remove':
      case 'element-update':
        return op.targetId;
      case 'element-add':
        return op.element.id;
      case 'layer-create':
      case 'layer-delete':
        return op.layerId;
      default:
        return null;
    }
  }

  private hasConflictingOperations(
    localOps: OpLogEntry[],
    remoteOps: OpLogEntry[]
  ): boolean {
    // Check if there are operations affecting the same target
    const localTargets = new Set(localOps.map(op => this.getTargetId(op.op)).filter(Boolean));
    const remoteTargets = new Set(remoteOps.map(op => this.getTargetId(op.op)).filter(Boolean));

    // Check for overlapping targets
    for (const target of localTargets) {
      if (remoteTargets.has(target)) {
        return true;
      }
    }

    return false;
  }

  private calculateDiff(
    localOps: OpLogEntry[],
    remoteOps: OpLogEntry[]
  ): ConflictDiff {
    const localIds = new Set(localOps.map(op => op.id));
    const remoteIds = new Set(remoteOps.map(op => op.id));

    const added = remoteOps.filter(op => !localIds.has(op.id));
    const removed = localOps.filter(op => !remoteIds.has(op.id));

    // Find modified operations (same target, different data)
    const modified: { local: OpLogEntry; remote: OpLogEntry }[] = [];
    const localByTarget = this.groupByTarget(localOps);
    const remoteByTarget = this.groupByTarget(remoteOps);

    for (const [targetId, localTargetOps] of localByTarget) {
      const remoteTargetOps = remoteByTarget.get(targetId);
      if (remoteTargetOps) {
        // Simple comparison - in real implementation, you'd do deeper comparison
        if (localTargetOps.length !== remoteTargetOps.length) {
          modified.push({
            local: localTargetOps[localTargetOps.length - 1]!,
            remote: remoteTargetOps[remoteTargetOps.length - 1]!
          });
        }
      }
    }

    return { added, removed, modified };
  }

  private showConflictNotification(conflict: ConflictEvent): void {
    const resolutionText = conflict.resolution === 'local-wins'
      ? 'Local version kept'
      : conflict.resolution === 'remote-wins'
        ? 'Remote version kept'
        : 'Manual resolution required';

    if (conflict.resolution === 'manual') {
      toast.warning(`Sync conflict detected in drawing ${conflict.drawingId}`, {
        description: `${conflict.diff?.added.length || 0} new, ${conflict.diff?.removed.length || 0} removed operations`,
        action: {
          label: 'Review',
          onClick: () => this.openConflictDialog(conflict.id)
        }
      });
    } else {
      toast.info(`Conflict resolved: ${resolutionText}`, {
        description: `Drawing ${conflict.drawingId} synced successfully`
      });
    }
  }

  private openConflictDialog(conflictId: string): void {
    // This would open a modal/dialog for manual conflict resolution
    // For now, we'll just log it
    console.log(`Opening conflict dialog for ${conflictId}`);
  }

  private notifyListeners(conflict: ConflictEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(conflict);
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    });
  }
}

export const conflictResolutionService = ConflictResolutionService.getInstance();