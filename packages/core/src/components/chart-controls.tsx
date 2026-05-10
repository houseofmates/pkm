import React from 'react';

interface ChartConfig {
  color?: string;
  stack?: boolean;
  legend?: boolean;
  xLabel?: string;
  yLabel?: string;
}

interface ChartControlsProps {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
}

export default function ChartControls({ config, onChange }: ChartControlsProps) {
  const onColor = (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...config, color: e.target.value });
  const onStack = (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...config, stack: e.target.checked });
  const onLegend = (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...config, legend: e.target.checked });
  const onX = (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...config, xLabel: e.target.value });
  const onY = (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...config, yLabel: e.target.value });
  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <input type="color" value={config?.color||'#f6b012'} onChange={onColor} title="series color" />
      <label style={{fontSize:12}}><input type="checkbox" checked={Boolean(config?.stack)} onChange={onStack} /> stack</label>
      <label style={{fontSize:12}}><input type="checkbox" checked={Boolean(config?.legend!==false)} onChange={onLegend} /> legend</label>
      <input style={{width:120}} placeholder="x label" value={config?.xLabel||''} onChange={onX} />
      <input style={{width:120}} placeholder="y label" value={config?.yLabel||''} onChange={onY} />
    </div>
  );
}
