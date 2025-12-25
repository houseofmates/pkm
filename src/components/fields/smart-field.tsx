
import { useState, useRef, useEffect } from 'react';
import type { Field } from '@/types/nocobase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, X, Phone, Mail, MapPin, Lock } from 'lucide-react';
import { LocationField } from './location-field'; // Import

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

    const type = field?.interface || field?.type || 'string';
    const isLocation = type === 'location' || field?.name?.toLowerCase().includes('location') || field?.name?.toLowerCase().includes('map');

    // --- Special Editor Renderers ---
    if (isEditing) {
        if (isLocation) {
            return (
                <div className="w-[400px] bg-background border p-2 rounded shadow-xl z-50">
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

        // Default Text Editor
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

    // 1. Phone
    if (type === 'phone' || field?.name?.toLowerCase().includes('phone')) {
        return <a href={`tel:${value}`} className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}><Phone className="h-3 w-3" /> {value}</a>;
    }

    // 2. Email
    if (type === 'email' || field?.name?.toLowerCase().includes('email')) {
        return <a href={`mailto:${value}`} className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}><Mail className="h-3 w-3" /> {value}</a>;
    }

    // 3. Password (Spoilered)
    if (type === 'password' || field?.name?.toLowerCase().includes('password')) {
        return (
            <div
                onClick={() => setIsEditing(true)}
                className="cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
                <Lock className="h-3 w-3" />
                <span className="font-mono text-xs">••••••••</span>
            </div>
        );
    }

    // 4. Location
    if (isLocation) {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <MapPin className="h-4 w-4 text-primary group-hover:animate-bounce" />
                        <span className="text-xs truncate max-w-[150px] underline decoration-dotted text-muted-foreground group-hover:text-primary">
                            {value ? 'View Map' : 'Set location'}
                        </span>
                        {/* Edit override via right click - simplified to just edit button for now in this iteration 
                             or simple click to edit if empty.
                          */}
                        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                            <Check className="h-3 w-3" /> {/* Use edit icon actually */}
                        </Button>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl h-[500px]">
                    <LocationField value={value} onChange={() => { }} readOnly={true} />
                </DialogContent>
            </Dialog>
        );
    }

    // Default String
    return (
        <div
            onClick={() => setIsEditing(true)}
            className={cn("cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors min-h-[20px] break-words", className)}
            title="Click to edit"
        >
            {value || <span className="opacity-20 italic">empty</span>}
        </div>
    );
}
