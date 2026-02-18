import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockData = [
  { name: 'groceries', value: 400 },
  { name: 'rent', value: 1200 },
  { name: 'utilities', value: 300 },
  { name: 'entertainment', value: 200 },
  { name: 'savings', value: 500 },
];

interface ChartDataItem {
  name: string;
  value: number;
}

interface FinancialChartProps {
  title?: string;
  data?: ChartDataItem[];
}

export function FinancialChart({ title = 'monthly expenses', data = mockData }: FinancialChartProps) {
  return (
  <Card className="w-full h-[300px] border-border bg-card">
  <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium  text-muted-foreground">
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
