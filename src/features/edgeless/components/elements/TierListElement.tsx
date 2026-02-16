import { useDroppable } from '@dnd-kit/core';

export function TierListElement({ element }: { element: any }) {
  const rows = ['S', 'A', 'B', 'C', 'D'];

  // Color mapping
  const colors: Record<string, string> = {
  'S': '#ff7f7f',
  'A': '#ffbf7f',
  'B': '#ffff7f',
  'C': '#7fff7f',
  'D': '#7f7fff'
  };

  return (
  <div className="w-full h-full flex flex-col bg-[#111] border border-white/20 rounded-md overflow-hidden">
  {rows.map(row => (
 <div key={row} className="flex-1 flex border-b border-white/10 last:border-none min-h-[60px]">
 {/* Label */}
 <div
 className="w-16 flex items-center justify-center font-bold text-black border-r border-black/20"
 style={{ backgroundColor: colors[row] }}
 >
 {row}
 </div>

 {/* Drop Zone */}
 <div className="flex-1 bg-black/50 hover:bg-white/5 transition-colors relative">
 {/*
   In a full implementation, we would register a Droppable zone here for dnd-kit
   that accepts other Node Elements and snaps them.
   For now, it's a visual container that elements float over.
   The snapping logic would be in `handleDrop` or `onDragEnd`.
 */}
 </div>
 </div>
  ))}
  </div>
  );
}
