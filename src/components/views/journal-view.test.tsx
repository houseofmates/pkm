import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JournalView } from './journal-view';
import * as React from 'react';

// Mocks
vi.mock('@/components/ui/rich-editor', () => ({
  default: ({ onChange, value }: any) => (
    <input
      data-testid="rich-editor"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
  markdownToHtml: (str: string) => str,
}));

vi.mock('@/features/records/components/record-context-menu', () => ({
  RecordContextMenu: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/fields/smart-field', () => ({
  SmartField: () => <div data-testid="smart-field" />
}));

vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Clock: () => <div data-testid="icon-clock" />,
  Send: () => <div data-testid="icon-send" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('JournalView', () => {
  const mockCollection = {
    name: 'journal',
    fields: [
      { name: 'content', interface: 'markdown' },
      { name: 'created_at', interface: 'datetime' }
    ]
  };

  const mockData: any[] = [];

  it('renders correctly', () => {
    render(
      <JournalView
        data={mockData}
        collection={mockCollection}
        config={{}}
        onCreate={vi.fn()}
      />
    );
    // Button text contains "post entry" and icon
    expect(screen.getByRole('button', { name: /post entry/i })).toBeInTheDocument();
  });

  it('calls onCreate when submitting entry', async () => {
    const onCreateMock = vi.fn();
    render(
      <JournalView
        data={mockData}
        collection={mockCollection}
        config={{}}
        onCreate={onCreateMock}
      />
    );

    const input = screen.getByTestId('rich-editor');
    fireEvent.change(input, { target: { value: 'My journal entry' } });

    const submitButton = screen.getByRole('button', { name: /post entry/i });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onCreateMock).toHaveBeenCalledTimes(1);
      expect(onCreateMock).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('My journal entry')
      }));
    });
  });

  it('disables submit button if entry is empty', () => {
    render(
      <JournalView
        data={mockData}
        collection={mockCollection}
        config={{}}
        onCreate={vi.fn()}
      />
    );
    const submitButton = screen.getByRole('button', { name: /post entry/i });
    expect(submitButton).toBeDisabled();
  });
});
