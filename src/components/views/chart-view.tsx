
import { useMemo } from 'react';
import { Settings } from 'lucide-react';
import type { ViewProps } from './registry';
import { ChartWidget } from '@/features/dashboard/chart-widget';
import { NetworkView } from './network-view';
import { MindMapView } from './mind-map-view';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RecordEditContent } from '@/features/records/components/record-context-menu';
import { RecordTable } from '@/features/records/components/record-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

export function ChartView(props: ViewProps) {
  const { data, collection, config, onConfigChange, onUpdateRecord, onDelete } = props;
  const [drillDown, setDrillDown] = useState<{ xKey: string, seriesKey?: string } | null>(null);
  const [virtualMenu, setVirtualMenu] = useState<{ x: number, y: number, records: any[] } | null>(null);

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

  // data transformation for charts
  const chartData = useMemo(() => {
    if (type === 'network' || type === 'mindmap') return []; // Handled by their own views

    // multi-series: build nested map: x -> seriesval -> { value, records }
    // simple single-series aggregation by x
    if (!seriesField) {
      const map = new Map<string, { value: number, records: any[] }>();
      data.forEach(rec => {
        const xVal = String(rec[xKey] || 'untagged');
        const current = map.get(xVal) || { value: 0, records: [] };
        if (aggregation === 'sum' && yField && Number(rec[yField]) != null) {
          map.set(xVal, {
            value: current.value + (Number(rec[yField]) || 0),
            records: [...current.records, rec]
          });
        } else {
          map.set(xVal, {
            value: current.value + 1,
            records: [...current.records, rec]
          });
        }
      });
      return Array.from(map.entries()).map(([name, data]) => ({ name, value: data.value, records: data.records }));
    }

    // multi-series aggregation
    const xMap = new Map<string, Map<string, { value: number, records: any[] }>>();
    const seriesSet = new Set<string>();

    data.forEach(rec => {
      const xVal = String(rec[xKey] || 'untagged');
      const sVal = String(rec[seriesField] ?? '');
      seriesSet.add(sVal);
      if (!xMap.has(xVal)) xMap.set(xVal, new Map());
      const inner = xMap.get(xVal)!;
      const current = inner.get(sVal) || { value: 0, records: [] };

      if (aggregation === 'sum' && yField && Number(rec[yField]) != null) {
        inner.set(sVal, {
          value: current.value + (Number(rec[yField]) || 0),
          records: [...current.records, rec]
        });
      } else {
        inner.set(sVal, {
          value: current.value + 1,
          records: [...current.records, rec]
        });
      }
    });

    // limit to top series
    const seriesList = Array.from(seriesSet).slice(0, 8);

    const rows: any[] = [];
    xMap.forEach((inner, xVal) => {
      const row: any = { name: xVal, _records: {} }; // Store records map in _records
      seriesList.forEach(s => {
        const data = inner.get(s);
        row[String(s)] = data?.value || 0;
        if (data) row._records[String(s)] = data.records;
      });
      rows.push(row);
    });

    return rows;
  }, [data, xKey, seriesField, aggregation, yField, type]);

  const handleConfig = (key: string, val: any) => {
    if (onConfigChange) onConfigChange(key, val);
  };

  const ischart = !['network', 'mindmap'].includes(type);

  return (
    <div className="h-full flex flex-col gap-4 relative">
      {/* minimal config button */}
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
                <Label className="text-[10px]  text-muted-foreground font-semibold">visualization type</Label>
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

              {ischart && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px]  text-muted-foreground font-semibold">group by (x axis)</Label>
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
                    <Label className="text-[10px]  text-muted-foreground font-semibold">split by (series)</Label>
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
                      <Label className="text-[10px]  text-muted-foreground font-semibold">aggregation</Label>
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
                        <Label className="text-[10px]  text-muted-foreground font-semibold">y field</Label>
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
                    <Label className="text-[10px]  text-muted-foreground font-semibold">series display</Label>
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
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[10px]  text-muted-foreground font-semibold">color customization</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {/* main color / series colors */}
                      {(seriesField || type === 'pie' || type === 'radar') && chartData.length > 0 ? (
                        // dynamic series colors (limited to top 5-8 for ui sanity)
                        chartData[0] && Object.keys(chartData[0])
                          .filter(k => k !== 'name' && k !== 'value') // Assuming transformed keys
                          .slice(0, 10)
                          .map((bgKey) => {
                            const current = config?.chartSeriesColors?.[bgKey];
                            return (
                              <Popover key={bgKey}>
                                <PopoverTrigger asChild>
                                  <button
                                    className="w-6 h-6 rounded-full border shadow-sm hover:scale-110 transition-transform"
                                    style={{ backgroundColor: current || '#e5e7eb' /* fallback gray if not set, logic handled in widget */ }}
                                    title={`Color for ${bgKey}`}
                                  />
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-2">
                                  <div className="space-y-2">
                                    <Label className="text-xs">{bgKey}</Label>
                                    <div className="grid grid-cols-4 gap-1">
                                      {['var(--primary)', '#00C49F', '#0088FE', '#FF8042', '#8884d8', '#ff0055', '#7F00FF', '#00FF00', '#ffffff', '#000000'].map(c => (
                                        <button
                                          key={c}
                                          className="w-6 h-6 rounded-full border border-border/50"
                                          style={{ backgroundColor: c }}
                                          onClick={() => {
                                            const next = { ...(config?.chartSeriesColors || {}), [bgKey]: c };
                                            handleConfig('chartSeriesColors', next);
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )
                          })
                      ) : (
                        null // todo: single color picker for non-series charts?
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* content area */}
      {/* force dark background and disable any hover brightness shifts */}
      <div
        className="flex-1 min-h-0 rounded-lg p-0 overflow-hidden relative group"
        style={{ backgroundColor: '#090909', border: '1px solid #1a1a1a' }}
      >
        {ischart ? (
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
              seriesColors={config?.chartSeriesColors}
              legendCollapsed={!!config?.chartLegendCollapsed}
              onConfig={handleConfig}
              columns={collection.fields?.map((f: any) => ({ label: (f.uiSchema?.title || f.name).toLowerCase(), value: f.name }))}
              onDataClick={(data, _, seriesKey) => {
                // data is payload. for bar/line it might be the full row object
                // or specific point data.
                // we rely on xkey/serieskey to locate it in our chartdata to be safe/reactive
                // recharts payload usually has the 'name' (x value).
                // but data argument from our chartwidget onclick aggregator might vary.
                // let's use the arguments passed: xkey (the group name), serieskey.
                // if serieskey is present (multi-series), we use that.
                // actually, in chartwidget we passed: ondataclick(data, xkey, key) where key is serieskey.
                // but 'xkey' arg in chartwidget is the property name of x (e.g. 'status').
                // we need the value of x (e.g. 'done').
                // data payload usually contains it.
                // if type=bar single series, data is { name: 'done', value: 10, records: ... }
                // so data.name is the x value.
                // if type=bar multi series, data is { name: 'done', 'low': 5, 'high': 2, ... }
                // so data.name is x value.
                const xVal = data?.name;
                if (xVal) {
                  setDrillDown({ xKey: xVal, seriesKey });
                }
              }}
              onDataContextMenu={(e, data, _, seriesKey) => {
                e.preventDefault();
                const xVal = data?.name;
                if (!xVal) return;

                // find records for this point
                // logic similar to drilldown derivation
                const row = chartData.find(r => r.name === xVal);
                let records = [];
                if (row) {
                  if (seriesKey && row._records) records = row._records[seriesKey] || [];
                  else records = row.records || [];
                }

                if (records.length === 1) {
                  // single record -> show virtual context menu (popover at cursor)
                  // we'll use a portal-like approach relative to view or just fixed
                  // but popover needs a trigger or anchor.
                  // helper: set virtual menu state
                  // adjust coordinates to be relative to viewport if using fixed overlay
                  // e.clientx/y are viewport coordinates
                  setVirtualMenu({
                    x: e.clientX,
                    y: e.clientY,
                    records: records
                  });
                } else if (records.length > 1) {
                  // multiple records -> drill down table
                  setDrillDown({ xKey: xVal, seriesKey });
                }
              }}
            />
          </div>
        ) : type === 'network' ? (
          <NetworkView {...props} />
        ) : type === 'mindmap' ? (
          <MindMapView {...props} />
        ) : null}
      </div>
      {/* drill down dialog */}
      <Dialog open={!!drillDown} onOpenChange={(open) => !open && setDrillDown(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {drillDown ? `${drillDown.xKey} ${drillDown.seriesKey ? `(${drillDown.seriesKey})` : ''} - Records` : 'Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0 border rounded-md">
            {drillDown && (
              <RecordTable
                data={(() => {
                  // derive records from current chartdata
                  const row = chartData.find(r => r.name === drillDown.xKey);
                  if (!row) return [];
                  if (drillDown.seriesKey && row._records) return row._records[drillDown.seriesKey] || [];
                  if (row.records) return row.records;
                  // fallback for aggregations that might not strictly follow structure (e.g. single series)
                  // if we are in single series mode, records are attached to the row object mapping iteration found in 'name'
                  // wait, in single series, map values are {value, records}.
                  // and we mapped to {name, value, records}.
                  return row.records || [];
                })()}
                collection={collection}
                onUpdateRecord={onUpdateRecord}
                onDelete={onDelete}
                config={config}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* virtual context menu (single record) */}
      {
        virtualMenu && (
          <div
            className="fixed inset-0 z-50 bg-black/5"
            onClick={() => setVirtualMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setVirtualMenu(null); }}
          >
            <div
              className="absolute bg-popover text-popover-foreground border shadow-lg rounded-md w-[380px] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200"
              style={{
                left: Math.min(virtualMenu.x, window.innerWidth - 390),
                top: Math.min(virtualMenu.y, window.innerHeight - 500)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {virtualMenu.records[0] && (
                <RecordEditContent
                  record={virtualMenu.records[0]}
                  collection={collection}
                  onUpdate={onUpdateRecord}
                  onDelete={(rec: any) => { onDelete?.(rec); setVirtualMenu(null); }}
                  onView={() => setVirtualMenu(null)} // Close on full view
                  titleField={collection.fields?.find((f: any) => f.name === config?.titleField)}
                />
              )}
            </div>
          </div>
        )
      }
    </div >
  );
}
