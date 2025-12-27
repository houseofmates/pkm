
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
import { toast } from 'sonner';
import { Plus, Image as ImageIcon, Palette } from 'lucide-react';
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

    const isEdit = !!collection;

    useEffect(() => {
        if (open) {
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
                // Auto-focus title on create
                setTimeout(() => titleInputRef.current?.focus(), 100);
            }
        }
    }, [open, isEdit, collection, metadata]);

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
                await client.createCollection({
                    title: displayName,
                    name: finalName,
                });
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

            toast.success(isEdit ? "database updated" : "database created");
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
