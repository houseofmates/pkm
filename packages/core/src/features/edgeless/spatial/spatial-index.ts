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

  // query objects within viewport bounds with optional margin for smooth scrolling
  // this is the primary method for viewport culling - aggressively strips off-screen elements
  queryVisible(viewportBounds: Bounds, marginX: number = 200, marginY: number = 200): SpatialObject[] {
    // expand viewport bounds with margin to include elements near screen edge
    // this prevents flickering when elements are just outside the viewport
    const expandedBounds: Bounds = {
      minX: viewportBounds.minX - marginX,
      minY: viewportBounds.minY - marginY,
      maxX: viewportBounds.maxX + marginX,
      maxY: viewportBounds.maxY + marginY,
    }

    const cells = this.getCellsForBounds(expandedBounds)
    const candidates = new Set<string>()

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey)
      if (cell) {
        for (const id of cell.objects) {
          candidates.add(id)
        }
      }
    }

    // fast rejection: check expanded bounds first before precise check
    const results: SpatialObject[] = []
    for (const id of candidates) {
      const obj = this.objects.get(id)
      if (!obj) continue
      if (!obj.visible) continue
      if (this.layerFilter && obj.layerId !== this.layerFilter) continue

      // final precise bounds check against expanded viewport
      if (
        obj.bounds.maxX < expandedBounds.minX ||
        obj.bounds.minX > expandedBounds.maxX ||
        obj.bounds.maxY < expandedBounds.minY ||
        obj.bounds.minY > expandedBounds.maxY
      ) {
        continue
      }

      results.push(obj)
    }

    return results
  }

  // get all visible object ids for quick lookup
  getVisibleIds(viewportBounds: Bounds, marginX: number = 200, marginY: number = 200): Set<string> {
    const visible = this.queryVisible(viewportBounds, marginX, marginY)
    return new Set(visible.map(obj => obj.id))
  }

  /**
   * Convenience method for overlay elements: convert viewport params (pan + zoom
   * + screen dimensions) into world-space bounds and return visible element IDs.
   *
   * @param panX - viewport pan X (viewPort.x)
   * @param panY - viewport pan Y (viewPort.y)
   * @param zoom - current zoom level
   * @param screenW - visible screen width in pixels
   * @param screenH - visible screen height in pixels
   * @param bufferPercent - percentage of screen size to use as buffer (default 0.2)
   */
  queryViewportIds(
    panX: number,
    panY: number,
    zoom: number,
    screenW: number,
    screenH: number,
    bufferPercent: number = 0.2,
  ): Set<string> {
    // Convert screen-space viewport rectangle to world-space coordinates.
    // Screen point (sx, sy) maps to world point:  wx = (sx - panX) / zoom
    const worldBounds: Bounds = {
      minX: -panX / zoom,
      minY: -panY / zoom,
      maxX: (screenW - panX) / zoom,
      maxY: (screenH - panY) / zoom,
    }

    // Buffer in world units
    const marginX = (screenW * bufferPercent) / zoom
    const marginY = (screenH * bufferPercent) / zoom

    return this.getVisibleIds(worldBounds, marginX, marginY)
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
      bounds: boundsFromFabricObject(obj),
      layerId: obj.data?.layerId || 'default',
      visible: obj.visible !== false,
      ref: obj,
    })
  }

  return index
}

/**
 * Build a spatial index from EdgelessElement overlay elements (not fabric objects).
 * Used for viewport culling of the HTML overlay layer.
 */
export function buildOverlaySpatialIndex(elements: { id: string; x: number; y: number; width: number; height: number; layerId?: string }[]): SpatialIndex {
  const index = new SpatialIndex(200) // larger cells for overlay elements (they're bigger than strokes)

  for (const el of elements) {
    index.insert({
      id: el.id,
      bounds: {
        minX: el.x,
        minY: el.y,
        maxX: el.x + el.width,
        maxY: el.y + el.height,
      },
      layerId: el.layerId || 'default',
      visible: true,
    })
  }

  return index
}
