import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppSetting } from '@/hooks/use-app-setting';
import { HexColorPicker } from 'react-colorful';

interface FieldSettingsDialogProps {
    collectionName: string;
    field: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFieldUpdated: () => void;
}

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

    // local metadata for property colors
    const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {});
    const fieldColor = metadata[collectionName]?.fieldColors?.[field?.name] || '#64748b';

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
            console.error(error);
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
                            <SelectTrigger className="lowercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FIELD_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value} className="lowercase">{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

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
            </DialogContent>
        </Dialog>
    );
}
