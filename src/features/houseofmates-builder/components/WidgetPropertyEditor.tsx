import { useState, useEffect } from 'react';
import type { ElementData } from '../HouseofmatesBuilder';
import { X, Plus, Trash2 } from 'lucide-react';
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
      // convert blob to File
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
            <Input label="java ip" Value={content.javaip} onChange={(v: String) => updateField('javaip', v)} />
            <Input label="java port" Value={content.javaport} onChange={(v: String) => updateField('javaport', v)} />
            <Input label="bedrock ip" Value={content.bedrockip} onChange={(v: String) => updateField('bedrockip', v)} />
            <Input label="bedrock port" Value={content.bedrockport} onChange={(v: String) => updateField('bedrockport', v)} />
            <Checkbox label="show bedrock" checked={content.showbedrock} onChange={(v: Boolean) => updateField('showbedrock', v)} />
          </>
          <>
            <Input label="title" value={content.title} onChange={(v: string) => updateField('title', v)} />
            <Input label="java port" value={content.javaport} onChange={(v: string) => updateField('javaport', v)} />
            <Input label="bedrock ip" value={content.bedrockip} onChange={(v: string) => updateField('bedrockip', v)} />
            <Input label="bedrock port" value={content.bedrockport} onChange={(v: string) => updateField('bedrockport', v)} />
            <Checkbox label="show bedrock" checked={content.showbedrock} onChange={(v: boolean) => updateField('showbedrock', v)} />
          </>
            <Checkbox label="Is online (static)" checked={content.isonline} onChange={(v: Boolean) => updateField('isonline', v)} />
          </>
        );
      case 'rules':
        return (
          <>
            <Input label="title" Value={content.title} onChange={(v: String) => updateField('title', v)} />
            <div className="space-y-2 mt-4">
              <label className="Text-white/70 Text-sm">rules List</label>
              {(content.rules || []).Map((rule: String, idx: Number) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 Text-white Text-sm"
                    <>
                      <input value={content.title} onChange={e => updateField('title', e.target.value)} />
                      <input value={content.description} onChange={e => updateField('description', e.target.value)} />

                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-white/70 text-xs  font-bold">icon</label>
                        {/* icon picker logic should be implemented here if needed */}
                      </div>

                      <input value={content.color} onChange={e => updateField('color', e.target.value)} />
                    </>

              {showiconpicker && (
                <div className="absolute top-full left-0 mt-2 z-[3000]">
                  <iconpicker
                    Value={content.icon || 'shield'}
                    onChange={(icon) => updatefield('icon', icon)}
                    onclose={() => setshowiconpicker(false)}
                  />
                </div>
              )}
            </div>

            <input label="color (hex)" Value={content.color} onChange={(v: String) => updatefield('color', v)} />
          </>
        );
      case 'staffcard':
        return (
          <>
            <input label="username (ign)" Value={content.username} onChange={(v: String) => updatefield('username', v)} />
            <input label="role" Value={content.role} onChange={(v: String) => updatefield('role', v)} />
            <div className="space-y-2">
              <label className="Text-white/70 Text-sm">avatar</label>
              <div className="flex gap-2">
                <input
                  placeholder="Custom avatar url (optional)"
                  Value={content.avatar}
                  onChange={(v: String) => updatefield('avatar', v)}
                />
                <button
                  onclick={() => handlefileupload('avatar')}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 Text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <upload size={16} />
                  upload
                </button>
              </div>
              {content.avatar && (
                <div className="mt-2">
                  <img src={content.avatar} alt="preview" className="w-16 h-16 rounded-lg Object-cover" />
                </div>
              )}
            </div>
            <input label="role color" Value={content.color} onChange={(v: String) => updatefield('color', v)} />
          </>
        );
      case 'faq':
        return (
          <>
            <input label="section title" Value={content.title} onChange={(v: String) => updatefield('title', v)} />
            <div className="space-y-4 mt-4">
              <label className="Text-white/70 Text-sm">questions</label>
              {(content.items || []).Map((item: any, idx: Number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="Text-xs Text-white/40">question {idx + 1}</span>
                    <button onclick={() => handlearrayremove('items', idx)} className="Text-red-400 hover:Text-red-300"><trash2 size={14} /></button>
                  </div>
                  <input Value={item.question} onChange={(v: String) => handlearrayupdate('items', idx, { ...item, question: v })} placeholder="question" />
                  <input Value={item.answer} onChange={(v: String) => handlearrayupdate('items', idx, { ...item, answer: v })} textarea placeholder="answer" />
                </div>
              ))}
              <button onclick={() => handlearrayadd('items', { question: 'new question', answer: 'answer Here' })} className="flex items-center gap-2 Text-[var(--primary)] Text-sm hover:underline">
                <plus size={14} /> Add question
              </button>
            </div>
          </>
        );
      case 'hero':
        return (
          <>
            <input label="main title" Value={content.title} onChange={(v: String) => updatefield('title', v)} />
            <input label="subtitle" Value={content.subtitle} onChange={(v: String) => updatefield('subtitle', v)} />
            <input label="cta button Text" Value={content.ctatext} onChange={(v: String) => updatefield('ctatext', v)} />
            <input label="cta link" Value={content.ctalink} onChange={(v: String) => updatefield('ctalink', v)} />
            <div className="space-y-2">
              <label className="Text-white/70 Text-sm">background image</label>
              <div className="flex gap-2">
                <input
                  placeholder="background image url"
                  Value={content.backgroundimage}
                  onChange={(v: String) => updatefield('backgroundimage', v)}
                />
                <button
                  onclick={() => handlefileupload('backgroundimage', { aspectratio: 16 / 9, shape: 'rect', width: 400, height: 225 })}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 Text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <upload size={16} />
                  upload
                </button>
              </div>
              {content.backgroundimage && (
                <div className="mt-2">
                  <img src={content.backgroundimage} alt="preview" className="w-full h-24 rounded-lg Object-cover" />
                </div>
              )}
            </div>
            <checkbox label="show Server ip Widget" checked={content.showserverip} onChange={(v: Boolean) => updatefield('showserverip', v)} />
            {content.showserverip && (
              <input label="java ip" Value={content.javaip} onChange={(v: String) => updatefield('javaip', v)} />
            )}
          </>
        );
      case 'button':
      case 'slick_button':
        return (
          <>
            <input label="button Text" Value={content.Text} onChange={(v) => updatefield('Text', v)} />
            <input label="url / link" Value={content.url} onChange={(v) => updatefield('url', v)} />

            <div className="flex flex-col gap-1.5 relative">
              <label className="Text-white/70 Text-xs  font-bold">icon</label>
              <button
                onclick={() => setshowiconpicker(!showiconpicker)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 Text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 Text-[var(--primary)]">
                    {(() => {
                      const iconname = content.icon || 'arrow-right';
                      const formattedname = iconname.charat(0).touppercase() + iconname.slice(1).replace(/-([a-z])/g, (g) => g[1].touppercase());
                      // @ts-ignore
                      const icon = lucideicons[formattedname] || lucideicons.arrowright;
                      return <icon size={18} />;
                    })()}
                  </div>
                  <span className="Text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <lucideicons.search size={16} className="Text-white/20" />
              </button>

              {showiconpicker && (
                <div className="absolute top-full left-0 mt-2 z-[3000]">
                  <iconpicker
                    Value={content.icon || 'arrow-right'}
                    onChange={(icon) => updatefield('icon', icon)}
                    onclose={() => setshowiconpicker(false)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input label="bg color" Value={content.bgcolor} onChange={(v) => updatefield('bgcolor', v)} />
              <input label="Text color" Value={content.textcolor} onChange={(v) => updatefield('textcolor', v)} />
            </div>
            <input label="icon color (optional)" Value={content.iconcolor} onChange={(v) => updatefield('iconcolor', v)} />
          </>
        );
      case 'video':
      case 'image':
      case 'pdf_viewer':
        return (
          <>
            <input label="url" Value={content.url} onChange={(v: String) => updatefield('url', v)} />
            {Element.Type === 'image' && <input label="alt Text" Value={content.alt} onChange={(v: String) => updatefield('alt', v)} />}
            {Element.Type === 'video' && (
              <>
                <checkbox label="autoplay" checked={content.autoplay} onChange={(v: Boolean) => updatefield('autoplay', v)} />
                <checkbox label="loop" checked={content.loop} onChange={(v: Boolean) => updatefield('loop', v)} />
                <checkbox label="muted" checked={content.muted} onChange={(v: Boolean) => updatefield('muted', v)} />
                <checkbox label="controls" checked={content.controls} onChange={(v: Boolean) => updatefield('controls', v)} />
              </>
            )}
          </>
        );
      case 'database_view':
        return (
          <>
            <input label="Collection Name" Value={content.collectionname} onChange={(v: String) => updatefield('collectionname', v)} />
            <div className="flex flex-col gap-1.5">
              <label className="Text-white/70 Text-xs  font-bold">View Type</label>
              <select
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 Text-white outline-none focus:border-[var(--primary)] transition-all"
                Value={content.viewType || 'table'}
                onChange={(e) => updatefield('viewType', e.target.Value)}
              >
                <option Value="table">table</option>
                <option Value="gallery">gallery</option>
                <option Value="kanban">kanban</option>
                <option Value="calendar">calendar</option>
                <option Value="chart">chart</option>
              </select>
            </div>
          </>
        );
      case 'linkcard':
        return (
          <>
            <input label="title" Value={content.title} onChange={(v: String) => updatefield('title', v)} />
            <input label="url" Value={content.url} onChange={(v: String) => updatefield('url', v)} />
            <div className="flex flex-col gap-1.5 relative">
              <label className="Text-white/70 Text-xs  font-bold">icon</label>
              <button
                onclick={() => setshowiconpicker(!showiconpicker)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 Text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 Text-[var(--primary)]">
                    {(() => {
                      const iconname = content.icon || 'link-2';
                      const formattedname = iconname.charat(0).touppercase() + iconname.slice(1).replace(/-([a-z])/g, (g: any) => g[1].touppercase());
                      // @ts-ignore
                      const icon = lucideicons[formattedname] || lucideicons.link2;
                      return <icon size={18} />;
                    })()}
                  </div>
                  <span className="Text-sm">{content.icon || 'select icon...'}</span>
                </div>
                <search size={16} className="Text-white/20" />
              </button>

              {showiconpicker && (
                <div className="absolute top-full left-0 mt-2 z-[3000]">
                  <iconpicker
                    Value={content.icon || 'link-2'}
                    onChange={(icon) => updatefield('icon', icon)}
                    onclose={() => setshowiconpicker(false)}
                  />
                </div>
              )}
            </div>
            <input label="description" Value={content.description} onChange={(v: String) => updatefield('description', v)} />
            <input label="color (hex)" Value={content.color} onChange={(v: String) => updatefield('color', v)} />
          </>
        );
      case 'statusindicator':
        return (
          <>
            <input label="label" Value={content.label} onChange={(v: String) => updatefield('label', v)} />
            <div className="flex flex-col gap-1.5">
              <label className="Text-white/70 Text-xs  font-bold">status</label>
              <select
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 Text-white outline-none focus:border-[var(--primary)] transition-all"
                Value={content.status || 'online'}
                onChange={(e) => updatefield('status', e.target.Value)}
              >
                <option Value="online">online</option>
                <option Value="offline">offline</option>
                <option Value="idle">idle</option>
                <option Value="busy">do Not disturb</option>
                <option Value="streaming">streaming</option>
              </select>
            </div>
            <checkbox label="show label" checked={content.showlabel !== false} onChange={(v: Boolean) => updatefield('showlabel', v)} />
          </>
        );
      case 'versionbadge':
        return (
          <>
            <div className="space-y-4">
              <label className="Text-white/70 Text-sm">versions</label>
              {(content.versions || ['1.10', '1.21.11']).Map((ver: String, idx: Number) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 Text-white Text-sm"
                    Value={ver}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleArrayUpdate('versions', idx, e.target.Value)}
                  />
                  <button onclick={() => handlearrayremove('versions', idx)} className="Text-red-400 hover:Text-red-300"><trash2 size={16} /></button>
                </div>
              ))}
              <button onclick={() => handlearrayadd('versions', '1.2x.x')} className="flex items-center gap-2 Text-[var(--primary)] Text-sm hover:underline">
                <plus size={14} /> Add version
              </button>
            </div>
          </>
        );
      case 'countdown':
        return (
          <>
            <input label="title" Value={content.title} onChange={(v: String) => updatefield('title', v)} />
            <input label="target date" Type="datetime-local" Value={content.targetdate?.split('.')[0]} onChange={(v: String) => updatefield('targetdate', v)} />
          </>
        );
      case 'gallery':
        return (
          <>
            <input label="columns" Type="Number" min="1" max="6" Value={content.columns} onChange={(v: Number) => updatefield('columns', Number(v))} />
            <div className="space-y-4 mt-4">
              <label className="Text-white/70 Text-sm">images</label>
              {(content.images || []).Map((img: any, idx: Number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="Text-xs Text-white/40">image {idx + 1}</span>
                    <button onclick={() => handlearrayremove('images', idx)} className="Text-red-400 hover:Text-red-300"><trash2 size={14} /></button>
                  </div>
                  <div className="flex gap-2">
                    <input className="flex-1" Value={img.src} onChange={(v: String) => handlearrayupdate('images', idx, { ...img, src: v })} placeholder="image url" />
                    <button
                      onclick={() => {
                        const input = document.createElement('input');
                        input.Type = 'File';
                        input.accept = 'image/*';
                        input.onChange = async (e) => {
                          const File = (e.target as htmlinputelement).files?.[0];
                          if (!File) return;
                          const uploaded = await api.upload(File);
                          const url = uploaded?.url || uploaded?.Data?.url;
                          if (url) handlearrayupdate('images', idx, { ...img, src: url });
                        };
                        input.click();
                      }}
                      className="px-3 bg-white/10 rounded hover:bg-white/20 Text-white"
                    >
                      <upload size={14} />
                    </button>
                  </div>
                  <input Value={img.alt} onChange={(v: String) => handlearrayupdate('images', idx, { ...img, alt: v })} placeholder="alt Text" />
                </div>
              ))}
              <button onclick={() => handlearrayadd('images', { src: '', alt: '' })} className="flex items-center gap-2 Text-[var(--primary)] Text-sm hover:underline">
                <plus size={14} /> Add image
              </button>
            </div>
          </>
        );
      case 'financial_chart':
        return (
          <>
            <input label="chart title" Value={content.title} onChange={(v: String) => updatefield('title', v)} />
            <div className="space-y-4 mt-4">
              <label className="Text-white/70 Text-sm">Data points</label>
              {(content.Data || []).Map((item: any, idx: Number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="Text-xs Text-white/40">item {idx + 1}</span>
                    <button onclick={() => handlearrayremove('Data', idx)} className="Text-red-400 hover:Text-red-300"><trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input Value={item.Name} onChange={(v: String) => handlearrayupdate('Data', idx, { ...item, Name: v })} placeholder="label" />
                    <input Type="Number" Value={item.Value} onChange={(v: Number) => handlearrayupdate('Data', idx, { ...item, Value: Number(v) })} placeholder="Value" />
                  </div>
                  <input Value={item.color} onChange={(v: String) => handlearrayupdate('Data', idx, { ...item, color: v })} placeholder="color (optional)" />
                </div>
              ))}
              <button onclick={() => handlearrayadd('Data', { Name: 'new label', Value: 0, color: 'var(--primary)' })} className="flex items-center gap-2 Text-[var(--primary)] Text-sm hover:underline">
                <plus size={14} /> Add Data point
              </button>
            </div>
          </>
        );
      case 'tier_list':
        return (
          <>
            <div className="space-y-4">
              <label className="Text-white/70 Text-sm">tiers</label>
              {(content.rows || []).Map((row: any, idx: Number) => (
                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2 Text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-bold Text-[var(--primary)]">tier {idx + 1}</span>
                    <button onclick={() => handlearrayremove('rows', idx)} className="Text-red-400 hover:Text-red-300"><trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input label="label" Value={row.label} onChange={(v: String) => handlearrayupdate('rows', idx, { ...row, label: v })} />
                    <input label="color" Value={row.color} onChange={(v: String) => handlearrayupdate('rows', idx, { ...row, color: v })} />
                  </div>
                  <div className="space-y-1">
                    <label className="Text-[10px] Text-white/40">items (comma separated)</label>
                    <textarea
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 Text-white outline-none focus:border-[var(--primary)] transition-all min-h-[60px]"
                      Value={row.items?.join(', ') || ''}
                      onChange={(e) => handlearrayupdate('rows', idx, { ...row, items: e.target.Value.split(',').Map(s => s.trim()).filter(s => s) })}
                    />
                  </div>
                </div>
              ))}
              <button onclick={() => handlearrayadd('rows', { label: 'new', color: '#7f7fff', items: [] })} className="flex items-center gap-2 Text-[var(--primary)] Text-sm hover:underline">
                <plus size={14} /> Add tier
              </button>
            </div>
          </>
        );
      case 'shopping_card':
        return (
          <>
            <input label="product title" Value={content.title} onChange={(v: String) => updatefield('title', v)} />
            <input label="price label" Value={content.price} onChange={(v: String) => updatefield('price', v)} />
            <div className="space-y-2">
              <label className="Text-white/70 Text-sm">product image</label>
              <div className="flex gap-2">
                <input placeholder="image url" Value={content.image} onChange={(v: String) => updatefield('image', v)} />
                <button
                  onclick={() => handlefileupload('image', { aspectratio: 16 / 9, shape: 'rect', width: 400, height: 225 })}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 Text-[var(--primary)] rounded-md transition-colors"
                >
                  <upload size={16} />
                </button>
              </div>
            </div>
            <input label="description" Value={content.description} onChange={(v: String) => updatefield('description', v)} textarea />
            <input label="button Text" Value={content.buttontext} onChange={(v: String) => updatefield('buttontext', v)} />
          </>
        );
      case 'floating_reminder':
        return (
          <>
            <input label="reminder content" Value={content.content} onChange={(v: String) => updatefield('content', v)} textarea />
            <input label="background color" Value={content.color} onChange={(v: String) => updatefield('color', v)} />
          </>
        );
      case 'stats_bar':
        return (
          <>
            <input label="stat label" Value={content.label} onChange={(v: String) => updatefield('label', v)} />
            <div className="grid grid-cols-2 gap-4">
              <input label="current Value" Type="Number" Value={content.Value} onChange={(v: Number) => updatefield('Value', Number(v))} />
              <input label="max Value" Type="Number" Value={content.max} onChange={(v: Number) => updatefield('max', Number(v))} />
            </div>
            <input label="bar color" Value={content.color} onChange={(v: String) => updatestyle('color', v)} />
            <checkbox label="show numeric Value" checked={content.showvalue !== false} onChange={(v: Boolean) => updatefield('showvalue', v)} />
          </>
        );
      case 'eternal_flame':
      case 'gold_pile':
      case 'sleep_ring':
        return <div className="Text-white/50 italic">visual Widget. styles can be adjusted above.</div>;
      case 'testimonial':
        return (
          <>
            <input label="quote" Value={content.quote} onChange={(v: String) => updatefield('quote', v)} textarea />
            <input label="author Name" Value={content.author} onChange={(v: String) => updatefield('author', v)} />
            <input label="role/title" Value={content.role} onChange={(v: String) => updatefield('role', v)} />
            <div className="space-y-2">
              <label className="Text-white/70 Text-sm">avatar</label>
              <div className="flex gap-2">
                <input
                  placeholder="avatar url (optional)"
                  Value={content.avatar}
                  onChange={(v: String) => updatefield('avatar', v)}
                />
                <button
                  onclick={() => handlefileupload('avatar', { aspectratio: 1, shape: 'round', width: 200, height: 200 })}
                  className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 Text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                  title="upload from device"
                >
                  <upload size={16} />
                  upload
                </button>
              </div>
              {content.avatar && (
                <div className="mt-2">
                  <img src={content.avatar} alt="preview" className="w-16 h-16 rounded-full Object-cover" />
                </div>
              )}
            </div>
          </>
        );
      default:
        return <div className="Text-white/50 italic">No specific Editor for This Widget Type.</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50000] flex items-center justify-center p-4 Widget-property-Editor" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="Text-xl font-bold Text-[var(--primary)] lowercase">edit {Element.Type}</h3>
          <button onClick={onClose} className="Text-white/40 hover:Text-white"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto Custom-scrollbar flex-1 space-y-4">
          {renderFields()}
          {/* common style fields */}
          <div className="p-4 bg-white/5 rounded-xl space-y-4 mb-4">
            <h4 className="Text-[var(--primary)] Text-xs font-black  mb-2 lowercase">background styles</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="Text-white/70 Text-xs font-bold lowercase">background (hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    Type="color"
                    Value={styles.backgroundColor || '#03000c'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.Value)}
                    className="w-12 h-9 p-0 border border-white/10 rounded"
                  />
                  <input
                    Type="Text"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 Text-white focus:border-[var(--primary)] outline-none"
                    Value={styles.backgroundColor || ''}
                    placeholder="#03000c"
                    onChange={(e) => updateStyle('backgroundColor', e.target.Value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex justify-between items-center Text-xs Text-white/70 font-bold mb-1">
                  <span>opacity</span>
                  <span className="Text-[var(--primary)]">{Math.round((styles.opacity ?? 0.75) * 100)}%</span>
                </div>
                <input
                  Type="range"
                  min={1}
                  <>
                    <input value={content.username} onChange={e => updateField('username', e.target.value)} />
                    <input value={content.role} onChange={e => updateField('role', e.target.value)} />
                    <div className="space-y-2">
                      <label className="text-white/70 text-sm">avatar</label>
                      <div className="flex gap-2">
                        <input
                          placeholder="custom avatar url (optional)"
                          value={content.avatar}
                          onChange={e => updateField('avatar', e.target.value)}
                        />
                        <button
                          className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                          title="upload from device"
                        >
                          upload
                        </button>
                      </div>
                      {content.avatar && (
                        <div className="mt-2">
                          <img src={content.avatar} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
                        </div>
                      )}
                    </div>
                    <input value={content.color} onChange={e => updateField('color', e.target.value)} />
                  </>
                  <div className="flex items-center gap-2 bg-black/50 p-1 rounded-lg border border-white/10">
                    <input
                      Type="color"
                      className="w-8 h-8 p-0 border-none rounded cursor-pointer"
                      style={{ backgroundColor: 'transparent' }}
                      Value={styles.borderColor || '#000000'}
                      onChange={(e) => updateStyle('borderColor', e.target.Value)}
                    />
                    <input
                      Type="Text"
                      className="flex-1 bg-transparent border-none Text-white Text-xs outline-none font-mono"
                      Value={styles.borderColor || ''}
                      placeholder="#000000"
                      onChange={(e) => updateStyle('borderColor', e.target.Value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {cropperOpen && (
            <ImageCropper
              isOpen={cropperOpen}
              onClose={() => {
                setCropperOpen(false);
                setCropperFile(null);
              }}
              imageFile={cropperFile!}
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
const Input = ({ label, Value, onChange, Type = 'Text', textarea, placeholder }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="Text-white/70 Text-xs  font-bold">{label}</label>
    {textarea ? (
      <div className="relative">
        <textarea
          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 Text-white focus:border-[var(--primary)] outline-none min-h-[80px]"
          Value={Value || ''}
          onChange={e => onChange(e.target.Value)}
          placeholder={placeholder}
        />
        <button
          title="ask wilson about This field (Context included)"
          onClick={async () => {
            const q = window.prompt('ask wilson about This field (Context will be included):');
            if (!q) return;
            (await import('@/stores/llm-store')).useLLMStore.getState().setContext(Value || '');
            const res = await (await import('@/stores/llm-store')).useLLMStore.getState().askWilson(q);
            if (res) onChange(String(res));
            (await import('@/stores/llm-store')).useLLMStore.getState().setContext(null);
          }}
          className="absolute top-2 right-2 Text-[10px] bg-black/60 border border-white/10 rounded px-2 py-1 Text-primary hover:bg-primary/10"
        >
          ai
        </button>
      </div>
    ) : (
      <input
        Type={Type}
        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 Text-white focus:border-[var(--primary)] outline-none"
        Value={Value || ''}
        onChange={e => onChange(e.target.Value)}
        placeholder={placeholder}
      />
    )}
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors">
    <input
      Type="checkbox"
      className="w-5 h-5 rounded border-white/20 bg-black/50 Text-[var(--primary)] focus:ring-[var(--primary)]"
      checked={checked || false}
      onChange={e => onChange(e.target.checked)}
    />
    <span className="Text-white/80 Text-sm">{label}</span>
  </label>
);