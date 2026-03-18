import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { secureLogger } from '@/lib/secure-logger';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppSetting } from '@/hooks/use-app-setting';
import { HexColorPicker } from 'react-colorful';
import { Trash2, Palette } from 'lucide-react';
import { IconPicker } from '@/components/icon-picker-dialog';

interface FieldSettingsDialogProps {
    collectionName: string;
    field: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFieldUpdated: () => void;
}

const COLORS = [
    'var(--primary)', '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E',
    '#71717a', '#ffffff'
];

const FIELD_TYPES = [
    { value: 'input', label: 'Single Line Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'richText', label: 'Rich Text' },
    { value: 'number', label: 'Number' },
    { value: 'integer', label: 'Integer' },
    { value: 'percent', label: 'Percent' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'Date Time' },
    { value: 'time', label: 'Time' },
    { value: 'attachment', label: 'Attachment' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'url', label: 'URL' },
    { value: 'color', label: 'Color' },
    { value: 'password', label: 'Password' },
    { value: 'select', label: 'Single Select' },
    { value: 'multipleSelect', label: 'Multiple Select' },
    { value: 'radioGroup', label: 'Radio Group' },
    { value: 'checkboxGroup', label: 'Checkbox Group' },
    { value: 'formula', label: 'Formula' },
    { value: 'linkTo', label: 'Relation' },
];

export function FieldSettingsDialog({ collectionName, field, open, onOpenChange, onFieldUpdated }: FieldSettingsDialogProps) {
    const { client } = useAuth();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [interfaceType, setInterfaceType] = useState('');

    // local metadata for property colors/icons
    const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {}, { pollIntervalMs: 3000 });
    const collMeta = metadata[collectionName] || {};
    const fieldColor = collMeta.fieldColors?.[field?.name] || '#64748b';
    const fieldIconInfo: { icon?: string; iconType?: 'lucide'|'emoji'|'image'; iconColor?: string } =
        collMeta.fieldIcons?.[field?.name] || {};
    const [iconPickerOpen, setIconPickerOpen] = useState(false);

    const fieldIconColor = fieldIconInfo.iconColor || '#ffffff';

    useEffect(() => {
        if (field && open) {
            setTitle(field.uiSchema?.title || field.title || field.name || '');
            setInterfaceType(field.interface || field.type || 'input');
        }
    }, [field, open]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!field) return;
        setLoading(true);

        try {
            // 1. Update NocoBase schema
            await client.updateField(collectionName, field.name, {
                uiSchema: {
                    ...field.uiSchema,
                    title: title,
                },
                interface: interfaceType,
            });

            toast.success("field updated successfully");
            onFieldUpdated();
            onOpenChange(false);
        } catch (error: any) {
            secureLogger.error(error);
            toast.error(error.message || "failed to update field");
        } finally {
            setLoading(false);
        }
    };

    const setFieldColor = (color: string) => {
        const collMeta = metadata[collectionName] || {};
        const fieldColors = collMeta.fieldColors || {};

        setMetadata({
            ...metadata,
            [collectionName]: {
                ...collMeta,
                fieldColors: {
                    ...fieldColors,
                    [field.name]: color
                }
            }
        });
    };

    const setFieldIcon = (icon: string, type: 'lucide'|'emoji'|'image') => {
        const collMeta = metadata[collectionName] || {};
        const icons = collMeta.fieldIcons || {};
        setMetadata({
            ...metadata,
            [collectionName]: {
                ...collMeta,
                fieldIcons: {
                    ...icons,
                    [field.name]: {
                        ...icons[field.name],
                        icon,
                        iconType: type
                    }
                }
            }
        });
    };

    const setFieldIconColor = (color: string) => {
        const collMeta = metadata[collectionName] || {};
        const icons = collMeta.fieldIcons || {};
        setMetadata({
            ...metadata,
            [collectionName]: {
                ...collMeta,
                fieldIcons: {
                    ...icons,
                    [field.name]: {
                        ...icons[field.name],
                        iconColor: color
                    }
                }
            }
        });
    };

    if (!field) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="lowercase">field settings: {field.name}</DialogTitle>
                    <DialogDescription className="lowercase">
                        edit properties for this column in <strong>{collectionName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpdate} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="lowercase">display name</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. status, priority"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="lowercase">property type</Label>
                        <Select value={interfaceType} onValueChange={setInterfaceType}>
                            <SelectTrigger className="lowercase" aria-label="property type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FIELD_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value} className="lowercase">{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* icon selection */}
                    <div className="space-y-2">
                        <Label className="lowercase">icon</Label>
                        <div className="flex gap-1 items-center">
                            <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8" onClick={() => setIconPickerOpen(true)}>
                                {fieldIconInfo.iconType === 'image' ? (
                                    <img src={fieldIconInfo.icon} className="h-4 w-4 object-contain" />
                                ) : (
                                    <span className="text-xs" style={{ color: fieldIconColor }}>
                                        {fieldIconInfo.icon || 'select'}
                                    </span>
                                )}
                            </Button>
                            {fieldIconInfo.icon && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFieldIcon('', 'lucide')} title="clear icon">
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="icon color">
                                        <Palette className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-2">
                                    <div className="grid grid-cols-7 gap-1">
                                        {COLORS.map(c => (
                                            <Button
                                                key={c}
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-full border border-border/50 hover:scale-110 transition-transform p-0"
                                                style={{ backgroundColor: c }}
                                                onClick={() => setFieldIconColor(c)}
                                            />
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* associated color for text */}
                    <div className="space-y-2">
                        <Label className="lowercase">associated color</Label>
                        <div className="flex gap-4 items-start">
                            <div
                                className="w-10 h-10 rounded border shadow-sm shrink-0"
                                style={{ backgroundColor: fieldColor }}
                            />
                            <div className="flex-1">
                                <HexColorPicker
                                    color={fieldColor}
                                    onChange={setFieldColor}
                                    className="!w-full !h-32"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={loading} className="lowercase">
                            {loading ? "saving..." : "save settings"}
                        </Button>
                    </DialogFooter>
                </form>

                <IconPicker
                    onSelect={(icon, type) => setFieldIcon(icon, type)}
                    open={iconPickerOpen}
                    onOpenChange={setIconPickerOpen}
                />
            </DialogContent>
        </Dialog>
    );
}
