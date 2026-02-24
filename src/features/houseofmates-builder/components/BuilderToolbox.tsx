import { useState } from 'react';
import { useBuilder, type ElementData } from '../HouseofmatesBuilder';
import {
  Type, Image, Square, Play, Code, MousePointerClick,
  Search, X, FileText, Users, Gamepad2, Star, Layout,
  HelpCircle, Clock, Link2, Grid, Quote, MessageCircle,
  Server, Shield, Zap, ChevronLeft, Upload,
  BarChart, ListOrdered, ShoppingBag, StickyNote, Flame, Coins, Moon, Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/nocobase-client';

import { FormBuilder } from './FormRenderer';

// unsplash & giphy keys will be stored in localstorage under 'unsplash_key' and 'giphy_key'

type TabType = 'basic' | 'home' | 'website' | 'minecraft' | 'media' | 'integrations' | 'embeds';

export function BuilderToolbox() {
  const { addElement, page } = useBuilder();
  const { previewMode, setPreviewMode } = useBuilder();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [mediaMode, setMediaMode] = useState<'list' | 'image' | 'video'>('list');
  const [showFormBuilder, setShowFormBuilder] = useState(false);

  const createDefaultElement = (type: ElementData['type'], content: any = {}): Omit<ElementData, 'id'> => ({
  type,
  x: 100 + Math.random() * 200,
  y: 100 + Math.random() * 200,
  width: type === 'text' ? 300 : 200,
  height: type === 'text' ? 100 : 200,
  content,
  styles: {},
  zIndex: page?.elements.length || 0,
  });

  // generic handler for new widgets
  const handleAddElement = (type: ElementData['type'], content: any = {}) => {
  addElement(createDefaultElement(type, content));
  setIsOpen(false);
  };

  // --- basic elements ---
  const handleAddText = () => {
  addElement(createDefaultElement('text', {
    html: '<p style="color: white; font-size: 18px;">new text block</p>',
  }));
  setIsOpen(false);
  };

  const handleAddSlickButton = () => {
  addElement({
  ...createDefaultElement('slick_button', {
 text: 'click here',
 icon: 'ShoppingCart',
 bgColor: 'var(--primary)',
 textColor: '#000',
  }),
  width: 300,
  height: 80,
  });
  setIsOpen(false);
  };

  const handleAddShape = () => {
  addElement(createDefaultElement('shape', { fill: '#ffffff33' }));
  setIsOpen(false);
  };

  const handleAddContainer = () => {
  addElement({
  ...createDefaultElement('container', {}),
  width: 400,
  height: 300,
  styles: { backgroundColor: '#ffffff10', borderRadius: 12 },
  });
  setIsOpen(false);
  };

  // --- website elements ---
  const handleAddHero = () => {
  addElement({
  ...createDefaultElement('hero', {
 title: 'welcome to our site',
 subtitle: 'the best experience awaits',
 ctaText: 'get started',
 ctaLink: '#',
  }),
  x: 0,
  y: 0,
  width: 800,
  height: 400,
  });
  setIsOpen(false);
  };

  const handleAddAbout = () => {
  addElement({
  ...createDefaultElement('about', {
 title: 'about us',
 content: 'tell your story here. share what makes you unique and why people should care about what you do.',
 image: '',
  }),
  width: 600,
  height: 250,
  });
  setIsOpen(false);
  };

  const handleAddSocialLinks = () => {
  addElement({
  ...createDefaultElement('social', {
 discord: 'https://discord.gg/...',
 twitter: '',
 youtube: '',
  }),
  width: 400,
  height: 60,
  });
  setIsOpen(false);
  };

  const handleAddFAQ = () => {
  addElement({
  ...createDefaultElement('faq', {
 title: 'frequently asked questions',
 items: [
 { question: 'how do i join?', answer: 'just connect to our server ip!' },
 { question: 'is it free?', answer: 'yes, completely free to play!' },
 { question: 'what version?', answer: 'we support 1.8 to 1.21!' },
 ],
  }),
  width: 500,
  height: 300,
  });
  setIsOpen(false);
  };

  const handleAddTestimonial = () => {
  addElement({
  ...createDefaultElement('testimonial', {
 quote: 'this is the best server i have ever played on!',
 author: 'happyplayer123',
 role: 'player since 2024',
  }),
  width: 400,
  height: 150,
  });
  setIsOpen(false);
  };

  const handleAddGallery = () => {
  addElement({
  ...createDefaultElement('gallery', {
 images: [
 { src: 'https://via.placeholder.com/300x300', alt: 'image 1' },
 { src: 'https://via.placeholder.com/300x300', alt: 'image 2' },
 { src: 'https://via.placeholder.com/300x300', alt: 'image 3' },
 ],
 columns: 3,
  }),
  width: 600,
  height: 200,
  });
  setIsOpen(false);
  };

  const handleAddCountdown = () => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 7);
  addElement({
  ...createDefaultElement('countdown', {
 title: 'launching soon',
 targetDate: targetDate.toISOString(),
  }),
  width: 400,
  height: 150,
  });
  setIsOpen(false);
  };

  const handleAddDivider = () => {
  addElement({
  ...createDefaultElement('divider', {
 style: 'gradient',
 spacing: 'md',
  }),
  x: 0,
  width: 800,
  height: 40,
  });
  setIsOpen(false);
  };

  // --- minecraft elements ---
  const handleAddServerIP = () => {
  addElement({
  ...createDefaultElement('serverip', {
 javaIP: 'play.dupemates.com',
 javaPort: '25565',
 bedrockIP: 'play.dupemates.com',
 bedrockPort: '19132',
 showBedrock: true,
  }),
  width: 400,
  height: 180,
  });
  setIsOpen(false);
  };

  const handleAddServerStatus = () => {
  addElement({
  ...createDefaultElement('serverstatus', {
 isOnline: true,
 playerCount: 42,
 maxPlayers: 100,
 motd: 'dupemates - the best dupe server!',
  }),
  width: 350,
  height: 80,
  });
  setIsOpen(false);
  };

  const handleAddMinecraftStats = () => {
  addElement({
  ...createDefaultElement('minecraft_stats', {}),
  width: 320,
  height: 400,
  });
  setIsOpen(false);
  };

  const handleAddFeatureCard = () => {
  addElement({
  ...createDefaultElement('featurecard', {
 icon: 'zap',
 title: 'unlimited duping',
 description: 'use all the latest dupe methods without getting banned!',
 color: 'var(--primary)',
  }),
  width: 280,
  height: 180,
  });
  setIsOpen(false);
  };

  const handleAddStaffCard = () => {
  addElement({
  ...createDefaultElement('staffcard', {
 username: 'adminplayer',
 role: 'owner',
 color: '#FF0000',
  }),
  width: 250,
  height: 80,
  });
  setIsOpen(false);
  };

  const handleAddRules = () => {
  addElement({
  ...createDefaultElement('rules', {
 title: 'server rules',
 rules: [

 'no spam',
 'no slurs, hate speech, discriminatory language (including femboy, les, lesbo + microaggressions)',
 'server is 13+ (discord tos). under 13 = reported',
 'politics are allowed. do not get whiny if chat gets political',
 'use common sense & behave respectfully',
 'do not beg for mod/admin roles',
 'swearing & adult humor are allowed (if easily offended, leave)',
 'asking for help is always allowed (no matter how "stupid")',
 'trolling, ragebaiting & bigotry = severe punishment',
 'manage your own mental state. step away if triggered'
 ],
  }),
  width: 400,
  height: 250,
  });
  setIsOpen(false);
  };

  const handleAddVersionBadge = () => {
  addElement({
  ...createDefaultElement('versionbadge', {
 versions: ['1.20.4', '1.21'],
  }),
  width: 200,
  height: 40,
  });
  setIsOpen(false);
  };

  // --- home elements ---
  const handleAddLinkCard = () => {
  addElement({
  ...createDefaultElement('linkcard', {
 title: 'my website',
 url: 'https://example.com',
 icon: 'link-2',
 description: 'visit my personal site',
 color: 'var(--primary)',
  }),
  width: 140,
  height: 140,
  });
  setIsOpen(false);
  };

  const handleAddStatusIndicator = () => {
  addElement({
  ...createDefaultElement('statusindicator', {
 label: 'coding',
 status: 'online',
 showLabel: true,
  }),
  width: 150,
  height: 40,
  });
  setIsOpen(false);
  };

  // --- form ---
  const handleFormSave = (formData: any) => {
  addElement({
  ...createDefaultElement('form', formData),
  width: 400,
  height: 400,
  });
  setShowFormBuilder(false);
  setIsOpen(false);
  };

  // --- media ---
  const handleImageUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  toast.info('uploading image...');
  try {
 const uploaded = await api.upload(file);
 const url = uploaded?.url || uploaded?.data?.url;
 if (url) {
    addElement(createDefaultElement('image', { url, alt: file.name }));
    toast.success('image uploaded');
 }
  } catch (err) {
 console.error(err);
 toast.error('upload failed');
  }
  setisopen(false);
  };
  input.click();
  };

  const handleVideoUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/*';
  input.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  toast.info('uploading video...');
  try {
 const uploaded = await api.upload(file);
 const url = uploaded?.url || uploaded?.data?.url;
 if (url) {
    addElement(createDefaultElement('video', {
 url,
 autoplay: false,
 loop: false,
 muted: true,
 controls: true,
 }));
 toast.success('video uploaded');
 }
  } catch (err) {
 console.error(err);
 toast.error('upload failed');
  }
  setisopen(false);
  };
  input.click();
  };

  const handleAddEmbed = () => {
  const url = prompt('enter embed url (youtube, spotify, etc.):');
  if (!url) return;

  let embedurl = url;
  if (url.includes('youtube.com/watch')) {
    const videoid = new URL(url).searchParams.get('v');
  embedurl = `https://www.youtube.com/embed/${videoid}`;
  } else if (url.includes('youtu.be/')) {
  const videoid = url.split('youtu.be/')[1]?.split('?')[0];
  embedurl = `https://www.youtube.com/embed/${videoid}`;
  }

  addElement({
    ...createDefaultElement('embed', { url: embedurl }),
  width: 560,
  height: 315,
  });
  setisopen(false);
  };

  // unsplash search
  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
  try {
    let key = localStorage.getItem('unsplash_key');
  if (!key) {
 key = prompt('enter your unsplash access key (will be saved locally):') || '';
 if (key) localStorage.setItem('unsplash_key', key);
  }
    if (!key) throw new Error('unsplash key missing');

  const res = await fetch(
 `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&client_id=${key}`
  );
  const data = await res.json();
    setSearchResults(data.results || []);
  } catch (e) {
  toast.error('unsplash search failed');
  } finally {
  setSearching(false);
  }
  };

  // giphy search
  const searchGiphy = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
  try {
    let key = localStorage.getItem('giphy_key');
  if (!key) {
 key = prompt('enter your giphy api key (will be saved locally):') || '';
 if (key) localStorage.setItem('giphy_key', key);
  }
    if (!key) throw new Error('giphy key missing');

  const res = await fetch(
 `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(searchQuery)}&limit=12&api_key=${key}`
  );
  const data = await res.json();
    setSearchResults(data.data || []);
  } catch (e) {
  toast.error('giphy search failed');
  } finally {
  setSearching(false);
  }
  };

  const handleSelectMedia = (url: string, type: 'image' | 'video' = 'image') => {
    addElement(createDefaultElement(type, { url }));
    setIsOpen(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
  <>
  {/* form builder modal */}
  {showFormBuilder && (
 <FormBuilder
 onSave={handleFormSave}
 onCancel={() => setShowFormBuilder(false)}
 />
  )}

  {/* floating add button */}
  <button
 onClick={() => setIsOpen(!isOpen)}
 className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[var(--primary)] flex items-center justify-center z-[40001] transition-all duration-150"
 style={{ color: '#f5af12' }}
  >
 {isOpen ? <X className="w-6 h-6" /> : <span className="text-3xl font-bold">+</span>}
  </button>

  {/* toolbox panel */}
  {isOpen && (
 <div className="fixed bottom-24 right-8 w-96 bg-[#050505] border border-white/10 rounded-2xl overflow-hidden z-[40000]">
 {/* tabs */}
 <div className="flex border-b border-white/10 overflow-x-auto">
 {(['basic', 'home', 'website', 'minecraft', 'media', 'integrations', 'embeds'] as TabType[]).map((tab) => (
   <button
   key={tab}
   onClick={() => { setActiveTab(tab); setSearchResults([]); setSearchQuery(''); }}
   className={`flex-shrink-0 px-3 py-3 text-xs lowercase transition-colors ${activeTab === tab ? 'bg-white/10 text-[var(--primary)]' : 'text-white/50 hover:text-white'
   }`}
   >
   {tab}
   </button>
 ))}
 </div>

 {/* preview mode controls */}
 <div className="flex gap-2 p-3 border-b border-white/10">
 <button onClick={() => setPreviewMode('desktop')} className={`px-2 py-1 text-xs rounded ${previewMode === 'desktop' ? 'bg-white/10 text-[var(--primary)]' : 'text-white/60'}`}>desktop</button>
 <button onClick={() => setPreviewMode('mobile')} className={`px-2 py-1 text-xs rounded ${previewMode === 'mobile' ? 'bg-white/10 text-[var(--primary)]' : 'text-white/60'}`}>mobile</button>
 <button onClick={() => setPreviewMode('tablet')} className={`px-2 py-1 text-xs rounded ${previewMode === 'tablet' ? 'bg-white/10 text-[var(--primary)]' : 'text-white/60'}`}>tablet</button>
 </div>

 {/* tab content */}
 <div className="p-4 max-h-[450px] overflow-y-auto">
 {activeTab === 'basic' && (
   <div className="grid grid-cols-2 gap-3">
   <ToolButton icon={<Type className="w-5 h-5" />} label="text" onClick={handleAddText} />
   <ToolButton icon={<MousePointerClick className="w-5 h-5" />} label="slick button" onClick={handleAddSlickButton} />
   <ToolButton icon={<Square className="w-5 h-5" />} label="shape" onClick={handleAddShape} />
   <ToolButton icon={<Layout className="w-5 h-5" />} label="container" onClick={handleAddContainer} />
   <ToolButton icon={<FileText className="w-5 h-5" />} label="form" onClick={() => setShowFormBuilder(true)} />
   </div>
 )}

 {activeTab === 'home' && (
   <div className="grid grid-cols-2 gap-3">
   <ToolButton icon={<Link2 className="w-5 h-5" />} label="link card" onClick={handleAddLinkCard} />
   <ToolButton icon={<Star className="w-5 h-5" />} label="status" onClick={handleAddStatusIndicator} />
   </div>
 )}

 {activeTab === 'website' && (
   <div className="grid grid-cols-2 gap-3">
   <ToolButton icon={<Layout className="w-5 h-5" />} label="hero" onClick={handleAddHero} />
   <ToolButton icon={<Users className="w-5 h-5" />} label="about" onClick={handleAddAbout} />
   <ToolButton icon={<Link2 className="w-5 h-5" />} label="social links" onClick={handleAddSocialLinks} />
   <ToolButton icon={<HelpCircle className="w-5 h-5" />} label="faq" onClick={handleAddFAQ} />
   <ToolButton icon={<Quote className="w-5 h-5" />} label="testimonial" onClick={handleAddTestimonial} />
   <ToolButton icon={<Grid className="w-5 h-5" />} label="gallery" onClick={handleAddGallery} />
   <ToolButton icon={<Clock className="w-5 h-5" />} label="countdown" onClick={handleAddCountdown} />
   <ToolButton icon={<Square className="w-5 h-5" />} label="divider" onClick={handleAddDivider} />
   </div>
 )}

 {activeTab === 'minecraft' && (
   <div className="grid grid-cols-2 gap-3">
   <ToolButton icon={<Server className="w-5 h-5" />} label="server ip" onClick={handleAddServerIP} />
   <ToolButton icon={<Gamepad2 className="w-5 h-5" />} label="status" onClick={handleAddServerStatus} />
   <ToolButton icon={<Zap className="w-5 h-5" />} label="feature" onClick={handleAddFeatureCard} />
   <ToolButton icon={<Users className="w-5 h-5" />} label="staff" onClick={handleAddStaffCard} />
   <ToolButton icon={<Shield className="w-5 h-5" />} label="rules" onClick={handleAddRules} />
   <ToolButton icon={<Star className="w-5 h-5" />} label="version" onClick={handleAddVersionBadge} />
   <ToolButton icon={<MessageCircle className="w-5 h-5" />} label="live feed" onClick={handleAddMinecraftStats} />
   <ToolButton icon={<Terminal className="w-5 h-5" />} label="live console" onClick={() => handleAddElement('minecraft_stats', {})} />
   <ToolButton icon={<Coins className="w-5 h-5" />} label="gold pile" onClick={() => handleAddElement('gold_pile', {})} />
   <ToolButton icon={<Moon className="w-5 h-5" />} label="sleep ring" onClick={() => handleAddElement('sleep_ring', {})} />
   </div>
 )}

 {activetab === 'integrations' && (
   <div className="grid grid-cols-2 gap-3">
   <ToolButton
   icon={<BarChart size={18} />}
   label="stats chart"
   onClick={() => handleAddElement('financial_chart', {
  title: 'activity log',
  data: [
  { name: 'Mon', value: 40, color: 'var(--primary)' },
  { name: 'Tue', value: 30, color: 'rgba(255,255,255,0.1)' },
  { name: 'Wed', value: 60, color: 'var(--primary)' },
  { name: 'Thu', value: 80, color: 'rgba(255,255,255,0.1)' }
  ]
   })}
   />
   <ToolButton
   icon={<ListOrdered size={18} />}
   label="tier list"
   onClick={() => handleAddElement('tier_list', {
  rows: [
  { label: 'S', color: '#ff7f7f', items: ['Dragon'] },
  { label: 'A', color: '#ffbf7f', items: ['Knight'] }
  ]
   })}
   />
   <ToolButton
   icon={<ShoppingBag size={18} />}
   label="product card"
   onClick={() => handleAddElement('shopping_card', {
  title: 'epic sword',
  price: '500 gold',
  description: 'A legendary weapon for the masters.'
   })}
   />
   <ToolButton
   icon={<StickyNote size={18} />}
   label="reminder"
   onClick={() => handleAddElement('floating_reminder', {
  content: 'dont forget to grind!',
  color: '#fef9c3'
   })}
   />
   <ToolButton
   icon={<Zap size={18} />}
   label="stats bar"
   onClick={() => handleAddElement('stats_bar', {
  label: 'power level',
  value: 75,
  max: 100
   })}
   />
   <ToolButton
   icon={<Flame size={18} />}
   label="eternal flame"
   onClick={() => handleAddElement('eternal_flame', {})}
   />
   </div>
 )}

 {activeTab === 'media' && (
   <div className="h-full">
   {mediaMode === 'list' ? (
   <div className="grid grid-cols-2 gap-3">
  <ToolButton icon={<Image className="w-5 h-5" />} label="image" onClick={() => setMediaMode('image')} />
  <ToolButton icon={<Play className="w-5 h-5" />} label="video" onClick={() => setMediaMode('video')} />
   </div>
   ) : mediaMode === 'image' ? (
   <div className="space-y-2">
  <button onClick={() => setMediaMode('list')} className="text-white/50 hover:text-white text-xs mb-2 flex items-center gap-1">
  <ChevronLeft className="w-3 h-3" /> back
  </button>
  <ToolButton icon={<Upload className="w-5 h-5" />} label="upload image" onClick={handleImageUpload} />
  <ToolButton icon={<Link2 className="w-5 h-5" />} label="image from url" onClick={() => {
  const url = prompt('enter image url:');
  if (url) handleSelectMedia(url, 'image');
  }} />
   </div>
   ) : (
   <div className="space-y-2">
  <button onClick={() => setMediaMode('list')} className="text-white/50 hover:text-white text-xs mb-2 flex items-center gap-1">
  <ChevronLeft className="w-3 h-3" /> back
  </button>
  <ToolButton icon={<Upload className="w-5 h-5" />} label="upload video" onClick={handleVideoUpload} />
  <ToolButton icon={<Link2 className="w-5 h-5" />} label="video from url" onClick={() => {
  const url = prompt('enter video url:');
  if (url) handleSelectMedia(url, 'video');
  }} />
   </div>
   )}
   </div>
 )}

 {activetab === 'integrations' && (
   <div className="space-y-4">
   {/* search */}
   <div className="flex gap-2">
   <input
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="search..."
  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 text-sm lowercase"
  onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
   />
   <button
  onClick={searchUnsplash}
  className="px-3 py-2 bg-[var(--primary)] text-black rounded-lg text-sm font-bold lowercase"
   >
  <Search className="w-4 h-4" />
   </button>
   </div>

   <div className="flex gap-2">
   <button
  onClick={searchUnsplash}
  className="flex-1 py-2 bg-white/10 rounded-lg text-sm text-white/70 lowercase"
   >
  unsplash
   </button>
   <button
  onClick={searchGiphy}
  className="flex-1 py-2 bg-white/10 rounded-lg text-sm text-white/70 lowercase"
   >
  giphy
   </button>
   </div>

   {/* results */}
   {searching && <div className="text-center text-white/50 py-4">searching...</div>}

   {searchResults.length > 0 && (
   <div className="grid grid-cols-3 gap-2">
  {searchResults.map((item: any) => {
  const url = item.urls?.small || item.images?.fixed_width?.url || item.images?.original?.url;
  const isgif = !!item.images;
  return (
  <button
    key={item.id}
    onClick={() => handleSelectMedia(isGif ? item.images.original.url : item.urls?.regular || url)}
    className="aspect-square rounded-lg overflow-hidden border border-transparent hover:border-white/20 transition-colors"
  >
    <img src={url} alt="" className="w-full h-full object-cover" />
  </button>
  );
  })}
   </div>
   )}
   </div>
 )}

 {activeTab === 'embeds' && (
   <div className="grid grid-cols-2 gap-3">
   <ToolButton icon={<Code className="w-5 h-5" />} label="embed" onClick={handleAddEmbed} />
   </div>
 )}
 </div>
 </div>
  )}
  </>
  );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
  <button
  onClick={onClick}
  className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white lowercase"
  >
  {icon}
  <span className="text-xs">{label}</span>
  </button>
  );
}
