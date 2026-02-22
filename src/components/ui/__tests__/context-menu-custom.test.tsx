import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ContextMenu } from '../context-menu-custom';
import { useContextMenuStore } from '../context-menu-store';
import { useEdgelessStore } from '@/features/edgeless/store';
import { AuthProvider } from '@/contexts/auth-context';
import { FronterProvider } from '@/contexts/fronter-context';

// helper to open tool menu with given tool
function openToolMenu(tool: 'pen' | 'eraser') {
  useContextMenuStore.setState({
    isOpen: true,
    x: 100,
    y: 100,
    targetId: tool,
    targetType: 'tool',
    data: { tool, color: '#ff0000' }
  });
}

// render helpers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <FronterProvider>{ui}</FronterProvider>
    </AuthProvider>
  );
}

describe('ContextMenu custom tool section', () => {
  beforeEach(() => {
    useContextMenuStore.setState({ isOpen: false });
    // reset edgeless defaults
    useEdgelessStore.setState({ penWidth: 10, penOpacity: 100, eraserWidth: 20, eraserOpacity: 100, penColor: '#ff0000' });
  });

  it('renders brush settings when pen tool', () => {
    openToolMenu('pen');
    renderWithProviders(<ContextMenu />);
    expect(screen.getByText(/size/i)).toBeInTheDocument();
    expect(screen.getByText(/opacity/i)).toBeInTheDocument();
    expect(screen.getByText(/darkness/i)).toBeInTheDocument();
    // color picker toggle button exists
    const colorBtn = screen.getByRole('button');
    expect(colorBtn).toBeTruthy();
  });

  it('updates store on slider change', () => {
    openToolMenu('pen');
    renderWithProviders(<ContextMenu />);
    const widthSlider = screen.getByRole('slider', { name: /size/i }) as HTMLInputElement;
    fireEvent.change(widthSlider, { target: { value: '20' } });
    expect(useEdgelessStore.getState().penWidth).toBe(20);
    const opacitySlider = screen.getByRole('slider', { name: /opacity/i }) as HTMLInputElement;
    fireEvent.change(opacitySlider, { target: { value: '50' } });
    expect(useEdgelessStore.getState().penOpacity).toBe(50);
  });

  it('renders eraser settings without brush options', () => {
    openToolMenu('eraser');
    renderWithProviders(<ContextMenu />);
    expect(screen.getByText(/size/i)).toBeInTheDocument();
    expect(screen.getByText(/opacity/i)).toBeInTheDocument();
    expect(screen.queryByText(/darkness/i)).toBeNull();
  });
});
