import { act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useEdgelessStore } from '../store'

describe('edgeless store', () => {
  it('initializes with reasonable brush/eraser defaults', () => {
    const state = useEdgelessStore.getState()
    expect(state.penWidth).toBe(4)
    expect(state.penColor).toBeTruthy()
    expect(state.penOpacity).toBe(100)
    expect(state.eraserWidth).toBe(20)
    expect(state.eraserOpacity).toBe(100)
  })

  it('allows updating brush and eraser opacity/size', () => {
    act(() => {
      useEdgelessStore.getState().setPenOpacity(42)
      useEdgelessStore.getState().setEraserOpacity(12)
      useEdgelessStore.getState().setPenWidth(17)
      useEdgelessStore.getState().setEraserWidth(33)
    })
    const s = useEdgelessStore.getState()
    expect(s.penOpacity).toBe(42)
    expect(s.eraserOpacity).toBe(12)
    expect(s.penWidth).toBe(17)
    expect(s.eraserWidth).toBe(33)
  })
})
