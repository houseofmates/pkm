import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RichResourceContextMenuContent } from '../rich-resource-context-menu';

// provide a very small set of icons so that our dynamic import can resolve them
vi.mock('lucide-react', () => ({
  Foo: () => <svg data-testid="icon-foo" />,
  Bar: () => <svg data-testid="icon-bar" />,
  // some of the icons used elsewhere in the component (Upload etc) need to exist
  Upload: () => <svg data-testid="icon-upload" />,
  Search: () => <svg data-testid="icon-search" />,
  Loader2: () => <svg data-testid="icon-loader2" />,
  Wand2: () => <svg data-testid="icon-wand2" />,
  Undo2: () => <svg data-testid="icon-undo2" />,
  Save: () => <svg data-testid="icon-save" />,
  RotateCcw: () => <svg data-testid="icon-rotateccw" />,
  Sparkles: () => <svg data-testid="icon-sparkles" />,
  Check: () => <svg data-testid="icon-check" />,
  Image: () => <svg data-testid="icon-image" />,
}));

// minimal onUpdate handler stub
const noop = vi.fn();

describe('RichResourceContextMenuContent', () => {
  it('shows lucide icons by default and resets search when name changes', async () => {
    const { rerender } = render(
      <RichResourceContextMenuContent
        currentName="first"
        currentColor="#123456"
        onUpdate={noop}
      />
    );

    // the dynamic import is asynchronous, so wait for one of our mocked icons
    const fooBtn = await screen.findByTitle('Foo');
    expect(fooBtn).toBeTruthy();
    // the button should have our localColor style applied
    expect(fooBtn).toHaveStyle({ color: '#123456' });

    // type something into the search box and ensure filtering works
    const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.queryByTitle('Foo')).toBeNull();

    // when the currentName prop changes, the search term should be cleared
    rerender(
      <RichResourceContextMenuContent
        currentName="second"
        currentColor="#abcdef"
        onUpdate={noop}
      />
    );

    expect(searchInput.value).toBe('');
    // icons should reappear
    expect(await screen.findByTitle('Foo')).toBeTruthy();
  });
});
