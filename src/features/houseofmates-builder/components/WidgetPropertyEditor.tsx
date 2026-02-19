import { useState, useEffect } from 'react';
import type { ElementData } from '../HouseofmatesBuilder';
import { X, Plus, Trash2, Search, Upload } from 'lucide-react';
import { IconPicker } from './IconPicker';
import * as LucideIcons from 'lucide-react';
import { api } from '@/api/nocobase-client';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/ui/image-cropper';

interface Props {
  element: ElementData;
  onUpdate: (updates: Partial<ElementData>) => void;
  onClose: () => void;
}

export function WidgetPropertyEditor({ element, onUpdate, onClose }: Props) {
  const [content, setContent] = useState<any>(element.content || {});
  const [styles, setStyles] = useState<any>(element.styles || {});
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperField, setCropperField] = useState<string>('');
  const [cropperConfig, setCropperConfig] = useState({ aspectRatio: 1, shape: 'rect' as 'rect' | 'round', width: 200, height: 200 });

  useEffect(() => {
    setContent(element.content || {});
    setStyles(element.styles || {});
  }, [element.id]);

  const handleSave = () => {
    onUpdate({ content, styles });
    onClose();
  };

  const updateField = (key: string, value: any) => {
    const newContent = { ...content, [key]: value };
    setContent(newContent);
    onUpdate({ content: newContent });
  };

  const updateStyle = (key: string, value: any) => {
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);
    onUpdate({ styles: newStyles });
  };

  // generic array handler (for rules, faq, etc.)
  const handleArrayUpdate = (key: string, index: number, value: any) => {
    const arr = [...(content[key] || [])];
    arr[index] = value;
    updateField(key, arr);
  };

  const handleArrayAdd = (key: string, defaultValue: any) => {
    updateField(key, [...(content[key] || []), defaultValue]);
  };

  const handleArrayRemove = (key: string, index: number) => {
    const arr = [...(content[key] || [])];
    arr.splice(index, 1);
    updateField(key, arr);
  };

  const handleFileUpload = async (field: string, config = { aspectRatio: 1, shape: 'rect' as 'rect' | 'round', width: 200, height: 200 }) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setCropperFile(file);
      setCropperField(field);
      setCropperConfig(config);
      setCropperOpen(true);
    };
    input.click();
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const toastId = toast.loading('uploading image...');
    try {
      // convert blob to file
      const file = new File([croppedBlob], cropperFile?.name || 'cropped.png', { type: 'image/png' });
      const uploaded = await api.upload(file);
      const url = uploaded?.url || uploaded?.data?.url;
      if (url) {
        updateField(cropperField, url);
        toast.success('image uploaded', { id: toastId });
      } else {
        toast.error('upload failed - no url returned', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('upload failed', { id: toastId });
    }
  };

  const renderFields = () => {
    switch (element.type) {
      case 'serverip':
        return (
          <>
            <Input label="java ip" value={content.javaIp} onChange={(v: string) => updateField('javaIp', v)} />
            <Input label="java port" value={content.javaPort} onChange={(v: string) => updateField('javaPort', v)} />
            <Input label="bedrock ip" value={content.bedrockIp} onChange={(v: string) => updateField('bedrockIp', v)} />
            <Input label="bedrock port" value={content.bedrockPort} onChange={(v: string) => updateField('bedrockPort', v)} />
            <Checkbox label="show bedrock" checked={content.showBedrock} onChange={(v: boolean) => updateField('showBedrock', v)} />
          </>
        );
      case 'serverstatus':
        return (
          <>
            <Input label="motd" value={content.motd} onChange={(v: string) => updateField('motd', v)} />
            <Input label="player count" type="number" value={content.playerCount} onChange={(v: number) => updateField('playerCount', Number(v))} />
            <Input label="max players" type="number" value={content.maxPlayers} onChange={(v: number) => updateField('maxPlayers', Number(v))} />
            <Checkbox label="is online (static)" checked={content.isOnline} onChange={(v: boolean) => updateField('isOnline', v)} />
          </>
        );
      case 'rules':
        return (
          <>
            <Input label="title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <div className="space-y-2 mt-4">
              <label className="text-white/70 text-sm">rules list</label>
              {(content.rules || []).map((rule: string, idx: number) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm"
                    value={rule}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleArrayUpdate('rules', idx, e.target.value)}
                  />
                  <button onClick={() => handleArrayRemove('rules', idx)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                </div>
              ))}
              <button onClick={() => handleArrayAdd('rules', 'new rule')} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <Plus size={14} /> add rule
              </button>
            </div>
          </>
        );
      case 'featurecard':
        return (
          <>
            <Input label="title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <Input label="description" value={content.description} onChange={(v: string) => updateField('description', v)} textarea />

            <div className="flex flex-col gap-1.5 relative">
              <label className="text-white/70 text-xs  font-bold">icon</label>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    {(() => {
                      const iconName = content.icon || 'shield';
                      const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
                      // @ts-expect-error
                      const Icon = LucideIcons[formattedName] || LucideIcons.shield;
                      return <Icon size={18} />;
                    })()}
                  </div>
                  <span className="text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <Search size={16} className="text-white/20" />
              </button>

              {showIconPicker && (
                <div className="absolute top-full left-0 mt-2 z-[3000]">
                  <IconPicker
                    value={content.icon || 'shield'}
                    onChange={(icon) => updateField('icon', icon)}
                    onClose={() => setShowIconPicker(false)}
                  />
                </div>
              )}
            </div>

            <Input label="color (hex)" value={content.color} onChange={(v: string) => updateField('color', v)} />
          </>
        );
      case 'staffcard':
        return (
          <>
            <Input label="username (ign)" value={content.username} onChange={(v: string) => updateField('username', v)} />
            <Input label="role" value={content.role} onChange={(v: string) => updateField('role', v)} />
            <div className="space-y-2">
              <label className="text-white/70 text-sm">avatar</label>
              <div className="flex gap-2">
                <Input
                  placeholder="custom avatar url (optional)"
                  value={content.avatar}
                  onChange={(v: string) => updateField('avatar', v)}
                />
                <button
                  onClick={() => handleFileUpload('avatar')}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <Upload size={16} />
                  upload
                </button>
              </div>
              {content.avatar && (
                <div className="mt-2">
                  <img src={content.avatar} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
                </div>
              )}
            </div>
            <Input label="role color" value={content.color} onChange={(v: string) => updateField('color', v)} />
          </>
        );
      case 'faq':
        return (
          <>
            <Input label="section title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <div className="space-y-4 mt-4">
              <label className="text-white/70 text-sm">questions</label>
              {(content.items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-white/40">question {idx + 1}</span>
                    <button onClick={() => handleArrayRemove('items', idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                  <Input value={item.question} onChange={(v: string) => handleArrayUpdate('items', idx, { ...item, question: v })} placeholder="question" />
                  <Input value={item.answer} onChange={(v: string) => handleArrayUpdate('items', idx, { ...item, answer: v })} textarea placeholder="answer" />
                </div>
              ))}
              <button onClick={() => handleArrayAdd('items', { question: 'new question', answer: 'answer here' })} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <Plus size={14} /> add question
              </button>
            </div>
          </>
        );
      case 'hero':
        return (
          <>
            <Input label="main title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <Input label="subtitle" value={content.subtitle} onChange={(v: string) => updateField('subtitle', v)} />
            <Input label="cta button text" value={content.ctaText} onChange={(v: string) => updateField('ctaText', v)} />
            <Input label="cta link" value={content.ctaLink} onChange={(v: string) => updateField('ctaLink', v)} />
            <div className="space-y-2">
              <label className="text-white/70 text-sm">background image</label>
              <div className="flex gap-2">
                <Input
                  placeholder="background image url"
                  value={content.backgroundImage}
                  onChange={(v: string) => updateField('backgroundImage', v)}
                />
                <button
                  onClick={() => handleFileUpload('backgroundImage', { aspectRatio: 16 / 9, shape: 'rect', width: 400, height: 225 })}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <Upload size={16} />
                  upload
                </button>
              </div>
              {content.backgroundImage && (
                <div className="mt-2">
                  <img src={content.backgroundImage} alt="preview" className="w-full h-24 rounded-lg object-cover" />
                </div>
              )}
            </div>
            <Checkbox label="show server ip widget" checked={content.showServerIp} onChange={(v: boolean) => updateField('showServerIp', v)} />
            {content.showServerIp && (
              <Input label="java ip" value={content.javaIp} onChange={(v: string) => updateField('javaIp', v)} />
            )}
          </>
        );
      case 'button':
      case 'slick_button':
        return (
          <>
            <Input label="button text" value={content.text} onChange={(v) => updateField('text', v)} />
            <Input label="url / link" value={content.url} onChange={(v) => updateField('url', v)} />

            <div className="flex flex-col gap-1.5 relative">
              <label className="text-white/70 text-xs  font-bold">icon</label>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    {(() => {
                      const iconName = content.icon || 'arrow-right';
                      const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                      // @ts-expect-error
                      const Icon = LucideIcons[formattedName] || LucideIcons.arrowRight;
                      return <Icon size={18} />;
                    })()}
                  </div>
                  <span className="text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <LucideIcons.Search size={16} className="text-white/20" />
              </button>

              {showIconPicker && (
                <div className="absolute top-full left-0 mt-2 z-[3000]">
                  <IconPicker
                    value={content.icon || 'arrow-right'}
                    onChange={(icon) => updateField('icon', icon)}
                    onClose={() => setShowIconPicker(false)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="bg color" value={content.bgColor} onChange={(v) => updateField('bgColor', v)} />
              <Input label="text color" value={content.textColor} onChange={(v) => updateField('textColor', v)} />
            </div>
            <Input label="icon color (optional)" value={content.iconColor} onChange={(v) => updateField('iconColor', v)} />
          </>
        );
      case 'video':
      case 'image':
      case 'pdf_viewer':
        return (
          <>
            <Input label="url" value={content.url} onChange={(v: string) => updateField('url', v)} />
            {element.type === 'image' && <Input label="alt text" value={content.alt} onChange={(v: string) => updateField('alt', v)} />}
            {element.type === 'video' && (
              <>
                <Checkbox label="autoplay" checked={content.autoplay} onChange={(v: boolean) => updateField('autoplay', v)} />
                <Checkbox label="loop" checked={content.loop} onChange={(v: boolean) => updateField('loop', v)} />
                <Checkbox label="muted" checked={content.muted} onChange={(v: boolean) => updateField('muted', v)} />
                <Checkbox label="controls" checked={content.controls} onChange={(v: boolean) => updateField('controls', v)} />
              </>
            )}
          </>
        );
      case 'database_view':
        return (
          <>
            <Input label="collection name" value={content.collectionName} onChange={(v: string) => updateField('collectionName', v)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-xs  font-bold">view type</label>
              <select
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--primary)] transition-all"
                value={content.viewType || 'table'}
                onChange={(e) => updateField('viewType', e.target.value)}
              >
                <option value="table">table</option>
                <option value="gallery">gallery</option>
                <option value="kanban">kanban</option>
                <option value="calendar">calendar</option>
                <option value="chart">chart</option>
              </select>
            </div>
          </>
        );
      case 'linkcard':
        return (
          <>
            <Input label="title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <Input label="url" value={content.url} onChange={(v: string) => updateField('url', v)} />
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-white/70 text-xs  font-bold">icon</label>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    {(() => {
                      const iconName = content.icon || 'link-2';
                      const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-([a-z])/g, (g: any) => g[1].toUpperCase());
                      // @ts-expect-error
                      const Icon = LucideIcons[formattedName] || LucideIcons.link2;
                      return <Icon size={18} />;
                    })()}
                  </div>
                  <span className="text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <Search size={16} className="text-white/20" />
              </button>

              {showIconPicker && (
                <div className="absolute top-full left-0 mt-2 z-[3000]">
                  <IconPicker
                    value={content.icon || 'link-2'}
                    onChange={(icon) => updateField('icon', icon)}
                    onClose={() => setShowIconPicker(false)}
                  />
                </div>
              )}
            </div>
            <Input label="description" value={content.description} onChange={(v: string) => updateField('description', v)} />
            <Input label="color (hex)" value={content.color} onChange={(v: string) => updateField('color', v)} />
          </>
        );
      case 'statusindicator':
        return (
          <>
            <Input label="label" value={content.label} onChange={(v: string) => updateField('label', v)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-xs  font-bold">status</label>
              <select
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--primary)] transition-all"
                value={content.status || 'online'}
                onChange={(e) => updateField('status', e.target.value)}
              >
                <option value="online">online</option>
                <option value="offline">offline</option>
                <option value="idle">idle</option>
                <option value="busy">do not disturb</option>
                <option value="streaming">streaming</option>
              </select>
            </div>
            <Checkbox label="show label" checked={content.showLabel !== false} onChange={(v: boolean) => updateField('showLabel', v)} />
          </>
        );
      case 'versionbadge':
        return (
          <>
            <div className="space-y-4">
              <label className="text-white/70 text-sm">versions</label>
              {(content.versions || ['1.10', '1.21.11']).map((ver: string, idx: number) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm"
                    value={ver}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleArrayUpdate('versions', idx, e.target.value)}
                  />
                  <button onClick={() => handleArrayRemove('versions', idx)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                </div>
              ))}
              <button onClick={() => handleArrayAdd('versions', '1.2x.x')} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <Plus size={14} /> add version
              </button>
            </div>
          </>
        );
      case 'countdown':
        return (
          <>
            <Input label="title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <Input label="target date" type="datetime-local" value={content.targetDate?.split('.')[0]} onChange={(v: string) => updateField('targetDate', v)} />
          </>
        );
      case 'gallery':
        return (
          <>
            <Input label="columns" type="number" min="1" max="6" value={content.columns} onChange={(v: number) => updateField('columns', Number(v))} />
            <div className="space-y-4 mt-4">
              <label className="text-white/70 text-sm">images</label>
              {(content.images || []).map((img: any, idx: number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">image {idx + 1}</span>
                    <button onClick={() => handleArrayRemove('images', idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex gap-2">
                    <Input className="flex-1" value={img.src} onChange={(v: string) => handleArrayUpdate('images', idx, { ...img, src: v })} placeholder="image url" />
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          const uploaded = await api.upload(file);
                          const url = uploaded?.url || uploaded?.data?.url;
                          if (url) handleArrayUpdate('images', idx, { ...img, src: url });
                        };
                        input.click();
                      }}
                      className="px-3 bg-white/10 rounded hover:bg-white/20 text-white"
                    >
                      <Upload size={14} />
                    </button>
                  </div>
                  <Input value={img.alt} onChange={(v: string) => handleArrayUpdate('images', idx, { ...img, alt: v })} placeholder="alt text" />
                </div>
              ))}
              <button onClick={() => handleArrayAdd('images', { src: '', alt: '' })} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <Plus size={14} /> add image
              </button>
            </div>
          </>
        );
      case 'financial_chart':
        return (
          <>
            <Input label="chart title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <div className="space-y-4 mt-4">
              <label className="text-white/70 text-sm">data points</label>
              {(content.data || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-white/40">item {idx + 1}</span>
                    <button onClick={() => handleArrayRemove('data', idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={item.name} onChange={(v: string) => handleArrayUpdate('data', idx, { ...item, name: v })} placeholder="label" />
                    <Input type="number" value={item.value} onChange={(v: number) => handleArrayUpdate('data', idx, { ...item, value: Number(v) })} placeholder="value" />
                  </div>
                  <Input value={item.color} onChange={(v: string) => handleArrayUpdate('data', idx, { ...item, color: v })} placeholder="color (optional)" />
                </div>
              ))}
              <button onClick={() => handleArrayAdd('data', { name: 'new label', value: 0, color: 'var(--primary)' })} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <Plus size={14} /> add data point
              </button>
            </div>
          </>
        );
      case 'tier_list':
        return (
          <>
            <div className="space-y-4">
              <label className="text-white/70 text-sm">tiers</label>
              {(content.rows || []).map((row: any, idx: number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-bold text-[var(--primary)]">tier {idx + 1}</span>
                    <button onClick={() => handleArrayRemove('rows', idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="label" value={row.label} onChange={(v: string) => handleArrayUpdate('rows', idx, { ...row, label: v })} />
                    <Input label="color" value={row.color} onChange={(v: string) => handleArrayUpdate('rows', idx, { ...row, color: v })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40">items (comma separated)</label>
                    <textarea
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--primary)] transition-all min-h-[60px]"
                      value={row.items?.join(', ') || ''}
                      onChange={(e) => handleArrayUpdate('rows', idx, { ...row, items: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    />
                  </div>
                </div>
              ))}
              <button onClick={() => handleArrayAdd('rows', { label: 'new', color: '#7f7fff', items: [] })} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <Plus size={14} /> add tier
              </button>
            </div>
          </>
        );
      case 'shopping_card':
        return (
          <>
            <Input label="product title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <Input label="price label" value={content.price} onChange={(v: string) => updateField('price', v)} />
            <div className="space-y-2">
              <label className="text-white/70 text-sm">product image</label>
              <div className="flex gap-2">
                <Input placeholder="image url" value={content.image} onChange={(v: string) => updateField('image', v)} />
                <button
                  onClick={() => handleFileUpload('image', { aspectRatio: 16 / 9, shape: 'rect', width: 400, height: 225 })}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md transition-colors"
                >
                  <Upload size={16} />
                </button>
              </div>
            </div>
            <Input label="description" value={content.description} onChange={(v: string) => updateField('description', v)} textarea />
            <Input label="button text" value={content.buttonText} onChange={(v: string) => updateField('buttonText', v)} />
          </>
        );
      case 'floating_reminder':
        return (
          <>
            <Input label="reminder content" value={content.content} onChange={(v: string) => updateField('content', v)} textarea />
            <Input label="background color" value={content.color} onChange={(v: string) => updateField('color', v)} />
          </>
        );
      case 'stats_bar':
        return (
          <>
            <Input label="stat label" value={content.label} onChange={(v: string) => updateField('label', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="current value" type="number" value={content.value} onChange={(v: number) => updateField('value', Number(v))} />
              <Input label="max value" type="number" value={content.max} onChange={(v: number) => updateField('max', Number(v))} />
            </div>
            <Input label="bar color" value={content.color} onChange={(v: string) => updateStyle('color', v)} />
            <Checkbox label="show numeric value" checked={content.showValue !== false} onChange={(v: boolean) => updateField('showValue', v)} />
          </>
        );
      case 'eternal_flame':
      case 'gold_pile':
      case 'sleep_ring':
        return <div className="text-white/50 italic">visual widget. styles can be adjusted above.</div>;
      case 'testimonial':
        return (
          <>
            <Input label="quote" value={content.quote} onChange={(v: string) => updateField('quote', v)} textarea />
            <Input label="author name" value={content.author} onChange={(v: string) => updateField('author', v)} />
            <Input label="role/title" value={content.role} onChange={(v: string) => updateField('role', v)} />
            <div className="space-y-2">
              <label className="text-white/70 text-sm">avatar</label>
              <div className="flex gap-2">
                <Input
                  placeholder="avatar url (optional)"
                  value={content.avatar}
                  onChange={(v: string) => updateField('avatar', v)}
                />
                <button
                  onClick={() => handleFileUpload('avatar', { aspectRatio: 1, shape: 'round', width: 200, height: 200 })}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <Upload size={16} />
                  upload
                </button>
              </div>
              {content.avatar && (
                <div className="mt-2">
                  <img src={content.avatar} alt="preview" className="w-16 h-16 rounded-full object-cover" />
                </div>
              )}
            </div>
          </>
        );
      default:
        return <div className="text-white/50 italic">no specific editor for this widget type.</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50000] flex items-center justify-center p-4 widget-property-editor" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-[var(--primary)] lowercase">edit {element.type}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {renderFields()}
          {/* common style fields */}
          <div className="p-4 bg-white/5 rounded-xl space-y-4 mb-4">
            <h4 className="text-[var(--primary)] text-xs font-black  mb-2 lowercase">background styles</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-white/70 text-xs font-bold lowercase">background (hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={styles.backgroundColor || '#03000c'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="w-12 h-9 p-0 border border-white/10 rounded"
                  />
                  <input
                    type="text"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[var(--primary)] outline-none"
                    value={styles.backgroundColor || ''}
                    placeholder="#03000c"
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex justify-between items-center text-xs text-white/70 font-bold mb-1">
                  <span>opacity</span>
                  <span class
