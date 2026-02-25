import re

file_path = 'src/features/dashboard/chart-widget.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Add AreaChart import if missing
if 'AreaChart' not in content:
    content = content.replace('BarChart,', 'BarChart, AreaChart, Area,')

# Add AreaChart logic before "return null;" or at the end of render function
# We'll look for "if (type === 'scatter')" block and add AreaChart after it.

area_chart_code = """
  if (type === 'area') {
    if (!isReady) {
      return <div ref={containerRef} className="w-full h-full flex items-center justify-center text-muted-foreground">loading chart...</div>;
    }

    return (
      <div ref={containerRef} className="w-full h-full relative group cursor-pointer" onClick={() => isPlaceholder && triggerConfig('chartX')}>
        <PlaceholderOverlay isPlaceholder={isPlaceholder} columns={columns} onConfig={onConfig} label="select grouping" targetKey="chartX" />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={"color" + yKey} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray={isPlaceholder ? "5 5" : "3 3"} opacity={0.1} vertical={false} />
            <XAxis dataKey={isPlaceholder ? "name" : xKey} {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--muted-foreground)'}} />
            <YAxis {...placeholderAxisProps} fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--muted-foreground)'}} />
            {!isPlaceholder && <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--foreground)' }} />}
            <Area
              type="monotone"
              dataKey={isPlaceholder ? "value" : yKey}
              stroke={color}
              fillOpacity={1}
              fill={"url(#color" + yKey + ")"}
              isAnimationActive={true}
              onClick={(data) => onDataClick && !isPlaceholder && onDataClick(data, xKey)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }
"""

if "if (type === 'area')" not in content:
    # Insert before the last return null
    last_return = content.rfind('return null;')
    if last_return != -1:
        content = content[:last_return] + area_chart_code + content[last_return:]
        print("Added AreaChart support.")
    else:
        print("Could not find insertion point.")
else:
    print("AreaChart already exists.")

# Ensure existing charts have isAnimationActive={true}
# (Recharts defaults to true, but explicitly setting it helps confirm intent)
# We can regex replace isAnimationActive={false} to true if we want, but treemap usually looks better without it or needs specific config.
# User asked for "smooth animations".
# Let's check BarChart
if '<Bar ' in content and 'isAnimationActive' not in content:
    content = content.replace('<Bar ', '<Bar isAnimationActive={true} ')

if '<Line ' in content and 'isAnimationActive' not in content:
    content = content.replace('<Line ', '<Line isAnimationActive={true} ')

with open(file_path, 'w') as f:
    f.write(content)

print("Updated ChartWidget.tsx")
