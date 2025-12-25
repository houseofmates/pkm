
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Collection } from '@/types/nocobase';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuLabel,
} from "@/components/ui/context-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Image, Trash2, Edit, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DatabaseContextMenuProps {
    collection: Collection;
    children: React.ReactNode;
    onUpdate: () => void;
}

export function DatabaseContextMenu({ collection, children, onUpdate }: DatabaseContextMenuProps) {
    const { client } = useAuth();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [colorOpen, setColorOpen] = useState(false);

    const [newName, setNewName] = useState(collection.title || collection.name);
    // Try to get color from uiSchema or description hacks? 
    // For now, let's assume no pre-existing color store standard, so default to empty
    const [newColor, setNewColor] = useState('#666666');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await client.updateCollection(collection.name, {
                title: newName
            });
            toast.success("Database renamed");
            setRenameOpen(false);
            onUpdate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to rename database");
        }
    };

    const handleColorSave = async () => {
        // Where to save color? uiSchema is a good place for view-related meta
        // But updateCollection is for DB metadata.
        // Let's store it in the description with a prefix convention if no other field exists,
        // OR update the collection.uiSchema if the API allows.
        // Given simplified requirements, reusing the 'description' field as a metadata store 
        // (like we discussed for cover image: "COVER:url | COLOR:hex") is risky but quick.
        // Better: Let's assume we can just save it to local storage for THIS app if the backend is rigid,
        // BUT user asked for "Visual Customization" back in id:33 task...
        // Let's try to update uiSchema via updateCollection if possible, or fall back to description.

        // Actually, NocoBase collections have `option` field sometimes.
        // Let's just stick to a localStorage override for "Color" if we can't easily modify schema,
        // OR, safer: Try to update the description with a JSON blob if possible?
        // No, the safest "App-Level" customization without breaking backend schema is often Client-Side persistence 
        // OR a dedicated "preferences" collection.

        // Let's use the same trick as View Config -> LocalStorage for "Visuals" if backend capabilities are unknown?
        // WAit, task 33 said "Visual Customization ... Context Menu".
        // I'll implement it using `localStorage` for now to ensure it works reliably immediately,
        // keyed by `collection_color_${collection.name}`.

        localStorage.setItem(`collection_color_${collection.name}`, newColor);
        toast.success("Color saved (Local)");
        setColorOpen(false);
        onUpdate(); // Trigger re-render if parent listens
    };

    const handleDelete = async () => {
        try {
            await client.deleteCollection(collection.name);
            toast.success(`Deleted ${collection.title || collection.name}`);
            onUpdate();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete database");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Uploading cover...");
        try {
            const res = await client.upload(file);
            const uploadedFile = res.data;

            if (!uploadedFile || !uploadedFile.url) {
                throw new Error("Upload failed");
            }

            // NOTE: Using description for cover image is the existing pattern from previous task
            await client.updateCollection(collection.name, {
                description: uploadedFile.url
            });

            toast.success("Cover updated", { id: toastId });
            onUpdate();

        } catch (error) {
            console.error(error);
            toast.error("Failed to update cover", { id: toastId });
        }
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>{children}</ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                    <ContextMenuLabel>{collection.title || collection.name}</ContextMenuLabel>
                    <ContextMenuSeparator />

                    <ContextMenuItem onSelect={() => fileInputRef.current?.click()}>
                        <Image className="mr-2 h-4 w-4" />
                        Change Cover Image
                    </ContextMenuItem>

                    <ContextMenuItem onSelect={() => setRenameOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Rename
                    </ContextMenuItem>

                    <ContextMenuItem onSelect={() => setColorOpen(true)}>
                        <Palette className="mr-2 h-4 w-4" />
                        Change Color
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Database
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            {/* Delete Alert */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the <strong>{collection.title || collection.name}</strong> database and all its data.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Rename Dialog */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Database</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRename} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Color Dialog */}
            <Dialog open={colorOpen} onOpenChange={setColorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Color</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex gap-2 justify-center">
                            <Input
                                type="color"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className="w-20 h-20 p-2 cursor-pointer"
                            />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'].map(c => (
                                <button
                                    key={c}
                                    className="w-8 h-8 rounded-full border border-muted ring-offset-background hover:ring-2 hover:ring-ring transition-all"
                                    style={{ backgroundColor: c }}
                                    onClick={() => setNewColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleColorSave}>Save Color</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
