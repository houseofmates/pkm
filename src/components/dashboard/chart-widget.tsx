import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Treemap, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
    FunnelChart as RechartsFunnelChart, Funnel, LabelList,
    AreaChart, Area, ScatterChart, Scatter
} from 'recharts';

interface ChartProps {
    type: 'line' | 'bar' | 'pie' | 'radar' | 'treemap' | 'funnel' | 'gauge' | 'kpi' | 'area' | 'scatter';
    data?: any[];
    xKey?: string;
    yKey?: string;
    color?: string;
    seriesKeys?: string[]; // keys in `data` to render as separate series
    stacked?: boolean;
    seriesType?: 'bar' | 'line' | 'area';
} 

// Mock Data if none provided
const MOCK_DATA = [
    { name: 'Mon', value: 400 },
    { name: 'Tue', value: 300 },
    { name: 'Wed', value: 300 },
    { name: 'Thu', value: 200 },
    { name: 'Fri', value: 278 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function ChartWidget({ type = 'line', data = MOCK_DATA, xKey = 'name', yKey = 'value', color = '#8884d8' }: ChartProps) {
    // Multi-series rendering helper
    const renderSeries = () => {
        if (!props.seriesKeys || props.seriesKeys.length === 0) return null;
        return props.seriesKeys.map((key, idx) => {
            const col = COLORS[idx % COLORS.length];
            if (type === 'bar') {
                return <Bar key={key} dataKey={key} stackId={props.stacked ? 'stack' : undefined} fill={col} />;
            }
            if (type === 'line') {
                return <Line key={key} type="monotone" dataKey={key} stroke={col} strokeWidth={2} dot={false} />;
            }
            if (type === 'area') {
                return <Area key={key} type="monotone" dataKey={key} stroke={col} fill={col} fillOpacity={0.25} />;
            }
            return null;
        });
    };

    if (type === 'line') {
        if (props.seriesKeys && props.seriesKeys.length > 0) {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                        {renderSeries()}
                        <Legend />
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                    <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'area') {
        if (props.seriesKeys && props.seriesKeys.length > 0) {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                        {renderSeries()}
                        <Legend />
                    </AreaChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                    <Area type="monotone" dataKey={yKey} stroke={color} fill={color} fillOpacity={0.3} />
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'scatter') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey={yKey} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                    <Scatter data={data} fill={color} />
                </ScatterChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'bar') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />
                    <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'pie') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60} // Donut style by default for modern look
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey={yKey}
                        nameKey={xKey}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'radar') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                    <Radar
                        name={yKey}
                        dataKey={yKey}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.6}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                </RadarChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'treemap') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}
                    dataKey={yKey}
                    aspectRatio={4 / 3}
                    stroke="var(--background)"
                    fill={color}
                >
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                </Treemap>
            </ResponsiveContainer>
        );
    }

    if (type === 'funnel') {
        // Funnel needs specific data shape usually, but we'll try to map standard
        // Sorted by value descending usually
        const sorted = [...data].sort((a, b) => (b[yKey] || 0) - (a[yKey] || 0));
        return (
            <ResponsiveContainer width="100%" height="100%">
                <RechartsFunnelChart>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <Funnel
                        dataKey={yKey}
                        data={sorted}
                        isAnimationActive
                    >
                        <LabelList position="right" fill="var(--foreground)" stroke="none" dataKey={xKey} />
                    </Funnel>
                </RechartsFunnelChart>
            </ResponsiveContainer>
        );
    }

    if (type === 'gauge') {
        // Half donut
        // We need a single value usually. Let's take the first item or sum?
        // Let's assume data[0].value is the current, and we need a max?
        // For generic usage, let's just show the first value relative to 100? Or just render it visually.
        const val = data[0]?.[yKey] || 0;
        const max = 100; // Arbitrary for now without config
        const gaugeData = [
            { name: 'Value', value: val },
            { name: 'Remainder', value: max - val }
        ];

        return (
            <div className="relative w-full h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            <Cell fill={color} />
                            <Cell fill="var(--muted)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute bottom-4 text-2xl font-bold flex flex-col items-center">
                    {val}%
                    <span className="text-xs text-muted-foreground font-normal">Target</span>
                </div>
            </div>
        );
    }

    if (type === 'kpi') {
        // Big Number
        const val = data.reduce((acc, cur) => acc + (Number(cur[yKey]) || 0), 0); // Sum by default?
        // Or if it's count, standard chartData is straight counts. So sum of counts = total count.

        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-4">
                <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">{xKey} Total</div>
                <div className="text-5xl font-bold tracking-tighter text-primary">
                    {val.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
                    +12% <span className="text-muted-foreground">vs last period (mock)</span>
                </div>
            </div>
        );
    }

    return null;
}
