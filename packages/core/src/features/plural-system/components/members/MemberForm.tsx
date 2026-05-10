import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Trash2, Plus } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import type { Member, MemberStatus, CustomFieldValue, CustomFieldType } from '../../types';
import { usePluralSystem } from '../../stores/use-plural-system';
import { compressImage, blobToDataUrl } from '../../utils/image-utils';

interface MemberFormProps {
  member?: Member;
  open: boolean;
  onClose: () => void;
}

const statusOptions: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: 'active' },
  { value: 'dormant', label: 'dormant' },
  { value: 'archived', label: 'archived' },
  { value: 'fused', label: 'fused' },
];

const customFieldTypeOptions: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'text' },
  { value: 'number', label: 'number' },
  { value: 'date', label: 'date' },
  { value: 'boolean', label: 'boolean' },
  { value: 'url', label: 'url' },
];

export function MemberForm({ member, open, onClose }: MemberFormProps) {
  const addMember = usePluralSystem(s => s.addMember);
  const updateMember = usePluralSystem(s => s.updateMember);
  const customFieldDefinitions = usePluralSystem(s => s.customFieldDefinitions);
  const addCustomFieldDefinition = usePluralSystem(s => s.addCustomFieldDefinition);

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [color, setColor] = useState('#f6b012');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState('');
  const [species, setSpecies] = useState('');
  const [age, setAge] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [status, setStatus] = useState<MemberStatus>('active');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldValue[]>([]);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setDisplayName(member.displayName || '');
      setPronouns(member.pronouns || '');
      setColor(member.color || '#f6b012');
      setDescription(member.description || '');
      setBirthdate(member.birthdate || '');
      setRole(member.role || '');
      setSource(member.source || '');
      setSpecies(member.species || '');
      setAge(member.age || '');
      setLikes(member.likes || '');
      setDislikes(member.dislikes || '');
      setStatus(member.status);
      setTags(member.tags || []);
      setCustomFields(member.customFields || []);
      if (member.avatarBlob) {
        blobToDataUrl(member.avatarBlob).then(setAvatarDataUrl);
      } else {
        setAvatarDataUrl(null);
      }
      if (member.bannerBlob) {
        blobToDataUrl(member.bannerBlob).then(setBannerDataUrl);
      } else {
        setBannerDataUrl(null);
      }
    } else {
      setName('');
      setDisplayName('');
      setPronouns('');
      setColor('#f6b012');
      setDescription('');
      setBirthdate('');
      setRole('');
      setSource('');
      setSpecies('');
      setAge('');
      setLikes('');
      setDislikes('');
      setStatus('active');
      setTags([]);
      setCustomFields([]);
      setAvatarDataUrl(null);
      setBannerDataUrl(null);
    }
  }, [member, open]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 512, 512);
    const url = await blobToDataUrl(compressed);
    setAvatarDataUrl(url);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 1200, 400, 0.7);
    const url = await blobToDataUrl(compressed);
    setBannerDataUrl(url);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(tag => tag !== t));

  const handleAddCustomField = async () => {
    const name = newFieldName.trim();
    if (!name) return;
    const def = await addCustomFieldDefinition({ name, type: newFieldType });
    setCustomFields([...customFields, { definitionId: def.id, value: '' }]);
    setNewFieldName('');
    setNewFieldType('text');
  };

  const updateCustomFieldValue = (definitionId: string, value: string | number | boolean) => {
    setCustomFields(prev =>
      prev.map(f => (f.definitionId === definitionId ? { ...f, value } : f))
    );
  };

  const handleSubmit = async () => {
    const avatarBlob = avatarDataUrl ? await fetch(avatarDataUrl).then(r => r.blob()) : undefined;
    const bannerBlob = bannerDataUrl ? await fetch(bannerDataUrl).then(r => r.blob()) : undefined;

    const data = {
      name: name.trim() || 'unnamed',
      displayName: displayName.trim() || undefined,
      pronouns: pronouns.trim() || undefined,
      avatarBlob,
      bannerBlob,
      color,
      description: description.trim() || undefined,
      birthdate: birthdate || undefined,
      role: role.trim() || undefined,
      source: source.trim() || undefined,
      species: species.trim() || undefined,
      age: age.trim() || undefined,
      likes: likes.trim() || undefined,
      dislikes: dislikes.trim() || undefined,
      status,
      tags,
      customFields,
    };

    if (member) {
      await updateMember(member.id, data);
    } else {
      await addMember(data);
    }
    onClose();
  };

  const getDefName = (id: string) => customFieldDefinitions.find(d => d.id === id)?.name || 'unknown field';
  const getDefType = (id: string) => customFieldDefinitions.find(d => d.id === id)?.type || 'text';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="lowercase">{member ? 'edit member' : 'new member'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* avatar + banner */}
          <div className="space-y-3">
            <div className="h-32 bg-white/5 rounded-lg relative overflow-hidden group">
              {bannerDataUrl ? (
                <img src={bannerDataUrl} alt="banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">no banner</div>
              )}
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Upload className="h-5 w-5 text-white" />
              </button>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            </div>

            <div className="flex items-end gap-4 -mt-8 px-4">
              <div className="relative group">
                <div
                  className="w-20 h-20 rounded-full border-4 border-[#111] overflow-hidden bg-black"
                  style={{ boxShadow: `0 0 0 2px ${color}` }}
                >
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl">
                      {name.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Upload className="h-4 w-4 text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-white/60 text-xs lowercase">name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs lowercase">display name</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
                </div>
              </div>
            </div>
          </div>

          {/* basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/60 text-xs lowercase">pronouns</Label>
              <Input value={pronouns} onChange={e => setPronouns(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-white/60 text-xs lowercase">role / title</Label>
              <Input value={role} onChange={e => setRole(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-white/60 text-xs lowercase">birthdate</Label>
              <Input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-white/60 text-xs lowercase">age</Label>
              <Input value={age} onChange={e => setAge(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-white/60 text-xs lowercase">species / type</Label>
              <Input value={species} onChange={e => setSpecies(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-white/60 text-xs lowercase">source</Label>
              <Input value={source} onChange={e => setSource(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
          </div>

          {/* color */}
          <div>
            <Label className="text-white/60 text-xs lowercase">color</Label>
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-full border-2 border-white/20"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-white/60">{color}</span>
            </div>
            {showColorPicker && (
              <div className="mt-2 p-2 bg-white/5 rounded-lg inline-block">
                <HexColorPicker color={color} onChange={setColor} />
              </div>
            )}
          </div>

          {/* status */}
          <div>
            <Label className="text-white/60 text-xs lowercase">status</Label>
            <Select value={status} onValueChange={(v: MemberStatus) => setStatus(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                {statusOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-white lowercase">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* description */}
          <div>
            <Label className="text-white/60 text-xs lowercase">description / bio</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="bg-white/5 border-white/10 text-white mt-1 resize-none"
            />
          </div>

          {/* likes / dislikes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/60 text-xs lowercase">likes</Label>
              <Textarea
                value={likes}
                onChange={e => setLikes(e.target.value)}
                rows={3}
                className="bg-white/5 border-white/10 text-white mt-1 resize-none"
              />
            </div>
            <div>
              <Label className="text-white/60 text-xs lowercase">dislikes</Label>
              <Textarea
                value={dislikes}
                onChange={e => setDislikes(e.target.value)}
                rows={3}
                className="bg-white/5 border-white/10 text-white mt-1 resize-none"
              />
            </div>
          </div>

          {/* tags */}
          <div>
            <Label className="text-white/60 text-xs lowercase">tags</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map(t => (
                <Badge key={t} variant="secondary" className="bg-white/10 text-white/80 lowercase gap-1">
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="add tag..."
                className="bg-white/5 border-white/10 text-white"
              />
              <Button variant="outline" size="sm" onClick={addTag} className="border-white/10 text-white hover:bg-white/10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* custom fields */}
          <div className="border-t border-white/5 pt-4">
            <Label className="text-white/60 text-xs lowercase">custom fields</Label>
            <div className="space-y-2 mt-2">
              {customFields.map(cf => {
                const def = customFieldDefinitions.find(d => d.id === cf.definitionId);
                if (!def) return null;
                return (
                  <div key={cf.definitionId} className="flex items-center gap-2">
                    <span className="text-xs text-white/40 w-24 lowercase">{def.name}</span>
                    {def.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={!!cf.value}
                        onChange={e => updateCustomFieldValue(cf.definitionId, e.target.checked)}
                        className="accent-[#f6b012]"
                      />
                    ) : (
                      <Input
                        type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : def.type === 'url' ? 'url' : 'text'}
                        value={String(cf.value || '')}
                        onChange={e => updateCustomFieldValue(cf.definitionId, def.type === 'number' ? Number(e.target.value) : e.target.value)}
                        className="bg-white/5 border-white/10 text-white flex-1"
                      />
                    )}
                    <button
                      onClick={() => setCustomFields(customFields.filter(f => f.definitionId !== cf.definitionId))}
                      className="text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-3">
              <Input
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                placeholder="new field name..."
                className="bg-white/5 border-white/10 text-white"
              />
              <Select value={newFieldType} onValueChange={(v: CustomFieldType) => setNewFieldType(v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {customFieldTypeOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-white lowercase">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleAddCustomField} className="border-white/10 text-white hover:bg-white/10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/5">
            cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase">
            {member ? 'save changes' : 'create member'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
