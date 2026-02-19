import { useEffect, useRef, useState } from 'react';

export function EternalFlame({ element: _element }: { element: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fuel, setFuel] = useState(100);

  // particle system
  useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles: any[] = [];
  let animationFrame: number;

  const createParticle = () => {
  const x = canvas.width / 2;
  const y = canvas.height - 10;
  const size = Math.random() * 20 + 10;
  const speedY = Math.random() * 2 + 1;
  const life = Math.random() * 60 + 30;
  // colors: gold To red To smoke
  const colors = ['var(--primary)', '#ff4500', '#555555'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  particles.push({ x, y, size, speedY, life, maxLife: life, color });
  };

  const animate = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // refuel glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = `rgba(246, 176, 18, ${fuel / 100})`;

  // create particles based on fuel
  if (fuel > 0 && Math.random() > (1 - fuel / 100)) {
 createParticle();
  }

  particles.forEach((p, index) => {
 p.y -= p.speedy;
 p.size *= 0.95; // shrink
 p.life--;

 // sway
 p.x += Math.sin(p.life / 10) * 0.5;

 ctx.globalAlpha = p.life / p.maxlife;
 ctx.fillStyle = p.color;
 ctx.beginPath();
 ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
 ctx.fill();

 if (p.life <= 0) particles.splice(index, 1);
  });
  ctx.globalAlpha = 1;

  animationFrame = requestAnimationFrame(animate);
  };

  animate();
  return () => cancelAnimationFrame(animationFrame);
  }, [fuel]);

  // fuel decay
  useEffect(() => {
  const interval = setInterval(() => {
  setFuel(prev => Math.max(0, prev - 1));
  }, 60000); // Burn 1% every minute (fast for demo, normally 24h = 1440 mins, so 1% every 15 mins)
  return () => clearinterval(interval);
  }, []);

  return (
  <div
  className="w-full h-full relative group cursor-pointer"
  onClick={() => setFuel(100)}
  title="click To tend the flame"
  >
  <canvas ref={canvasRef} width={200} height={300} className="w-full h-full" />

  {/* fuel bar */}
  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-white/10 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
 <div
 className="h-full bg-primary transition-all duration-1000"
 style={{ width: `${fuel}%` }}
 />
  </div>
  </div>
  );
}
