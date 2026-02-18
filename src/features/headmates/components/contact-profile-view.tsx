import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Droplet, Save, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFronter } from '@/contexts/fronter-context';
import { formatHeadmateName } from '@/utils/text-formatting';
import { PLACEHOLDER_IMAGE } from '@/lib/discord-utils';
import { api } from '@/api/nocobase-client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { Headmate } from './headmate-card';

interface ContactProfileViewProps {
  member: Headmate;
  onClose: () => void;
  isOpen: boolean;
}

export function ContactProfileView({ member, onClose, isOpen }: ContactProfileViewProps) {
  const { refresh } = useFronter();

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Fields
  // Use extended fields if available on member, or defaults
  const [name, setName] = useState(member.name);
  const [bannerUrl, setBannerUrl] = useState((member as any).banner || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop');
  const [birthday, setBirthday] = useState((member as any).birthday || '');
  const [favColor, setFavColor] = useState(member.color || '#ffffff');
  const [description, setDescription] = useState(member.description || '');
  const [pronouns, setPronouns] = useState(member.pronouns || '');
  const [role, setRole] = useState((member as any).role || '');
  const [status, setStatus] = useState((member as any).status || 'Active');

  // Reset state when member changes
  useEffect(() => {
  if (member) {
  setName(member.name);
  setBannerUrl((member as any).banner || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop');
  setBirthday((member as any).birthday || '');
  setFavColor(member.color || '#ffffff');
  setDescription(member.description || '');
  setPronouns(member.pronouns || '');
  setRole((member as any).role || '');
  setStatus((member as any).status || 'Active');
  }
  }, [member]);

  const formattedName = formatHeadmateName(name);

  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
  if (birthday) {
  const birthDate = new Date(birthday);
  const today = new Date();
  let calculatedAge = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
 calculatedAge--;
  }
  setAge(calculatedAge);
  }
  }, [birthday]);

  // Handle banner upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
  const formData = new FormData();
  formData.append('file', file);

  // Use fetch directly for file upload since uploadFile may not exist on api client
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (data?.url) {
 setBannerUrl(data.url);
 toast.success('banner uploaded');
  }
  } catch (e) {
  console.error(e);
  toast.error('failed to upload banner');
  }
  };

  // Handle save
  const handleSave = async () => {
  try {
  await api.updateRecord('headmates', member.id, {
 name,
 color: favColor,
 description,
 pronouns,
 banner: bannerUrl,
 birthday,
 role,
 status
  });
  await refresh();
  toast.success("profile updated");
  setIsEditing(false);
  } catch (e) {
  console.error(e);
  toast.error("failed to update profile");
  }
  };

  if (!isOpen) return null;

  return (
  <AnimatePresence>
  <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
 onClick={(e) => {
 if (e.target === e.currentTarget) onClose();
 }}
  >
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative"
 >
 {/* Close Button */}
 <button
 onClick={onClose}
 className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full hover:bg-white/20 transition-colors text-white"
 >
 <X size={20} />
 </button>

 {/* Banner */}
 <div className="h-48 md:h-64 w-full relative group">
 <img
   src={bannerUrl}
   alt="Banner"
   className="w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />

 {isEditing && (
   <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4">
   <input
   ref={bannerInputRef}
   type="file"
   accept="image/*"
   onChange={handleBannerUpload}
   className="hidden"
   />
   <button
   onClick={() => bannerInputRef.current?.click()}
   className="bg-white/20 hover:bg-white/30 border border-white/40 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
   >
   <Upload size={18} />
   Upload Image
   </button>
   <div className="text-white/60 text-xs">or</div>
   <input
   type="text"
   value={bannerUrl}
   onChange={(e) => setBannerUrl(e.target.value)}
   className="bg-black/80 border border-white/30 p-2 rounded text-white text-sm w-3/4"
   placeholder="Enter URL..."
   />
   </div>
 )}
 </div>

 {/* Profile Header (Avatar overlap) */}
 <div className="px-8 -mt-16 flex flex-col md:flex-row items-end md:items-end gap-6 relative z-10">
 <div className="relative group">
   <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0a0a0a] overflow-hidden bg-black shadow-xl">
   <img
   src={member.avatar || PLACEHOLDER_IMAGE}
   alt={name}
   className="w-full h-full object-cover"
   />
   </div>
 </div>

 <div className="flex-1 pb-4 mb-2">
   {isEditing ? (
   <input
   value={name}
   onChange={e => setName(e.target.value)}
   className="text-4xl font-bold text-white mb-1 bg-transparent border-b border-white/20 focus:outline-none w-full"
   />
   ) : (
   <h1 className="text-4xl font-bold text-white mb-1" style={{ textShadow: `0 0 20px ${favColor}` }}>{formattedName}</h1>
   )}

   <div className="flex flex-wrap gap-2 text-white/60 text-sm">
   {isEditing ? (
   <input
  value={pronouns}
  onChange={e => setPronouns(e.target.value)}
  placeholder="Pronouns"
  className="bg-white/5 px-2 py-1 rounded-md text-white border border-white/10"
   />
   ) : (pronouns && (
   <span className="bg-white/5 px-2 py-1 rounded-md">{pronouns}</span>
   ))}

   <span className="bg-white/5 px-2 py-1 rounded-md flex items-center gap-1">
   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: favColor }} />
   {favColor}
   </span>
   </div>
 </div>

 <div className="pb-6">
   <button
   onClick={() => isEditing ? handleSave() : setIsEditing(true)}
   className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isEditing
   ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
   : 'bg-white/10 text-white hover:bg-white/20'
   }`}
   >
   {isEditing ? <><Save size={16} /> Save Profile</> : 'Edit Profile'}
   </button>
 </div>
 </div>

 {/* Body Content */}
 <div className="flex-1 overflow-y-auto p-8 space-y-8">
 {/* About Section */}
 <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
   <div className="space-y-4">
   <h2 className="text-lg font-semibold text-white/80 border-b border-white/10 pb-2">Details</h2>
   <div className="space-y-3">
   <div className="flex items-center gap-3 text-white/60">
  <Calendar size={18} />
  <span className="w-24">Birthday</span>
  {isEditing ? (
  <input
  type="date"
  value={birthday}
  onChange={(e) => setBirthday(e.target.value)}
  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
  />
  ) : (
  <span className="text-white">{birthday || 'Not set'} {age !== null && <span className="text-white/40">({age} years old)</span>}</span>
  )}
   </div>
   <div className="flex items-center gap-3 text-white/60">
  <Droplet size={18} />
  <span className="w-24">Color</span>
  {isEditing ? (
  <div className="flex gap-2">
  <input
    type="color"
    value={favColor}
    onChange={(e) => setFavColor(e.target.value)}
    className="bg-transparent"
  />
  <input
    type="text"
    value={favColor}
    onChange={(e) => setFavColor(e.target.value)}
    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white w-24"
  />
  </div>
  ) : (
  <span className="text-white" style={{ color: favColor }}>{favColor}</span>
  )}
   </div>
   </div>
   </div>

   <div className="space-y-4">
   <h2 className="text-lg font-semibold text-white/80 border-b border-white/10 pb-2">Bio</h2>
   {isEditing ? (
   <div className="space-y-2">
  <textarea
  value={description}
  onChange={e => setDescription(e.target.value)}
  className="w-full h-32 bg-white/5 border border-white/10 rounded py-2 px-3 text-white focus:outline-none font-mono text-sm"
  placeholder="Supports **markdown** formatting..."
  />
  <div className="text-xs text-white/40">Supports markdown: **bold**, *italic*, [links](url), etc.</div>
   </div>
   ) : (
   <div className="text-white/70 leading-relaxed prose prose-invert prose-sm max-w-none">
  {description ? (
  <ReactMarkdown rehypePlugins={[rehypeRaw]}>
  {description}
  </ReactMarkdown>
  ) : (
  <p className="text-white/50 italic">No description provided.</p>
  )}
   </div>
   )}
   </div>
 </section>

 {/* Tracking / Properties Section */}
 <section>
   <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
   <h2 className="text-lg font-semibold text-white/80">Properties</h2>
   </div>

   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
   <div className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
   <div className="text-xs text-white/40 mb-1">Status</div>
   {isEditing ? (
  <input
  value={status}
  onChange={e => setStatus(e.target.value)}
  className="bg-transparent border-b border-white/20 text-white focus:outline-none w-full"
  placeholder="Active"
  />
   ) : (
  <div className="text-white">{status || 'Active'}</div>
   )}
   </div>
   <div className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
   <div className="text-xs text-white/40 mb-1">Role</div>
   {isEditing ? (
  <input
  value={role}
  onChange={e => setRole(e.target.value)}
  className="bg-transparent border-b border-white/20 text-white focus:outline-none w-full"
  placeholder="Protector"
  />
   ) : (
  <div className="text-white">{role || 'Protector'}</div>
   )}
   </div>
   </div>
 </section>

 </div>
 </motion.div>
  </motion.div>
  </AnimatePresence>
  );
}

// Add these types to fronter context if not exists or ignore for now as 'any' is used in prop
