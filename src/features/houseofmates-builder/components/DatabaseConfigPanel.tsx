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

  const [fields, setfields] = usestate<any[]>([]);

  // visible fields
  const [visiblefields, setvisiblefields] = usestate<string[]>(element?.content?.visiblefields || []);

  // sort state
  const [sortfield, setsortfield] = usestate(element?.content?.sort?.[0]?.replace('-', '') || '');
  const [sortorder, setsortorder] = usestate<'asc' | 'desc'>(
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
 const colFields = res?.data?.fields || [];
 const validFields = colFields.filter((f: any) => !f.hidden && !f.name.startsWith('_'));
 setFields(validFields);

 // if no visible fields set, default to first 5
 if (!element?.content?.visibleFields || element.content.visibleFields.length === 0) {
 setVisibleFields(validFields.slice(0, 5).map((f: any) => f.name));
 }
  } catch (e) {
 console.error('Failed to fetch fields:', e);
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
   <label key={f.name} className="flex items-center gap-2 text-white/80 text-xs lowercase cursor-pointer hover:bg-white/5 p-1 rounded">
   <input
  type="checkbox"
  checked={visibleFields.includes(f.name)}
  onChange={(e) => {
  if (e.target.checked) {
  setVisibleFields([...visibleFields, f.name]);
  } else {
  setVisibleFields(visibleFields.filter(name => name !== f.name));
  }
  }}
  className="form-checkbox bg-transparent border-white/20 rounded text-[var(--primary)] focus:ring-0 w-4 h-4"
   />
   {f.title || f.name}
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
   value={sortField}
   onChange={(e) => setSortField(e.target.value)}
   className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer lowercase"
   >
   <option value="" className="bg-[#050505]">no sorting</option>
   {fields.map(f => (
  <option key={f.name} value={f.name} className="bg-[#050505]">
  {f.title || f.name}
  </option>
   ))}
   </select>
   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
   </div>

   {sortfield && (
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
   value={filterField}
   onChange={(e) => setFilterField(e.target.value)}
   className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer lowercase"
   >
   <option value="" className="bg-[#050505]">no filter</option>
   {fields.map(f => (
  <option key={f.name} value={f.name} className="bg-[#050505]">
  {f.title || f.name}
  </option>
   ))}
   </select>
   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
   </div>

   {filterfield && (
   <>
   <div className="relative">
  <select
  value={filterOp}
  onChange={(e) => setFilterOp(e.target.value)}
  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer lowercase"
  >
  <option value="$eq" className="bg-[#050505]">equals</option>
  <option value="$ne" className="bg-[#050505]">not equal</option>
  <option value="$includes" className="bg-[#050505]">contains</option>
  <option value="$notIncludes" className="bg-[#050505]">does not contain</option>
  </select>
  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
   </div>
   <input
  type="text"
  value={filterValue}
  onChange={(e) => setFilterValue(e.target.value)}
  placeholder="value..."
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
