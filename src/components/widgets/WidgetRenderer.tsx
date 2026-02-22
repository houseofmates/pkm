import React from 'react';
import { Button } from '@/components/ui/button';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DataEmbed } from '@/components/DataEmbed/DataEmbed';
import { ClockWidget } from '@/features/widgets/ClockWidget';
import { N8nWidget } from '@/features/widgets/N8nWidget';

interface WidgetRendererProps {
    widget: any;
    data: Record<string, any[]>;
    onUpdateWidget?: (patch: any) => void;
    onUpdateData?: (source: string, rowIndex: number, patch: any) => void;
    onAddData?: (source: string, vals: any) => void;
}

export function WidgetRenderer({ widget, data, onUpdateWidget, onUpdateData, onAddData }: WidgetRendererProps) {
    const findRowsForSource = (source: string) => {
        if (!source) return [];
        return data[source] || [];
    };

    // ... existing renders ...
    const renderTable = (w: any) => {
        const rows = findRowsForSource(w.source);
        const headers = w.headers || (rows.length > 0 ? Object.keys(rows[0]) : []);
        return (
            <div className="space-y-2">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="bg-background/40 border border-border/30 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                        <thead className="bg-muted/30 text-muted-foreground font-bold">
                            <tr>
                                {headers.slice(0, 5).map((h: string) => (
                                    <th key={h} className="p-2 text-left">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.slice(0, 10).map((r: any, i: number) => (
                                <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                    {headers.slice(0, 5).map((h: string) => (
                                        <td key={h} className="p-2">{String(r[h] || '')}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderKanban = (w: any) => {
        const rows = findRowsForSource(w.source);
        const statusField = w.statusField || 'status';
        const statuses = w.statuses || ['todo', 'in-progress', 'done'];

        return (
            <div className="space-y-2">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="grid grid-cols-3 gap-2 h-64">
                    {statuses.map((status: string) => (
                        <div key={status} className="bg-muted/20 border border-border/30 rounded-lg p-2 flex flex-col">
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">{status}</div>
                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {rows.filter((r: any) => r[statusField] === status).map((r: any, i: number) => (
                                    <div key={i} className="bg-background border border-white/5 p-2 rounded text-xs shadow-sm">
                                        <div className="font-medium">{r.title || r.name || 'Untitled'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderChart = (w: any) => {
        const type = (w.chart?.type || w.chartType || 'bar').toLowerCase();
        const rows = findRowsForSource(w.source);
        const xKey = w.chart?.x || 'timestamp';
        const yKey = w.chart?.y || 'value';
        const chartData = rows.map((r: any) => ({
            name: r[xKey],
            value: Number(r[yKey] || 0),
            x: r[xKey],
            y: Number(r[yKey] || 0)
        }));
        const color = w.chart?.color || '#f6b012';

        return (
            <div className="space-y-2">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="h-48 w-full bg-background/30 rounded-lg border border-border/30 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        {type === 'line' ? (
                            <LineChart data={chartData}>
                                <XAxis dataKey="x" hide />
                                <YAxis hide />
                                <Tooltip />
                                <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
                            </LineChart>
                        ) : (
                            <BarChart data={chartData}>
                                <XAxis dataKey="x" hide />
                                <YAxis hide />
                                <Tooltip />
                                <Bar dataKey="y" fill={color} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    const renderMap = (w: any) => (
        <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-xl">Map view placeholder</div>
    );

    const renderRichText = (w: any) => (
        <div className="space-y-2">
            <h4 className="font-bold text-sm lowercase">{w.title}</h4>
            <div
                className="prose prose-invert prose-xs bg-muted/10 p-4 rounded-xl border border-dashed border-border/50 min-h-[100px] outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onUpdateWidget?.({ content: e.currentTarget.innerText })}
            >
                {w.content || 'start typing...'}
            </div>
        </div>
    );

    // New Widget Types
    const type = (widget.view_type || widget.type || '').toLowerCase();

    if (type === 'clock') {
        return <ClockWidget data={widget.data || {}} className="h-48" />;
    }

    if (type === 'n8n') {
        return <N8nWidget data={widget.data || {}} />;
    }

    if (type === 'embed_nocobase' || type === 'database') {
        return (
            <div className="space-y-2 h-[400px]">
                <h4 className="font-bold text-sm lowercase">{widget.title || widget.data?.collection}</h4>
                <DataEmbed
                    collection={widget.data?.collection}
                    view={widget.data?.view || 'table'}
                    limit={widget.data?.limit || 10}
                    height="100%"
                />
            </div>
        );
    }

    if (type === 'smart-text' || type === 'text') {
        return renderRichText(widget);
    }

    // Legacy / Other
    switch (type) {
        case 'table': return renderTable(widget);
        case 'kanban': return renderKanban(widget);
        case 'chart': return renderChart(widget);
        case 'map': return renderMap(widget);
        // case 'gallery': return renderGallery(widget);
        // case 'form': return renderForm(widget);
        case 'iframe':
        case 'embed': return (
            <div className="aspect-video bg-muted/20 border border-border/50 rounded-xl flex items-center justify-center overflow-hidden">
                <iframe src={widget.src || widget.data?.url} className="w-full h-full border-0" />
            </div>
        );
        default: return (
            <div className="p-4 border border-dashed rounded-lg text-xs text-muted-foreground text-center">
                unknown widget type: {type}
            </div>
        );
    }
}
