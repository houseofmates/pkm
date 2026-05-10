/* eslint-disable */
import { useRef, useEffect, useCallback } from 'react'
import * as fabric from 'fabric'
import { useEdgelessStore } from '../store'

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5.0
const ZOOM_LERP = 0.18
const PAN_FRICTION = 0.88
const MOMENTUM_THRESHOLD = 0.6

/**
 * smooth viewport controller with inertia panning and animated zoom.
 * integrates with the edgeless store for state sync.
 */
export function useCanvasViewport(fabricCanvas: fabric.Canvas | null) {
  const setViewport = useEdgelessStore((s) => s.setViewport)

  const animRef = useRef<number | null>(null)
  const zoomTargetRef = useRef<{ zoom: number; x: number; y: number } | null>(null)
  const momentumRef = useRef<{ vx: number; vy: number } | null>(null)

  const syncViewport = useCallback(() => {
    if (!fabricCanvas) return
    const vpt = fabricCanvas.viewportTransform
    if (vpt) {
      setViewport({ zoom: vpt[0], x: vpt[4], y: vpt[5] })
    }
  }, [fabricCanvas, setViewport])

  const tick = useCallback(() => {
    if (!fabricCanvas) return
    let needsFrame = false

    // smooth zoom
    if (zoomTargetRef.current) {
      const { zoom: targetZoom, x, y } = zoomTargetRef.current
      const currentZoom = fabricCanvas.getZoom()
      const newZoom = currentZoom + (targetZoom - currentZoom) * ZOOM_LERP

      if (Math.abs(newZoom - targetZoom) < 0.002) {
        fabricCanvas.zoomToPoint(new fabric.Point(x, y), targetZoom)
        zoomTargetRef.current = null
      } else {
        fabricCanvas.zoomToPoint(new fabric.Point(x, y), newZoom)
        needsFrame = true
      }
      fabricCanvas.requestRenderAll()
    }

    // momentum pan
    if (momentumRef.current) {
      const { vx, vy } = momentumRef.current
      const vpt = fabricCanvas.viewportTransform
      if (vpt) {
        vpt[4] += vx
        vpt[5] += vy
        fabricCanvas.requestRenderAll()

        const newVx = vx * PAN_FRICTION
        const newVy = vy * PAN_FRICTION

        if (Math.abs(newVx) < MOMENTUM_THRESHOLD && Math.abs(newVy) < MOMENTUM_THRESHOLD) {
          momentumRef.current = null
        } else {
          momentumRef.current = { vx: newVx, vy: newVy }
          needsFrame = true
        }
      }
    }

    syncViewport()

    if (needsFrame) {
      animRef.current = requestAnimationFrame(tick)
    } else {
      animRef.current = null
    }
  }, [fabricCanvas, syncViewport])

  const smoothZoomTo = useCallback(
    (targetZoom: number, centerX: number, centerY: number) => {
      zoomTargetRef.current = { zoom: targetZoom, x: centerX, y: centerY }
      if (!animRef.current) {
        animRef.current = requestAnimationFrame(tick)
      }
    },
    [tick]
  )

  const startMomentum = useCallback(
    (vx: number, vy: number) => {
      momentumRef.current = { vx, vy }
      if (!animRef.current) {
        animRef.current = requestAnimationFrame(tick)
      }
    },
    [tick]
  )

  const cancelAnimations = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    zoomTargetRef.current = null
    momentumRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimations()
    }
  }, [cancelAnimations])

  return { smoothZoomTo, startMomentum, cancelAnimations, syncViewport }
}
