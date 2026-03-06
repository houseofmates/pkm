import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IconPicker } from '../icon-picker-dialog';

// mock a subset of lucide-react exports that our component uses
vi.mock('lucide-react', () => ({
  Folder: () => <svg data-testid="icon-folder" />,
  File: () => <svg data-testid="icon-file" />,
  Database: () => <svg data-testid="icon-database" />,
  Upload: () => <svg data-testid="icon-upload" />,
  Sparkles: () => <svg data-testid="icon-sparkles" />,
  Loader2: () => <svg data-testid="icon-loader2" />,
  RotateCcw: () => <svg data-testid="icon-rotate" />,
  Wand2: () => <svg data-testid="icon-wand2" />,
  Save: () => <svg data-testid="icon-save" />,
  Check: () => <svg data-testid="icon-check" />,
  Undo2: () => <svg data-testid="icon-undo" />,
  // plus the other helpers the module exports automatically (should be fine)
}));

const noop = vi.fn();

describe('IconPickerDialog', () => {
  it('shows lucide icons when opened', async () => {
    render(<IconPicker open={true} onSelect={noop} />);
    const btn = await screen.findByTitle('Folder');
    expect(btn).toBeInTheDocument();
  });
});
