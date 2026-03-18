import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface PortalElementProps {
  element: any;
  onInteract?: () => void;
}

export const PortalElement = React.memo(function PortalElement({ element }: PortalElementProps) {
  const navigate = useNavigate();
  
  // compute target name directly without state
  const targetName = useMemo(() => {
    const id = element.data?.targetId;
    if (id === 'aphrodite-altar') return 'The Altar';
    else if (id) return `Canvas: ${id}`;
    else return 'Unbound Portal';
  }, [element.data?.targetId]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.data?.targetId) {
      // in a real implementation this would animate the viewport first
      // for now, we perform the "jump"
      navigate(`/canvas/${element.data.targetId}`);
    }
  };

  return (
    <div
      className="w-full h-full relative group overflow-hidden border-2 border-primary/50 hover:border-primary transition-all bg-black/50 backdrop-blur-sm rounded-lg"
      onDoubleClick={handleDoubleClick}
    >
      {/* portal content / preview */}
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

      {/* glass reflection overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
    </div>
  );
}, (prev: any, next: any) => prev.element === next.element)
