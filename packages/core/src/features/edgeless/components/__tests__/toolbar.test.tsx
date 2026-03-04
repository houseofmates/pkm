import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toolbar } from '../Toolbar';
import { useEdgelessStore } from '../../store';
import { FronterProvider } from '@/contexts/fronter-context';

// custom render that includes required providers
function render(ui: React.ReactElement) {
  return rtlRender(<FronterProvider>{ui}</FronterProvider>);
}

// wrap component with store if needed
// The Toolbar doesn't need router

describe('Toolbar', () => {
  it('renders with bottom safe-area class', () => {
    render(<Toolbar />);
    const wrapper = document.querySelector('div.absolute');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain('bottom-[calc(1rem+env(safe-area-inset-bottom))]');
  });

  it('shows brush opacity and smoothness sliders in brush menu', () => {
    // ensure default tool is pen/brush
    useEdgelessStore.setState({ activeTool: 'pen' });
    render(<Toolbar />);
    // find brush button by title or aria-label? use tool prop 'pen'
    const brushBtn = screen.getByTitle(/pen|brush/i);
    fireEvent.click(brushBtn);
    // now menu should appear; look for opacity label
    expect(screen.getByText(/opacity/i)).toBeInTheDocument();
    expect(screen.getByText(/smooth/i)).toBeInTheDocument();
  });

  it('shows eraser opacity slider in eraser menu', () => {
    useEdgelessStore.setState({ activeTool: 'eraser' });
    render(<Toolbar />);
    const eraserBtn = screen.getByTitle(/eraser/i);
    fireEvent.click(eraserBtn);
    expect(screen.getByText(/opacity/i)).toBeInTheDocument();
    expect(screen.getByText(/width/i)).toBeInTheDocument();
  });
});
