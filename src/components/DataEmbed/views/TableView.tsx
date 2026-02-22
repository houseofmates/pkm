import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { cn } from '@/lib/utils';

interface TableViewProps {
  records: any[];
  isLoading: boolean;
  theme: any;
  onSelect?: (record: any) => void;
}

export function TableView({ records, isLoading, theme, onSelect }: TableViewProps) {
  // Generate columns dynamically from the first record or schema
  // Ideally passed from parent, but inferring for now
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!records.length) return [];
    const keys = Object.keys(records[0]).filter(k =>
      !['id', 'created_at', 'updated_at', 'created_by', 'updated_by'].includes(k)
    );

    // Add primary column first (title/name)
    const titleKey = keys.find(k => k === 'title' || k === 'name') || keys[0];
    const otherKeys = keys.filter(k => k !== titleKey);

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
  }, [records]);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  if (isLoading && !records.length) {
    return <div className="p-4 text-muted-foreground animate-pulse">Loading table...</div>;
  }

  if (!records.length) {
    return <div className="p-4 text-muted-foreground">No records found.</div>;
  }

  return (
    <div className="w-full h-full bg-card/50 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col text-sm overflow-hidden">
      {/* Header */}
      <div className="flex bg-muted/50 border-b border-white/5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
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
            <FixedSizeList
              height={height}
              width={width}
              itemCount={rows.length}
              itemSize={40}
              itemData={{ rows, onSelect }}
            >
              {({ index, style, data }) => {
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
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}
