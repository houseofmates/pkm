import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';

interface WidgetRendererProps {
    widget: any;
    data: Record<string, any[]>;
    onUpdateWidget?: (patch: any) => void;
    onUpdateData?: (source: string, rowIndex: number, patch: any) => void;
    onAddData?: (source: string, vals: any) => void;
}

export function WidgetRenderer({ widget, data, onUpdateWidget, onUpdateData, onAddData }: WidgetRendererProps) {
    const findRowsForSource = (source: string) => data[source] || [];

    const renderTable = (w: any) => {
        const rows = findRowsForSource(w.source);
        // basic heuristic for columns if properties not defined
        const cols = w.properties?.map((p: any) => p.name) || (rows.length > 0 ? Object.keys(rows[0]) : ['id', 'title']);

        return (
            <div className="space-y-2">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="overflow-auto border border-border/50 rounded-lg bg-background/50">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border/50 bg-muted/30">
                                {cols.map((c: any) => <th key={c} className="px-3 py-2 text-left font-medium text-muted-foreground">{c}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r: any, ri: number) => (
                                <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                                    {cols.map((c: any) => (
                                        <td key={c} className="px-3 py-2">
                                            <input
                                                className="w-full bg-transparent outline-none border-none focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                                                value={String(r[c] ?? '')}
                                                onChange={(e) => onUpdateData?.(w.source, ri, { [c]: e.target.value })}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={cols.length} className="p-4 text-center text-muted-foreground italic">no data</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderKanban = (w: any) => {
        const lanes = w.lanes || ['todo', 'doing', 'done'];
        const statusField = w.statusField || w.statusfield || 'status';
        const rows = findrowsforsource(w.source);

        return (
            <div className="space-y-2">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {lanes.map((lane: string) => (
                        <div key={lane} className="flex-1 min-w-[200px] bg-muted/20 rounded-xl p-3 border border-border/30">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{lane}</span>
                                <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded-full border border-border/50">
                                    {rows.filter((r: any) => r[statusfield] === lane).length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {rows.filter((r: any) => r[statusField] === lane).map((r: any, i: number) => {
                                    const rowIndex = rows.indexOf(r);
                                    return (
                                        <div key={i} className="group p-3 bg-background border border-border/50 rounded-lg shadow-sm hover:border-primary/30 transition-all cursor-pointer">
                                            <input
                                                className="w-full bg-transparent text-sm font-medium outline-none mb-2"
                                                value={r.title || r.name || ''}
                                                onChange={(e) => onUpdateData?.(w.source, rowIndex, { title: e.target.value })}
                                            />
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[10px] text-muted-foreground hover:text-primary p-0 px-2"
                                                    onClick={() => {
                                                        const next = lanes[(lanes.indexOf(lane) + 1) % lanes.length];
                                                        onUpdateData?.(w.source, rowIndex, { [statusField]: next });
                                                    }}
                                                >
                                                    → move
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
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
                        ) : type === 'area' ? (
                            <AreaChart data={chartData}>
                                <XAxis dataKey="x" hide />
                                <YAxis hide />
                                <Tooltip />
                                <Area type="monotone" dataKey="y" fill={color} fillOpacity={0.2} stroke={color} />
                            </AreaChart>
                        ) : type === 'pie' ? (
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%" cy="50%"
                                    outerRadius={60}
                                    fill={color}
                                    label
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={[`#f6b012`, `#f8d16d`, `#96600a`, `#3a2804`][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
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

    const renderMap = (w: any) => {
        const rows = findRowsForSource(w.source);
        const latField = w.latField || 'lat';
        const lngField = w.lngField || 'lng';
        const markers = rows.filter((r: any) => r[latField] && r[lngField]);
        const center: [number, number] = markers.length > 0 ? [Number(markers[0][latField]), Number(markers[0][lngField])] : [51.505, -0.09];

        return (
            <div className="space-y-2">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="h-64 w-full rounded-xl overflow-hidden border border-border/50 grayscale hover:grayscale-0 transition-all shadow-inner">
                    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {markers.map((m: any, i: number) => (
                            <Marker key={i} position={[Number(m[latField]), Number(m[lngField])]} icon={undefined}>
                                <Popup>
                                    <div className="text-xs">
                                        <div className="font-bold mb-1">{m.title || m.name || 'Location'}</div>
                                        <div className="text-muted-foreground">{m.description || ''}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        );
    };

    const renderGallery = (w: any) => {
        const rows = findrowsforsource(w.source);
        return (
            <div className="space-y-2">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="grid grid-cols-2 gap-3">
                    {rows.slice(0, 4).map((r: any, i: number) => (
                        <div key={i} className="aspect-video bg-muted/40 rounded-lg overflow-hidden border border-border/50 group relative">
                            {r.image || r.url ? (
                                <img src={r.image || r.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">no image</div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                                <span className="text-[10px] font-medium truncate block">{r.title || r.name || 'Untitled'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderForm = (w: any) => {
        const properties = w.properties || [];
        return (
            <div className="space-y-3">
                <h4 className="font-bold text-sm lowercase">{w.title}</h4>
                <div className="bg-background/40 border border-border/30 rounded-xl p-4 space-y-3">
                    {properties.map((p: any) => (
                        <div key={p.name} className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">{p.name}</label>
                            <input
                                className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                                placeholder={`Enter ${p.name}...`}
                            />
                        </div>
                    ))}
                    <Button
                        className="w-full h-8 text-xs font-bold lowercase bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
                        onClick={() => onAddData?.(w.source, {})}
                    >
                        submit to {w.source}
                    </Button>
                </div>
            </div>
        );
    };

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

    const renderEmbed = (w: any) => (
        <div className="space-y-2">
            <h4 className="font-bold text-sm lowercase">{w.title}</h4>
            <div className="aspect-video bg-muted/20 border border-border/50 rounded-xl flex items-center justify-center overflow-hidden">
                {w.src ? (
                    <iframe src={w.src} className="w-full h-full border-0" title={w.title} />
                ) : (
                    <span className="text-xs text-muted-foreground italic">no source provided</span>
                )}
            </div>
        </div>
    );

    switch ((widget.view_type || '').tolowercase()) {
        case 'table': return rendertable(widget);
        case 'kanban': return renderkanban(widget);
        case 'chart': return renderchart(widget);
        case 'map': return rendermap(widget);
        case 'gallery': return rendergallery(widget);
        case 'form': return renderform(widget);
        case 'richtext': return renderrichtext(widget);
        case 'iframe':
        case 'embed': return renderembed(widget);
        default: return (
            <div className="p-4 border border-dashed rounded-lg text-xs text-muted-foreground text-center">
                unknown widget type: {widget.view_type}
            </div>
        );
    }
}
