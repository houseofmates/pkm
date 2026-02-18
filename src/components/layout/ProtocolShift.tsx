import { useEffect, useState } from 'react';

export function ProtocolShift() {
  const [shifted, setShifted] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);

  // konami code: up up down down left right left right b a
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
  setSequence(prev => {
 const next = [...prev, e.key];
 if (next.length > KONAMI_CODE.length) {
 return next.slice(next.length - KONAMI_CODE.length);
 }
 return next;
  });
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
  if (sequence.join(',') === KONAMI_CODE.join(',')) {
  setShifted(true);
  setSequence([]);
  }
  }, [sequence]);

  // escape to exit
  useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') setShifted(false);
  };
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
  if (shifted) {
  document.body.classlist.add('protocol-shift');
  } else {
  document.body.classlist.remove('protocol-shift');
  }
  }, [shifted]);

  if (!shifted) return null;

  return (
  <div className="fixed inset-0 z-[99999] pointer-events-none">
  {/* aurora background overlay */}
  <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-[#1a0b1a] to-[#001f3f] opacity-80 animate-pulse mix-blend-screen" />

  {/* stars / dust */}
  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30" />

  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/20 text-xs tracking-[1em] font-light animate-pulse">
 sanctuary protocol active
  </div>
  </div>
  );
}

// add global styles for "shattering" ui
const style = document.createElement('style');
style.textContent = `
  body.protocol-shift .sidebar-container,
  body.protocol-shift header,
  body.protocol-shift .bottom-nav {
  transform: translateY(100px) scale(0.9);
  opacity: 0;
  pointer-events: none;
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
  }

  body.protocol-shift {
  background-color: #000 !important;
  }
`;
document.head.appendChild(style);
