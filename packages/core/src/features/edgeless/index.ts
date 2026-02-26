// edgeless canvas feature exports
// main entry point for the drawing/edgeless system

export { useEdgelessStore } from './store'
export type {
  ElementType,
  EdgelessLayer,
  EdgelessElement,
  ToolType,
} from './store'

export {
  SpatialIndex,
  boundsFromFabricObject,
  buildSpatialIndex,
  type Bounds,
  type SpatialObject,
} from './spatial'

export {
  DEFAULT_DARK_CONFIG,
  applyFabricConfig,
  cleanupFabricConfig,
  createConfiguredCanvas,
  type FabricConfig,
} from './config'

export {
  canvasSync,
  useSyncStatus,
} from './sync/canvas-sync'

export {
  // storage operations
  appendOp,
  getUnsyncedOps,
  markOpsSynced,
  getRecentOps,
  pruneOldOps,
  saveCheckpoint,
  getLatestCheckpoint,
  getDrawingMeta,
  updateDrawingMeta,
  listPendingDrawings,
  getToken,
  setToken,
  clearToken,
  clearMemoryTokens,

  // oplog operations
  applyOp,
  replayOplog,

  // migration
  migrateFromLocalStorage,
  hasLegacyDrawings,

  // types
  type DrawOp,
  type OpLogEntry,
  type CanvasCheckpoint,
  type PathOp,
  type EraseOp,
  type TransformOp,
  type DeleteOp,
} from './storage'

// re-export components
export { EdgelessCanvas } from './components/EdgelessCanvas'
export { Toolbar } from './components/Toolbar'
export { CanvasControls } from './components/CanvasControls'
export { CanvasErrorBoundary } from './components/canvas-error-boundary'

// production guards
export { productionGuard, perfMonitor, checkStorageHealth } from './lib/production-guards'

// hooks
export { useCanvasSafe } from './hooks/use-canvas-safe'
