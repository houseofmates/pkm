import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListView } from '../list-view';
import { vi } from 'vitest';

// we don't need to mock SmartField because ListView uses it directly and
// our earlier tests already validate its behaviour. Instead we provide a
// very simple field and confirm that onUpdateRecord is called when the
// user clicks and updates the value.

const mockCollection = {
  name: 'testcol',
  fields: [
    { name: 'title', interface: 'input' }
  ]
};

const mockConfig = { titleField: 'title', visibleFields: [] };

const fakeRow = { id: '1', title: 'hello' };

// provide a dummy auth context if needed (SmartField may require it)
import { AuthContext } from '@/contexts/auth-context';
const fakeClient = {};
const authValue = { token: 'x', isAuthenticated: true, login: vi.fn(), logout: vi.fn(), client: fakeClient };

function withAuth(ui: React.ReactElement) {
  return render(<AuthContext.Provider value={authValue as any}>{ui}</AuthContext.Provider>);
}

describe('ListView', () => {
  it('renders a record and allows inline editing via onUpdateRecord', () => {
    const onUpdate = vi.fn();
    withAuth(
      <ListView
        data={[fakeRow]}
        collection={mockCollection as any}
        config={mockConfig}
        onUpdateRecord={onUpdate}
      />
    );

    // value should be visible
    expect(screen.getByText('hello')).toBeInTheDocument();
    // click to edit
    fireEvent.click(screen.getByText('hello'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'world' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdate).toHaveBeenCalledWith('1', { title: 'world' });
  });
});