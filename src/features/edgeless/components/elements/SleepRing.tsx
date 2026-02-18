
export function SleepRing({ element }: { element: any }) {
  const { start = "23:00", end = "07:00" } = element.data;

  // convert time string to angle
  const timeToAngle = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return ((h + m / 60) / 24) * 360; // 0-360 degrees
  };

  // calculate arc path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle - 90);
  const end = polarToCartesian(x, y, radius, startAngle - 90);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
  "M", start.x, start.y,
  "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees) * Math.PI / 180.0;
  return {
  x: centerX + (radius * Math.cos(angleInRadians)),
  y: centerY + (radius * Math.sin(angleInRadians))
  };
  };

  const sAngle = timeToAngle(start);
  const eAngle = timeToAngle(end);
  // handle crossing midnight
  const adjustedEnd = eAngle < sAngle ? eAngle + 360 : eAngle;

  return (
  <div className="w-full h-full relative flex items-center justify-center select-none bg-black/60 rounded-full border border-white/10 backdrop-blur-md">
  <svg viewBox="0 0 100 100" className="w-full h-full p-2">
 {/* background ring */}
 <circle cx="50" cy="50" r="40" stroke="#333" strokeWidth="10" fill="none" />

 {/* current sleep arc (dream wheel) */}
 <path
 d={describeArc(50, 50, 40, sAngle, adjustedEnd)}
 stroke="var(--primary)"
 strokeWidth="10"
 fill="none"
 strokeLinecap="round"
 className="filter drop-shadow-[0_0_5px_var(--primary)]"
 />

 {/* history overlays (faint) */}
 {[...Array(3)].map((_, i) => (
 <circle
 key={i}
 cx="50" cy="50" r={35 - i * 5}
 stroke="rgba(255,255,255,0.1)"
 strokeWidth="2"
 fill="none"
 strokeDasharray="20 60"
 className="animate-[spin_10s_linear_infinite]"
 style={{ animationDuration: `${10 + i * 5}s` }}
 />
 ))}

 {/* center text */}
 <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">SLEEP</text>
 <text x="50" y="60" textAnchor="middle" fill="var(--primary)" fontSize="12" fontWeight="bold">8h 20m</text>
  </svg>

  {/* paint handles (visual only for now) */}
  <div className="absolute inset-0 pointer-events-none">
 {/* would implement drag handles here for actual editing */}
  </div>
  </div>
  );
}
