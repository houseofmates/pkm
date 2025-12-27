
import { useState, useEffect, useRef } from 'react';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';
import type { Collection } from '@/types/nocobase';

interface CollectionDialogProps {
    collection?: Collection;
    onSuccess: () => void;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

interface CollectionMetadata {
    color?: string;
    image?: string;
}

const FIELD_TYPES = [
    { label: 'text', type: 'string', interface: 'text' },
    { label: 'email', type: 'string', interface: 'email' },
    { label: 'phone', type: 'string', interface: 'phone' },
    { label: 'password', type: 'string', interface: 'password' },
    { label: 'number', type: 'number', interface: 'number' },
    { label: 'date', type: 'date', interface: 'datetime' },
    { label: 'checkbox', type: 'boolean', interface: 'checkbox' },
    { label: 'url', type: 'string', interface: 'url' },
    { label: 'color', type: 'string', interface: 'color' },
    { label: 'file/image', type: 'attachment', interface: 'attachment' },
    { label: 'location', type: 'point', interface: 'map' },
    { label: 'select', type: 'string', interface: 'select' },
    { label: 'multi-select', type: 'json', interface: 'multipleSelect' },
    { label: 'relation', type: 'belongsTo', interface: 'belongsTo' },
] as const;

export function CollectionDialog({ collection, onSuccess, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: CollectionDialogProps) {
    const { client } = useAuth();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

    const [loading, setLoading] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [name, setName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [color, setColor] = useState('#666666');

    const titleInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [metadata, setMetadata] = useAppSetting<Record<string, CollectionMetadata>>('collection_metadata', {});
    const [collectionsList, setCollectionsList] = useState<Collection[]>([]);

    const isEdit = !!collection;

    useEffect(() => {
        if (open) {
            // Fetch collections list for relation targets
            client.listCollections().then(res => setCollectionsList(res.data)).catch(console.error);

            if (isEdit) {
                setDisplayName(collection.title || '');
                setName(collection.name || '');
                const meta = metadata[collection.name] || {};
                setImageUrl(meta.image || '');
                setColor(meta.color || '#666666');
            } else {
                setDisplayName('');
                setName('');
                setImageUrl('');
                setColor('#666666');
                setCsvData([]);
                setCsvFields([]);
                // Auto-focus title on create
                setTimeout(() => titleInputRef.current?.focus(), 100);
            }
        }
    }, [open, isEdit, collection, metadata, client]);

    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvFields, setCsvFields] = useState<{ name: string; title: string; interface: string; target?: string }[]>([]);
    const csvInputRef = useRef<HTMLInputElement>(null);

    const inferType = (values: any[]) => {
        const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
        if (nonNull.length === 0) return 'text';

        // Check for Email
        const isEmail = nonNull.every(v => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(v)));
        if (isEmail) return 'email';

        // Check for Phone (10+ digits or specific patterns)
        const isPhone = nonNull.every(v => {
            const s = String(v).replace(/[-().\s+]/g, '');
            return s.length >= 10 && /^\d+$/.test(s);
        });
        if (isPhone) return 'phone';

        // Check for Password (numbers > 3 digits without decimals)
        const isSecret = nonNull.every(v => {
            const s = String(v);
            return s.length >= 4 && /^\d+$/.test(s);
        });
        if (isSecret) return 'password';

        // Check for boolean
        const isBool = nonNull.every(v => {
            const s = String(v).toLowerCase();
            return ['true', 'false', 'yes', 'no', '1', '0'].includes(s);
        });
        if (isBool) return 'checkbox';

        // Check for number
        const isNum = nonNull.every(v => !isNaN(Number(v)) && String(v).trim() !== '');
        if (isNum) return 'number';

        // Check for date
        const isDate = nonNull.every(v => !isNaN(Date.parse(String(v))));
        if (isDate) return 'datetime';

        return 'text';
    };

    const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        import('papaparse').then((Papa) => {
            Papa.default.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        const data = results.data as any[];
                        const headers = Object.keys(data[0]);
                        const fields = headers.map(h => ({
                            name: h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                            title: h,
                            interface: inferType(data.map(row => row[h]))
                        }));
                        setCsvData(data);
                        setCsvFields(fields);
                        if (!displayName) setDisplayName(file.name.replace(/\.[^/.]+$/, ""));
                        toast.success(`parsed ${data.length} rows and ${fields.length} columns`);
                    }
                },
                error: (err) => {
                    toast.error("failed to parse CSV: " + err.message);
                }
            });
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const finalName = name || displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

            if (isEdit) {
                await client.updateCollection(collection.name, {
                    title: displayName,
                });
            } else {
                // 1. Create Collection
                await client.createCollection({
                    title: displayName,
                    name: finalName,
                });

                // 2. If CSV, Create Fields
                if (csvFields.length > 0) {
                    toast.info(`creating ${csvFields.length} fields...`);
                    // We must create fields sequentially or carefully to avoid NocoBase race conditions
                    for (const field of csvFields) {
                        let typeConfig = FIELD_TYPES.find(t => t.interface === field.interface);

                        // Intelligent Text Logic: Auto-switch between input and textarea
                        let finalInterface = field.interface;
                        let internalType: any = typeConfig?.type || 'string';

                        if (field.interface === 'text') {
                            const isLong = csvData.some(row => String(row[field.title] || '').length > 200);
                            finalInterface = isLong ? 'textarea' : 'input';
                            internalType = isLong ? 'text' : 'string';
                        }

                        await client.createField(finalName, {
                            name: field.name,
                            title: field.title,
                            type: internalType,
                            interface: finalInterface
                        });
                    }

                    // 3. Batch Create Records
                    if (csvData.length > 0) {
                        toast.info(`importing ${csvData.length} records...`);
                        // For simplicity, we loop. In production we'd want a bulk API
                        const batchSize = 10;
                        for (let i = 0; i < csvData.length; i += batchSize) {
                            const chunk = csvData.slice(i, i + batchSize);
                            await Promise.all(chunk.map(row => {
                                // Map CSV header keys to NocoBase field names
                                const record: any = {};
                                csvFields.forEach(f => {
                                    record[f.name] = row[f.title];
                                });
                                return client.createRecord(finalName, record);
                            }));
                            if (i % 50 === 0) toast.info(`imported ${i + chunk.length} / ${csvData.length} records...`);
                        }
                    }
                }
            }

            // Save metadata
            const collectionKey = isEdit ? collection.name : finalName;
            setMetadata(prev => ({
                ...prev,
                [collectionKey]: {
                    ...prev[collectionKey],
                    image: imageUrl,
                    color: color
                }
            }));

            toast.success(isEdit ? "database updated" : (csvData.length > 0 ? "database imported successfully" : "database created"));
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || `failed to ${isEdit ? 'update' : 'create'} database`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("uploading image...");
        try {
            const res = await client.upload(file);
            const uploadedFile = res.data;

            if (!uploadedFile || !uploadedFile.url) {
                throw new Error("upload failed");
            }

            setImageUrl(uploadedFile.url);
            toast.success("image uploaded", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("failed to upload image", { id: toastId });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'edit database' : 'create database'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'update your database settings and metadata.' : 'create a new collection to store your data.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">display name</Label>
                        <Input
                            id="title"
                            ref={titleInputRef}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="my books"
                            required
                        />
                    </div>

                    {!isEdit && (
                        <div className="space-y-4 border-t pt-4">
                            <Label>csv import (optional)</Label>
                            <div className="flex flex-col gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-dashed"
                                    onClick={() => csvInputRef.current?.click()}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {csvData.length > 0 ? "change csv file" : "upload csv (notion export)"}
                                </Button>
                                <input
                                    type="file"
                                    ref={csvInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleCsvChange}
                                />

                                {csvData.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            detected {csvFields.length} columns:
                                        </div>
                                        <div className="max-h-48 overflow-y-auto border rounded p-2 bg-muted/30 space-y-1">
                                            {csvFields.map((field, idx) => (
                                                <div key={field.name} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0 border-muted group/field">
                                                    <span className="font-medium truncate mr-2" title={field.title}>{field.title}</span>
                                                    <Select
                                                        value={field.interface}
                                                        onValueChange={(val) => {
                                                            const newFields = [...csvFields];
                                                            newFields[idx].interface = val;
                                                            setCsvFields(newFields);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-7 w-[110px] text-[10px] px-2 bg-background border-muted hover:border-accent transition-colors">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {FIELD_TYPES.map(t => (
                                                                <SelectItem key={t.interface} value={t.interface} className="text-xs">
                                                                    {t.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[0.7rem] text-muted-foreground italic">
                                            {csvData.length} records will be imported.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isEdit && (
                        <div className="space-y-2">
                            <Label htmlFor="name">system name (optional)</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="my_books"
                            />
                            <p className="text-[0.8rem] text-muted-foreground">
                                leave blank to auto-generate from display name.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>cover image</Label>
                        <div className="flex gap-2">
                            <Input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://... or upload"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>theme color</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                placeholder="#666666"
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? (isEdit ? "saving..." : "creating...") : (isEdit ? "save" : "create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
