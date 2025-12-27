import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Treemap, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
    FunnelChart as RechartsFunnelChart, Funnel, LabelList,
    AreaChart, Area, ScatterChart, Scatter
} from 'recharts';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Placeholder Data for "Wireframe" mode
const PLACEHOLDER_DATA = [
    { name: 'Category A', value: 40, value2: 24, amt: 2400 },
    { name: 'Category B', value: 30, value2: 13, amt: 2210 },
    { name: 'Category C', value: 20, value2: 98, amt: 2290 },
    { name: 'Category D', value: 27, value2: 39, amt: 2000 },
    { name: 'Category E', value: 18, value2: 48, amt: 2181 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface ChartProps {
    type: 'line' | 'bar' | 'pie' | 'radar' | 'treemap' | 'funnel' | 'gauge' | 'kpi' | 'area' | 'scatter';
    data?: any[];
    xKey?: string;
    yKey?: string;
    color?: string;
    seriesKeys?: string[]; // keys in `data` to render as separate series
    stacked?: boolean;
    seriesType?: 'bar' | 'line' | 'area';
    seriesTypes?: Record<string, 'bar' | 'line' | 'area'>;
    seriesOrder?: string[];
    legendCollapsed?: boolean;
    onConfig?: (key: string, value?: any) => void;
    columns?: { label: string, value: string }[];
}

export function ChartWidget({ type = 'line', data = [], xKey = 'name', yKey = 'value', color = '#8884d8', seriesKeys, stacked, seriesType, seriesTypes, seriesOrder, legendCollapsed, onConfig, columns }: ChartProps) {
    const [hidden, setHidden] = useState<Record<string, boolean>>({});
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState(!!legendCollapsed);

    const isPlaceholder = !data || data.length === 0;
    const chartData = isPlaceholder ? PLACEHOLDER_DATA : data;

    // Helper to request config change
    const triggerConfig = (configKey: string, val?: any) => {
        if (!onConfig) return;
        onConfig(configKey, val);
    };

    // Render Overlay for Placeholder instructions
    const PlaceholderOverlay = ({ label, targetKey }: { label?: string, targetKey?: string }) => {
        if (!isPlaceholder) return null;

        if (targetKey && columns && columns.length > 0) {
            return (
                <div className="absolute inset-0 flex items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
                    <Select onValueChange={(v) => triggerConfig(targetKey, v)}>
                        <SelectTrigger className="w-[200px] bg-background/90 backdrop-blur shadow-lg border-dashed border-primary/50">
                            <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                            <SelectValue placeholder={label || "Configure Data"} />
                        </SelectTrigger>
                        <SelectContent>
                            {columns.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )
        }

        return (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-background/80 backdrop-blur-sm border border-dashed border-primary/50 text-primary px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                    <PlusCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold">{label || "Configure Chart Data"}</span>
                </div>
            </div>
        )
    };

    // Common Axis Props for Placeholders
    const placeholderAxisProps = isPlaceholder ? {
        // We can't easily put a Select on Axis click without positioning logic
        // So we fallback to simple trigger or just let the main overlay handle it
        cursor: "pointer",
        tick: { fill: 'var(--muted-foreground)', opacity: 0.5 }
    } : {};
    const toggle = (k: string) => setHidden(prev => ({ ...prev, [k]: !prev[k] }));

    // Build the ordered keys list (respect seriesOrder if present)
    const buildKeys = () => {
        const base = seriesKeys || [];
        if (seriesOrder && seriesOrder.length > 0) {
            // only include keys that exist in base and preserve order
            return seriesOrder.filter(k => base.includes(k));
        }
        return base;
    };

    // Multi-series rendering helper
    const renderSeries = () => {
        const keys = buildKeys();
        if (!keys || keys.length === 0) return null;
        return keys.map((key, idx) => {
            if (hidden[key]) return null;
            if (search && !key.toLowerCase().includes(search.toLowerCase())) return null;
            const col = COLORS[idx % COLORS.length];
            const keyType = seriesTypes?.[key] || seriesType || type;
            const isDim = hoverKey && hoverKey !== key;
            if (keyType === 'bar') {
                return <Bar key={key} dataKey={key} stackId={stacked ? 'stack' : undefined} fill={col} fillOpacity={isDim ? 0.15 : 1} />;
            }
            if (keyType === 'line') {
                return <Line key={key} type="monotone" dataKey={key} stroke={col} strokeWidth={2} dot={false} strokeOpacity={isDim ? 0.2 : 1} />;
            }
            if (keyType === 'area') {
                return <Area key={key} type="monotone" dataKey={key} stroke={col} fill={col} fillOpacity={isDim ? 0.08 : 0.25} />;
            }
            return null;
        });
    };

    if (type === 'line') {
        if (!isPlaceholder && seriesKeys && seriesKeys.length > 0) {
            return (
                <div className="w-full h-full relative group">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                            {renderSeries()}
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <input placeholder="Search series..." value={search} onChange={(e) => setSearch(e.target.value)} className="input input-sm" />
                            <button onClick={() => setCollapsed(!collapsed)} className="btn btn-ghost">{collapsed ? 'Expand Legend' : 'Collapse Legend'}</button>
                        </div>
                        <div className="text-xs text-muted-foreground">{(buildKeys() || []).filter(k => !hidden[k]).length} visible</div>
                    </div>
                    {!collapsed && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {buildKeys().map((k, idx) => {
                                const col = COLORS[idx % COLORS.length];
                                const hiddenFlag = !!hidden[k];
                                if (search && !k.toLowerCase().includes(search.toLowerCase())) return null;
                                return (
                                    <button key={k} onClick={() => toggle(k)} onMouseEnter={() => setHoverKey(k)} onMouseLeave={() => setHoverKey(null)} className="flex items-center gap-2 px-2 py-1 rounded bg-card">
                                        <span style={{ width: 12, height: 12, backgroundColor: col, display: 'inline-block', borderRadius: 3, opacity: hiddenFlag ? 0.3 : 1 }} />
                                        <span className={hiddenFlag ? 'line-through text-muted-foreground' : ''}>{k}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="w-full h-full relative group cursor-pointer" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select Group By" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray={isPlaceholder ? "5 5" : "3 3"} opacity={isPlaceholder ? 0.1 : 0.2} />
                        <XAxis dataKey="name" {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />}
                        <Line
                            type="monotone"
                            dataKey={isPlaceholder ? "value" : yKey}
                            stroke={isPlaceholder ? "var(--muted-foreground)" : color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            strokeDasharray={isPlaceholder ? "5 5" : undefined}
                            className={isPlaceholder ? "opacity-50" : ""}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'area') {
        if (!isPlaceholder && seriesKeys && seriesKeys.length > 0) {
            // ... (existing multi-series logic)
            return (
                <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                            {renderSeries()}
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <input
                                placeholder="Search series..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input input-sm"
                            />
                            <button onClick={() => setCollapsed(!collapsed)} className="btn btn-ghost">
                                {collapsed ? 'Expand Legend' : 'Collapse Legend'}
                            </button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {(buildKeys() || []).filter(k => !hidden[k]).length} visible
                        </div>
                    </div>
                    {!collapsed && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {buildKeys().map((k, idx) => {
                                const col = COLORS[idx % COLORS.length];
                                const hiddenFlag = !!hidden[k];
                                if (search && !k.toLowerCase().includes(search.toLowerCase())) return null;
                                return (
                                    <button
                                        key={k}
                                        onClick={() => toggle(k)}
                                        onMouseEnter={() => setHoverKey(k)}
                                        onMouseLeave={() => setHoverKey(null)}
                                        className="flex items-center gap-2 px-2 py-1 rounded bg-card"
                                    >
                                        <span style={{ width: 12, height: 12, backgroundColor: col, display: 'inline-block', borderRadius: 3, opacity: hiddenFlag ? 0.3 : 1 }} />
                                        <span className={hiddenFlag ? 'line-through text-muted-foreground' : ''}>{k}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="w-full h-full relative group cursor-pointer" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select Group By" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray={isPlaceholder ? "5 5" : "3 3"} opacity={0.2} />
                        <XAxis dataKey="name" {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />}
                        <Area
                            type="monotone"
                            dataKey={isPlaceholder ? "value" : yKey}
                            stroke={isPlaceholder ? "var(--muted-foreground)" : color}
                            fill={isPlaceholder ? "var(--muted)" : color}
                            fillOpacity={isPlaceholder ? 0.1 : 0.3}
                            strokeDasharray={isPlaceholder ? "5 5" : undefined}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'scatter') {
        return (
            <div className="w-full h-full relative group cursor-pointer" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select X Axis" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey={yKey} fontSize={10} tickLine={false} axisLine={false} />
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />}
                        <Scatter data={data} fill={color} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'bar') {
        if (!isPlaceholder && seriesKeys && seriesKeys.length > 0) {
            // ... (multi-series logic)
            return (
                <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                            {renderSeries()}
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <input placeholder="Search series..." value={search} onChange={(e) => setSearch(e.target.value)} className="input input-sm" />
                            <button onClick={() => setCollapsed(!collapsed)} className="btn btn-ghost">{collapsed ? 'Expand Legend' : 'Collapse Legend'}</button>
                        </div>
                        <div className="text-xs text-muted-foreground">{(buildKeys() || []).filter(k => !hidden[k]).length} visible</div>
                    </div>
                    {!collapsed && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {buildKeys().map((k, idx) => {
                                const col = COLORS[idx % COLORS.length];
                                const hiddenFlag = !!hidden[k];
                                if (search && !k.toLowerCase().includes(search.toLowerCase())) return null;
                                return (
                                    <button key={k} onClick={() => toggle(k)} onMouseEnter={() => setHoverKey(k)} onMouseLeave={() => setHoverKey(null)} className="flex items-center gap-2 px-2 py-1 rounded bg-card">
                                        <span style={{ width: 12, height: 12, backgroundColor: col, display: 'inline-block', borderRadius: 3, opacity: hiddenFlag ? 0.3 : 1 }} />
                                        <span className={hiddenFlag ? 'line-through text-muted-foreground' : ''}>{k}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="w-full h-full relative group cursor-pointer" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select Group By" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray={isPlaceholder ? "5 5" : "3 3"} opacity={0.2} />
                        <XAxis dataKey="name" {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />}
                        <Bar
                            dataKey={isPlaceholder ? "value" : yKey}
                            fill={isPlaceholder ? "var(--muted)" : color}
                            opacity={isPlaceholder ? 0.3 : 1}
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'pie') {
        return (
            <div className="relative w-full h-full group" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select Category" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60} // Donut style by default for modern look
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey={isPlaceholder ? "value" : yKey}
                            nameKey={isPlaceholder ? "name" : xKey}
                            cursor={isPlaceholder ? "pointer" : "default"}
                        >
                            {chartData.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={isPlaceholder ? 'var(--muted)' : COLORS[index % COLORS.length]}
                                    fillOpacity={isPlaceholder ? 0.3 : 1}
                                    stroke={isPlaceholder ? 'var(--muted-foreground)' : 'none'}
                                    strokeDasharray={isPlaceholder ? '5 5' : ''}
                                />
                            ))}
                        </Pie>
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />}
                        {!isPlaceholder && <Legend />}
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'radar') {
        return (
            <div className="relative w-full h-full group" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select Dimensions" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid strokeDasharray={isPlaceholder ? "5 5" : "3 3"} opacity={0.2} />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: isPlaceholder ? 'var(--muted-foreground)' : 'var(--foreground)' }} {...placeholderAxisProps} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} {...placeholderAxisProps} />
                        <Radar
                            name={isPlaceholder ? "Metric" : yKey}
                            dataKey={isPlaceholder ? "value" : yKey}
                            stroke={isPlaceholder ? "var(--muted-foreground)" : color}
                            fill={isPlaceholder ? "var(--muted)" : color}
                            fillOpacity={isPlaceholder ? 0.1 : 0.6}
                            strokeDasharray={isPlaceholder ? "5 5" : undefined}
                        />
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />}
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'treemap') {
        return (
            <div className="relative w-full h-full group" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select Grouping" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={chartData}
                        dataKey={isPlaceholder ? "value" : yKey}
                        aspectRatio={4 / 3}
                        stroke="var(--background)"
                        fill={isPlaceholder ? "var(--muted)" : "#000000"}
                        isAnimationActive={false}
                        content={isPlaceholder ? (props: any) => {
                            const { x, y, width, height } = props;
                            return (
                                <g>
                                    <rect x={x} y={y} width={width} height={height} fill="var(--muted)" stroke="var(--background)" strokeDasharray="3 3" fillOpacity={0.1} />
                                </g>
                            )
                        } : undefined}
                    >
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />}
                    </Treemap>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'funnel') {
        // Funnel sort
        const sorted = isPlaceholder ? chartData : [...data].sort((a, b) => (b[yKey] || 0) - (a[yKey] || 0));
        return (
            <div className="relative w-full h-full group" onClick={() => isPlaceholder && triggerConfig('chartX')}>
                <PlaceholderOverlay label="Select Stage" targetKey="chartX" />
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsFunnelChart>
                        {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />}
                        <Funnel
                            dataKey={isPlaceholder ? "value" : yKey}
                            data={sorted}
                            isAnimationActive
                        >
                            <LabelList position="right" fill="var(--foreground)" stroke="none" dataKey={isPlaceholder ? "name" : xKey} />
                        </Funnel>
                    </RechartsFunnelChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (type === 'gauge') {
        const val = isPlaceholder ? 0 : (data[0]?.[yKey] || 0);
        const max = 100; // Arbitrary for now without config
        const safeVal = Math.min(Math.max(val, 0), max);
        const gaugeData = [
            { name: 'Value', value: safeVal },
            { name: 'Remainder', value: max - safeVal }
        ];

        return (
            <div className="relative w-full h-full flex items-center justify-center p-2 group" onClick={() => isPlaceholder && triggerConfig('chartY')}>
                <PlaceholderOverlay label="Select Metric" targetKey="chartY" />
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={isPlaceholder ? [{ value: 100 }] : gaugeData}
                            cx="50%"
                            cy="85%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="75%"
                            outerRadius="110%"
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {isPlaceholder ? (
                                <Cell fill="var(--muted)" strokeDasharray="5 5" stroke="var(--muted-foreground)" fillOpacity={0.1} />
                            ) : (
                                <>
                                    <Cell fill={color} />
                                    <Cell fill="var(--muted)" opacity={0.2} />
                                </>
                            )}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                {!isPlaceholder && (
                    <div className="absolute bottom-4 text-2xl font-bold flex flex-col items-center">
                        {val}%
                        <span className="text-xs text-muted-foreground font-normal">Target</span>
                    </div>
                )}
            </div>
        );
    }

    if (type === 'kpi') {
        const val = isPlaceholder ? 1234 : data.reduce((acc, cur) => acc + (Number(cur[yKey]) || 0), 0);

        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-4 group cursor-pointer relative" onClick={() => isPlaceholder && triggerConfig('chartY')}>
                <PlaceholderOverlay label="Configure KPI Values" targetKey="chartY" />
                <div className={cn("text-sm uppercase tracking-wider mb-2", isPlaceholder ? "text-muted-foreground/50" : "text-muted-foreground")}>
                    {isPlaceholder ? "Total Metric" : (xKey + ' Total')}
                </div>
                <div className={cn("text-5xl font-bold tracking-tighter", isPlaceholder ? "text-muted-foreground/30 dashed-text" : "text-primary")}>
                    {val.toLocaleString()}
                </div>
                {!isPlaceholder && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 opacity-0">
                        {/* Placeholder for future trends */}
                    </div>
                )}
            </div>
        );
    }

    if (type === 'scatter') {
        return (
            <div className="w-full h-full relative group cursor-pointer" onClick={() => isPlaceholder && triggerConfig('chartSeriesField')}>
                <PlaceholderOverlay />
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                        <CartesianGrid strokeDasharray={isPlaceholder ? "5 5" : "3 3"} opacity={0.2} />
                        <XAxis dataKey="amt" type="number" name="amt" unit="" {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey={yKey} type="number" name="val" unit="" {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} />
                        {!isPlaceholder && <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />}
                        <Scatter
                            name="A school"
                            data={chartData}
                            fill={isPlaceholder ? "var(--muted)" : color}
                            fillOpacity={isPlaceholder ? 0.3 : 1}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        );
    }
    return null;
}
