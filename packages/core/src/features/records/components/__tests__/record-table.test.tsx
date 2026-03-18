import '@testing-library/jest-dom/vitest';
import { render, fireEvent } from '@testing-library/react';
import { RecordTable } from '../record-table';
import { vi } from 'vitest';

// simple mocks to avoid worrying about context dependencies
vi.mock('@/features/records/components/record-context-menu', () => ({
  RecordContextMenu: ({ children }: any) => <>{children}</>
}));
vi.mock('@/components/fields/smart-field', () => ({
  SmartField: ({ value }: any) => <span>{String(value)}</span>
}));
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ client: {} })
}));

// create a table with many columns to force horizontal overflow
const makeData = () => {
  const rec: any = {};
  for (let i = 1; i <= 20; i++) {
    rec[`col${i}`] = `val${i}`;
  }
  return [rec];
};

const fields = Array.from({ length: 20 }, (_, i) => ({ name: `col${i + 1}`, interface: 'input' }));

describe('RecordTable horizontal scroll sync', () => {
  it('uses a single scrollbar and keeps header and body in sync', () => {
    const { getByTestId } = render(
      <div style={{ width: 200, height: 200 }}>
        <RecordTable
          data={makeData()}
          collection={{ name: 'foo', fields }}
          onUpdateRecord={() => {}}
          onDelete={() => {}}
        />
      </div>
    );

    const header = getByTestId('table-header-container');
    const body = getByTestId('table-body-container');

    expect(header).toBeTruthy();
    expect(body).toBeTruthy();

    // initially at left edge
    expect(header.scrollLeft).toBe(0);
    expect(body.scrollLeft).toBe(0);

    // scroll the body
    body.scrollLeft = 50;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(50);

    // scroll the header and ensure body follows too
    header.scrollLeft = 20;
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(20);
  });
});