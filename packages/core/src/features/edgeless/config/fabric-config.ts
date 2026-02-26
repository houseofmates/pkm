// isolated fabric.js configuration
// eliminates global prototype pollution
// each canvas instance receives explicit configuration

import type { Canvas } from 'fabric'

export interface FabricConfig {
  selectionColor: string
  selectionBorderColor: string
  selectionDashArray: number[]
  selectionLineWidth: number
  cornerColor: string
  cornerStrokeColor: string
  borderColor: string
  cornerSize: number
  padding: number
  borderScaleFactor: number
  borderDashArray: number[]
  cornerStyle: 'rect' | 'circle'
  transparentCorners: boolean
}

export const DEFAULT_DARK_CONFIG: FabricConfig = {
  selectionColor: 'hsla(37, 92%, 52%, 0.1)', // #f6b012 with opacity
  selectionBorderColor: 'hsl(37, 92%, 52%)', // #f6b012
  selectionDashArray: [3, 3],
  selectionLineWidth: 1.5,
  cornerColor: 'rgba(0, 0, 0, 0)',
  cornerStrokeColor: 'rgba(0, 0, 0, 0)',
  borderColor: 'rgba(255, 255, 255, 0.4)',
  cornerSize: 12,
  padding: 8,
  borderScaleFactor: 1.5,
  borderDashArray: [4, 4],
  cornerStyle: 'rect',
  transparentCorners: false,
}

// apply config to a specific canvas instance only
export function applyFabricConfig(canvas: Canvas, config: FabricConfig = DEFAULT_DARK_CONFIG): void {
  // set selection defaults on canvas
  canvas.selectionColor = config.selectionColor
  canvas.selectionBorderColor = config.selectionBorderColor
  canvas.selectionDashArray = config.selectionDashArray
  canvas.selectionLineWidth = config.selectionLineWidth

  // set object defaults - applied to new objects only on this canvas
  // note: fabric.js doesn't support per-instance defaults natively
  // we hook into object:added to apply config to each new object
  canvas.on('object:added', (e: any) => {
    const obj = e.target
    if (!obj) return

    // apply corner/selection styles
    obj.set({
      cornerColor: config.cornerColor,
      cornerStrokeColor: config.cornerStrokeColor,
      borderColor: config.borderColor,
      cornerSize: config.cornerSize,
      padding: config.padding,
      borderScaleFactor: config.borderScaleFactor,
      borderDashArray: config.borderDashArray,
      cornerStyle: config.cornerStyle,
      transparentCorners: config.transparentCorners,
    })

    // ensure all objects have data.id for spatial indexing
    if (!obj.data?.id) {
      obj.set('data', {
        ...(obj.data || {}),
        id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      })
    }
  })
}

// cleanup config hooks when canvas disposed
export function cleanupFabricConfig(canvas: Canvas): void {
  canvas.off('object:added')
}

// canvas initialization with isolated config
export async function createConfiguredCanvas(
  canvasEl: HTMLCanvasElement,
  width: number,
  height: number,
  config: FabricConfig = DEFAULT_DARK_CONFIG
): Promise<Canvas> {
  const { Canvas: FabricCanvas } = await import('fabric')

  const canvas = new FabricCanvas(canvasEl, {
    width,
    height,
    backgroundColor: '#050505',
    isDrawingMode: false,
    selection: true,
    selectionColor: config.selectionColor,
    selectionBorderColor: config.selectionBorderColor,
    selectionDashArray: config.selectionDashArray,
    selectionLineWidth: config.selectionLineWidth,
  }) as Canvas

  applyFabricConfig(canvas, config)

  return canvas
}
