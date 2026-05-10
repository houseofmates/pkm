import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IconPicker } from '../icon-picker-dialog';

// mock lucide-react icons our component references while preserving other exports
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const mockIcon = (name: string) => () => <svg data-testid={`icon-${name}`} />;

  const iconsToMock = [
    'Folder', 'File', 'Database', 'User', 'Users', 'Home', 'Search', 'Menu',
    'MoreVertical', 'MoreHorizontal', 'Plus', 'Minus', 'X', 'Check',
    'ChevronRight', 'ChevronDown', 'ArrowRight', 'ArrowLeft', 'Calendar',
    'Clock', 'Bell', 'Mail', 'MessageSquare', 'Phone', 'Video', 'Image',
    'Music', 'Map', 'Globe', 'Sun', 'Moon', 'Cloud', 'Zap', 'Activity',
    'BarChart', 'PieChart', 'TrendingUp', 'DollarSign', 'CreditCard',
    'ShoppingBag', 'Gift', 'Heart', 'Star', 'Flag', 'Bookmark', 'Tag', 'Link',
    'Lock', 'Unlock', 'Eye', 'EyeOff', 'Upload', 'Sparkles', 'Loader2',
    'RotateCcw', 'Wand2', 'Save', 'Undo2'
  ];

  const overrides: Record<string, React.ComponentType> = {};
  iconsToMock.forEach((icon) => {
    overrides[icon] = mockIcon(icon.toLowerCase());
  });

  return {
    ...actual,
    ...overrides,
  };
});

const noop = vi.fn();

describe('IconPickerDialog', () => {
  it('shows lucide icons when opened', async () => {
    render(<IconPicker open={true} onSelect={noop} />);
    const btn = await screen.findByTitle('Folder');
    expect(btn).toBeInTheDocument();
  });
});
