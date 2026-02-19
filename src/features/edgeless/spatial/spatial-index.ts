// uniform grid spatial index for canvas objects
// transforms o(n) hit detection into o(1) average case
// critical for eraser performance on complex drawings

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface SpatialObject {
  id: string
  bounds: Bounds
  layerId: string
  visible: boolean
  // reference to fabric object for direct manipulation
  ref?: unknown
}

interface GridCell {
  objects: Set<string> // object ids
}

export class SpatialIndex {
  private cellSize: number
  private grid: Map<string, GridCell>
  private objects: Map<string, SpatialObject>
  private layerFilter: string | null

  constructor(cellSize = 100) {
    this.cellSize = cellSize
    this.grid = new Map()
    this.objects = new Map()
    this.layerFilter = null
  }

  // set active layer for filtering (eraser respects layer isolation)
  setLayerFilter(layerId: string | null) {
    this.layerFilter = layerId
  }

  private getCellKey(cx: number, cy: number): string {
    return `${cx},${cy}`
  }

  private worldToCell(x: number, y: number): [number, number] {
    return [
      Math.floor(x / this.cellSize),
      Math.floor(y / this.cellSize),
    ]
  }

  private getCellsForBounds(bounds: Bounds): string[] {
    const [minCx, minCy] = this.worldToCell(bounds.minX, bounds.minY)
    const [maxCx, maxCy] = this.worldToCell(bounds.maxX, bounds.maxY)

    const cells: string[] = []
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        cells.push(this.getCellKey(cx, cy))
      }
    }
    return cells
  }

  insert(obj: SpatialObject): void {
    // remove if exists to update position
    if (this.objects.has(obj.id)) {
      this.remove(obj.id)
    }

    this.objects.set(obj.id, obj)

    const cells = this.getCellsForBounds(obj.bounds)
    for (const cellKey of cells) {
      let cell = this.grid.get(cellKey)
      if (!cell) {
        cell = { objects: new Set() }
        this.grid.set(cellKey, cell)
      }
      cell.objects.add(obj.id)
    }
  }

  remove(id: string): boolean {
    const obj = this.objects.get(id)
    if (!obj) return false

    const cells = this.getCellsForBounds(obj.bounds)
    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey)
      if (cell) {
        cell.objects.delete(id)
        if (cell.objects.size === 0) {
          this.grid.delete(cellKey)
        }
      }
    }

    this.objects.delete(id)
    return true
  }

  update(id: string, newBounds: Bounds): boolean {
    const obj = this.objects.get(id)
    if (!obj) return false

    this.remove(id)
    obj.bounds = newBounds
    this.insert(obj)
    return true
  }

  // query objects within radius of point
  queryRadius(x: number, y: number, radius: number): SpatialObject[] {
    const bounds: Bounds = {
      minX: x - radius,
      minY: y - radius,
      maxX: x + radius,
      maxY: y + radius,
    }

    const cells = this.getCellsForBounds(bounds)
    const candidates = new Set<string>()

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey)
      if (cell) {
        for (const id of cell.objects) {
          candidates.add(id)
        }
      }
    }

    // filter by actual distance and layer
    const results: SpatialObject[] = []
    for (const id of candidates) {
      const obj = this.objects.get(id)
      if (!obj) continue
      if (!obj.visible) continue
      if (this.layerFilter && obj.layerId !== this.layerFilter) continue

      // rough bounds check first
      if (
        obj.bounds.maxX < bounds.minX ||
        obj.bounds.minX > bounds.maxX ||
        obj.bounds.maxY < bounds.minY ||
        obj.bounds.minY > bounds.maxY
      ) {
        continue
      }

      results.push(obj)
    }

    return results
  }

  // query objects intersecting a line segment
  querySegment(x1: number, y1: number, x2: number, y2: number): SpatialObject[] {
    const bounds: Bounds = {
      minX: Math.min(x1, x2),
      minY: Math.min(y1, y2),
      maxX: Math.max(x1, x2),
      maxY: Math.max(y1, y2),
    }

    const cells = this.getCellsForBounds(bounds)
    const candidates = new Set<string>()

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey)
      if (cell) {
        for (const id of cell.objects) {
          candidates.add(id)
        }
      }
    }

    const results: SpatialObject[] = []
    for (const id of candidates) {
      const obj = this.objects.get(id)
      if (!obj) continue
      if (!obj.visible) continue
      if (this.layerFilter && obj.layerId !== this.layerFilter) continue

      results.push(obj)
    }

    return results
  }

  getObject(id: string): SpatialObject | undefined {
    return this.objects.get(id)
  }

  clear(): void {
    this.grid.clear()
    this.objects.clear()
  }

  size(): number {
    return this.objects.size
  }

  // debug: visualize grid occupancy
  getGridStats(): { cells: number; avgObjectsPerCell: number } {
    let totalObjects = 0
    for (const cell of this.grid.values()) {
      totalObjects += cell.objects.size
    }
    return {
      cells: this.grid.size,
      avgObjectsPerCell: this.grid.size > 0 ? totalObjects / this.grid.size : 0,
    }
  }
}

// factory for creating bounds from fabric objects
export function boundsFromFabricObject(obj: any): Bounds {
  const rect = obj.getBoundingRect()
  return {
    minX: rect.left,
    minY: rect.top,
    maxX: rect.left + rect.width,
    maxY: rect.top + rect.height,
  }
}

// rebuild spatial index from fabric canvas
export function buildSpatialIndex(canvas: any): SpatialIndex {
  const index = new SpatialIndex(100) // 100px cells

  const objects = canvas.getObjects()
  for (const obj of objects) {
    const id = obj.data?.id || `obj-${Math.random().toString(36).slice(2, 9)}`
    obj.set('data', { ...(obj.data || {}), id })

    index.insert({
      id,
      bounds: BoundsFromFabricObject(obj),
      layerId: obj.data?.layerId || 'default',
      visible: obj.visible !== false,
      ref: obj,
    })
  }

  return index
}