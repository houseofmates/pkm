
import { useState, useRef, useEffect } from 'react';
import type { Field } from '@/types/nocobase'; // Assuming generic field type
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Pencil, Check, X, Phone, Mail, MapPin, Eye, EyeOff, Lock } from 'lucide-react';

// Import sub-fields (we will create these next)
// import { LocationField } from './location-field'; 
// import { VisualField } from './visual-field';

export interface SmartFieldProps {
    value: any;
    field: any; // Using any for flexibility now, tighten later
    mode?: 'view' | 'edit';
    onChange: (value: any) => void;
    className?: string;
}

export function SmartField({ value, field, mode = 'view', onChange, className }: SmartFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Sync external value changes unless editing
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

    // Determine Field Type
    const type = field?.interface || field?.type || 'string';

    // --- Render Logic ---

    if (isEditing) {
        return (
            <div className={cn("flex items-center gap-1 min-w-[120px]", className)}>
                {/* Fallback Editor: Text */}
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
    if (type === 'password') {
        // Logic to reveal
        return <div onClick={() => setIsEditing(true)} className="cursor-pointer flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> ••••••••</div>;
    }

    // Default String
    return (
        <div
            onClick={() => setIsEditing(true)}
            className={cn("cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors min-h-[20px]", className)}
            title="Click to edit"
        >
            {value || <span className="opacity-20 italic">empty</span>}
        </div>
    );
}
