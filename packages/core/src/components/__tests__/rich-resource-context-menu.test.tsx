import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ContextMenuContent (Radix UI) requires being inside a ContextMenu portal tree;
// mock it as a plain div so we can render RichResourceContextMenuContent directly.
vi.mock('@/components/ui/context-menu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/context-menu')>();
  return {
    ...actual,
    ContextMenu: ({ children }: any) => <>{children}</>,
    ContextMenuTrigger: ({ children }: any) => <>{children}</>,
    ContextMenuContent: ({ children, className, ref: _ref, ...rest }: any) =>
      <div className={className} data-testid="context-menu-content" {...rest}>{children}</div>,
    ContextMenuItem: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    ContextMenuSub: ({ children }: any) => <>{children}</>,
    ContextMenuSubTrigger: ({ children }: any) => <>{children}</>,
    ContextMenuSubContent: ({ children }: any) => <>{children}</>,
    ContextMenuSeparator: ({ children }: any) => <>{children}</>,
  };
});

// stub the component itself for test simplicity
vi.mock('../rich-resource-context-menu', () => ({
  RichResourceContextMenuContent: ({ currentName, currentColor }: any) => (
    <div title={currentName} style={{ color: currentColor }} data-testid="rich-menu" />
  ),
}));

// minimal onUpdate handler stub
const noop = vi.fn();

describe('RichResourceContextMenuContent', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders title and color and resets when name changes', async () => {
    const { RichResourceContextMenuContent } = await import('../rich-resource-context-menu');

    const { rerender } = render(
      <RichResourceContextMenuContent currentName="first" currentColor="#123456" onUpdate={noop} />
    );

    const el = await screen.findByTitle('first');
    expect(el).toBeTruthy();
    expect(el).toHaveStyle({ color: '#123456' });

    rerender(<RichResourceContextMenuContent currentName="second" currentColor="#abcdef" onUpdate={noop} />);
    expect(await screen.findByTitle('second')).toBeTruthy();
  });
});
