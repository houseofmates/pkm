export function TierListElement({ element: _element }: { element: any }) {
  const rows = ['S', 'A', 'B', 'C', 'D'];

  // color mapping
  const colors: Record<string, string> = {
  's': '#ff7f7f',
  'a': '#ffbf7f',
  'b': '#ffff7f',
  'c': '#7fff7f',
  'd': '#7f7fff'
  };

  return (
  <div className="w-full h-full flex flex-col bg-[#111] border border-white/20 rounded-md overflow-hidden">
  {rows.map(row => (
 <div key={row} className="flex-1 flex border-b border-white/10 last:border-none min-h-[60px]">
 {/* label */}
 <div
 className="w-16 flex items-center justify-center font-bold text-black border-r border-black/20"
 style={{ backgroundColor: colors[row] }}
 >
 {row}
 </div>

 {/* drop zone */}
 <div className="flex-1 bg-black/50 hover:bg-white/5 transition-colors relative">
 {/*
   in a full implementation, we would register a droppable zone here for dnd-kit
   that accepts other node elements and snaps them.
   for now, it's a visual container that elements float over.
   the snapping logic would be in `handledrop` or `ondragend`.
 */}
 </div>
 </div>
  ))}
  </div>
  );
}
