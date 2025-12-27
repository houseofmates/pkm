
import { useMemo } from 'react';
import { Settings } from 'lucide-react';
import type { ViewProps } from './registry';
import { ChartWidget } from '@/components/dashboard/chart-widget';
import { NetworkView } from './network-view';
import { MindMapView } from './mind-map-view';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function ChartView(props: ViewProps) {
    const { data, collection, config, onConfigChange } = props;

    if (!collection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm">loading collection metadata...</p>
                </div>
            </div>
        );
    }

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
                const xVal = String(rec[xKey] || 'untagged');
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
            const xVal = String(rec[xKey] || 'untagged');
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
        <div className="h-full flex flex-col gap-4 relative">
            {/* Minimal Config Button */}
            <div className="absolute top-4 right-4 z-50">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-dashed">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="end">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">visualization type</Label>
                                <Select value={type} onValueChange={(v) => handleConfig('chartType', v)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bar">bar chart</SelectItem>
                                        <SelectItem value="line">line chart</SelectItem>
                                        <SelectItem value="area">area chart</SelectItem>
                                        <SelectItem value="pie">donut chart</SelectItem>
                                        <SelectItem value="scatter">scatter plot</SelectItem>
                                        <SelectItem value="radar">radar chart</SelectItem>
                                        <SelectItem value="treemap">treemap</SelectItem>
                                        <SelectItem value="funnel">funnel</SelectItem>
                                        <SelectItem value="gauge">gauge (speedometer)</SelectItem>
                                        <SelectItem value="kpi">scorecard / kpi</SelectItem>
                                        <SelectItem value="network">network graph</SelectItem>
                                        <SelectItem value="mindmap">mind map</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {isChart && (
                                <>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">group by (x axis)</Label>
                                        <Select value={xKey} onValueChange={(v) => handleConfig('chartX', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {collection.fields?.map((f: any) => (
                                                    <SelectItem key={f.name} value={f.name}>{(f.uiSchema?.title || f.name).toLowerCase()}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">split by (series)</Label>
                                        <Select value={seriesField || '_none'} onValueChange={(v) => handleConfig('chartSeriesField', v === '_none' ? null : v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_none">(none)</SelectItem>
                                                {collection.fields?.map((f: any) => (
                                                    <SelectItem key={f.name} value={f.name}>{(f.uiSchema?.title || f.name).toLowerCase()}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">aggregation</Label>
                                            <Select value={aggregation} onValueChange={(v) => handleConfig('chartAgg', v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="count">count</SelectItem>
                                                    <SelectItem value="sum">sum</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {aggregation === 'sum' && (
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">y field</Label>
                                                <Select value={yField || '_none'} onValueChange={(v) => handleConfig('chartY', v === '_none' ? null : v)}>
                                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="_none">select field</SelectItem>
                                                        {collection.fields?.filter((f: any) => f.type === 'number' || f.interface === 'number').map((f: any) => (
                                                            <SelectItem key={f.name} value={f.name}>{(f.uiSchema?.title || f.name).toLowerCase()}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">series display</Label>
                                        <Select value={seriesType || '_auto'} onValueChange={(v) => handleConfig('chartSeriesType', v === '_auto' ? null : v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_auto">auto</SelectItem>
                                                <SelectItem value="bar">bar</SelectItem>
                                                <SelectItem value="line">line</SelectItem>
                                                <SelectItem value="area">area</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="stacked"
                                            checked={stacked}
                                            onChange={(e) => handleConfig('chartStacked', e.target.checked)}
                                            className="rounded border-muted bg-muted/20"
                                        />
                                        <Label htmlFor="stacked" className="text-xs cursor-pointer font-normal">stacked bars/areas</Label>
                                    </div>
                                </>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 border rounded-lg p-0 bg-card shadow-sm overflow-hidden relative">
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
                            columns={collection.fields?.map((f: any) => ({ label: (f.uiSchema?.title || f.name).toLowerCase(), value: f.name }))}
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

{/* Content Area */ }
<div className="flex-1 min-h-0 border rounded-lg p-0 bg-card shadow-sm overflow-hidden relative">
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
        </div >
    );
}
