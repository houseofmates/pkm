
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
import { Image as ImageIcon, Plus, Smartphone, Monitor, Database, FileText, ArrowLeft, Zap } from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';
import type { Collection } from '@/types/nocobase';
import { detectFieldType } from '@/utils/csv-detector';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card"
import { TRACKING_TEMPLATES } from '@/features/databases/data/tracking-templates';

interface CollectionDialogProps {
    collection?: Collection;
    onSuccess: () => void;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialTitle?: string;
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
    { label: 'number', type: 'double', interface: 'number' },
    { label: 'date', type: 'date', interface: 'datetime' },
    { label: 'checkbox', type: 'boolean', interface: 'checkbox' },
    { label: 'url', type: 'string', interface: 'url' },
    { label: 'color', type: 'string', interface: 'color' },
    { label: 'file/image', type: 'attachment', interface: 'attachment' },
    { label: 'location', type: 'point', interface: 'map' },
    { label: 'select', type: 'string', interface: 'select' },
    { label: 'multi-select', type: 'json', interface: 'multipleSelect' },
    { label: 'relation', type: 'belongsTo', interface: 'belongsTo' },
    { label: 'formula', type: 'formula', interface: 'formula' },
] as const;

export function CollectionDialog({ collection, onSuccess, trigger, open: controlledOpen, onOpenChange: setControlledOpen, initialTitle }: CollectionDialogProps) {
    const { client } = useAuth();
    const navigate = useNavigate();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = controlledOpen !== undefined ? setControlledOpen : setInternalOpen;

    const isEdit = !!collection;
    const [step, setStep] = useState<'type-select' | 'template-select' | 'database-form' | 'document-select'>('type-select');

    useEffect(() => {
        if (!open) {
            // Reset to select screen on close if creating
            if (!isEdit) setTimeout(() => setStep('type-select'), 300);
        } else {
            if (isEdit) setStep('database-form');
            // If already open and not edit, ensure select
            else if (step === 'database-form' && !displayName) setStep('type-select');
        }
    }, [open, isEdit]);

    const handleCreateDocument = (mode: 'edgeless' | 'desktop-8k' | 'iphone-8k') => {
        const id = Math.random().toString(36).substring(7);
        // Stash config
        localStorage.setItem(`canvas-config-${id}`, JSON.stringify({ title: "untitled document", mode }));
        navigate(`/canvas/${id}`);
        if (setOpen) setOpen(false);
    };

    const handleTemplateSelect = (template: typeof TRACKING_TEMPLATES[0] | null) => {
        if (template) {
            setDisplayName(template.label);
            setColor(template.metadata.color);
            // Map template fields to the internal schema format
            setCsvFields(template.fields.map(f => ({
                ...f,
                detectionReason: 'Template',
                detectionConfidence: 'high' as const
            })));
        } else {
            // Blank
            setDisplayName('');
            setCsvFields([]);
        }
        setStep('database-form');
    };

    const [loading, setLoading] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [name, setName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [color, setColor] = useState('#666666');

    const titleInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [metadata, setMetadata] = useAppSetting<Record<string, CollectionMetadata>>('collection_metadata', {});
    const [collectionsList, setCollectionsList] = useState<Collection[]>([]);



    useEffect(() => {
        if (open) {
            // Fetch collections list for relation targets
            client.listCollections().then(res => {
                // Filter out system and backend collections
                const systemCollections = ['users', 'roles', 'attachments', 'collection_fields', 'collections', 'ui_schemas', 'application_installations', 'cas_providers', 'oidc_providers', 'saml_providers', 'site-pages', 'dupemates-pages', 'server-stats', 'public_blocks', 'public_pages', 'pkm_canvases', 'pkm_settings', 'front_history', 'headmates'];
                const filteredCollections = res.data.filter((col: Collection) => {
                    const name = (col.name || '').toLowerCase().trim();
                    const title = (col.title || '').toLowerCase().trim();

                    // Exclude system collections
                    if (systemCollections.includes(name)) return false;

                    // Exclude pkm_settings
                    if (name === 'pkm_settings' || title === 'pkm settings') return false;

                    // Hide anything with "backend" in the name or title
                    if (name.includes('backend') || title.includes('backend')) return false;

                    // Exclude hidden collections
                    if (col.hidden) return false;

                    return true;
                });
                setCollectionsList(filteredCollections);
            }).catch(console.error);

            if (isEdit) {
                setDisplayName(initialTitle || collection.title || '');
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
    const [csvFields, setCsvFields] = useState<{
        name: string;
        title: string;
        interface: string;
        target?: string;
        expression?: string;
        uiSchema?: any; // Added for template support
        detectionReason?: string;
        detectionConfidence?: 'high' | 'medium' | 'low';
    }[]>([]);
    const csvInputRef = useRef<HTMLInputElement>(null);

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
                        const fields = headers.map(h => {
                            const detection = detectFieldType(h, data.map(row => row[h]), collectionsList.map(c => c.name));
                            return {
                                name: h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                                title: h,
                                interface: detection.type,
                                target: detection.target,
                                detectionReason: detection.reason,
                                detectionConfidence: detection.confidence
                            };
                        });
                        setCsvData(data);
                        setCsvFields(fields);
                        if (!displayName) setDisplayName(file.name.replace(/\.[^/.]+$/, ""));
                        toast.success(`parsed ${data.length} rows and ${fields.length} columns`);
                    }
                },
                error: (err: any) => {
                    toast.error("failed to parse csv: " + err.message);
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

                // 2. If CSV/Templates, Create Fields
                if (csvFields.length > 0) {
                    toast.info(`creating ${csvFields.length} fields...`);
                    // We must create fields sequentially or carefully to avoid NocoBase race conditions
                    for (const field of csvFields) {
                        const fieldType = FIELD_TYPES.find(t => t.interface === field.interface);

                        // Intelligent Type/UI Management: Prevent varchar(255) overflow
                        let dbType: string = fieldType?.type || 'string';
                        let xComponent = 'Input';

                        // Check if data contains long strings (> 200 chars)
                        const isLong = csvData.some(row => String(row[field.title] || '').length > 200);

                        if (isLong && (dbType === 'string' || field.interface === 'text')) {
                            dbType = 'text';
                            xComponent = 'Input.TextArea';
                        } else {
                            // Default component mapping
                            switch (field.interface) {
                                case 'number': xComponent = 'InputNumber'; break;
                                case 'checkbox': xComponent = 'Checkbox'; break;
                                case 'attachment': xComponent = 'Upload.Attachment'; break;
                                case 'select': case 'multipleSelect': xComponent = 'Select'; break;
                                default: xComponent = 'Input';
                            }
                        }

                        let uiSchema: any = {
                            title: field.title,
                            'x-component': xComponent,
                        };

                        // Extract options for Select / Multi-Select (CSV only)
                        if (csvData.length > 0 && (field.interface === 'select' || field.interface === 'multipleSelect')) {
                            const uniqueValues = new Set<string>();
                            csvData.forEach(row => {
                                const val = row[field.title];
                                if (val) {
                                    if (field.interface === 'multipleSelect') {
                                        String(val).split(',').map(s => s.trim()).forEach(v => v && uniqueValues.add(v));
                                    } else {
                                        uniqueValues.add(String(val).trim());
                                    }
                                }
                            });
                            uiSchema.enum = Array.from(uniqueValues).map(v => ({ label: v, value: v }));
                            if (field.interface === 'multipleSelect') {
                                uiSchema['x-component-props'] = { mode: 'multiple' };
                            }
                        }

                        // Use Template UI Schema if available
                        if (field.uiSchema) {
                            uiSchema = {
                                ...uiSchema,
                                ...field.uiSchema
                            };
                        }

                        const fieldConfig: any = {
                            name: field.name,
                            type: dbType,
                            interface: field.interface,
                            uiSchema
                        };

                        if (field.interface === 'belongsTo' && field.target) {
                            fieldConfig.target = field.target;
                            fieldConfig.targetKey = 'id';
                        }

                        if (field.interface === 'formula' && field.expression) {
                            fieldConfig.params = { expression: field.expression };
                        }

                        await client.createField(finalName, fieldConfig);
                    }

                    // 3. Batch Create Records
                    if (csvData.length > 0) {
                        toast.info(`importing ${csvData.length} records...`);
                        const batchSize = 10;
                        for (let i = 0; i < csvData.length; i += batchSize) {
                            const chunk = csvData.slice(i, i + batchSize);
                            await Promise.all(chunk.map(row => {
                                const record: any = {};
                                csvFields.forEach(f => {
                                    let val = row[f.title];
                                    if (f.interface === 'multipleSelect' && val) {
                                        val = String(val).split(',').map(s => s.trim()).filter(Boolean);
                                    }
                                    if (f.interface === 'belongsTo' && val) {
                                        val = isNaN(Number(val)) ? val : Number(val);
                                    }
                                    record[f.name] = val;
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
            if (setOpen) setOpen(false);
            onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || `Failed to ${isEdit ? 'update' : 'create'} database`);
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
                    <DialogTitle>
                        {step === 'type-select' && "create new item"}
                        {step === 'template-select' && "choose a template"}
                        {step === 'database-form' && (isEdit ? 'edit database' : 'create database')}
                        {step === 'document-select' && "select document type"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'type-select' ? "choose what you want to create." : ""}
                        {step === 'template-select' ? "start from scratch or use a template." : ""}
                        {step === 'database-form' ? (isEdit ? 'update your database settings.' : 'configure your new database.') : ""}
                        {step === 'document-select' ? "choose a canvas size." : ""}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Type Selection */}
                {step === 'type-select' && (
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Card
                            className="cursor-pointer hover:border-black transition-all hover:bg-muted/50"
                            onClick={() => setStep('document-select')}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center h-40">
                                <FileText className="w-8 h-8" />
                                <div className="font-semibold lowercase">document</div>
                                <div className="text-xs text-muted-foreground lowercase">infinite canvas & pdfs</div>
                            </CardContent>
                        </Card>

                        <Card
                            className="cursor-pointer hover:border-black transition-all hover:bg-muted/50"
                            onClick={() => setStep('template-select')}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center h-40">
                                <Database className="w-8 h-8" />
                                <div className="font-semibold lowercase">database</div>
                                <div className="text-xs text-muted-foreground lowercase">structured data tables</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 1.5: Template Selection */}
                {step === 'template-select' && (
                    <div className="space-y-4">
                        <Button variant="ghost" size="sm" className="pl-0 gap-1" onClick={() => setStep('type-select')}>
                            <ArrowLeft className="w-4 h-4" /> back
                        </Button>
                        <div className="grid grid-cols-2 gap-2 h-[300px] overflow-y-auto pr-2">
                            <Card
                                className="cursor-pointer hover:border-black transition-all border-dashed"
                                onClick={() => handleTemplateSelect(null)}
                            >
                                <CardContent className="flex flex-col items-center justify-center p-4 gap-1 text-center h-24">
                                    <Plus className="w-6 h-6 text-muted-foreground" />
                                    <div className="font-semibold text-xs lowercase">empty database</div>
                                </CardContent>
                            </Card>

                            {TRACKING_TEMPLATES.map(template => (
                                <Card
                                    key={template.id}
                                    className="cursor-pointer hover:border-black transition-all"
                                    onClick={() => handleTemplateSelect(template)}
                                    style={{ borderColor: template.metadata.color ? `${template.metadata.color}40` : undefined }}
                                >
                                    <CardContent className="flex flex-col items-center justify-center p-4 gap-1 text-center h-24 relative overflow-hidden">
                                        {/* Color accent */}
                                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: template.metadata.color }} />

                                        {/* Icon (dynamic string to component mapping would be ideal, but for now generic Zap) */}
                                        <Zap className="w-5 h-5" style={{ color: template.metadata.color }} />

                                        <div className="font-semibold text-xs lowercase truncate w-full">{template.label}</div>
                                        <div className="text-[0.6rem] text-muted-foreground line-clamp-2 leading-tight">
                                            {template.description}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}


                {/* Step 2b: Document Selection */}
                {step === 'document-select' && (
                    <div className="space-y-4">
                        <Button variant="ghost" size="sm" className="pl-0 gap-1" onClick={() => setStep('type-select')}>
                            <ArrowLeft className="w-4 h-4" /> back
                        </Button>
                        <div className="grid grid-cols-3 gap-2">
                            <Card
                                className="cursor-pointer hover:border-black transition-all bg-primary/5 border-primary/20"
                                onClick={() => handleCreateDocument('edgeless')}
                            >
                                <CardContent className="flex flex-col items-center justify-center p-4 gap-1 text-center h-32">
                                    <div className="text-2xl">∞</div>
                                    <div className="font-semibold text-xs lowercase">edgeless</div>
                                    <div className="text-[0.65rem] text-muted-foreground lowercase">infinite canvas</div>
                                </CardContent>
                            </Card>

                            <Card
                                className="cursor-pointer hover:border-black transition-all"
                                onClick={() => handleCreateDocument('desktop-8k')}
                            >
                                <CardContent className="flex flex-col items-center justify-center p-4 gap-1 text-center h-32">
                                    <Monitor className="w-6 h-6" />
                                    <div className="font-semibold text-xs lowercase">desktop 8k</div>
                                    <div className="text-[0.65rem] text-muted-foreground lowercase">fixed 7680x4320</div>
                                </CardContent>
                            </Card>

                            <Card
                                className="cursor-pointer hover:border-black transition-all"
                                onClick={() => handleCreateDocument('iphone-8k')}
                            >
                                <CardContent className="flex flex-col items-center justify-center p-4 gap-1 text-center h-32">
                                    <Smartphone className="w-6 h-6" />
                                    <div className="font-semibold text-xs lowercase">iphone 8k</div>
                                    <div className="text-[0.65rem] text-muted-foreground lowercase">portrait 4320x9360</div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}


                {/* Step 2a: Database Form (Existing) */}
                {step === 'database-form' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isEdit && (
                            <Button variant="ghost" size="sm" type="button" className="pl-0 gap-1 -mt-2 mb-2" onClick={() => setStep('template-select')}>
                                <ArrowLeft className="w-4 h-4" /> back
                            </Button>
                        )}

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

                                    {csvFields.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                {csvData.length > 0 ? `detected ${csvFields.length} columns:` : `template fields (${csvFields.length}):`}
                                            </div>
                                            <div className="max-h-48 overflow-y-auto border rounded p-2 bg-muted/30 space-y-1">
                                                {csvFields.map((field, idx) => (
                                                    <div key={field.name} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0 border-muted group/field">
                                                        <div className="flex flex-col gap-0.5 max-w-[45%]">
                                                            <span className="font-medium truncate" title={field.title}>{field.title}</span>
                                                            {field.detectionReason && (
                                                                <span className={`text-[0.65rem] truncate ${field.detectionConfidence === 'high' ? 'text-green-600' : 'text-muted-foreground'}`} title={`Detected as ${field.interface}: ${field.detectionReason}`}>
                                                                    {field.detectionReason}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <Select
                                                                value={field.interface}
                                                                onValueChange={(val) => {
                                                                    const newFields = [...csvFields];
                                                                    newFields[idx].interface = val;
                                                                    setCsvFields(newFields);
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {FIELD_TYPES.map(t => (
                                                                        <SelectItem key={t.interface} value={t.interface}>{t.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            {field.interface === 'belongsTo' && (
                                                                <Select
                                                                    value={field.target}
                                                                    onValueChange={(val) => {
                                                                        const newFields = [...csvFields];
                                                                        newFields[idx].target = val;
                                                                        setCsvFields(newFields);
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-8 text-xs border-primary/50 bg-primary/5">
                                                                        <SelectValue placeholder="target collection..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {collectionsList.map(c => (
                                                                            <SelectItem key={c.name} value={c.name}>{c.title || c.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                            {field.interface === 'formula' && (
                                                                <Input
                                                                    className="h-8 text-xs border-primary/50 bg-primary/5 font-mono"
                                                                    placeholder="formula (e.g. {{price}} * 0.1)..."
                                                                    value={field.expression || ''}
                                                                    onChange={(e) => {
                                                                        const newFields = [...csvFields];
                                                                        newFields[idx].expression = e.target.value;
                                                                        setCsvFields(newFields);
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {csvData.length > 0 && <p className="text-[0.7rem] text-muted-foreground italic">
                                                {csvData.length} records will be imported.
                                            </p>}
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
                )}
            </DialogContent>
        </Dialog>
    );
}
