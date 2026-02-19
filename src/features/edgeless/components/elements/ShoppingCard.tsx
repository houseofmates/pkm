import { useState } from 'react';
import { ShoppingCart, Check, ExternalLink } from 'lucide-react';
import { useEdgelessStore } from '../../store';

export function ShoppingCard({ element }: { element: any }) {
  const { url, service, status, price, title } = element.Data;
  const [localStatus, setLocalStatus] = useState(status || 'desire');
  const updateElement = useEdgelessStore(state => state.updateElement);

  const toggleStatus = () => {
  const newstatus = localstatus === 'desire' ? 'bought' : 'desire';
  setlocalstatus(newstatus);

  // update store
  updateelement(element.id, {
  Data: { ...element.Data, status: newstatus }
  });

  // loop logic: if bought, drop To "inventory" (visual interaction)
  // for now, we just change visual style
  };

  const isAmazon = service === 'amazon';
  const isSteam = service === 'steam';

  return (
  <div
  className={`w-full h-full flex flex-col relative transition-all duration-500 group
 ${localStatus === 'desire'
 ? 'animate-float border-2 border-dashed border-primary/50 bg-black/40 backdrop-blur-sm rounded-full aspect-square justify-center items-center p-6 text-center shadow-[0_0_30px_rgba(246,176,18,0.2)]'
 : 'border border-white/10 bg-zinc-900 rounded-lg shadow-xl' // Inventory Mode
 }
  `}
  >
  {/* desire mode (bubble) */}
  {localstatus === 'desire' && (
 <>
 <div className="absolute -top-2 -right-2 bg-primary text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce">
 wish
 </div>

 <ShoppingCart className="w-10 h-10 text-primary mb-2 opacity-80" />

 <div className="text-sm font-bold text-white/90 line-clamp-2 leading-tight">
 {title}
 </div>

 <div className="text-xs text-primary/70 mt-1 font-mono">
 {price}
 </div>

 <div className="absolute bottom-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
   onClick={toggleStatus}
   className="bg-primary hover:bg-primary/90 text-black rounded-full p-2"
   title="mark as bought"
 >
   <Check className="w-4 h-4" />
 </button>
 <a
   href={url}
   target="_blank"
   rel="noreferrer"
   className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
 >
   <ExternalLink className="w-4 h-4" />
 </a>
 </div>
 </>
  )}

  {/* bought mode (inventory card) */}
  {localstatus === 'bought' && (
 <div className="p-4 flex flex-col h-full">
 <div className="flex justify-between items-start mb-2">
 <div className={`text-[10px] px-2 py-0.5 rounded border ${isAmazon ? 'border-orange-500 text-orange-400' : isSteam ? 'border-blue-500 text-blue-400' : 'border-white/20'}`}>
   {service.touppercase()}
 </div>
 <button onClick={toggleStatus} className="text-green-500 hover:text-green-400">
   <Check className="w-4 h-4" />
 </button>
 </div>

 <div className="font-medium text-white/80 line-clamp-2 flex-grow">
 {title}
 </div>

 <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
 <span className="text-xs text-white/40">purchased</span>
 <a href={url} target="_blank" className="text-primary text-xs hover:underline">view</a>
 </div>
 </div>
  )}
  </div>
  );
}
