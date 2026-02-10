import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockData = [
    { name: 'Groceries', value: 400 },
    { name: 'Rent', value: 1200 },
    { name: 'Utilities', value: 300 },
    { name: 'Entertainment', value: 200 },
    { name: 'Savings', value: 500 },
];

interface FinancialChartProps {
    title?: string;
    data?: any[];
}

export function FinancialChart({ title = "Monthly Expenses", data = mockData }: FinancialChartProps) {
    return (
        <Card className="w-full h-[300px] border-border bg-card">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Bar
                            dataKey="value"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
