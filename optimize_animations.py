import re

file_path = 'src/features/dashboard/chart-widget.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Force animations on
content = content.replace('isAnimationActive={false}', 'isAnimationActive={true}')

# Ensure Radar has animation
if '<Radar ' in content and 'isAnimationActive' not in content:
    content = content.replace('<Radar ', '<Radar isAnimationActive={true} ')

# Ensure Scatter has animation
if '<Scatter ' in content and 'isAnimationActive' not in content:
    content = content.replace('<Scatter ', '<Scatter isAnimationActive={true} ')

# Ensure Pie has animation
if '<Pie ' in content and 'isAnimationActive' not in content:
    content = content.replace('<Pie ', '<Pie isAnimationActive={true} ')

with open(file_path, 'w') as f:
    f.write(content)

print("Optimized animations in ChartWidget.tsx")
