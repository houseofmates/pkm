// storage layer exports
// centralized access to oplog, indexeddb, and checkpoint operations

export { getCanvasDB } from './canvas-db'
export {
  appendOp,
  appendOps,
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
} from './db-bridge'


export type {
  DrawOp,
  OpLogEntry,
  CanvasCheckpoint,
  PathOp,
  EraseOp,
  TransformOp,
  DeleteOp,
  LayerCreateOp,
  LayerDeleteOp,
} from './oplog'

export { applyOp, replayOplog } from './oplog'

export { migrateFromLocalStorage, hasLegacyDrawings } from './migrate'
