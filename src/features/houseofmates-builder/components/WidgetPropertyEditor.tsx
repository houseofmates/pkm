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
        setContent((prev: any) => ({ ...prev, [key]: value }));
    };

    const updateStyle = (key: string, value: any) => {
        setStyles((prev: any) => ({ ...prev, [key]: value }));
    };

    // Generic Array Handler (for Rules, FAQ, etc.)
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
            // Convert blob to file
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
                        <Input label="Java IP" value={content.javaIP} onChange={(v: string) => updateField('javaIP', v)} />
                        <Input label="Java Port" value={content.javaPort} onChange={(v: string) => updateField('javaPort', v)} />
                        <Input label="Bedrock IP" value={content.bedrockIP} onChange={(v: string) => updateField('bedrockIP', v)} />
                        <Input label="Bedrock Port" value={content.bedrockPort} onChange={(v: string) => updateField('bedrockPort', v)} />
                        <Checkbox label="Show Bedrock" checked={content.showBedrock} onChange={(v: boolean) => updateField('showBedrock', v)} />
                    </>
                );
            case 'serverstatus':
                return (
                    <>
                        <Input label="MOTD" value={content.motd} onChange={(v: string) => updateField('motd', v)} />
                        <Input label="Player Count" type="number" value={content.playerCount} onChange={(v: number) => updateField('playerCount', Number(v))} />
                        <Input label="Max Players" type="number" value={content.maxPlayers} onChange={(v: number) => updateField('maxPlayers', Number(v))} />
                        <Checkbox label="Is Online (Static)" checked={content.isOnline} onChange={(v: boolean) => updateField('isOnline', v)} />
                    </>
                );
            case 'rules':
                return (
                    <>
                        <Input label="Title" value={content.title} onChange={(v: string) => updateField('title', v)} />
                        <div className="space-y-2 mt-4">
                            <label className="text-white/70 text-sm">Rules List</label>
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
                            <button onClick={() => handleArrayAdd('rules', 'New Rule')} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                                <Plus size={14} /> Add Rule
                            </button>
                        </div>
                    </>
                );
            case 'featurecard':
                return (
                    <>
                        <Input label="Title" value={content.title} onChange={(v: string) => updateField('title', v)} />
                        <Input label="Description" value={content.description} onChange={(v: string) => updateField('description', v)} textarea />

                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-white/70 text-xs uppercase tracking-wider font-bold">Icon</label>
                            <button
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                                        {(() => {
                                            const iconName = content.icon || 'shield';
                                            const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
                                            // @ts-ignore
                                            const Icon = LucideIcons[formattedName] || LucideIcons.Shield;
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

                        <Input label="Color (Hex)" value={content.color} onChange={(v: string) => updateField('color', v)} />
                    </>
                );
            case 'staffcard':
                return (
                    <>
                        <Input label="Username (IGN)" value={content.username} onChange={(v: string) => updateField('username', v)} />
                        <Input label="Role" value={content.role} onChange={(v: string) => updateField('role', v)} />
                        <div className="space-y-2">
                            <label className="text-white/70 text-sm">Avatar</label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="custom avatar url (Optional)"
                                    value={content.avatar} 
                                    onChange={(v: string) => updateField('avatar', v)} 
                                />
                                <button
                                    onClick={() => handleFileUpload('avatar')}
                                    className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                                    title="Upload from device"
                                >
                                    <Upload size={16} />
                                    Upload
                                </button>
                            </div>
                            {content.avatar && (
                                <div className="mt-2">
                                    <img src={content.avatar} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                                </div>
                            )}
                        </div>
                        <Input label="Role Color" value={content.color} onChange={(v: string) => updateField('color', v)} />
                    </>
                );
            case 'faq':
                return (
                    <>
                        <Input label="Section Title" value={content.title} onChange={(v: string) => updateField('title', v)} />
                        <div className="space-y-4 mt-4">
                            <label className="text-white/70 text-sm">Questions</label>
                            {(content.items || []).map((item: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white/5 rounded flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-white/40">Question {idx + 1}</span>
                                        <button onClick={() => handleArrayRemove('items', idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                                    </div>
                                    <Input value={item.question} onChange={(v: string) => handleArrayUpdate('items', idx, { ...item, question: v })} placeholder="question" />
                                    <Input value={item.answer} onChange={(v: string) => handleArrayUpdate('items', idx, { ...item, answer: v })} textarea placeholder="answer" />
                                </div>
                            ))}
                            <button onClick={() => handleArrayAdd('items', { question: 'New Question', answer: 'Answer here' })} className="flex items-center gap-2 text-[var(--primary)] text-sm hover:underline">
                                <Plus size={14} /> Add Question
                            </button>
                        </div>
                    </>
                );
            case 'hero':
                return (
                    <>
                        <Input label="Main Title" value={content.title} onChange={(v: string) => updateField('title', v)} />
                        <Input label="Subtitle" value={content.subtitle} onChange={(v: string) => updateField('subtitle', v)} />
                        <Input label="CTA Button Text" value={content.ctaText} onChange={(v: string) => updateField('ctaText', v)} />
                        <Input label="CTA Link" value={content.ctaLink} onChange={(v: string) => updateField('ctaLink', v)} />
                        <div className="space-y-2">
                            <label className="text-white/70 text-sm">Background Image</label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="background image url"
                                    value={content.backgroundImage} 
                                    onChange={(v: string) => updateField('backgroundImage', v)} 
                                />
                                <button
                                    onClick={() => handleFileUpload('backgroundImage', { aspectRatio: 16/9, shape: 'rect', width: 400, height: 225 })}
                                    className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                                    title="Upload from device"
                                >
                                    <Upload size={16} />
                                    Upload
                                </button>
                            </div>
                            {content.backgroundImage && (
                                <div className="mt-2">
                                    <img src={content.backgroundImage} alt="Preview" className="w-full h-24 rounded-lg object-cover" />
                                </div>
                            )}
                        </div>
                        <Checkbox label="Show Server IP Widget" checked={content.showServerIP} onChange={(v: boolean) => updateField('showServerIP', v)} />
                        {content.showServerIP && (
                            <Input label="Java IP" value={content.javaIP} onChange={(v: string) => updateField('javaIP', v)} />
                        )}
                    </>
                );
            case 'button':
                return (
                    <>
                        <Input label="Button Text" value={content.text} onChange={(v: string) => updateField('text', v)} />
                        <Input label="Background Color" value={content.bgColor} onChange={(v: string) => updateField('bgColor', v)} />
                        <Input label="Text Color" value={content.textColor} onChange={(v: string) => updateField('textColor', v)} />
                    </>
                );
            case 'video':
            case 'image':
            case 'pdf_viewer':
                return (
                    <>
                        <Input label="URL" value={content.url} onChange={(v: string) => updateField('url', v)} />
                        {element.type === 'image' && <Input label="Alt Text" value={content.alt} onChange={(v: string) => updateField('alt', v)} />}
                        {element.type === 'video' && (
                            <>
                                <Checkbox label="Autoplay" checked={content.autoplay} onChange={(v: boolean) => updateField('autoplay', v)} />
                                <Checkbox label="Loop" checked={content.loop} onChange={(v: boolean) => updateField('loop', v)} />
                                <Checkbox label="Muted" checked={content.muted} onChange={(v: boolean) => updateField('muted', v)} />
                                <Checkbox label="Controls" checked={content.controls} onChange={(v: boolean) => updateField('controls', v)} />
                            </>
                        )}
                    </>
                );
            case 'linkcard':
                return (
                    <>
                        <Input label="Title" value={content.title} onChange={(v: string) => updateField('title', v)} />
                        <Input label="URL" value={content.url} onChange={(v: string) => updateField('url', v)} />
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-white/70 text-xs uppercase tracking-wider font-bold">Icon</label>
                            <button
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white flex items-center justify-between hover:border-[var(--primary)]/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                                        {(() => {
                                            const iconName = content.icon || 'link-2';
                                            const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-([a-z])/g, (g: any) => g[1].toUpperCase());
                                            // @ts-ignore
                                            const Icon = LucideIcons[formattedName] || LucideIcons.Link2;
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
                        <Input label="Description" value={content.description} onChange={(v: string) => updateField('description', v)} />
                        <Input label="Color (Hex)" value={content.color} onChange={(v: string) => updateField('color', v)} />
                    </>
                );
            case 'statusindicator':
                return (
                    <>
                        <Input label="Label" value={content.label} onChange={(v: string) => updateField('label', v)} />
                        <div className="flex flex-col gap-1.5">
                            <label className="text-white/70 text-xs uppercase tracking-wider font-bold">Status</label>
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
                        <Checkbox label="Show Label" checked={content.showLabel !== false} onChange={(v: boolean) => updateField('showLabel', v)} />
                    </>
                );
            case 'versionbadge':
                return (
                    <>
                        <div className="space-y-4">
                            <label className="text-white/70 text-sm">Versions</label>
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
                                <Plus size={14} /> Add Version
                            </button>
                        </div>
                    </>
                );
            case 'testimonial':
                return (
                    <>
                        <Input label="Quote" value={content.quote} onChange={(v: string) => updateField('quote', v)} textarea />
                        <Input label="Author Name" value={content.author} onChange={(v: string) => updateField('author', v)} />
                        <Input label="Role/Title" value={content.role} onChange={(v: string) => updateField('role', v)} />
                        <div className="space-y-2">
                            <label className="text-white/70 text-sm">Avatar</label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="avatar url (Optional)"
                                    value={content.avatar} 
                                    onChange={(v: string) => updateField('avatar', v)} 
                                />
                                <button
                                    onClick={() => handleFileUpload('avatar', { aspectRatio: 1, shape: 'round', width: 200, height: 200 })}
                                    className="px-4 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] rounded-md flex items-center gap-2 whitespace-nowrap transition-colors"
                                    title="Upload from device"
                                >
                                    <Upload size={16} />
                                    Upload
                                </button>
                            </div>
                            {content.avatar && (
                                <div className="mt-2">
                                    <img src={content.avatar} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
                                </div>
                            )}
                        </div>
                    </>
                );
            default:
                return <div className="text-white/50 italic">No specific editor for this widget type.</div>;
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
                    {/* Common Style Fields */}
                    <div className="p-4 bg-white/5 rounded-xl space-y-4 mb-4">
                        <h4 className="text-[var(--primary)] text-xs font-black uppercase tracking-widest mb-2">Background Styles</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Background (Hex)" value={styles.backgroundColor} onChange={(v: string) => updateStyle('backgroundColor', v)} />
                            <Input label="Opacity (0-1)" type="number" step="0.1" min="0" max="1" value={styles.opacity} onChange={(v: string) => updateStyle('opacity', parseFloat(v))} />
                        </div>
                    </div>

                    {renderFields()}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors lowercase">cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded-xl selected-icon-btn font-bold hover:scale-[1.02] transition-transform lowercase">save changes</button>
                </div>
            </div>

            {cropperFile && (
                <ImageCropper
                    isOpen={cropperOpen}
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
    );
}

// Helper Components
const Input = ({ label, value, onChange, type = 'text', textarea, placeholder }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-white/70 text-xs uppercase tracking-wider font-bold">{label}</label>
        {textarea ? (
            <textarea
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[var(--primary)] outline-none min-h-[80px]"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
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
