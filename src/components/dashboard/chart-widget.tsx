import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Treemap, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

interface ChartProps {
    type: 'line' | 'bar' | 'pie' | 'radar' | 'treemap';
    data?: any[];
    xKey?: string;
    yKey?: string;
    color?: string;
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
    if (type === 'line') {
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
                        {data.map((entry, index) => (
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

    return null;
}
