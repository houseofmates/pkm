
import { useState, useRef, useEffect } from 'react';
import type { Field } from '@/types/nocobase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, X, Phone, Mail, MapPin, Lock, Palette, ChevronDown, Terminal, Code2 } from 'lucide-react';
import { LocationField } from './location-field'; // Import
import ReactMarkdown from 'react-markdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface SmartFieldProps {
    value: any;
    field: any;
    mode?: 'view' | 'edit';
    onChange: (value: any) => void;
    className?: string;
}

export function SmartField({ value, field, mode = 'view', onChange, className }: SmartFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Sync external value
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

    // --- Special Editors ---
    if (isEditing) {
        if (isLocation) {
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

        if (isMarkdown || isCode) {
            return (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-3xl h-[80vh] border rounded-lg shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-2 border-b flex justify-between items-center bg-muted/50">
                            <div className="flex items-center gap-2">
                                {isCode ? <Code2 className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                                <span className="font-mono text-sm font-bold">{isCode ? 'Code Injection' : 'Markdown Editor'}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleSave}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
                            </div>
                        </div>
                        <Textarea
                            value={localValue || ''}
                            onChange={e => setLocalValue(e.target.value)}
                            className="flex-1 p-4 font-mono text-sm resize-none border-0 focus-visible:ring-0"
                            placeholder={isCode ? "// Enter Javascript code here..." : "# Markdown text..."}
                        />
                        {isCode && (
                            <div className="p-2 bg-destructive/10 text-destructive text-xs border-t">
                                Warning: Code injection allows this script to run in your browser.
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (isSelect) {
            // Basic Select Editor fallback
            // Real implementation needs options from `field.uiSchema.enum` usually
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

        if (isColor) {
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

        // Default Text Editor (Inline)
        return (
            <div className={cn("flex items-center gap-1 min-w-[120px] bg-background relative z-10", className)}>
                <Input
                    autoFocus
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

    // --- View Mode ---

    if (isPhone) return <a href={`tel:${value}`} className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}><Phone className="h-3 w-3" /> {value}</a>;
    if (isEmail) return <a href={`mailto:${value}`} className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}><Mail className="h-3 w-3" /> {value}</a>;

    if (isPassword) {
        return (
            <div onClick={() => setIsEditing(true)} className="cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Lock className="h-3 w-3" />
                <span className="font-mono text-xs">••••••••</span>
            </div>
        );
    }

    if (isColor) {
        return (
            <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer group">
                <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: value || 'transparent' }} />
                <span className="text-xs font-mono opacity-80 group-hover:opacity-100">{value}</span>
            </div>
        );
    }

    if (isCheckbox) {
        return (
            <div
                className="flex items-center justify-center h-full w-full cursor-pointer"
                onClick={() => onChange(!value)} // Inline toggle for bools immediately
            >
                <Checkbox
                    checked={!!value}
                    className={cn("data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black border-muted-foreground", !value && "opacity-50")} // Yellow when checked as requested
                    onCheckedChange={(checked) => onChange(checked)}
                />
            </div>
        )
    }

    if (isSelect) {
        return (
            <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted/50 px-2 py-0.5 rounded border border-transparent hover:border-muted-foreground/20 text-xs">
                {value || <span className="opacity-30">select</span>}
            </div>
        )
    }

    if (isLocation) {
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

    if (isMarkdown) {
        return (
            <div onClick={() => setIsEditing(true)} className="cursor-pointer group relative min-h-[20px]">
                <div className="prose prose-invert prose-sm line-clamp-3 text-xs leading-tight opacity-90 group-hover:opacity-100">
                    <ReactMarkdown>{value || ''}</ReactMarkdown>
                </div>
                {!value && <span className="opacity-20 italic text-xs">empty markdown</span>}
            </div>
        )
    }

    // Code with execution button
    if (isCode) {
        return (
            <div className="flex items-center gap-2">
                <div onClick={() => setIsEditing(true)} className="cursor-pointer font-mono text-[10px] bg-muted px-1 rounded text-muted-foreground truncate max-w-[100px]">
                    {value ? '<script...>' : 'empty code'}
                </div>
                {value && (
                    <Button variant="outline" size="sm" className="h-5 text-[10px] px-1" onClick={() => {
                        try {
                            // User asked to "inject into browser"
                            // We'll run it.
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
