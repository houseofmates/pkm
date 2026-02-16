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

// Slug generator
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

  // Position the menu so it doesn't overflow the viewport
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
  const url = prompt('background image URL (or leave empty to clear):', '');
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
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log('[GlobalContextMenu] Uploading file:', file.name, file.type, file.size);
  toast.info('uploading background...');
  try {
 const uploaded = await api.upload(file);
 console.log('[GlobalContextMenu] Upload response:', uploaded);

 // Try multiple possible response structures
 const url = uploaded?.url || uploaded?.data?.url || uploaded?.data?.data?.url;
 console.log('[GlobalContextMenu] Extracted URL:', url);

 if (url) {
 const bgStyle = `url("${url}") center center / cover no-repeat fixed`;
 console.log('[GlobalContextMenu] Setting background to:', bgStyle);
 console.log('[GlobalContextMenu] Current page:', page);

 updatePage({ background: bgStyle });
 toast.success('background uploaded successfully');
 } else {
 console.error('[GlobalContextMenu] No URL found in upload response:', uploaded);
 throw new Error('no url in response - upload may have failed');
 }
  } catch (err) {
 console.error('[GlobalContextMenu] Upload error:', err);
 console.error('[GlobalContextMenu] Error details:', err.response || err.message);
 toast.error('failed to upload background: ' + (err.message || 'unknown error'));
  }
  onClose();
  };
  input.click();
  };

  const handleCreatePage = async () => {
  if (!newPageTitle.trim()) return;

  const slug = generateSlug(newPageTitle);
  setCreating(true);

  try {
  await api.createRecord(collectionNames.website, {
 title: newPageTitle.trim(),
 slug,
 site: site_identifier,
 is_home: false,
 theme_color: 'var(--primary)',
 background: page?.background || '#050505',
 elements: JSON.stringify([])
  });
  toast.success(`page "${slug}" created!`);
  // Navigate to new page
  window.location.href = `/${slug}`;
  } catch (e: any) {
  toast.error(`failed to create page: ${e.message}`);
  } finally {
  setCreating(false);
  setShowPageModal(false);
  onClose();
  }
  };

  const handleExpandPage = () => {
  const currentHeight = page?.height || window.innerHeight;
  const newHeight = currentHeight + 500;
  updatePage({ height: newHeight });
  toast.success(`page extended to ${newHeight}px`);
  onClose();
  };

  const addElementAtCursor = (type: string) => {
  const element = {
  type: type as any,
  x: x - 100,
  y: y - 50,
  width: type === 'text' ? 250 : type === 'button' ? 150 : 200,
  height: type === 'text' ? 60 : type === 'button' ? 50 : 200,
  content: getDefaultContent(type),
  styles: {
 backgroundColor: type === 'text' ? 'transparent' : '#0b0015',
 opacity: type === 'text' ? 1 : 0.5
  },
  zIndex: 10,
  };
  addElement(element);
  onClose();
  toast.success(`${type} added`);
  };

  const getDefaultContent = (type: string) => {
  switch (type) {
  case 'text': return { html: '<p>New text block</p>' };
  case 'button': return { text: 'Click me', bgColor: 'var(--primary)', textColor: '#000' };
  case 'image': return { url: '', alt: '' };
  case 'video': return { url: '', autoplay: false, loop: false, muted: true };
  case 'embed': return { url: '' };
  case 'shape': return { fill: '#ffffff' };
  default: return {};
  }
  };

  const handleDatabaseViewSelect = (collectionName: string, viewType: string) => {
  const element = {
  type: 'database_view' as const,
  x: x - 200,
  y: y - 150,
  width: 500,
  height: 350,
  content: { collectionName, viewType },
  styles: {},
  zIndex: 10,
  };
  addElement(element);
  setShowCollectionPicker(false);
  onClose();
  };

  // Color Picker Modal
  if (showColorPicker) {
  return (
  <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80" onClick={onClose}>
 <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-lg font-bold text-[var(--primary)] lowercase">background color</h3>
 <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
 </div>
 <input
 type="color"
 value={bgColor.startsWith('#') ? bgColor : '#050505'}
 onChange={(e) => setBgColor(e.target.value)}
 className="w-full h-16 rounded-xl cursor-pointer mb-4"
 />
 <input
 type="text"
 value={bgColor}
 onChange={(e) => setBgColor(e.target.value)}
 placeholder="#050505 or linear-gradient(...)"
 className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white mb-4"
 />
 <button
 onClick={handleBackgroundColorSave}
 className="w-full py-3 rounded-xl selected-icon-btn font-bold hover:scale-[1.02] transition-transform"
 >
 apply
 </button>
 </div>
  </div>
  );
  }

  // Page Creation Modal
  if (showPageModal) {
  const previewSlug = generateSlug(newPageTitle);
  return (
  <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80" onClick={onClose}>
 <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-lg font-bold text-[var(--primary)] lowercase">create new page</h3>
 <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
 </div>
 <label className="block text-white/60 text-sm mb-2 lowercase">page title</label>
 <input
 type="text"
 value={newPageTitle}
 onChange={(e) => setNewPageTitle(e.target.value)}
 placeholder="e.g. About Us"
 className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white mb-4"
 autoFocus
 />
 {newPageTitle && (
 <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
   <p className="text-xs text-white/40 lowercase mb-1">url preview</p>
   <p className="text-sm text-[var(--primary)] font-mono">
   {import.meta.env.VITE_DOMAIN || 'localhost'}/<span className="text-white">{previewSlug || 'page-slug'}</span>
   </p>
 </div>
 )}
 <button
 onClick={handleCreatePage}
 disabled={!newPageTitle.trim() || creating}
 className="w-full py-3 rounded-xl bg-[var(--primary)] text-black font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
 >
 {creating ? 'creating...' : 'create page'}
 </button>
 </div>
  </div>
  );
  }

  return (
  <>
  {/* Backdrop */}
  <div className="fixed inset-0 z-[19998]" onClick={onClose} />

  {/* Menu */}
  <div
 className="fixed z-[19999] bg-[#050505] border border-white/10 rounded-xl shadow-2xl py-2 min-w-[220px] animate-bounce-up builder-context-menu"
 style={menuStyle}
 onClick={(e) => e.stopPropagation()}
  >
 {/* Background Section */}
 <div className="px-3 py-1 text-[10px]  text-white/40">clipboard</div>

 <button
 onClick={() => {
 paste(x, y);
 onClose();
 }}
 disabled={clipboard.length === 0}
 className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase disabled:opacity-30 disabled:hover:bg-transparent"
 >
 <ClipboardPaste className="w-4 h-4" />
 paste elements {clipboard.length > 0 ? `(${clipboard.length})` : ''}
 </button>

 <div className="h-px bg-white/10 my-1" />

 <div className="px-3 py-1 text-[10px]  text-white/40">background</div>

 <div className="relative">
 <button
 onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
 className="w-full px-3 py-2 flex items-center justify-between text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <span className="flex items-center gap-3">
   <Image className="w-4 h-4" />
   edit background
 </span>
 <ChevronRight className={`w-4 h-4 transition-transform ${showBackgroundMenu ? 'rotate-90' : ''}`} />
 </button>

 {showBackgroundMenu && (
 <div className="pl-6 border-l border-white/10 ml-3 space-y-1 mt-1">
   <button
   onClick={() => setShowColorPicker(true)}
   className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase rounded-r-lg"
   >
   <Palette className="w-4 h-4" /> color
   </button>
   <button
   onClick={handleUploadBackground}
   className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase rounded-r-lg"
   >
   <Upload className="w-4 h-4" /> upload image
   </button>
   <button
   onClick={handleBackgroundImage}
   className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase rounded-r-lg"
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
 className="w-full px-3 py-2 flex items-center justify-between text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <span className="flex items-center gap-3">
   <Volume2 className="w-4 h-4" />
   page sounds
 </span>
 <span className={`text-[10px] px-1.5 py-0.5 rounded ${page?.enable_sounds ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-white/10 text-white/40'}`}>
   {page?.enable_sounds ? 'on' : 'off'}
 </span>
 </button>
 {page?.enable_sounds && (
 <div className="pl-10 space-y-1 pb-1">
   <button
   onClick={() => {
   const input = document.createElement('input');
   input.type = 'file';
   input.accept = 'audio/*';
   input.onchange = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  toast.info('uploading open sound...');
  try {
  const uploaded = await api.upload(file);
  const url = uploaded?.url || uploaded?.data?.url;
  if (url) {
  updatePage({ custom_pop_sound: url });
  toast.success('page open sound updated');
  }
  } catch (err) {
  console.error(err);
  toast.error('upload failed');
  }
  onClose();
   };
   input.click();
   }}
   className="w-full px-3 py-1.5 flex items-center gap-3 text-white/50 hover:bg-white/10 hover:text-white lowercase text-[10px] rounded-lg"
   >
   <Upload className="w-3 h-3" />
   {page?.custom_pop_sound ? 'change open mp3' : 'upload open mp3'}
   </button>
   <button
   onClick={() => {
   const input = document.createElement('input');
   input.type = 'file';
   input.accept = 'audio/*';
   input.onchange = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  toast.info('uploading close sound...');
  try {
  const uploaded = await api.upload(file);
  const url = uploaded?.url || uploaded?.data?.url;
  if (url) {
  updatePage({ custom_exit_sound: url });
  toast.success('page close sound updated');
  }
  } catch (err) {
  console.error(err);
  toast.error('upload failed');
  }
  onClose();
   };
   input.click();
   }}
   className="w-full px-3 py-1.5 flex items-center gap-3 text-white/50 hover:bg-white/10 hover:text-white lowercase text-[10px] rounded-lg"
   >
   <Upload className="w-3 h-3" />
   {page?.custom_exit_sound ? 'change close mp3' : 'upload close mp3'}
   </button>
 </div>
 )}
 </div>

 <div className="h-px bg-white/10 my-1" />

 {/* Pages Section */}
 <div className="px-3 py-1 text-[10px]  text-white/40">pages</div>

 <button
 onClick={() => setShowPageModal(true)}
 className="w-full px-3 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <FilePlus className="w-4 h-4" />
 create sub-page (inherits bg)
 </button>

 <button
 onClick={handleExpandPage}
 className="w-full px-3 py-2 flex items-center gap-3 text-[var(--primary)] hover:bg-white/10 transition-colors lowercase"
 >
 <Upload className="w-4 h-4 rotate-180" />
 add scrollable space (+500px)
 </button>

 <div className="h-px bg-white/10 my-1" />

 {/* Add Element Section */}
 <div className="px-3 py-1 text-[10px]  text-white/40">add element</div>

 <div className="relative">
 <button
 onClick={() => setShowAddMenu(!showAddMenu)}
 className="w-full px-3 py-2 flex items-center justify-between text-white/80 hover:bg-white/10 transition-colors lowercase"
 >
 <span className="flex items-center gap-3">
   <ChevronRight className={`w-4 h-4 transition-transform ${showAddMenu ? 'rotate-90' : ''}`} />
   insert at cursor
 </span>
 </button>

 {showAddMenu && (
 <div className="pl-6 border-l border-white/10 ml-3">
   <button onClick={() => addElementAtCursor('text')} className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase">
   <Type className="w-4 h-4" /> text
   </button>
   <button onClick={() => addElementAtCursor('button')} className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase">
   <MousePointerClick className="w-4 h-4" /> button
   </button>
   <button onClick={() => addElementAtCursor('image')} className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase">
   <Image className="w-4 h-4" /> image
   </button>
   <button onClick={() => addElementAtCursor('video')} className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase">
   <Play className="w-4 h-4" /> video
   </button>
   <button onClick={() => addElementAtCursor('embed')} className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase">
   <Code className="w-4 h-4" /> embed
   </button>
   <button onClick={() => addElementAtCursor('shape')} className="w-full px-3 py-2 flex items-center gap-3 text-white/60 hover:bg-white/10 hover:text-white lowercase">
   <Square className="w-4 h-4" /> shape
   </button>
   <button onClick={() => setShowCollectionPicker(true)} className="w-full px-3 py-2 flex items-center gap-3 text-[var(--primary)] hover:bg-white/10 lowercase">
   <Database className="w-4 h-4" /> database view
   </button>
 </div>
 )}
 </div>




  </div>

  {/* Collection Picker Modal */}
  {showCollectionPicker && (
 <CollectionPickerModal
 onSelect={handleDatabaseViewSelect}
 onClose={() => setShowCollectionPicker(false)}
 />
  )}
  </>
  );
}
