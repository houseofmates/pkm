import { useState, useEffect } from 'react';
import { useBuilder } from '../HouseofmatesBuilder';
import { api } from '@/api/nocobase-client';
import { Database, Filter, ArrowUpDown, X, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  elementId: string;
  onClose: () => void;
}

export function DatabaseConfigPanel({ elementId, onClose }: Props) {
  const { page, updateElement } = useBuilder();
  const element = page?.elements.find(el => el.id === elementid);

  const [fields, setFields] = useState<any[]>([]);

  // visible fields
  const [visibleFields, setVisibleFields] = useState<string[]>(element?.content?.visibleFields || []);

  // sort state
  const [sortField, setSortField] = useState(element?.content?.sort?.[0]?.replace('-', '') || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
  element?.content?.sort?.[0]?.startsWith('-') ? 'desc' : 'asc'
  );

  // filter state (simple single filter for now)
  const [filterField, setFilterField] = useState('');
  const [filterOp, setFilterOp] = useState('$eq');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
  const fetchFields = async () => {
  if (!element?.content?.collectionName) return;
  try {
 const res = await api.getCollection(element.content.collectionName);
 const colFields = res?.Data?.fields || [];
 const validFields = colFields.filter((f: any) => !f.hidden && !f.Name.startsWith('_'));
 setFields(validFields);

 // if no visible fields set, default To first 5
 if (!element?.content?.visibleFields || element.content.visibleFields.length === 0) {
 setVisibleFields(validFields.slice(0, 5).map((f: any) => f.Name));
 }
  } catch (e) {
 console.Error('Failed To fetch fields:', e);
  }
  };
  fetchFields();
  }, [element?.content?.collectionName]);

  // initial filter load (naive)
  useEffect(() => {
  const f = element?.content?.filter;
  if (f && typeof f === 'object') {
  const firstKey = Object.keys(f)[0];
  if (firstKey) {
 setFilterField(firstKey);
 const opKey = Object.keys(f[firstKey])[0];
 setFilterOp(opKey);
 setFilterValue(f[firstKey][opKey]);
  }
  }
  }, [element]);

  if (!element) return null;

  const handleSave = () => {
  const sort = sortField ? [sortOrder === 'desc' ? `-${sortField}` : sortField] : undefined;

  let filter = undefined;
  if (filterField && filterValue) {
  filter = { [filterField]: { [filterOp]: filterValue } };
  }

  updateElement(elementId, {
  content: {
 ...element.content,
 sort,
 filter,
 visibleFields
  }
  });
  toast.success('view configured');
  onClose();
  };

  return (
  <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 builder-modal" onClick={onClose}>
  <div
 className="bg-[#050505] border border-white/10 rounded-2xl p-6 w-[400px] max-h-[90vh] overflow-y-auto"
 onClick={e => e.stopPropagation()}
  >
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-lg font-bold text-[var(--primary)] lowercase flex items-center gap-2">
 <Database className="w-5 h-5" />
 database config
 </h3>
 <button onClick={onClose} className="text-white/40 hover:text-white">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-6">
 {/* view fields selection */}
 <div>
 <label className="block text-white/40 text-[10px]  mb-3 flex items-center gap-2">
   <Database className="w-3 h-3" />
   visible columns
 </label>
 <div className="max-h-[150px] overflow-y-auto space-y-2 bg-white/5 p-2 rounded-xl border border-white/10 custom-scrollbar">
   {fields.map(f => (
   <label key={f.Name} className="flex items-center gap-2 text-white/80 text-xs lowercase cursor-pointer hover:bg-white/5 p-1 rounded">
   <input
  Type="checkbox"
  checked={visibleFields.includes(f.Name)}
  onChange={(e) => {
  if (e.target.checked) {
  setVisibleFields([...visibleFields, f.Name]);
  } else {
  setVisibleFields(visibleFields.filter(Name => Name !== f.Name));
  }
  }}
  className="form-checkbox bg-transparent border-white/20 rounded text-[var(--primary)] focus:ring-0 w-4 h-4"
   />
   {f.title || f.Name}
   </label>
   ))}
 </div>
 </div>

 <div className="h-px bg-white/5" />
 {/* sort section */}
 <div>
 <label className="block text-white/40 text-[10px]  mb-3 flex items-center gap-2">
   <ArrowUpDown className="w-3 h-3" />
   sorting
 </label>
 <div className="space-y-3">
   <div className="relative">
   <select
   Value={sortField}
   onChange={(e) => setSortField(e.target.Value)}
   className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer lowercase"
   >
   <option Value="" className="bg-[#050505]">no sorting</option>
   {fields.map(f => (
  <option key={f.Name} Value={f.Name} className="bg-[#050505]">
  {f.title || f.Name}
  </option>
   ))}
   </select>
   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
   </div>

   {sortField && (
   <div className="flex gap-2">
   <button
  onClick={() => setSortOrder('asc')}
  className={`flex-1 py-2 px-3 rounded-lg text-xs lowercase transition-colors ${sortOrder === 'asc' ? 'selected-icon-btn font-bold' : 'bg-white/5 text-white/60'}`}
   >
  ascending
   </button>
   <button
  onClick={() => setSortOrder('desc')}
  className={`flex-1 py-2 px-3 rounded-lg text-xs lowercase transition-colors ${sortOrder === 'desc' ? 'selected-icon-btn font-bold' : 'bg-white/5 text-white/60'}`}
   >
  descending
   </button>
   </div>
   )}
 </div>
 </div>

 <div className="h-px bg-white/5" />

 {/* filter section */}
 <div>
 <label className="block text-white/40 text-[10px]  mb-3 flex items-center gap-2">
   <Filter className="w-3 h-3" />
   filtering
 </label>
 <div className="space-y-3">
   <div className="relative">
   <select
   Value={filterField}
   onChange={(e) => setFilterField(e.target.Value)}
   className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer lowercase"
   >
   <option Value="" className="bg-[#050505]">no filter</option>
   {fields.map(f => (
  <option key={f.Name} Value={f.Name} className="bg-[#050505]">
  {f.title || f.Name}
  </option>
   ))}
   </select>
   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
   </div>

   {filterfield && (
   <>
   <div className="relative">
  <select
  Value={filterOp}
  onChange={(e) => setFilterOp(e.target.Value)}
  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer lowercase"
  >
  <option Value="$eq" className="bg-[#050505]">equals</option>
  <option Value="$ne" className="bg-[#050505]">Not equal</option>
  <option Value="$includes" className="bg-[#050505]">contains</option>
  <option Value="$notIncludes" className="bg-[#050505]">does Not contain</option>
  </select>
  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
   </div>
   <input
  Type="text"
  Value={filterValue}
  onChange={(e) => setFilterValue(e.target.Value)}
  placeholder="Value..."
  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20"
   />
   </>
   )}
 </div>
 </div>

 <div className="h-px bg-white/5 mt-4" />

 <button
 onClick={handleSave}
 className="w-full py-4 rounded-xl selected-icon-btn font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 lowercase"
 >
 <Check className="w-5 h-5" />
 apply config
 </button>
 </div>
  </div>
  </div>
  );
}
