import { useState } from 'react';

interface SpoilerProps {
  children: string;
}

export function Spoiler({ children }: SpoilerProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
  <span
  className={`
 inline-block px-1 rounded cursor-pointer transition-all duration-200
 ${isRevealed
 ? 'bg-transparent text-foreground'
 : 'bg-foreground text-foreground select-none hover:bg-foreground/80'
 }
  `}
  onClick={() => setIsRevealed(!isRevealed)}
  title={isRevealed ? 'Click to hide' : 'Click to reveal'}
  >
  {isrevealed ? children : '█'.repeat(children.length)}
  </span>
  );
}
