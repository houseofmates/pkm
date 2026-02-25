import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TableView } from '@/components/DataEmbed/views/TableView';

vi.mock('@tanstack/react-table', () => {
  return {
    useReactTable: jest.fn().mockReturnValue({
      getHeaderGroups: () => [],
      getRowModel: () => ({ rows: [] })
    }),
    getCoreRowModel: jest.fn(),
    flexRender: (comp: any) => comp,
  };
});

vi.mock('react-window', () => {
  const original = jest.requireActual('react-window');
  return {
    ...original,
    List: ({ children, ...props }: any) => {
      return <div data-testid="virtual-list" {...props}>{children({index:0,style:{},data:{rows:[]}})}</div>;
    },
  };
});

vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children }: any) => <div style={{ width: 200, height: 200 }}>{children({ width: 200, height: 200 })}</div>
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));

const makeData = () => [{ col1: 'a' }];

describe('DataEmbed TableView', () => {
  it('syncs header/body scrolling', () => {
    const { getByTestId } = render(
      <div style={{ width: 200, height: 200 }}>
        <TableView records={makeData()} isLoading={false} theme={{}} />
      </div>
    );

    const header = getByTestId('table-header-container');
    const body = getByTestId('virtual-list');
    expect(header).toBeVisible();
    expect(body).toBeVisible();

    header.scrollLeft = 30;
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(30);

    body.scrollLeft = 40;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(40);
  });
});