import '@testing-library/jest-dom/vitest';
import { render, fireEvent } from '@testing-library/react';
import { TableView } from '../TableView';
import { vi } from 'vitest';

// minimal mocks for react-window and hooks
vi.mock('@tanstack/react-table', () => {
  return {
    useReactTable: vi.fn().mockReturnValue({
      getHeaderGroups: () => [],
      getRowModel: () => ({ rows: [] })
    }),
    getCoreRowModel: vi.fn(),
    flexRender: (comp: any) => comp,
  };
});

vi.mock('react-window', () => {
  const original = vi.importActual('react-window');
  return {
    ...original,
    List: ({ children, outerRef, onScroll, itemCount, itemSize, height, width, itemData, style, ...rest }: any) => {
      // simple scrollable div
      const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (onScroll) {
          onScroll({ scrollOffset: e.currentTarget.scrollLeft });
        }
      };
      return (
        <div 
          ref={outerRef} 
          data-testid="virtual-list" 
          onScroll={handleScroll}
          style={{ ...style, height, width, overflow: 'auto' }}
        >
          {children({index:0,style:{},data:itemData})}
        </div>
      );
    },
  };
});

vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children }: any) => <div style={{ width: 200, height: 200 }}>{children({ width: 200, height: 200 })}</div>
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));

// simple fixture data
const makeData = () => [{ col1: 'a' }];

describe('DataEmbed TableView', () => {
  it('synchronizes horizontal scrolling between header and body', () => {
    const { getByTestId } = render(
      <div style={{ width: 200, height: 200 }}>
        <TableView records={makeData()} isLoading={false} />
      </div>
    );

    const header = getByTestId('table-header-container');
    const body = getByTestId('virtual-list');

    expect(header).toBeTruthy();
    expect(body).toBeTruthy();

    header.scrollLeft = 30;
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(30);

    body.scrollLeft = 40;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(40);
  });
});