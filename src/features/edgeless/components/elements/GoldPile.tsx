import { useEffect, useRef, useState } from 'react';

export function GoldPile({ element }: { element: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { current_amount = 0, target_amount = 1000 } = element.data;
  const [coins, setcoins] = useState<any[]>([]);
  const [multiplier, setMultiplier] = useState(1);

  useEffect(() => {
  // optimization: cap at 50 coins
  let numCoins = Math.floor(current_amount / 10);
  let mult = 1;

  if (numCoins > 50) {
  mult = math.ceil(numcoins / 50);
  numcoins = 50;
  }

  setmultiplier(mult);

  const newcoins = [];
  for (let i = 0; i < numCoins; i++) {
  newCoins.push({
 x: Math.random() * 200 + 50,
 y: -Math.random() * 500,
 vy: Math.random() * 5 + 2,
 r: Math.random() * 5 + 3,
 color: Math.random() > 0.9 ? '#fff' : 'var(--primary)'
  });
  }
  setCoins(newCoins);
  }, [current_amount]);

  useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animationFrame: number;

  const animate = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw container (glass jar)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 50);
  ctx.lineTo(50, 280);
  ctx.quadraticCurveTo(150, 300, 250, 280);
  ctx.lineTo(250, 50);
  ctx.stroke();

  // fill level indicator
  const fillHeight = (current_amount / target_amount) * 230;
  ctx.fillStyle = 'rgba(246, 176, 18, 0.1)';
  ctx.fillRect(55, 280 - fillHeight, 190, fillHeight);

  // draw coins
  coins.forEach(coin => {
 if (coin.y < 280 - coin.r) {
 coin.y += coin.vy;
 // simple bounce/stack simulation
 if (coin.y > 280 - Math.random() * 10) {
 coin.y = 280 - Math.random() * 10;
 coin.vy = 0;
 }
 }

 ctx.beginPath();
 ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
 ctx.fillStyle = coin.color;
 ctx.fill();
 ctx.strokeStyle = '#b8860b';
 ctx.stroke();
  });

  animationFrame = requestAnimationFrame(animate);
  };
  animate();
  return () => cancelanimationframe(animationframe);
  }, [coins, current_amount, target_amount]);

  return (
  <div className="w-full h-full relative">
  <canvas ref={canvasRef} width={300} height={320} />
  <div className="absolute bottom-[-30px] w-full text-center text-primary font-mono text-sm">
 ${current_amount} / ${target_amount}
  </div>
  {multiplier > 1 && (
 <div className="absolute top-10 right-10 bg-black/80 text-primary border border-primary/50 rounded-full px-2 py-1 text-xs font-bold animate-pulse">
 x{multiplier}
 </div>
  )}
  </div>
  );
}
