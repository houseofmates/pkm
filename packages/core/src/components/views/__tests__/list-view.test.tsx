import '@testing-library/jest-dom/vitest';
// virtualization components are tricky in tests; stub them out to render all rows
import { vi, describe, it, expect } from 'vitest';
vi.mock('react-window', () => ({
  List: ({ itemCount, itemSize, itemData, style, children }: any) => (
    <div style={style}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i}>{children({ index: i, style: {}, data: itemData })}</div>
      ))}
    </div>
  ),
}));
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children }: any) => <div>{children({ width: 100, height: 100 })}</div>,
}));
vi.mock('@/components/fields/smart-field', () => ({
  SmartField: ({ value, onChange, className }: any) => {
  const [val, setVal] = React.useState(value);
    return (
      <input
        data-testid="smartfield-input"
        className={className}
        value={val}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setVal(e.target.value);
          onChange?.(e.target.value);
        }}
      />
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListView } from '../list-view';

// we don't need to mock smartfield because listview uses it directly and
// our earlier tests already validate its behaviour. instead we provide a
// very simple field and confirm that onupdaterecord is called when the
// user clicks and updates the value.

const mockCollection = {
  name: 'testcol',
  fields: [
    { name: 'title', interface: 'input' }
  ]
};

const mockConfig = { titleField: 'title', visibleFields: [] };

const fakeRow = { id: '1', title: 'hello' };

// provide a dummy auth context if needed (smartfield may require it)
import { AuthContext } from '@/contexts/auth-context';
const fakeClient = {};
const authValue = { token: 'x', isAuthenticated: true, login: vi.fn(), logout: vi.fn(), client: fakeClient };

function withAuth(ui: React.ReactElement) {
  // many components inside listview rely on react-router hooks; wrap with a
  // lightweight memory router to satisfy them.
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue as any}>{ui}</AuthContext.Provider>
    </MemoryRouter>
  );
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

    // value should be visible through mocked smartfield input
    const input = screen.getByTestId('smartfield-input');
    expect(input).toHaveValue('hello');
    // click to edit (focus the input)
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'world' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdate).toHaveBeenCalledWith('1', { title: 'world' });
  });
});