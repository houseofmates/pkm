import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

interface TableViewProps {
  records: any[];
  isLoading: boolean;
  onSelect?: (record: any) => void;
  fields?: any[]; // optional schema fields from collection
}

export function TableView({ records, isLoading, onSelect, fields }: TableViewProps) {
  // Generate columns dynamically from the first record or schema.  We
  // also keep a ref to the last known column set so that headers remain
  // visible when the record list becomes empty; this mirrors the behaviour
  // in the main record table.
  const prevColsRef = React.useRef<ColumnDef<any>[]>([]);

  const renderCellValue = (value: unknown) => {
    if (value === null || value === undefined) return <span className="text-center w-full block">empty</span>;

    if (typeof value === 'object') {
      // keep it brief and avoid rendering huge JSON blobs
      return <span className="break-words">{JSON.stringify(value)}</span>;
    }

    const text = String(value);

    // render http(s) urls as clickable links (show as much of the url as fits)
    let url: URL | null = null;
    try {
      url = new URL(text);
    } catch {
      url = null;
    }

    if (url && (url.protocol === 'http:' || url.protocol === 'https:')) {
      return (
        <a
          href={text}
          target="_blank"
          rel="noreferrer noopener"
          className="underline text-primary break-words"
          title={text}
        >
          {text}
        </a>
      );
    }

    return <span className="break-words">{text}</span>;
  };

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
          cell: (info: any) => {
            const value = info.getValue();
            // center IDs, times, datetimes
            if (
              typeof value === 'string' && (
                value.match(/^\d+$/) || // id
                value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/) // iso datetime
              )
            ) {
              return <span className="text-center w-full block">{value}</span>;
            }
            return <span className="font-bold text-foreground">{renderCellValue(value)}</span>;
          },
          size: 200,
        },
        ...otherKeys.slice(0, 5).map(k => ({
          accessorKey: k,
          header: k,
          cell: (info: any) => {
            const value = info.getValue();
            // center IDs, times, datetimes, and empty
            if (
              value === null || value === undefined ||
              (typeof value === 'string' && (
                value.match(/^\d+$/) || // id
                value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/) // iso datetime
              ))
            ) {
              return <span className="text-center w-full block">{value === null || value === undefined ? 'empty' : value}</span>;
            }
            return renderCellValue(value);
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

  const columnSizingState = table.getState ? table.getState().columnSizing : null;
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
        {/* @ts-expect-error types mismatch */}
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              key={columnVersion}
              outerRef={bodyRef}
              // @ts-expect-error types mismatch
              onScroll={({ scrollOffset }: { scrollOffset: number }) => {
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
              {/* @ts-expect-error types mismatch */}
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
                          className="p-2 px-3 text-xs flex items-center justify-center text-muted-foreground text-center"
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
