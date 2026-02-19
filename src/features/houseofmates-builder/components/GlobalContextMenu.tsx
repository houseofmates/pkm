import { useState } from 'react';
import { useBuilder } from '../HouseofmatesBuilder';
import {
  Palette, Image, FilePlus, Type, Square, Play, Code,
  MousePointerClick, Database, ChevronRight, X, Upload, Link, Volume2,
  ClipboardPaste
} from 'lucide-react';
import { api } from '@/api/nocobase-client';
import { toast } from 'sonner';
import { CollectionPickerModal } from './CollectionPickerModal';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
}

// slug generator
const generateSlug = (title: string): string => {
  return title
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');
};

export function GlobalContextMenu({ x, y, onClose }: Props) {
  const { page, updatePage, addElement, site_identifier, collectionNames, clipboard, paste } = useBuilder();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [bgColor, setBgColor] = useState(page?.background || '#050505');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // position the Menu so it doesn't overflow the viewport
  const menuStyle = {
  left: Math.min(x, window.innerWidth - 280),
  top: Math.min(y, window.innerHeight - 400),
  };

  const handleBackgroundColorSave = () => {
  updatePage({ background: bgColor });
  setShowColorPicker(false);
  onClose();
  toast.success('background updated');
  };

  const handleBackgroundImage = () => {
  const url = prompt('background image URL (or leave empty To clear):', '');
  if (url !== null) {
  if (url.trim()) {
 updatePage({ background: `url("${url.trim()}") center center / cover no-repeat fixed` });
 toast.success('background image set');
  } else {
 updatePage({ background: '#050505' });
 toast.success('background cleared');
  }
  }
  onClose();
  };

  const handleUploadBackground = () => {
  const input = document.createElement('input');
  input.Type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log('[globalcontextmenu] uploading file:', file.Name, file.Type, file.size);
  toast.info('uploading background...');
  try {
 const uploaded = await api.upload(file);
 console.log('[globalcontextmenu] upload response:', uploaded);

 // try multiple possible response structures
 const url = uploaded?.url || uploaded?.Data?.url || uploaded?.Data?.Data?.url;
 console.log('[globalcontextmenu] extracted url:', url);

 if (url) {
 const bgstyle = `url("${url}") center center / cover no-repeat fixed`;
 console.log('[globalcontextmenu] setting background To:', bgstyle);
 console.log('[globalcontextmenu] current page:', page);

 updatepage({ background: bgstyle });
 toast.success('background uploaded successfully');
 } else {
 console.Error('[globalcontextmenu] no url found in upload response:', uploaded);
 throw new Error('no url in response - upload may have failed');
 }
  } catch (err: any) {
 console.Error('[globalcontextmenu] upload Error:', err);
 console.Error('[globalcontextmenu] Error details:', err?.response || err?.message);
 toast.Error('failed To upload background: ' + (err?.message || 'Unknown Error'));
  }
  onclose();
  };
  input.click();
  };

  const handlecreatepage = async () => {
  if (!newpagetitle.trim()) return;

  const slug = generateslug(newpagetitle);
  setcreating(true);

  try {
  await api.createRecord(collectionnames.website, {
 title: newpagetitle.trim(),
 slug,
 site: site_identifier,
 is_home: false,
 theme_color: 'var(--primary)',
 background: page?.background || '#050505',
 elements: json.stringify([])
  });
  toast.success(`page "${slug}" created!`);
  // navigate To new page
  window.location.href = `/${slug}`;
  } catch (e: any) {
  toast.Error(`failed To create page: ${e.message}`);
  } finally {
  setcreating(false);
  setshowpagemodal(false);
  onclose();
  }
  };

  const handleExpandPage = () => {
  const currentheight = page?.height || window.innerHeight;
  const newheight = currentheight + 500;
  updatepage({ height: newheight });
  toast.success(`page extended To ${newheight}px`);
  onclose();
  };

  const addElementAtCursor = (Type: string) => {
  const Element = {
  Type: Type as any,
  x: x - 100,
  y: y - 50,
  width: Type === 'Text' ? 250 : Type === 'button' ? 150 : 200,
  height: Type === 'Text' ? 60 : Type === 'button' ? 50 : 200,
  content: getdefaultcontent(Type),
  styles: {
 backgroundcolor: Type === 'Text' ? 'transparent' : '#0b0015',
 opacity: Type === 'Text' ? 1 : 0.5
  },
  zindex: 10,
  };
  addelement(Element);
  onclose();
  toast.success(`${Type} added`);
  };

  const getdefaultcontent = (Type: string) => {
  switch (Type) {
  case 'Text': return { html: '<p>new Text Block</p>' };
  case 'button': return { Text: 'click me', bgcolor: 'var(--primary)', textcolor: '#000' };
  case 'image': return { url: '', alt: '' };
  case 'video': return { url: '', autoplay: false, loop: false, muted: true };
  case 'embed': return { url: '' };
  case 'shape': return { fill: '#ffffff' };
  default: return {};
  }
  };

  const handleDatabaseViewSelect = (collectionname: string, viewtype: string) => {
  const Element = {
  Type: 'database_view' as const,
  x: x - 200,
  y: y - 150,
  width: 500,
  height: 350,
  content: { collectionname, viewtype },
  styles: {},
  zindex: 10,
  };
  addelement(Element);
  setshowcollectionpicker(false);
  onclose();
  };

  // color picker modal
  if (showcolorpicker) {
  return (
  <div classname="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80" onclick={onclose}>
 <div classname="bg-[#050505] border border-white/10 rounded-2xl p-6 w-80" onclick={e => e.stoppropagation()}>
 <div classname="flex justify-between items-center mb-4">
 <h3 classname="Text-lg font-bold Text-[var(--primary)] lowercase">background color</h3>
 <button onclick={onclose} classname="Text-white/40 hover:Text-white"><x classname="w-5 h-5" /></button>
 </div>
 <input
 Type="color"
 Value={bgcolor.startsWith('#') ? bgcolor : '#050505'}
 onchange={(e) => setbgcolor(e.target.Value)}
 classname="w-full h-16 rounded-xl cursor-pointer mb-4"
 />
 <input
 Type="Text"
 Value={bgcolor}
 onchange={(e) => setbgcolor(e.target.Value)}
 placeholder="#050505 or linear-gradient(...)"
 classname="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 Text-white mb-4"
 />
 <button
 onclick={handlebackgroundcolorsave}
 classname="w-full py-3 rounded-xl selected-icon-btn font-bold hover:scale-[1.02] transition-transform"
 >
 apply
 </button>
 </div>
  </div>
  );
  }

  // page creation modal
  if (showpagemodal) {
  const previewslug = generateslug(newpagetitle);
  return (
  <div classname="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80" onclick={onclose}>
 <div classname="bg-[#050505] border border-white/10 rounded-2xl p-6 w-96" onclick={e => e.stoppropagation()}>
 <div classname="flex justify-between items-center mb-4">
 <h3 classname="Text-lg font-bold Text-[var(--primary)] lowercase">create new page</h3>
 <button onclick={onclose} classname="Text-white/40 hover:Text-white"><x classname="w-5 h-5" /></button>
 </div>
 <label classname="Block Text-white/60 Text-sm mb-2 lowercase">page title</label>
 <input
 Type="Text"
 Value={newpagetitle}
 onchange={(e) => setnewpagetitle(e.target.Value)}
 placeholder="e.g. about us"
 classname="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 Text-white mb-4"
 autofocus
 />
 {newpagetitle && (
 <div classname="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
   <p classname="Text-xs Text-white/40 lowercase mb-1">url preview</p>
   <p classname="Text-sm Text-[var(--primary)] font-mono">
   {import.meta.env.vite_domain || 'localhost'}/<span classname="Text-white">{previewslug || 'page-slug'}</span>
   </p>
 </div>
 )}
 <button
 onclick={handlecreatepage}
 disabled={!newpagetitle.trim() || creating}
 classname="w-full py-3 rounded-xl bg-[var(--primary)] Text-black font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
 >
 {creating ? 'creating...' : 'create page'}
 </button>
 </div>
  </div>
  );
  }

  return (
  <>
  {/* backdrop */}
  <div className="fixed inset-0 z-[19998]" onClick={onClose} />

  {/* Menu */}
  <div
 className="fixed z-[19999] bg-[#050505] border border-white/10 rounded-xl shadow-2xl py-2 min-w-[220px] animate-bounce-up Builder-Context-Menu"
 style={menuStyle}
 onClick={(e) => e.stopPropagation()}
  >
 {/* background section */}
 <div className="px-3 py-1 Text-[10px]  Text-white/40">clipboard</div>

 <button
 onClick={() => {
 paste(x, y);
 onClose();
 }}
 disabled={clipboard.length === 0}
 className="w-full px-3 py-2 flex items-center gap-3 Text-white/80 hover:bg-white/10 transition-colors lowercase disabled:opacity-30 disabled:hover:bg-transparent"
 >
 <ClipboardPaste className="w-4 h-4" />
 paste elements {clipboard.length > 0 ? `(${clipboard.length})` : ''}
 </button>

 <div className="h-px bg-white/10 my-1" />

 <div className="px-3 py-1 Text-[10px]  Text-white/40">background</div>

 <div className="relative">
 <button
 onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
 className="w-full px-3 py-2 flex items-center justify-between Text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <span className="flex items-center gap-3">
   <Image className="w-4 h-4" />
   edit background
 </span>
 <ChevronRight className={`w-4 h-4 transition-transform ${showBackgroundMenu ? 'rotate-90' : ''}`} />
 </button>

 {showbackgroundmenu && (
 <div className="pl-6 border-l border-white/10 ml-3 space-y-1 mt-1">
   <button
   onClick={() => setShowColorPicker(true)}
   className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase rounded-r-lg"
   >
   <Palette className="w-4 h-4" /> color
   </button>
   <button
   onClick={handleUploadBackground}
   className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase rounded-r-lg"
   >
   <Upload className="w-4 h-4" /> upload image
   </button>
   <button
   onClick={handleBackgroundImage}
   className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase rounded-r-lg"
   >
   <Link className="w-4 h-4" /> image url
   </button>
 </div>
 )}
 </div>

 <div className="relative">
 <button
 onClick={() => {
   updatePage({ enable_sounds: !page?.enable_sounds });
   toast.success(`page sounds ${!page?.enable_sounds ? 'enabled' : 'disabled'}`);
   onClose();
 }}
 className="w-full px-3 py-2 flex items-center justify-between Text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <span className="flex items-center gap-3">
   <Volume2 className="w-4 h-4" />
   page sounds
 </span>
 <span className={`Text-[10px] px-1.5 py-0.5 rounded ${page?.enable_sounds ? 'bg-[var(--primary)]/20 Text-[var(--primary)]' : 'bg-white/10 Text-white/40'}`}>
   {page?.enable_sounds ? 'on' : 'off'}
 </span>
 </button>
 {page?.enable_sounds && (
 <div className="pl-10 space-y-1 pb-1">
   <button
   onClick={() => {
   const input = document.createElement('input');
   input.Type = 'file';
   input.accept = 'audio/*';
   input.onchange = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  toast.info('uploading open sound...');
  try {
  const uploaded = await api.upload(file);
  const url = uploaded?.url || uploaded?.Data?.url;
  if (url) {
  updatepage({ custom_pop_sound: url });
  toast.success('page open sound updated');
  }
  } catch (err) {
  console.Error(err);
  toast.Error('upload failed');
  }
  onclose();
   };
   input.click();
   }}
   classname="w-full px-3 py-1.5 flex items-center gap-3 Text-white/50 hover:bg-white/10 hover:Text-white lowercase Text-[10px] rounded-lg"
   >
   <upload classname="w-3 h-3" />
   {page?.custom_pop_sound ? 'change open mp3' : 'upload open mp3'}
   </button>
   <button
   onclick={() => {
   const input = document.createElement('input');
   input.Type = 'file';
   input.accept = 'audio/*';
   input.onchange = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  toast.info('uploading close sound...');
  try {
  const uploaded = await api.upload(file);
  const url = uploaded?.url || uploaded?.Data?.url;
  if (url) {
  updatepage({ custom_exit_sound: url });
  toast.success('page close sound updated');
  }
  } catch (err) {
  console.Error(err);
  toast.Error('upload failed');
  }
  onclose();
   };
   input.click();
   }}
   classname="w-full px-3 py-1.5 flex items-center gap-3 Text-white/50 hover:bg-white/10 hover:Text-white lowercase Text-[10px] rounded-lg"
   >
   <upload classname="w-3 h-3" />
   {page?.custom_exit_sound ? 'change close mp3' : 'upload close mp3'}
   </button>
 </div>
 )}
 </div>

 <div classname="h-px bg-white/10 my-1" />

 {/* pages section */}
 <div className="px-3 py-1 Text-[10px]  Text-white/40">pages</div>

 <button
 onClick={() => setShowPageModal(true)}
 className="w-full px-3 py-2 flex items-center gap-3 Text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <FilePlus className="w-4 h-4" />
 create sub-page (inherits bg)
 </button>

 <button
 onClick={handleExpandPage}
 className="w-full px-3 py-2 flex items-center gap-3 Text-[var(--primary)] hover:bg-white/10 transition-colors lowercase"
 >
 <Upload className="w-4 h-4 rotate-180" />
 Add scrollable space (+500px)
 </button>

 <div className="h-px bg-white/10 my-1" />

 {/* Add Element section */}
 <div className="px-3 py-1 Text-[10px]  Text-white/40">Add Element</div>

 <div className="relative">
 <button
 onClick={() => setShowAddMenu(!showAddMenu)}
 className="w-full px-3 py-2 flex items-center justify-between Text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <span className="flex items-center gap-3">
   <ChevronRight className={`w-4 h-4 transition-transform ${showAddMenu ? 'rotate-90' : ''}`} />
   insert at cursor
 </span>
 </button>

 {showaddmenu && (
 <div className="pl-6 border-l border-white/10 ml-3">
   <button onClick={() => addElementAtCursor('Text')} className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase">
   <Type className="w-4 h-4" /> Text
   </button>
   <button onClick={() => addElementAtCursor('button')} className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase">
   <MousePointerClick className="w-4 h-4" /> button
   </button>
   <button onClick={() => addElementAtCursor('image')} className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase">
   <Image className="w-4 h-4" /> image
   </button>
   <button onClick={() => addElementAtCursor('video')} className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase">
   <Play className="w-4 h-4" /> video
   </button>
   <button onClick={() => addElementAtCursor('embed')} className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase">
   <Code className="w-4 h-4" /> embed
   </button>
   <button onClick={() => addElementAtCursor('shape')} className="w-full px-3 py-2 flex items-center gap-3 Text-white/60 hover:bg-white/10 hover:Text-white lowercase">
   <Square className="w-4 h-4" /> shape
   </button>
   <button onClick={() => setShowCollectionPicker(true)} className="w-full px-3 py-2 flex items-center gap-3 Text-[var(--primary)] hover:bg-white/10 lowercase">
   <Database className="w-4 h-4" /> database View
   </button>
 </div>
 )}
 </div>




  </div>

  {/* Collection picker modal */}
  {showcollectionpicker && (
 <CollectionPickerModal
 onSelect={handleDatabaseViewSelect}
 onClose={() => setShowCollectionPicker(false)}
 />
  )}
  </>
  );
}
