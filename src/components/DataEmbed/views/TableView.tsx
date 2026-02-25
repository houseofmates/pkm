import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { cn } from '@/lib/utils';

interface TableViewProps {
  records: any[];
  isLoading: boolean;
  theme: any;
  onSelect?: (record: any) => void;
  fields?: any[]; // optional schema fields from collection
}

export function TableView({ records, isLoading, theme, onSelect, fields }: TableViewProps) {
  // Generate columns dynamically from the first record or schema.  We
  // also keep a ref to the last known column set so that headers remain
  // visible when the record list becomes empty; this mirrors the behaviour
  // in the main record table.
  const prevColsRef = React.useRef<ColumnDef<any>[]>([]);

  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const makeColsFromKeys = (keys: string[]) => {
      // filter out common metadata columns
      const filtered = keys.filter(k =>
        !['id', 'created_at', 'updated_at', 'created_by', 'updated_by'].includes(k)
      );
      if (filtered.length === 0) return [];

      const titleKey = filtered.find(k => k === 'title' || k === 'name') || filtered[0];
      const otherKeys = filtered.filter(k => k !== titleKey);

      return [
        {
          accessorKey: titleKey,
          header: titleKey,
          cell: info => <span className="font-bold text-foreground">{String(info.getValue() || '')}</span>,
          size: 200,
        },
        ...otherKeys.slice(0, 5).map(k => ({
          accessorKey: k,
          header: k,
          cell: info => {
              const val = info.getValue();
              if (typeof val === 'object') return JSON.stringify(val).slice(0, 20);
              return String(val || '');
          },
          size: 150,
        }))
      ];
    };

    if (records.length) {
      const keys = Object.keys(records[0]);
      const cols = makeColsFromKeys(keys);
      if (cols.length) {
        prevColsRef.current = cols;
        return cols;
      }
    }

    // if we have explicit field definitions, use those next
    if (fields && fields.length) {
      const keys = fields.map(f => f.name).filter(Boolean);
      const cols = makeColsFromKeys(keys as string[]);
      if (cols.length) {
        prevColsRef.current = cols;
        return cols;
      }
    }

    // if we previously computed columns keep them
    if (prevColsRef.current.length) {
      return prevColsRef.current;
    }

    // otherwise show a generic placeholder
    return [
      {
        accessorKey: '__placeholder',
        header: () => <span className="text-muted-foreground lowercase">no properties</span>,
        cell: () => null,
        size: 150,
      },
    ];
  }, [records, fields]);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const columnSizingState = table.getState().columnSizing;
  const [columnVersion, setColumnVersion] = React.useState(0);
  React.useEffect(() => {
    setColumnVersion(v => v + 1);
  }, [columnSizingState]);

  if (isLoading && !records.length) {
    return <div className="p-4 text-muted-foreground animate-pulse">Loading table...</div>;
  }

  // when there are no records we still want to render the header bar, and
  // provide a helpful placeholder row in the body rather than removing the
  // entire table from the DOM. the `isLoading` case above handles the
  // spinner.

  return (
    <div className="w-full h-full bg-card/50 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col text-sm overflow-hidden">
      {/* Header */}
      <div
        ref={headerRef}
        data-testid="table-header-container"
        className="flex bg-muted/50 border-b border-white/5 font-medium text-xs uppercase tracking-wider text-muted-foreground overflow-x-auto no-scrollbar"
        onScroll={(e) => {
          if (bodyRef.current) {
            bodyRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
      >
        {table.getHeaderGroups().map(headerGroup => (
          <div key={headerGroup.id} className="flex w-full">
            {headerGroup.headers.map(header => (
              <div
                key={header.id}
                className="p-3 border-r border-white/5 last:border-0 truncate"
                style={{ width: header.getSize(), flex: `0 0 ${header.getSize()}px` }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Body (Virtualized) */}
      <div className="flex-1 relative">
        <AutoSizer>
          {({ height, width }) => (
            <List
              key={columnVersion}
              outerRef={bodyRef}
              onScroll={({ scrollOffset }) => {
                if (headerRef.current) {
                  headerRef.current.scrollLeft = scrollOffset;
                }
              }}
              itemCount={rows.length || 1}
              itemSize={40}
              height={height}
              width={width}
              itemData={{ rows, onSelect }}
              style={{ height, width }}
            >
              {({ index, style, data }: any) => {
                if (data.rows.length === 0) {
                  return (
                    <div
                      style={style}
                      className="flex items-center justify-center text-xs text-muted-foreground italic h-full w-full"
                    >
                      no records
                    </div>
                  );
                }

                const row = data.rows[index];
                return (
                  <div
                    style={style}
                    className="flex hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
                    onClick={() => data.onSelect?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell: any) => (
                      <div
                        key={cell.id}
                        className="p-2 px-3 truncate text-xs flex items-center text-muted-foreground"
                        style={{ width: cell.column.getSize(), flex: `0 0 ${cell.column.getSize()}px` }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              }}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}
