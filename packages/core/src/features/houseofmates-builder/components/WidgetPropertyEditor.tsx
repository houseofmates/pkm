import React, { useState } from 'react';
import { X, Upload, Search } from 'lucide-react';
import { ImageCropper } from '@/features/blog-builder/components/ImageCropper';

interface WidgetPropertyEditorProps {
  element: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

export function WidgetPropertyEditor({ element, onUpdate, onClose }: WidgetPropertyEditorProps) {
  const content = element.content || {};
  const styles = element.styles || {};
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperConfig, setCropperConfig] = useState({ field: '', aspectRatio: 1, shape: 'rect' as 'rect' | 'round', width: 200, height: 200 });

  const updateField = (key: string, value: any) => {
    onUpdate({ content: { ...content, [key]: value } });
  };

  const updateStyle = (key: string, value: any) => {
    onUpdate({ styles: { ...styles, [key]: value } });
  };

  const handleFileUpload = (field: string, config: any) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setcropperfile(file);
        setcropperconfig({ field, ...config });
        setcropperopen(true);
      }
    };
    input.click();
  };

  const handlecropcomplete = (blob: blob) => {
    const reader = new filereader();
    reader.onload = (e) => {
      updatefield(cropperconfig.field, e.target?.result);
      setcropperopen(false);
      setcropperfile(null);
    };
    reader.readasdataurl(blob);
  };

  const renderfields = () => {
    switch (element.type) {
      case 'text':
        return <div classname="text-white/50 italic">edit text directly on canvas. use double click.</div>;
      case 'button':
      case 'slick_button':
        return (
          <>
            <input label="button text" value={content.text} onchange={(v: string) => updatefield('text', v)} />
            <input label="url" value={content.url} onchange={(v: string) => updatefield('url', v)} placeholder="https://" />
            <div classname="flex flex-col gap-1.5">
              <label classname="text-white/70 text-xs font-bold">icon (lucide name)</label>
              <div classname="flex gap-2">
                <input
                  classname="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[var(--primary)] outline-none"
                  value={content.icon || ''}
                  onchange={e => updatefield('icon', e.target.value)}
                  placeholder="e.g. star, heart, link"
                />
                <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" classname="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white" title="browse icons">
                  <search size={16} />
                </a>
              </div>
            </div>
          </>
        );
      case 'hero':
        return (
          <>
            <input label="headline" value={content.headline} onchange={(v: string) => updatefield('headline', v)} />
            <input label="subheadline" value={content.subheadline} onchange={(v: string) => updatefield('subheadline', v)} textarea />
            <input label="button text" value={content.ctatext} onchange={(v: string) => updatefield('ctatext', v)} />
            <input label="button link" value={content.ctalink} onchange={(v: string) => updatefield('ctalink', v)} />
          </>
        );
      case 'gallery':
        return <div classname="text-white/50 italic">gallery configuration coming soon (manage items via list)</div>;
      case 'stats_bar':
        return (
          <>
            <input label="label" value={content.label} onchange={(v: string) => updatefield('label', v)} />
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
      case 'serverip':
        return (
          <>
            <input label="java address" value={content.javaip} onchange={(v: string) => updatefield('javaip', v)} placeholder="dupemates.playit.pub" />
            <input label="java port" value={content.javaport} onchange={(v: string) => updatefield('javaport', v)} placeholder="25565 (optional)" />
            <input label="bedrock address" value={content.bedrockip} onchange={(v: string) => updatefield('bedrockip', v)} placeholder="dupemates.playit.pub" />
            <input label="bedrock port" value={content.bedrockport} onchange={(v: string) => updatefield('bedrockport', v)} placeholder="19132" />
            <checkbox label="show bedrock" checked={content.showbedrock !== false} onchange={(v: boolean) => updatefield('showbedrock', v)} />
          </>
        );
      default:
        return <div classname="text-white/50 italic">no specific editor for this widget type.</div>;
    }
  };

  return (
    <div classname="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50000] flex items-center justify-center p-4 widget-property-editor" onclick={onclose}>
      <div
        classname="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-bounce-up"
        onclick={e => e.stoppropagation()}
        onmousedown={e => e.stoppropagation()}
      >
        <div classname="flex justify-between items-center p-6 border-b border-white/10 bg-[#1a1a1a] sticky top-0 z-10 rounded-t-2xl">
          <h3 classname="text-xl font-bold text-[var(--primary)] lowercase">edit {element.type}</h3>
          <button onclick={onclose} classname="text-white/40 hover:text-white"><x size={20} /></button>
        </div>

        <div classname="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-[#111]">
          {renderfields()}
          {/* common style fields */}
          <div className="p-4 bg-white/5 rounded-xl space-y-4 mb-4">
            <h4 className="text-[var(--primary)] text-xs font-black mb-2 lowercase">background styles</h4>
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

            <div className="p-4 bg-white/5 rounded-xl space-y-4 mt-4">
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
          title="ask hermes about this field (context included)"
          onClick={async () => {
            const q = window.prompt('ask hermes about this field (context will be included):');
            if (!q) return;
            (await import('@/stores/llm-store')).useLLMStore.getState().setContext(value || '');
            const res = await (await import('@/stores/llm-store')).useLLMStore.getState().askHermes(q);
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
