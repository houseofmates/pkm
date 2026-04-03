import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    // reset edgeless defaults including penDarkness
    useEdgelessStore.setState({ 
      penWidth: 10, 
      penOpacity: 100, 
      eraserWidth: 20, 
      eraserOpacity: 100, 
      penColor: '#ff0000',
      penDarkness: 0,
      pressureEnabled: true
    });
  });

  it('renders brush settings when pen tool', () => {
    openToolMenu('pen');
    renderWithProviders(<ContextMenu />);
    expect(screen.getByText(/size/i)).toBeInTheDocument();
    expect(screen.getByText(/opacity/i)).toBeInTheDocument();
    expect(screen.getByText(/darkness/i)).toBeInTheDocument();
    expect(screen.getByText(/pen pressure/i)).toBeInTheDocument();
    // color picker toggle button exists
    const colorBtn = screen.getByLabelText(/color/i);
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

  it('shows darkness slider for pen tool', () => {
    // Set a specific darkness value
    useEdgelessStore.setState({ penColor: '#1a1a1a', penDarkness: 75 });
    openToolMenu('pen');
    renderWithProviders(<ContextMenu />);
    
    const darknessSlider = screen.getByRole('slider', { name: /darkness/i }) as HTMLInputElement;
    // The slider shows the stored penDarkness value
    expect(parseInt(darknessSlider.value)).toBe(75);
  });

  it('updates darkness value in store when slider changes', () => {
    useEdgelessStore.setState({ penColor: '#ff0000', penDarkness: 0 });
    openToolMenu('pen');
    renderWithProviders(<ContextMenu />);
    
    const darknessSlider = screen.getByRole('slider', { name: /darkness/i }) as HTMLInputElement;
    fireEvent.change(darknessSlider, { target: { value: '50' } });
    expect(useEdgelessStore.getState().penDarkness).toBe(50);
  });

  it('toggles pressure setting', () => {
    useEdgelessStore.setState({ pressureEnabled: true });
    openToolMenu('pen');
    renderWithProviders(<ContextMenu />);
    
    const pressureToggle = screen.getByLabelText(/pen pressure/i) as HTMLInputElement;
    expect(pressureToggle.checked).toBe(true);
    
    fireEvent.click(pressureToggle);
    expect(useEdgelessStore.getState().pressureEnabled).toBe(false);
  });

  it('renders eraser settings without brush options', () => {
    openToolMenu('eraser');
    renderWithProviders(<ContextMenu />);
    expect(screen.getByText(/size/i)).toBeInTheDocument();
    expect(screen.getByText(/opacity/i)).toBeInTheDocument();
    expect(screen.queryByText(/darkness/i)).toBeNull();
    expect(screen.queryByText(/pen pressure/i)).toBeNull();
  });
});
