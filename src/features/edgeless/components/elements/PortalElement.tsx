import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PortalElementProps {
  element: any;
  onInteract?: () => void;
}

export function PortalElement({ element }: PortalElementProps) {
  const navigate = useNavigate();
  const [targetName, setTargetName] = useState('Loading Portal...');

  // Mock fetching target name - in real app, fetch from collection/NocoBase
  useEffect(() => {
  const id = element.data?.targetId;
  if (id === 'aphrodite-altar') setTargetName('The Altar');
  else if (id) setTargetName(`Canvas: ${id}`);
  else setTargetName('Unbound Portal');
  }, [element.data?.targetId]);

  const handleDoubleClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (element.data?.targetId) {
  // In a real implementation this would animate the viewport first
  // For now, we perform the "Jump"
  navigate(`/canvas/${element.data.targetId}`);
  }
  };

  return (
  <div
  className="w-full h-full relative group overflow-hidden border-2 border-primary/50 hover:border-primary transition-all bg-black/50 backdrop-blur-sm rounded-lg"
  onDoubleClick={handleDoubleClick}
  >
  {/* Portal Content / Preview */}
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
 <div className="text-center group-hover:scale-110 transition-transform duration-500">
 <div className="text-4xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
 🌀
 </div>
 <div className="text-xs  text-primary font-bold">
 {targetName}
 </div>
 </div>
  </div>

  {/* Glass Reflection Overlay */}
  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
  </div>
  );
}
