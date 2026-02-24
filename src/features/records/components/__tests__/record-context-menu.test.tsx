import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { RecordContextMenu } from '../record-context-menu';

// simple collection/record fixtures
const mockCollection = {
  name: 'foo',
  fields: [{ name: 'title', interface: 'input' }],
};
const mockRecord = { id: '1', title: 'hello' };

describe('RecordContextMenu', () => {
  it('renders children and opens context menu with edit button', () => {
    render(
      <RecordContextMenu record={mockRecord} collection={mockCollection}>
        <div data-testid="target">row</div>
      </RecordContextMenu>
    );

    const target = screen.getByTestId('target');
    // simulate right-click/context menu
    fireEvent.contextMenu(target);

    const editButton = screen.getByRole('button', { name: /edit/i });
    expect(editButton).toBeInTheDocument();

    // click the edit button and ensure dialog opens
    fireEvent.click(editButton);
    expect(screen.getByText(/edit item/i)).toBeInTheDocument();
  });
});