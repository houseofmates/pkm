
import { useMemo } from 'react';
import type { ViewProps } from './registry';
import { ChartWidget } from '@/components/dashboard/chart-widget';
import { NetworkView } from './network-view';
import { MindMapView } from './mind-map-view';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ChartView(props: ViewProps) {
    const { data, collection, config, onConfigChange } = props;
    const defaultX = collection.fields?.find((f: any) => f.type === 'string' || f.interface === 'input')?.name;

    const xKey = config?.chartX || defaultX || 'id';

    const type = config?.chartType || 'bar';
    const seriesField = config?.chartSeriesField || null;
    const aggregation: 'count' | 'sum' = config?.chartAgg || 'count';
    const yField = config?.chartY || null;
    const stacked = !!config?.chartStacked;
    const seriesType = config?.chartSeriesType || null; // global series display override (bar/line/area)

    // Data Transformation for Charts
    const chartData = useMemo(() => {
        if (type === 'network' || type === 'mindmap') return []; // Handled by their own views

        if (!seriesField) {
            // Simple single-series aggregation by X
            const map = new Map<string, number>();
            data.forEach(rec => {
                const xVal = String(rec[xKey] || 'Untagged');
                const current = map.get(xVal) || 0;
                if (aggregation === 'sum' && yField && Number(rec[yField]) != null) {
                    map.set(xVal, current + (Number(rec[yField]) || 0));
                } else {
                    map.set(xVal, current + 1);
                }
            });
            return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
        }

        // Multi-series: build nested map: x -> seriesVal -> agg
        const xMap = new Map<string, Map<string, number>>();
        const seriesSet = new Set<string>();

        data.forEach(rec => {
            const xVal = String(rec[xKey] || 'Untagged');
            const sVal = String(rec[seriesField] ?? '');
            seriesSet.add(sVal);
            if (!xMap.has(xVal)) xMap.set(xVal, new Map());
            const inner = xMap.get(xVal)!;
            const current = inner.get(sVal) || 0;
            if (aggregation === 'sum' && yField && Number(rec[yField]) != null) {
                inner.set(sVal, current + (Number(rec[yField]) || 0));
            } else {
                inner.set(sVal, current + 1);
            }
        });

        // Limit to top series to keep chart readable (e.g., top 8)
        const seriesList = Array.from(seriesSet).slice(0, 8);

        const rows: any[] = [];
        xMap.forEach((inner, xVal) => {
            const row: any = { name: xVal };
            seriesList.forEach(s => {
                row[String(s)] = inner.get(s) || 0;
            });
            rows.push(row);
        });

        return rows;
    }, [data, xKey, seriesField, aggregation, yField, type]);

    const handleConfig = (key: string, val: any) => {
        if (onConfigChange) onConfigChange(key, val);
    }

    const isChart = !['network', 'mindmap'].includes(type);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Config Bar */}
            <div className="flex gap-4 p-4 border bg-card rounded-lg items-end flex-wrap">
                <div className="space-y-1 min-w-[200px]">
                    <Label>Visualization Type</Label>
                    <Select value={type} onValueChange={(v) => handleConfig('chartType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bar">Bar Chart</SelectItem>
                            <SelectItem value="line">Line Chart</SelectItem>
                            <SelectItem value="area">Area Chart</SelectItem>
                            <SelectItem value="pie">Donut Chart</SelectItem>
                            <SelectItem value="scatter">Scatter Plot</SelectItem>
                            <SelectItem value="radar">Radar Chart</SelectItem>
                            <SelectItem value="treemap">Treemap</SelectItem>
                            <SelectItem value="funnel">Funnel</SelectItem>
                            <SelectItem value="gauge">Gauge (Speedometer)</SelectItem>
                            <SelectItem value="kpi">Scorecard / KPI</SelectItem>
                            <SelectItem value="network">Network Graph</SelectItem>
                            <SelectItem value="mindmap">Mind Map</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isChart && (
                    <>
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

                        <div className="space-y-1 min-w-[180px]">
                            <Label>Split By (Series)</Label>
                            <Select value={seriesField || '_none'} onValueChange={(v) => handleConfig('chartSeriesField', v === '_none' ? null : v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">(none)</SelectItem>
                                    {collection.fields?.map((f: any) => (
                                        <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1 min-w-[150px]">
                            <Label>Aggregation</Label>
                            <Select value={aggregation} onValueChange={(v) => handleConfig('chartAgg', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="count">Count</SelectItem>
                                    <SelectItem value="sum">Sum (requires Y field)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {aggregation === 'sum' && (
                            <div className="space-y-1 min-w-[150px]">
                                <Label>Y Field</Label>
                                <Select value={yField || '_none'} onValueChange={(v) => handleConfig('chartY', v === '_none' ? null : v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">Select Field</SelectItem>
                                        {collection.fields?.filter((f: any) => f.type === 'number' || f.interface === 'number').map((f: any) => (
                                            <SelectItem key={f.name} value={f.name}>{f.uiSchema?.title || f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1 min-w-[120px]">
                            <Label>Display</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" id="stacked" checked={stacked} onChange={(e) => handleConfig('chartStacked', e.target.checked)} />
                                <label htmlFor="stacked" className="text-sm text-muted-foreground">Stacked</label>
                            </div>
                        </div>

                        <div className="space-y-1 min-w-[150px]">
                            <Label>Series Type</Label>
                            <Select value={seriesType || '_auto'} onValueChange={(v) => handleConfig('chartSeriesType', v === '_auto' ? null : v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_auto">Auto</SelectItem>
                                    <SelectItem value="bar">Bar</SelectItem>
                                    <SelectItem value="line">Line</SelectItem>
                                    <SelectItem value="area">Area</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-[400px] border rounded-lg p-0 bg-card shadow-sm overflow-hidden relative">
                {isChart ? (
                    <div className="w-full h-full p-4">
                        <ChartWidget
                            type={type as any}
                            data={chartData}
                            xKey="name"
                            yKey="value"
                            seriesKeys={seriesField ? (chartData[0] ? Object.keys(chartData[0]).filter(k => k !== 'name') : []) : undefined}
                            stacked={stacked}
                            seriesType={seriesType}
                            seriesTypes={config?.chartSeriesTypes}
                            seriesOrder={config?.chartSeriesOrder}
                            legendCollapsed={!!config?.chartLegendCollapsed}
                            onConfig={handleConfig}
                            columns={collection.fields?.map((f: any) => ({ label: f.uiSchema?.title || f.name, value: f.name }))}
                        />
                    </div>
                ) : type === 'network' ? (
                    <NetworkView {...props} />
                ) : type === 'mindmap' ? (
                    <MindMapView {...props} />
                ) : null}
            </div>
        </div>
    );
}
