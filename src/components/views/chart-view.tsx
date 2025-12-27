
import { useMemo } from 'react';
import type { ViewProps } from './registry';
import { ChartWidget } from '@/components/dashboard/chart-widget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ChartView({ data, collection, config, onConfigChange }: ViewProps) {
    const defaultX = collection.fields?.find((f: any) => f.type === 'string' || f.interface === 'input')?.name;
    const defaultY = collection.fields?.find((f: any) => f.type === 'number' || f.interface === 'number' || f.name === 'id')?.name;

    const xKey = config?.chartX || defaultX || 'id';

    const type = config?.chartType || 'bar';

    // Data Preparation: Count or Sum?
    // User probably wants to Count occurrences for categorical, or Sum/Avg for numerical.
    // Simplifying: If Y is number, plot it. If Y is ID/String, count occurrences.

    const chartData = useMemo(() => {
        if (!xKey) return [];

        // Strategy: Aggregate by X
        const map = new Map<string, number>();

        data.forEach(rec => {
            const xVal = String(rec[xKey] || 'Untagged');

            // If Y is just ID, we are counting occurrences of X
            // If Y is a number field, we are summing/averaging? 
            // Let's assume Count for now unless Y is explicitly a number field AND user selects "Sum"?
            // Simplest robust v1: Count Occurrences of X

            const current = map.get(xVal) || 0;
            // If we find a way to distinguish 'Sum' vs 'Count' later.
            // For now: Count
            map.set(xVal, current + 1);
        });

        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [data, xKey]);

    const handleConfig = (key: string, val: any) => {
        if (onConfigChange) onConfigChange(key, val);
    }

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Simple Config Bar within View */}
            <div className="flex gap-4 p-4 border bg-card rounded-lg items-end flex-wrap">
                <div className="space-y-1 min-w-[150px]">
                    <Label>Chart Type</Label>
                    <Select value={type} onValueChange={(v) => handleConfig('chartType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bar">Bar Chart</SelectItem>
                            <SelectItem value="line">Line Chart</SelectItem>
                            <SelectItem value="pie">Donut Chart</SelectItem>
                            <SelectItem value="radar">Radar Chart</SelectItem>
                            <SelectItem value="treemap">Treemap</SelectItem>
                            <SelectItem value="funnel">Funnel</SelectItem>
                            <SelectItem value="gauge">Gauge (Speedometer)</SelectItem>
                            <SelectItem value="kpi">Scorecard / KPI</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1 min-w-[150px]">
                    <Label>Group By (X Axis)</Label>
                    <Select value={xKey} onValueChange={(v) => handleConfig('chartX', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {collection.fields?.map((f: any) => (
                                <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1 min-w-[150px]">
                    <div className="text-xs text-muted-foreground pt-3">
                        Showing count of records by <b>{xKey}</b>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[400px] border rounded-lg p-4 bg-card shadow-sm">
                <ChartWidget type={type} data={chartData} xKey="name" yKey="value" />
            </div>
        </div>
    );
}
