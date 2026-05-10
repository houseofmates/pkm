/**
 * enhanced canvas interactions hook
 * provides smooth zoom, infinite pan, and improved mobile touch support
 * designed for buttery-smooth user experience across all devices
 */

import { useRef, useCallback, useEffect } from 'react'
import * as fabric from 'fabric'
import { useEdgelessStore } from '../store'
import { MIN_ZOOM, MAX_ZOOM } from './use-canvas-viewport'

interface EnhancedInteractionState {
  isAnimating: boolean
  animationFrame: number | null
  targetZoom: number
  targetPan: { x: number; y: number }
  currentVelocity: { x: number; y: number }
  lastTouchTime: number
  touchStartDistance: number
  touchStartZoom: number
  pinchCenter: { x: number; y: number }
  isPinching: boolean
  isPanning: boolean
  momentumActive: boolean
  wheelAccumulator: number
  lastWheelTime: number
}

interface InteractionOptions {
  enableSmoothZoom?: boolean
  enableMomentumPan?: boolean
  enableInfinitePan?: boolean
  zoomSpeed?: number
  momentumDecay?: number
  maxPanVelocity?: number
}

export function useEnhancedCanvasInteractions(
  fabricCanvas: fabric.Canvas | null,
  options: InteractionOptions = {}
) {
  const {
    enableSmoothZoom = true,
    enableMomentumPan = true,
    enableInfinitePan = true,
    zoomSpeed = 0.1,
    momentumDecay = 0.92,
    maxPanVelocity = 50
  } = options

  const setViewport = useEdgelessStore((s) => s.setViewport)
  
  const state = useRef<EnhancedInteractionState>({
    isAnimating: false,
    animationFrame: null,
    targetZoom: 1,
    targetPan: { x: 0, y: 0 },
    currentVelocity: { x: 0, y: 0 },
    lastTouchTime: 0,
    touchStartDistance: 0,
    touchStartZoom: 1,
    pinchCenter: { x: 0, y: 0 },
    isPinching: false,
    isPanning: false,
    momentumActive: false,
    wheelAccumulator: 0,
    lastWheelTime: 0
  })

  // Smooth zoom animation
  const animateZoom = useCallback((targetZoom: number, center?: fabric.Point) => {
    if (!fabricCanvas || !enableSmoothZoom) return

    state.current.targetZoom = targetZoom
    state.current.isAnimating = true

    const animate = () => {
      if (!fabricCanvas || !state.current.isAnimating) return

      const currentZoom = fabricCanvas.getZoom()
      const diff = state.current.targetZoom - currentZoom
      
      if (Math.abs(diff) > 0.001) {
        // Smooth easing function
        const newZoom = currentZoom + diff * 0.15
        
        // Clamp to min/max zoom
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
        
        if (center) {
          fabricCanvas.zoomToPoint(center, clampedZoom)
        } else {
          fabricCanvas.setZoom(clampedZoom)
        }
        
        fabricCanvas.requestRenderAll()
        state.current.animationFrame = requestAnimationFrame(animate)
      } else {
        // Animation complete
        state.current.isAnimating = false
        state.current.animationFrame = null
      }
    }

    // Cancel any existing animation
    if (state.current.animationFrame) {
      cancelAnimationFrame(state.current.animationFrame)
    }

    animate()
  }, [fabricCanvas, enableSmoothZoom])

  // Enhanced wheel zoom with smooth animation
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!fabricCanvas) return

    e.preventDefault()
    
    const now = Date.now()
    const timeDelta = now - state.current.lastWheelTime
    
    // Accumulate wheel events for smooth zooming
    if (timeDelta < 16) { // ~60fps
      state.current.wheelAccumulator += e.deltaY
    } else {
      state.current.wheelAccumulator = e.deltaY
    }
    
    state.current.lastWheelTime = now

    // Debounced zoom calculation
    setTimeout(() => {
      if (state.current.wheelAccumulator !== 0) {
        const delta = state.current.wheelAccumulator
        state.current.wheelAccumulator = 0
        
        const zoom = fabricCanvas.getZoom()
        const scaleFactor = 1 - (delta * zoomSpeed * 0.01)
        const newZoom = zoom * scaleFactor
        
        // Get pointer position for zoom center
        const pointer = fabricCanvas.getPointer(e)
        const center = new fabric.Point(pointer.x, pointer.y)
        
        animateZoom(newZoom, center)
      }
    }, 16)
  }, [fabricCanvas, zoomSpeed, animateZoom])

  // Enhanced pinch zoom for mobile
  const handlePinchZoom = useCallback((touches: Touch[], center: fabric.Point) => {
    if (!fabricCanvas || touches.length !== 2) return

    const distance = Math.sqrt(
      Math.pow(touches[0].clientX - touches[1].clientX, 2) +
      Math.pow(touches[0].clientY - touches[1].clientY, 2)
    )

    if (!state.current.isPinching) {
      state.current.isPinching = true
      state.current.touchStartDistance = distance
      state.current.touchStartZoom = fabricCanvas.getZoom()
      state.current.pinchCenter = center
    }

    const scaleFactor = distance / state.current.touchStartDistance
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.current.touchStartZoom * scaleFactor))
    
    animateZoom(newZoom, center)
  }, [fabricCanvas, animateZoom])

  // Momentum-based panning
  const startMomentumPan = useCallback((velocity: { x: number; y: number }) => {
    if (!fabricCanvas || !enableMomentumPan) return

    state.current.currentVelocity = velocity
    state.current.momentumActive = true

    const animateMomentum = () => {
      if (!fabricCanvas || !state.current.momentumActive) return

      const vpt = fabricCanvas.viewportTransform
      if (!vpt) return

      const velocity = state.current.currentVelocity
      
      // Apply velocity with decay
      if (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1) {
        vpt[4] += velocity.x
        vpt[5] += velocity.y
        
        // Apply infinite pan boundaries if enabled
        if (enableInfinitePan) {
          // Keep viewport within reasonable bounds to prevent floating point issues
          const maxOffset = 100000
          vpt[4] = Math.max(-maxOffset, Math.min(maxOffset, vpt[4]))
          vpt[5] = Math.max(-maxOffset, Math.min(maxOffset, vpt[5]))
        }
        
        fabricCanvas.requestRenderAll()
        
        // Apply momentum decay
        state.current.currentVelocity = {
          x: velocity.x * momentumDecay,
          y: velocity.y * momentumDecay
        }
        
        requestAnimationFrame(animateMomentum)
      } else {
        // Momentum depleted
        state.current.momentumActive = false
        state.current.currentVelocity = { x: 0, y: 0 }
      }
    }

    animateMomentum()
  }, [fabricCanvas, enableMomentumPan, enableInfinitePan, momentumDecay])

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!fabricCanvas) return

    const touches = Array.from(e.touches)
    
    if (touches.length === 2) {
      // Start pinch zoom
      const center = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      }
      handlePinchZoom(touches, new fabric.Point(center.x, center.y))
    } else if (touches.length === 1) {
      // Start pan
      state.current.isPanning = true
      state.current.lastTouchTime = Date.now()
    }
  }, [fabricCanvas, handlePinchZoom])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!fabricCanvas) return

    const touches = Array.from(e.touches)
    
    if (touches.length === 2 && state.current.isPinching) {
      // Continue pinch zoom
      const center = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      }
      handlePinchZoom(touches, new fabric.Point(center.x, center.y))
    } else if (touches.length === 1 && state.current.isPanning) {
      // Pan gesture
      const touch = touches[0]
      const vpt = fabricCanvas.viewportTransform
      
      if (vpt) {
        const now = Date.now()
        const dt = now - state.current.lastTouchTime
        
        if (dt > 0) {
          // Calculate velocity for momentum
          const velocity = {
            x: (touch.clientX - (vpt[4] || 0)) / dt * 10,
            y: (touch.clientY - (vpt[5] || 0)) / dt * 10
          }
          
          // Clamp velocity
          velocity.x = Math.max(-maxPanVelocity, Math.min(maxPanVelocity, velocity.x))
          velocity.y = Math.max(-maxPanVelocity, Math.min(maxPanVelocity, velocity.y))
          
          state.current.currentVelocity = velocity
        }
        
        vpt[4] = touch.clientX
        vpt[5] = touch.clientY
        
        fabricCanvas.requestRenderAll()
        state.current.lastTouchTime = now
      }
    }
  }, [fabricCanvas, handlePinchZoom, maxPanVelocity])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!fabricCanvas) return

    const touches = Array.from(e.touches)
    
    if (touches.length === 0) {
      // Gesture ended - apply momentum if panning
      if (state.current.isPanning && enableMomentumPan) {
        startMomentumPan(state.current.currentVelocity)
      }
      
      // Reset state
      state.current.isPinching = false
      state.current.isPanning = false
      state.current.currentVelocity = { x: 0, y: 0 }
    }
  }, [fabricCanvas, enableMomentumPan, startMomentumPan])

  // Keyboard shortcuts for zoom and pan
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!fabricCanvas) return

    const vpt = fabricCanvas.viewportTransform
    if (!vpt) return

    const panSpeed = 20
    const zoomSpeed = 0.1

    switch (e.key) {
      case '+':
      case '=':
        e.preventDefault()
        const zoomIn = fabricCanvas.getZoom() * (1 + zoomSpeed)
        animateZoom(Math.min(MAX_ZOOM, zoomIn))
        break
        
      case '-':
      case '_':
        e.preventDefault()
        const zoomOut = fabricCanvas.getZoom() * (1 - zoomSpeed)
        animateZoom(Math.max(MIN_ZOOM, zoomOut))
        break
        
      case 'ArrowUp':
        e.preventDefault()
        vpt[5] += panSpeed
        fabricCanvas.requestRenderAll()
        break
        
      case 'ArrowDown':
        e.preventDefault()
        vpt[5] -= panSpeed
        fabricCanvas.requestRenderAll()
        break
        
      case 'ArrowLeft':
        e.preventDefault()
        vpt[4] += panSpeed
        fabricCanvas.requestRenderAll()
        break
        
      case 'ArrowRight':
        e.preventDefault()
        vpt[4] -= panSpeed
        fabricCanvas.requestRenderAll()
        break
        
      case '0':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          // Reset to origin and 100% zoom
          fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
          animateZoom(1)
        }
        break
    }
  }, [fabricCanvas, animateZoom])

  // Setup event listeners
  useEffect(() => {
    if (!fabricCanvas) return

    const canvasElement = fabricCanvas.getElement()
    if (!canvasElement) return

    // Wheel events for smooth zoom
    canvasElement.addEventListener('wheel', handleWheel, { passive: false })
    
    // Touch events for mobile
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvasElement.addEventListener('touchend', handleTouchEnd, { passive: false })
    canvasElement.addEventListener('touchcancel', handleTouchEnd, { passive: false })
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      canvasElement.removeEventListener('wheel', handleWheel)
      canvasElement.removeEventListener('touchstart', handleTouchStart)
      canvasElement.removeEventListener('touchmove', handleTouchMove)
      canvasElement.removeEventListener('touchend', handleTouchEnd)
      canvasElement.removeEventListener('touchcancel', handleTouchEnd)
      document.removeEventListener('keydown', handleKeyDown)
      
      // Clean up animation frame
      if (state.current.animationFrame) {
        cancelAnimationFrame(state.current.animationFrame)
      }
    }
  }, [fabricCanvas, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, handleKeyDown])

  // Public API for programmatic control
  const zoomTo = useCallback((zoom: number, center?: fabric.Point) => {
    animateZoom(zoom, center)
  }, [animateZoom])

  const panTo = useCallback((x: number, y: number, animate = false) => {
    if (!fabricCanvas) return

    const vpt = fabricCanvas.viewportTransform
    if (!vpt) return

    if (animate && enableSmoothZoom) {
      // Animate pan
      const startX = vpt[4]
      const startY = vpt[5]
      const deltaX = x - startX
      const deltaY = y - startY
      
      let progress = 0
      const animate = () => {
        progress += 0.1
        if (progress <= 1) {
          const eased = 1 - Math.pow(1 - progress, 3) // Ease out cubic
          vpt[4] = startX + deltaX * eased
          vpt[5] = startY + deltaY * eased
          fabricCanvas.requestRenderAll()
          requestAnimationFrame(animate)
        }
      }
      animate()
    } else {
      // Immediate pan
      vpt[4] = x
      vpt[5] = y
      fabricCanvas.requestRenderAll()
    }
  }, [fabricCanvas, enableSmoothZoom])

  const resetView = useCallback(() => {
    if (!fabricCanvas) return
    
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    animateZoom(1)
  }, [fabricCanvas, animateZoom])

  return {
    zoomTo,
    panTo,
    resetView,
    isAnimating: state.current.isAnimating,
    currentZoom: fabricCanvas?.getZoom() || 1,
    isPinching: state.current.isPinching,
    isPanning: state.current.isPanning
  }
}