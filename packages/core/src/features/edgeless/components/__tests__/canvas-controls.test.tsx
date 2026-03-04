import React from 'react'
import { render as rtlRender, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CanvasControls } from '../CanvasControls'
import { useEdgelessStore } from '../../store'
import { FronterProvider } from '@/contexts/fronter-context'

// minimal render w/ provider
function render(ui: React.ReactElement) {
  return rtlRender(<FronterProvider>{ui}</FronterProvider>)
}

describe('CanvasControls', () => {
  it('renders with safe-area bottom class', () => {
    render(<CanvasControls />)
    const wrapper = document.querySelector('div.absolute')
    expect(wrapper).toBeTruthy()
    expect(wrapper?.className).toContain('bottom-[calc(1rem+env(safe-area-inset-bottom))]')
  })

  it('shows undo/redo buttons', () => {
    // default store history is empty
    render(<CanvasControls />)
    const undo = screen.getByTitle(/undo/i)
    const redo = screen.getByTitle(/redo/i)
    expect(undo).toBeInTheDocument()
    expect(redo).toBeInTheDocument()
  })
})
