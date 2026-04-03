import { cn } from '@/lib/utils';

interface SaturationRingProps {
  mood: number;
  body: number;
  mind: number;
  finance: number;
  social: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

// category colors matching the store
const CATEGORY_COLORS = {
  mood: '#f472b6',    // pink-400
  body: '#60a5fa',    // blue-400
  mind: '#a78bfa',    // purple-400
  finance: '#4ade80', // green-400
  social: '#fb923c',  // orange-400
};

export function SaturationRing({
  mood,
  body,
  mind,
  finance,
  social,
  size = 120,
  strokeWidth = 8,
  className,
}: SaturationRingProps) {
  const categories = [
    { key: 'mood', value: mood, color: CATEGORY_COLORS.mood, label: 'mood', icon: '💭' },
    { key: 'body', value: body, color: CATEGORY_COLORS.body, label: 'body', icon: '💪' },
    { key: 'mind', value: mind, color: CATEGORY_COLORS.mind, label: 'mind', icon: '🧠' },
    { key: 'finance', value: finance, color: CATEGORY_COLORS.finance, label: 'finance', icon: '💰' },
    { key: 'social', value: social, color: CATEGORY_COLORS.social, label: 'social', icon: '👥' },
  ];

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 4; // gap between segments in degrees
  const totalGap = gap * categories.length;
  const availableDegrees = 360 - totalGap;
  const segmentDegrees = availableDegrees / categories.length;

  // calculate overall coverage
  const avgCoverage = Math.round((mood + body + mind + finance + social) / 5);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          
          {/* category segments */}
          {categories.map((cat, i) => {
            const startAngle = i * (segmentDegrees + gap);
            const endAngle = startAngle + segmentDegrees;
            const largeArcFlag = segmentDegrees > 180 ? 1 : 0;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = size / 2 + radius * Math.cos(startRad);
            const y1 = size / 2 + radius * Math.sin(startRad);
            const x2 = size / 2 + radius * Math.cos(endRad);
            const y2 = size / 2 + radius * Math.sin(endRad);
            
            const dashArray = `${(cat.value / 100) * (circumference / categories.length - 2)} ${circumference}`;
            
            return (
              <g key={cat.key}>
                {/* segment track */}
                <path
                  d={`M ${size/2 + radius * Math.cos(startRad)} ${size/2 + radius * Math.sin(startRad)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${size/2 + radius * Math.cos(endRad)} ${size/2 + radius * Math.sin(endRad)}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
                {/* filled portion */}
                <path
                  d={`M ${size/2 + radius * Math.cos(startRad)} ${size/2 + radius * Math.sin(startRad)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${size/2 + radius * Math.cos(endRad)} ${size/2 + radius * Math.sin(endRad)}`}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${(cat.value / 100) * (circumference * segmentDegrees / 360)} 1000`}
                  className="transition-all duration-500"
                />
              </g>
            );
          })}
        </svg>
        
        {/* center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-medium text-white/80">{avgCoverage}%</span>
          <span className="text-[10px] text-white/40 lowercase">coverage</span>
        </div>
      </div>
      
      {/* legend */}
      <div className="grid grid-cols-5 gap-1 w-full">
        {categories.map(cat => (
          <div key={cat.key} className="flex flex-col items-center gap-1">
            <span className="text-xs">{cat.icon}</span>
            <div 
              className="w-full h-1 rounded-full"
              style={{ backgroundColor: cat.color, opacity: 0.3 + (cat.value / 100) * 0.7 }}
            />
            <span className="text-[9px] text-white/40 lowercase">{cat.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
