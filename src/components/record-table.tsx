
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Collection } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import * as React from 'react';
import { SmartField } from '@/components/fields/smart-field';

interface RecordTableProps {
    data: any[];
    collection: Collection;
    onEdit?: (record: any) => void;
    onDelete?: (record: any) => void;
    onUpdateRecord?: (id: string | number, data: any) => void;
    loading?: boolean;
}

export function RecordTable({ data, collection, onEdit, onDelete, onUpdateRecord, loading }: RecordTableProps) {
    const columnHelper = createColumnHelper<any>();

    // Dynamically generate columns based on collection fields or data keys
    const columns = React.useMemo(() => {
        let cols: any[] = [];

        // If collection has fields definition, use that
        if (collection.fields && collection.fields.length > 0) {
            cols = (collection.fields || [])
                .filter((f: any) => !f.hidden && f.interface !== 'subTable') // Filter out hidden or complex fields for now
                .map((field: any) => columnHelper.accessor(field.name, {
                    header: field.uiSchema?.title || field.name,
                    cell: info => (
                        <SmartField
                            value={info.getValue()}
                            field={field}
                            onChange={(val) => {
                                // Call update callback
                                if (onUpdateRecord) {
                                    onUpdateRecord(info.row.original.id, { [field.name]: val });
                                }
                            }}
                        />
                    )
                }));
        } else if (data.length > 0) {
            // Fallback: infer (use string field for now)
            cols = Object.keys(data[0]).map((key) =>
                columnHelper.accessor(key, {
                    header: key,
                    cell: info => (
                        <SmartField
                            value={info.getValue()}
                            field={{ type: 'string', name: key }}
                            onChange={(val) => {
                                if (onUpdateRecord) {
                                    onUpdateRecord(info.row.original.id, { [key]: val });
                                }
                            }}
                        />
                    )
                })
            );
        }

        if (onEdit || onDelete) {
            cols.push(columnHelper.display({
                id: 'actions',
                header: 'Actions',
                cell: (props) => (
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(props.row.original); }}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(props.row.original); }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )
            }));
        }

        return cols;
    }, [data, collection, columnHelper, onEdit, onDelete]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading records...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No records found.</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
// Import React to fix "React is not defined" if it occurs in useMemo

