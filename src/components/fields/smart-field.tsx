
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, X, Phone, Mail, MapPin, Lock, Terminal, Code2, Paperclip, Link as LinkIcon } from 'lucide-react';
import { LocationField } from './location-field';
import ReactMarkdown from 'react-markdown';
import { Textarea } from '@/components/ui/textarea';
import RichEditor from '@/components/ui/rich-editor';
import { sanitizeHTML } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';

// --- Relation Picker Component ---
function RelationPicker({ field, value, onChange, onCancel }: any) {
    const { client } = useAuth();
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch target records
        const fetchTarget = async () => {
            if (!field.target) return;
            setLoading(true);
            try {
                // Determine target collection
                const res = await client.listRecords(field.target);
                const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
                setOptions(data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchTarget();
    }, [field, client]);

    // Handle Selection
    // If "many", we usually need a multi-select. 
    // Checking field.interface or type for "many" hint.
    const isMany = field.interface?.includes('Many') || field.type?.includes('Many');

    const handleSelect = (recId: string) => {
        // Find full record or just send ID? NocoBase usually wants ID or object.
        // Sending object for now to keep local state pretty
        const selected = options.find(o => o.id == recId); // loose match

        if (isMany) {
            // If already array, add/remove
            const current = Array.isArray(value) ? value : [];
            const exists = current.find((c: any) => c.id == recId);
            let newVal;
            if (exists) newVal = current.filter((c: any) => c.id != recId);
            else newVal = [...current, selected];
            onChange(newVal);
        } else {
            // Single select: immediate save
            onChange(selected);
        }
    };

    return (
        <div className="absolute z-50 bg-popover border shadow-lg rounded-md p-2 w-[250px] max-h-[300px] flex flex-col gap-2">
            <div className="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                Select {field.target}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
                {loading && <div className="text-xs p-2">Loading...</div>}
                {options.map(opt => {
                    const isSelected = Array.isArray(value)
                        ? value.some((v: any) => v.id == opt.id)
                        : value?.id == opt.id;

                    return (
                        <div
                            key={opt.id}
                            onClick={() => handleSelect(opt.id)}
                            className={cn(
                                "text-sm p-1.5 rounded cursor-pointer hover:bg-accent flex items-center justify-between",
                                isSelected && "bg-accent/50 font-medium"
                            )}
                        >
                            <span className="truncate">{opt.title || opt.name || opt.id}</span>
                            {isSelected && <Check className="h-3 w-3 opacity-50" />}
                        </div>
                    )
                })}
            </div>
            <div className="flex justify-end gap-1 pt-2 border-t mt-1">
                {isMany && <Button size="sm" className="h-6 text-xs" onClick={() => onChange(value)}>Done</Button>}
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    )
}

export interface SmartFieldProps {
    value: any;
    field: any;
    mode?: 'view' | 'edit';
    onChange: (value: any) => void;
    className?: string;
}

export function SmartField({ value, field, mode: _mode = 'view', onChange, className }: SmartFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const { client } = useAuth();

    useEffect(() => {
        if (!isEditing) setLocalValue(value);
    }, [value, isEditing]);

    const handleSave = () => {
        onChange(localValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setLocalValue(value);
        setIsEditing(false);
    };

    // --- Helper for Type Detection ---
    // Mapping complex user requests to NocoBase/Generic types
    const type = field?.interface || field?.type || 'string';
    const name = field?.name?.toLowerCase() || '';

    const isLocation = type === 'location' || name.includes('location') || name.includes('map');
    const isPhone = type === 'phone' || name.includes('phone');
    const isEmail = type === 'email' || name.includes('email');
    const isPassword = type === 'password' || name.includes('password');
    const isColor = type === 'color' || name.includes('color');
    const isCheckbox = type === 'boolean' || type === 'checkbox';
    const isSelect = type === 'select' || type === 'multipleSelect';
    const isCode = type === 'code' || name === 'code';
    const isMarkdown = type === 'markdown' || type === 'richText' || name.includes('desc') || name.includes('note');
    const isNumber = type === 'number' || type === 'integer' || type === 'percent';
    const isUrl = type === 'url' || type === 'link' || name.includes('link') || name.includes('url');
    const isFile = type === 'attachment' || name.includes('file') || name.includes('image') || name.includes('avatar');
    const isDate = type === 'datetime' || type === 'date' || name.includes('date') || name.includes('created');

    const isId = name === 'id' || name === 'uuid' || type === 'uid';
    const isRelation = type === 'relation' || type === 'linkToAnotherRecord' || (field?.interface === 'linkToAnotherRecord'); // NocoBase specific

    // --- SPECIAL FORMATTERS ---
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            // Format: (lowercase) dec. 25, '93
            const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase() + '.';
            const day = date.getDate();
            const year = "'" + date.getFullYear().toString().slice(-2);
            return `${month} ${day}, ${year}`;
        } catch (e) { return dateStr; }
    };

    const formatTime = (dateStr: string) => {
        // 12 hour format PST/pacific time and pulls live time to compare to current time
        // Simplification: Just 12h formatting for now
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) { return ''; }
    };

    const formatNumber = (val: any) => {
        if (field?.type === 'percent' || name.includes('percent')) return `${val}%`;
        return val;
    }

    // --- EDITORS ---
    if (isEditing) {
        // ... (Previous Editors: Location, Markdown/Code, Select, Color) ...

        if (isLocation) { /* ... same as before ... */
            return (
                <div className="w-[400px] bg-background border p-2 rounded shadow-xl z-50 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-xs">Set Location</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}><Check className="h-3 w-3 text-green-500" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3 text-red-500" /></Button>
                        </div>
                    </div>
                    <LocationField value={localValue} onChange={setLocalValue} />
                </div>
            );
        }

        if (isMarkdown || isCode) { /* WYSIWYG editor for markdown, code still uses plaintext */
            return (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-3xl h-[80vh] border rounded-lg shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-2 border-b flex justify-between items-center bg-muted/50">
                            <div className="flex items-center gap-2">
                                {isCode ? <Code2 className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                                <span className="font-mono text-sm font-bold">{isCode ? 'Code Editor' : 'Rich Text Editor'}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleSave}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
                            </div>
                        </div>

                        {isCode ? (
                            <Textarea
                                value={localValue || ''}
                                onChange={e => setLocalValue(e.target.value)}
                                className="flex-1 p-4 font-mono text-sm resize-none border-0 focus-visible:ring-0"
                                placeholder={"// Enter Javascript code here..."}
                            />
                        ) : (
                            <div className="flex-1 overflow-auto p-4">
                                <RichEditor
                                    value={localValue && String(localValue).trim().startsWith('<') ? localValue : (localValue ? `<p>${String(localValue).replace(/\n/g, '<br/>')}</p>` : '')}
                                    onChange={(html) => setLocalValue(sanitizeHTML(html))}
                                    uploadImage={async (file: File) => {
                                        try {
                                            const res = await client.upload(file);
                                            return res?.data?.url || '';
                                        } catch (e) {
                                            console.error('upload failed', e);
                                            throw e;
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {isCode && (
                            <div className="p-2 bg-destructive/10 text-destructive text-xs border-t">
                                Warning: Code injection allows this script to run in your browser.
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (isFile) {
            return (
                <div className="flex items-center gap-2 border p-1 rounded bg-background min-w-[200px]">
                    <Input
                        placeholder="Paste URL..."
                        value={localValue || ''}
                        onChange={e => setLocalValue(e.target.value)}
                        className="h-8 text-xs"
                    />
                    {/* Mock Upload - In real app, this would use an uploader utils */}
                    <div className="relative">
                        <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-6" onChange={() => alert("File upload mock")} />
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={handleSave}><Check className="h-3 w-3" /></Button>
                </div>
            )
        }

        if (isDate) {
            return (
                <div className="bg-background border rounded shadow-lg p-2 z-50 absolute">
                    <Calendar
                        mode="single"
                        selected={localValue ? new Date(localValue) : undefined}
                        onSelect={(d) => { if (d) setLocalValue(d.toISOString()); }}
                        initialFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" onClick={handleSave}>Save</Button>
                    </div>
                </div>
            )
        }

        if (isSelect) { /* ... same as before */
            const options = field?.uiSchema?.enum || [{ label: 'Option 1', value: 'opt1' }, { label: 'Option 2', value: 'opt2' }];
            return (
                <div className="flex items-center gap-1">
                    <Select value={localValue} onValueChange={setLocalValue}>
                        <SelectTrigger className="h-8 w-[150px]">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={handleSave}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
                </div>
            )
        }

        if (isColor) { /* ... same as before */
            return (
                <div className="flex items-center gap-2 p-1 bg-card border rounded shadow-lg">
                    <input
                        type="color"
                        value={localValue || '#000000'}
                        onChange={e => setLocalValue(e.target.value)}
                        className="h-8 w-8 cursor-pointer border-0 p-0 rounded overflow-hidden"
                    />
                    <Input
                        value={localValue || ''}
                        onChange={e => setLocalValue(e.target.value)}
                        className="h-8 w-24 text-xs font-mono"
                        placeholder="#HEX"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={handleSave}><Check className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
                </div>
            )
        }

        if (isRelation) {
            // Relation Editor: Simple picker that fetches target records
            // We need to fetch the target collection list.
            // Assumption: field.target is the collection name of the relation.
            return <RelationPicker field={field} value={localValue} onChange={handleSave} onCancel={handleCancel} />;
        }

        return (
            <div className={cn("flex items-center gap-1 min-w-[120px] bg-background relative z-10", className)}>
                <Input
                    autoFocus
                    type={isNumber ? "number" : "text"}
                    value={localValue || ''}
                    onChange={e => setLocalValue(e.target.value)}
                    className="h-8 text-xs"
                    onKeyDown={e => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                    }}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-600" onClick={handleSave}>
                    <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={handleCancel}>
                    <X className="h-3 w-3" />
                </Button>
            </div>
        );
    }

    
    // ... View logic ...


    // --- VIEW MODE ---

    if (isId) return <span className="font-mono text-[10px] opacity-50 select-text">{value?.toString().slice(0, 8)}...</span>;

    if (isRelation) {
        // Prepare display value: if object, show title/name. If array, join them.
        let display = '';
        if (Array.isArray(value)) {
            display = value.map(v => v?.title || v?.name || v?.id || JSON.stringify(v)).join(', ');
        } else if (typeof value === 'object' && value !== null) {
            display = value.title || value.name || value.id || JSON.stringify(value);
        } else {
            display = String(value || '');
        }

        return (
            <div className="flex items-center gap-1">
                <div className="px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs border border-blue-100 dark:border-blue-800 truncate max-w-[200px]">
                    {display || <span className="opacity-50 italic">empty relation</span>}
                </div>
            </div>
        )
    }

    if (isPhone) return <a href={`tel:${value}`} className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}><Phone className="h-3 w-3" /> {value}</a>;
    if (isEmail) return <a href={`mailto:${value}`} className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}><Mail className="h-3 w-3" /> {value}</a>;
    if (isUrl) return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[150px]" onClick={e => e.stopPropagation()}><LinkIcon className="h-3 w-3" /> {value}</a>;

    if (isPassword) { /* ... */
        return (
            <div onClick={() => setIsEditing(true)} className="cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Lock className="h-3 w-3" />
                <span className="font-mono text-xs">••••••••</span>
            </div>
        );
    }

    if (isColor) { /* ... */
        return (
            <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer group">
                <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: value || 'transparent' }} />
                <span className="text-xs font-mono opacity-80 group-hover:opacity-100">{value}</span>
            </div>
        );
    }

    if (isCheckbox) { /* ... */
        return (
            <div
                className="flex items-center justify-center h-full w-full cursor-pointer"
                onClick={() => onChange(!value)}
            >
                <Checkbox
                    checked={!!value}
                    className={cn("data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black border-muted-foreground", !value && "opacity-50")}
                    onCheckedChange={(checked) => onChange(checked)}
                />
            </div>
        )
    }

    if (isFile) {
        // Normalize to array of urls
        const imgs: string[] = [];
        if (Array.isArray(value)) {
            value.forEach((v: any) => {
                if (!v) return;
                if (typeof v === 'string') imgs.push(v);
                else if (v.url) imgs.push(v.url);
            });
        } else if (typeof value === 'string') imgs.push(value);
        else if (value?.url) imgs.push(value.url);

        if (imgs.length > 0) {
            return (
                <>
                    <div className="cursor-pointer flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setGalleryOpen(true); }}>
                        {imgs.slice(0, 3).map((u, i) => (
                            <img key={i} src={u} className="h-6 w-6 object-cover rounded" alt={`img-${i}`} />
                        ))}
                        <span className="text-xs truncate max-w-[120px]">{imgs.length} image{imgs.length > 1 ? 's' : ''}</span>
                    </div>

                    <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
                        <DialogContent className="max-w-5xl w-full">
                                <div className="flex gap-2 items-center mb-4">
                                    <input type="file" accept="image/*" onChange={async (e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        try {
                                            const res = await client.upload(f);
                                            const url = res?.data?.url;
                                            if (url) {
                                                const newImgs = [...imgs, url];
                                                onChange?.(newImgs);
                                            }
                                        } catch (err) { console.error(err); alert('Upload failed'); }
                                    }} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {imgs.map((u, i) => (
                                        <div key={i} className="relative">
                                            <img src={u} alt={`img-${i}`} className="rounded shadow cursor-pointer object-contain w-full h-60" />
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <button className="btn-ghost btn-xs" onClick={() => {
                                                    // remove
                                                    const newImgs = imgs.filter((_, idx) => idx !== i);
                                                    onChange?.(newImgs.length === 1 ? newImgs[0] : newImgs);
                                                }}>Delete</button>
                                                <button className="btn-ghost btn-xs" onClick={() => {
                                                    if (i === 0) return;
                                                    const arr = [...imgs];
                                                    [arr[i-1], arr[i]] = [arr[i], arr[i-1]];
                                                    onChange?.(arr.length === 1 ? arr[0] : arr);
                                                }}>Left</button>
                                                <button className="btn-ghost btn-xs" onClick={() => {
                                                    if (i === imgs.length - 1) return;
                                                    const arr = [...imgs];
                                                    [arr[i+1], arr[i]] = [arr[i], arr[i+1]];
                                                    onChange?.(arr.length === 1 ? arr[0] : arr);
                                                }}>Right</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )
            }

    if (isSelect) { /* ... */
        return (
            <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 px-2 py-0.5 rounded border border-transparent hover:border-muted-foreground/20 text-xs">
                {value || <span className="opacity-30">select</span>}
            </div>
        )
    }

    if (isLocation) { /* ... */
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <MapPin className="h-4 w-4 text-primary group-hover:animate-bounce" />
                        <span className="text-xs truncate max-w-[150px] underline decoration-dotted text-muted-foreground group-hover:text-primary">
                            {value ? 'View Map' : 'Set location'}
                        </span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                            <Check className="h-3 w-3" />
                        </Button>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl h-[500px]">
                    <LocationField value={value} onChange={() => { }} readOnly={true} />
                </DialogContent>
            </Dialog>
        );
    }

    if (isMarkdown) { /* ... */
        return (
            <div onClick={() => setIsEditing(true)} className="cursor-pointer group relative min-h-[20px]">
                <div className="prose prose-invert prose-sm line-clamp-3 text-xs leading-tight opacity-90 group-hover:opacity-100">
                    <ReactMarkdown>{value || ''}</ReactMarkdown>
                </div>
                {!value && <span className="opacity-20 italic text-xs">empty markdown</span>}
            </div>
        )
    }

    if (isCode) { /* ... */
        return (
            <div className="flex items-center gap-2">
                <div onClick={() => setIsEditing(true)} className="cursor-pointer font-mono text-[10px] bg-muted px-1 rounded text-muted-foreground truncate max-w-[100px]">
                    {value ? '<script...>' : 'empty code'}
                </div>
                {value && (
                    <Button variant="outline" size="sm" className="h-5 text-[10px] px-1" onClick={() => {
                        try {
                            // eslint-disable-next-line
                            const func = new Function(value);
                            func();
                        } catch (e) {
                            alert("Error running code: " + e);
                        }
                    }}>
                        Run
                    </Button>
                )}
            </div>
        )
    }

    if (isNumber) {
        return (
            <div
                onClick={() => setIsEditing(true)}
                className="cursor-pointer text-right min-h-[20px] font-mono text-xs"
            >
                {value ? formatNumber(value) : <span className="opacity-20">-</span>}
            </div>
        )
    }

    // Default String
    return (
        <div
            onClick={() => setIsEditing(true)}
            className={cn("cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors min-h-[20px] break-words text-sm", className)}
            title="Click to edit"
        >
            {value || <span className="opacity-20 italic text-xs">empty</span>}
        </div>
    );
}
