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

export function WidgetPropertyEditor({ element, onupdate, onclose }: props) {
  const [content, setcontent] = usestate<any>(element.content || {});
  const [styles, setstyles] = usestate<any>(element.styles || {});
  const [showiconpicker, setshowiconpicker] = usestate(false);
  const [cropperopen, setcropperopen] = usestate(false);
  const [cropperfile, setcropperfile] = usestate<File | null>(null);
  const [cropperfield, setcropperfield] = usestate<string>('');
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
      const file = (e.target as htmlinputelement).files?.[0];
      if (!file) return;

      setcropperfile(file);
      setcropperfield(field);
      setcropperconfig(config);
      setcropperopen(true);
    };
    input.click();
  };

  const handlecropcomplete = async (croppedblob: blob) => {
    const toastid = toast.loading('uploading image...');
    try {
      // convert blob to file
      const file = new file([croppedblob], cropperfile?.name || 'cropped.png', { type: 'image/png' });
      const uploaded = await api.upload(file);
      const url = uploaded?.url || uploaded?.data?.url;
      if (url) {
        updatefield(cropperfield, url);
        toast.success('image uploaded', { id: toastid });
      } else {
        toast.error('upload failed - no url returned', { id: toastid });
      }
    } catch (err) {
      console.error(err);
      toast.error('upload failed', { id: toastid });
    }
  };

  const renderfields = () => {
    switch (element.type) {
      case 'serverip':
        return (
          <>
            <input label="java ip" value={content.javaip} onchange={(v: string) => updatefield('javaip', v)} />
            <input label="java port" value={content.javaport} onchange={(v: string) => updatefield('javaport', v)} />
            <input label="bedrock ip" value={content.bedrockip} onchange={(v: string) => updatefield('bedrockip', v)} />
            <input label="bedrock port" value={content.bedrockport} onchange={(v: string) => updatefield('bedrockport', v)} />
            <checkbox label="show bedrock" checked={content.showbedrock} onchange={(v: boolean) => updatefield('showbedrock', v)} />
          </>
        );
      case 'serverstatus':
        return (
          <>
            <input label="motd" value={content.motd} onchange={(v: string) => updatefield('motd', v)} />
            <input label="player count" type="number" value={content.playercount} onchange={(v: number) => updatefield('playercount', number(v))} />
            <input label="max players" type="number" value={content.maxplayers} onchange={(v: number) => updatefield('maxplayers', number(v))} />
            <checkbox label="is online (static)" checked={content.isonline} onchange={(v: boolean) => updatefield('isonline', v)} />
          </>
        );
      case 'rules':
        return (
          <>
            <input label="title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <div classname="space-y-2 mt-4">
              <label classname="text-white/70 text-sm">rules list</label>
              {(content.rules || []).map((rule: string, idx: number) => (
                <div key={idx} classname="flex gap-2">
                  <input
                    classname="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm"
                    value={rule}
                    onchange={(e: react.changeevent<htmlinputelement>) => handlearrayupdate('rules', idx, e.target.value)}
                  />
                  <button onclick={() => handlearrayremove('rules', idx)} classname="text-red-400 hover:text-red-300"><trash2 size={16} /></button>
                </div>
              ))}
              <button onclick={() => handlearrayadd('rules', 'new rule')} classname="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <plus size={14} /> add rule
              </button>
            </div>
          </>
        );
      case 'featurecard':
        return (
          <>
            <input label="title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <input label="description" value={content.description} onchange={(v: string) => updatefield('description', v)} textarea />

            <div classname="flex flex-col gap-1.5 relative">
              <label classname="text-white/70 text-xs  font-bold">icon</label>
              <button
                onclick={() => setshowiconpicker(!showiconpicker)}
                classname="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div classname="flex items-center gap-3">
                  <div classname="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    {(() => {
                      const iconname = content.icon || 'shield';
                      const formattedname = iconname.charat(0).touppercase() + iconname.slice(1);
                      // @ts-expect-error -- dynamic LucideIcons lookup
                      const Icon = (LucideIcons as any)[formattedName] || LucideIcons.shield;
                      return <icon size={18} />;
                    })()}
                  </div>
                  <span classname="text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <search size={16} classname="text-white/20" />
              </button>

              {showiconpicker && (
                <div classname="absolute top-full left-0 mt-2 z-[3000]">
                  <iconpicker
                    value={content.icon || 'shield'}
                    onchange={(icon) => updatefield('icon', icon)}
                    onclose={() => setshowiconpicker(false)}
                  />
                </div>
              )}
            </div>

            <input label="color (hex)" value={content.color} onchange={(v: string) => updatefield('color', v)} />
          </>
        );
      case 'staffcard':
        return (
          <>
            <input label="username (ign)" value={content.username} onchange={(v: string) => updatefield('username', v)} />
            <input label="role" value={content.role} onchange={(v: string) => updatefield('role', v)} />
            <div classname="space-y-2">
              <label classname="text-white/70 text-sm">avatar</label>
              <div classname="flex gap-2">
                <input
                  placeholder="custom avatar url (optional)"
                  value={content.avatar}
                  onchange={(v: string) => updatefield('avatar', v)}
                />
                <button
                  onclick={() => handlefileupload('avatar')}
                  classname="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <upload size={16} />
                  upload
                </button>
              </div>
              {content.avatar && (
                <div classname="mt-2">
                  <img src={content.avatar} alt="preview" classname="w-16 h-16 rounded-lg object-cover" />
                </div>
              )}
            </div>
            <input label="role color" value={content.color} onchange={(v: string) => updatefield('color', v)} />
          </>
        );
      case 'faq':
        return (
          <>
            <input label="section title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <div classname="space-y-4 mt-4">
              <label classname="text-white/70 text-sm">questions</label>
              {(content.items || []).map((item: any, idx: number) => (
                <div key={idx} classname="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div classname="flex justify-between">
                    <span classname="text-xs text-white/40">question {idx + 1}</span>
                    <button onclick={() => handlearrayremove('items', idx)} classname="text-red-400 hover:text-red-300"><trash2 size={14} /></button>
                  </div>
                  <input value={item.question} onchange={(v: string) => handlearrayupdate('items', idx, { ...item, question: v })} placeholder="question" />
                  <input value={item.answer} onchange={(v: string) => handlearrayupdate('items', idx, { ...item, answer: v })} textarea placeholder="answer" />
                </div>
              ))}
              <button onclick={() => handlearrayadd('items', { question: 'new question', answer: 'answer here' })} classname="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <plus size={14} /> add question
              </button>
            </div>
          </>
        );
      case 'hero':
        return (
          <>
            <input label="main title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <input label="subtitle" value={content.subtitle} onchange={(v: string) => updatefield('subtitle', v)} />
            <input label="cta button text" value={content.ctatext} onchange={(v: string) => updatefield('ctatext', v)} />
            <input label="cta link" value={content.ctalink} onchange={(v: string) => updatefield('ctalink', v)} />
            <div classname="space-y-2">
              <label classname="text-white/70 text-sm">background image</label>
              <div classname="flex gap-2">
                <input
                  placeholder="background image url"
                  value={content.backgroundimage}
                  onchange={(v: string) => updatefield('backgroundimage', v)}
                />
                <button
                  onclick={() => handlefileupload('backgroundimage', { aspectratio: 16 / 9, shape: 'rect', width: 400, height: 225 })}
                  classname="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <upload size={16} />
                  upload
                </button>
              </div>
              {content.backgroundimage && (
                <div classname="mt-2">
                  <img src={content.backgroundimage} alt="preview" classname="w-full h-24 rounded-lg object-cover" />
                </div>
              )}
            </div>
            <checkbox label="show server ip widget" checked={content.showserverip} onchange={(v: boolean) => updatefield('showserverip', v)} />
            {content.showserverip && (
              <input label="java ip" value={content.javaip} onchange={(v: string) => updatefield('javaip', v)} />
            )}
          </>
        );
      case 'button':
      case 'slick_button':
        return (
          <>
            <input label="button text" value={content.text} onchange={(v) => updatefield('text', v)} />
            <input label="url / link" value={content.url} onchange={(v) => updatefield('url', v)} />

            <div classname="flex flex-col gap-1.5 relative">
              <label classname="text-white/70 text-xs  font-bold">icon</label>
              <button
                onclick={() => setshowiconpicker(!showiconpicker)}
                classname="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div classname="flex items-center gap-3">
                  <div classname="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    {(() => {
                      const iconname = content.icon || 'arrow-right';
                      const formattedname = iconname.charat(0).touppercase() + iconname.slice(1).replace(/-([a-z])/g, (g) => g[1].touppercase());
                      // @ts-ignore
                      const icon = lucideicons[formattedname] || lucideicons.arrowright;
                      return <icon size={18} />;
                    })()}
                  </div>
                  <span classname="text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <lucideicons.search size={16} classname="text-white/20" />
              </button>

              {showiconpicker && (
                <div classname="absolute top-full left-0 mt-2 z-[3000]">
                  <iconpicker
                    value={content.icon || 'arrow-right'}
                    onchange={(icon) => updatefield('icon', icon)}
                    onclose={() => setshowiconpicker(false)}
                  />
                </div>
              )}
            </div>

            <div classname="grid grid-cols-2 gap-4">
              <input label="bg color" value={content.bgcolor} onchange={(v) => updatefield('bgcolor', v)} />
              <input label="text color" value={content.textcolor} onchange={(v) => updatefield('textcolor', v)} />
            </div>
            <input label="icon color (optional)" value={content.iconcolor} onchange={(v) => updatefield('iconcolor', v)} />
          </>
        );
      case 'video':
      case 'image':
      case 'pdf_viewer':
        return (
          <>
            <input label="url" value={content.url} onchange={(v: string) => updatefield('url', v)} />
            {element.type === 'image' && <input label="alt text" value={content.alt} onchange={(v: string) => updatefield('alt', v)} />}
            {element.type === 'video' && (
              <>
                <checkbox label="autoplay" checked={content.autoplay} onchange={(v: boolean) => updatefield('autoplay', v)} />
                <checkbox label="loop" checked={content.loop} onchange={(v: boolean) => updatefield('loop', v)} />
                <checkbox label="muted" checked={content.muted} onchange={(v: boolean) => updatefield('muted', v)} />
                <checkbox label="controls" checked={content.controls} onchange={(v: boolean) => updatefield('controls', v)} />
              </>
            )}
          </>
        );
      case 'database_view':
        return (
          <>
            <input label="collection name" value={content.collectionname} onchange={(v: string) => updatefield('collectionname', v)} />
            <div classname="flex flex-col gap-1.5">
              <label classname="text-white/70 text-xs  font-bold">view type</label>
              <select
                classname="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--primary)] transition-all"
                value={content.viewtype || 'table'}
                onchange={(e) => updatefield('viewtype', e.target.value)}
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
            <input label="title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <input label="url" value={content.url} onchange={(v: string) => updatefield('url', v)} />
            <div classname="flex flex-col gap-1.5 relative">
              <label classname="text-white/70 text-xs  font-bold">icon</label>
              <button
                onclick={() => setshowiconpicker(!showiconpicker)}
                classname="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div classname="flex items-center gap-3">
                  <div classname="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    {(() => {
                      const iconname = content.icon || 'link-2';
                      const formattedname = iconname.charat(0).touppercase() + iconname.slice(1).replace(/-([a-z])/g, (g: any) => g[1].touppercase());
                      // @ts-ignore
                      const icon = lucideicons[formattedname] || lucideicons.link2;
                      return <icon size={18} />;
                    })()}
                  </div>
                  <span classname="text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <search size={16} classname="text-white/20" />
              </button>

              {showiconpicker && (
                <div classname="absolute top-full left-0 mt-2 z-[3000]">
                  <iconpicker
                    value={content.icon || 'link-2'}
                    onchange={(icon) => updatefield('icon', icon)}
                    onclose={() => setshowiconpicker(false)}
                  />
                </div>
              )}
            </div>
            <input label="description" value={content.description} onchange={(v: string) => updatefield('description', v)} />
            <input label="color (hex)" value={content.color} onchange={(v: string) => updatefield('color', v)} />
          </>
        );
      case 'statusindicator':
        return (
          <>
            <input label="label" value={content.label} onchange={(v: string) => updatefield('label', v)} />
            <div classname="flex flex-col gap-1.5">
              <label classname="text-white/70 text-xs  font-bold">status</label>
              <select
                classname="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--primary)] transition-all"
                value={content.status || 'online'}
                onchange={(e) => updatefield('status', e.target.value)}
              >
                <option value="online">online</option>
                <option value="offline">offline</option>
                <option value="idle">idle</option>
                <option value="busy">do not disturb</option>
                <option value="streaming">streaming</option>
              </select>
            </div>
            <checkbox label="show label" checked={content.showlabel !== false} onchange={(v: boolean) => updatefield('showlabel', v)} />
          </>
        );
      case 'versionbadge':
        return (
          <>
            <div classname="space-y-4">
              <label classname="text-white/70 text-sm">versions</label>
              {(content.versions || ['1.10', '1.21.11']).map((ver: string, idx: number) => (
                <div key={idx} classname="flex gap-2">
                  <input
                    classname="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-sm"
                    value={ver}
                    onchange={(e: react.changeevent<htmlinputelement>) => handlearrayupdate('versions', idx, e.target.value)}
                  />
                  <button onclick={() => handlearrayremove('versions', idx)} classname="text-red-400 hover:text-red-300"><trash2 size={16} /></button>
                </div>
              ))}
              <button onclick={() => handlearrayadd('versions', '1.2x.x')} classname="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <plus size={14} /> add version
              </button>
            </div>
          </>
        );
      case 'countdown':
        return (
          <>
            <input label="title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <input label="target date" type="datetime-local" value={content.targetdate?.split('.')[0]} onchange={(v: string) => updatefield('targetdate', v)} />
          </>
        );
      case 'gallery':
        return (
          <>
            <input label="columns" type="number" min="1" max="6" value={content.columns} onchange={(v: number) => updatefield('columns', number(v))} />
            <div classname="space-y-4 mt-4">
              <label classname="text-white/70 text-sm">images</label>
              {(content.images || []).map((img: any, idx: number) => (
                <div key={idx} classname="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div classname="flex justify-between items-center">
                    <span classname="text-xs text-white/40">image {idx + 1}</span>
                    <button onclick={() => handlearrayremove('images', idx)} classname="text-red-400 hover:text-red-300"><trash2 size={14} /></button>
                  </div>
                  <div classname="flex gap-2">
                    <input classname="flex-1" value={img.src} onchange={(v: string) => handlearrayupdate('images', idx, { ...img, src: v })} placeholder="image url" />
                    <button
                      onclick={() => {
                        const input = document.createelement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as htmlinputelement).files?.[0];
                          if (!file) return;
                          const uploaded = await api.upload(file);
                          const url = uploaded?.url || uploaded?.data?.url;
                          if (url) handlearrayupdate('images', idx, { ...img, src: url });
                        };
                        input.click();
                      }}
                      classname="px-3 bg-white/10 rounded hover:bg-white/20 text-white"
                    >
                      <upload size={14} />
                    </button>
                  </div>
                  <input value={img.alt} onchange={(v: string) => handlearrayupdate('images', idx, { ...img, alt: v })} placeholder="alt text" />
                </div>
              ))}
              <button onclick={() => handlearrayadd('images', { src: '', alt: '' })} classname="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <plus size={14} /> add image
              </button>
            </div>
          </>
        );
      case 'financial_chart':
        return (
          <>
            <input label="chart title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <div classname="space-y-4 mt-4">
              <label classname="text-white/70 text-sm">data points</label>
              {(content.data || []).map((item: any, idx: number) => (
                <div key={idx} classname="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div classname="flex justify-between">
                    <span classname="text-xs text-white/40">item {idx + 1}</span>
                    <button onclick={() => handlearrayremove('data', idx)} classname="text-red-400 hover:text-red-300"><trash2 size={14} /></button>
                  </div>
                  <div classname="grid grid-cols-2 gap-2">
                    <input value={item.name} onchange={(v: string) => handlearrayupdate('data', idx, { ...item, name: v })} placeholder="label" />
                    <input type="number" value={item.value} onchange={(v: number) => handlearrayupdate('data', idx, { ...item, value: number(v) })} placeholder="value" />
                  </div>
                  <input value={item.color} onchange={(v: string) => handlearrayupdate('data', idx, { ...item, color: v })} placeholder="color (optional)" />
                </div>
              ))}
              <button onclick={() => handlearrayadd('data', { name: 'new label', value: 0, color: 'var(--primary)' })} classname="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <plus size={14} /> add data point
              </button>
            </div>
          </>
        );
      case 'tier_list':
        return (
          <>
            <div classname="space-y-4">
              <label classname="text-white/70 text-sm">tiers</label>
              {(content.rows || []).map((row: any, idx: number) => (
                <div key={idx} classname="p-3 bg-white/5 rounded flex flex-col gap-2 text-sm">
                  <div classname="flex justify-between border-b border-white/5 pb-2">
                    <span classname="font-bold text-[var(--primary)]">tier {idx + 1}</span>
                    <button onclick={() => handlearrayremove('rows', idx)} classname="text-red-400 hover:text-red-300"><trash2 size={14} /></button>
                  </div>
                  <div classname="grid grid-cols-2 gap-2">
                    <input label="label" value={row.label} onchange={(v: string) => handlearrayupdate('rows', idx, { ...row, label: v })} />
                    <input label="color" value={row.color} onchange={(v: string) => handlearrayupdate('rows', idx, { ...row, color: v })} />
                  </div>
                  <div classname="space-y-1">
                    <label classname="text-[10px] text-white/40">items (comma separated)</label>
                    <textarea
                      classname="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--primary)] transition-all min-h-[60px]"
                      value={row.items?.join(', ') || ''}
                      onchange={(e) => handlearrayupdate('rows', idx, { ...row, items: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    />
                  </div>
                </div>
              ))}
              <button onclick={() => handlearrayadd('rows', { label: 'new', color: '#7f7fff', items: [] })} classname="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                <plus size={14} /> add tier
              </button>
            </div>
          </>
        );
      case 'shopping_card':
        return (
          <>
            <input label="product title" value={content.title} onchange={(v: string) => updatefield('title', v)} />
            <input label="price label" value={content.price} onchange={(v: string) => updatefield('price', v)} />
            <div classname="space-y-2">
              <label classname="text-white/70 text-sm">product image</label>
              <div classname="flex gap-2">
                <input placeholder="image url" value={content.image} onchange={(v: string) => updatefield('image', v)} />
                <button
                  onclick={() => handlefileupload('image', { aspectratio: 16 / 9, shape: 'rect', width: 400, height: 225 })}
                  classname="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md transition-colors"
                >
                  <upload size={16} />
                </button>
              </div>
            </div>
            <input label="description" value={content.description} onchange={(v: string) => updatefield('description', v)} textarea />
            <input label="button text" value={content.buttontext} onchange={(v: string) => updatefield('buttontext', v)} />
          </>
        );
      case 'floating_reminder':
        return (
          <>
            <input label="reminder content" value={content.content} onchange={(v: string) => updatefield('content', v)} textarea />
            <input label="background color" value={content.color} onchange={(v: string) => updatefield('color', v)} />
          </>
        );
      case 'stats_bar':
        return (
          <>
            <input label="stat label" value={content.label} onchange={(v: string) => updatefield('label', v)} />
            <div classname="grid grid-cols-2 gap-4">
              <input label="current value" type="number" value={content.value} onchange={(v: number) => updatefield('value', number(v))} />
              <input label="max value" type="number" value={content.max} onchange={(v: number) => updatefield('max', number(v))} />
            </div>
            <input label="bar color" value={content.color} onchange={(v: string) => updatestyle('color', v)} />
            <checkbox label="show numeric value" checked={content.showvalue !== false} onchange={(v: boolean) => updatefield('showvalue', v)} />
          </>
        );
      case 'eternal_flame':
      case 'gold_pile':
      case 'sleep_ring':
        return <div classname="text-white/50 italic">visual widget. styles can be adjusted above.</div>;
      case 'testimonial':
        return (
          <>
            <input label="quote" value={content.quote} onchange={(v: string) => updatefield('quote', v)} textarea />
            <input label="author name" value={content.author} onchange={(v: string) => updatefield('author', v)} />
            <input label="role/title" value={content.role} onchange={(v: string) => updatefield('role', v)} />
            <div classname="space-y-2">
              <label classname="text-white/70 text-sm">avatar</label>
              <div classname="flex gap-2">
                <input
                  placeholder="avatar url (optional)"
                  value={content.avatar}
                  onchange={(v: string) => updatefield('avatar', v)}
                />
                <button
                  onclick={() => handlefileupload('avatar', { aspectratio: 1, shape: 'round', width: 200, height: 200 })}
                  classname="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <upload size={16} />
                  upload
                </button>
              </div>
              {content.avatar && (
                <div classname="mt-2">
                  <img src={content.avatar} alt="preview" classname="w-16 h-16 rounded-full object-cover" />
                </div>
              )}
            </div>
          </>
        );
      default:
        return <div classname="text-white/50 italic">no specific editor for this widget type.</div>;
    }
  };

  return (
    <div classname="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50000] flex items-center justify-center p-4 widget-property-editor" onclick={onclose}>
      <div
        classname="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        onclick={e => e.stoppropagation()}
        onmousedown={e => e.stoppropagation()}
      >
        <div classname="flex justify-between items-center p-6 border-b border-white/10">
          <h3 classname="text-xl font-bold text-[var(--primary)] lowercase">edit {element.type}</h3>
          <button onclick={onclose} classname="text-white/40 hover:text-white"><x size={20} /></button>
        </div>

        <div classname="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {renderfields()}
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
                  <span className="text-[var(--primary)]">{Math.round((styles.opacity ?? 0.75) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={Math.round((styles.opacity ?? 0.75) * 100)}
                  onChange={(e) => updateStyle('opacity', Number(e.target.value) / 100)}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                />
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl space-y-4 mb-4">
              <h4 className="text-[var(--primary)] text-xs font-black mb-2 lowercase">border styles</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="width (px)"
                  type="number"
                  value={styles.borderWidth}
                  onChange={(v: number) => updateStyle('borderWidth', Number(v))}
                  placeholder="0"
                />
                <Input
                  label="radius (px)"
                  type="number"
                  value={styles.borderRadius}
                  onChange={(v: number) => updateStyle('borderRadius', Number(v))}
                  placeholder="16"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/70 text-xs font-bold">color</label>
                  <div className="flex items-center gap-2 bg-black/50 p-1 rounded-lg border border-white/10">
                    <input
                      type="color"
                      className="w-8 h-8 p-0 border-none rounded cursor-pointer"
                      style={{ backgroundColor: 'transparent' }}
                      value={styles.borderColor || '#000000'}
                      onChange={(e) => updateStyle('borderColor', e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-none text-white text-xs outline-none font-mono"
                      value={styles.borderColor || ''}
                      placeholder="#000000"
                      onChange={(e) => updateStyle('borderColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {cropperopen && (
            <ImageCropper
              open={cropperOpen}
              onClose={() => {
                setCropperOpen(false);
                setCropperFile(null);
              }}
              imageFile={cropperFile}
              onCropComplete={handleCropComplete}
              aspectRatio={cropperConfig.aspectRatio}
              shape={cropperConfig.shape}
              previewWidth={cropperConfig.width}
              previewHeight={cropperConfig.height}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// helper components
const Input = ({ label, value, onChange, type = 'text', textarea, placeholder }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-white/70 text-xs  font-bold">{label}</label>
    {textarea ? (
      <div className="relative">
        <textarea
          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[var(--primary)] outline-none min-h-[80px]"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          title="ask wilson about this field (context included)"
          onClick={async () => {
            const q = window.prompt('ask wilson about this field (context will be included):');
            if (!q) return;
            (await import('@/stores/llm-store')).useLLMStore.getState().setContext(value || '');
            const res = await (await import('@/stores/llm-store')).useLLMStore.getState().askWilson(q);
            if (res) onChange(String(res));
            (await import('@/stores/llm-store')).useLLMStore.getState().setContext(null);
          }}
          className="absolute top-2 right-2 text-[10px] bg-black/60 border border-white/10 rounded px-2 py-1 text-primary hover:bg-primary/10"
        >
          ai
        </button>
      </div>
    ) : (
      <input
        type={type}
        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[var(--primary)] outline-none"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors">
    <input
      type="checkbox"
      className="w-5 h-5 rounded border-white/20 bg-black/50 text-[var(--primary)] focus:ring-[var(--primary)]"
      checked={checked || false}
      onChange={e => onChange(e.target.checked)}
    />
    <span className="text-white/80 text-sm">{label}</span>
  </label>
);