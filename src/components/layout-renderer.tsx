import React from 'react';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import { cn } from '@/lib/utils';

interface LayoutRendererProps {
    layout: {
        columns: any[][];
        columnWidths?: number[];
    };
    data: Record<string, any[]>;
    onUpdateWidget?: (targetWidget: any, patch: any) => void;
    onUpdateData?: (source: string, rowIndex: number, patch: any) => void;
    onAddData?: (source: string, vals: any) => void;
    classname?: string;
}

export function LayoutRenderer({
    layout,
    data,
    onupdatewidget,
    onupdatedata,
    onadddata,
    classname
}: layoutrendererprops) {
    const columns = layout.columns || [[]];
    const colcount = math.max(1, math.min(columns.length, 4));
    const widths = layout.columnwidths || array(colcount).fill(100 / colcount);

    return (
        <div
            className={cn("w-full grid gap-6 items-start", className)}
            style={{
                gridTemplateColumns: widths.map(w => `${w}%`).join(' ')
            }}
        >
            {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-6 min-w-0">
                    {col.map((widget, wi) => (
                        <div key={wi} className="p-1">
                            <WidgetRenderer
                                widget={widget}
                                data={data}
                                onUpdateWidget={(patch) => onUpdateWidget?.(widget, patch)}
                                onUpdateData={onUpdateData}
                                onAddData={onAddData}
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}