
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
import { Image, Trash2, Settings, Edit, Palette } from 'lucide-react';
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
    const [newName, setNewName] = useState(collection.title || collection.name);
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
            const uploadedFile = res.data; // Depending on NocoBase response structure, might be res.data.url or similar

            if (!uploadedFile || !uploadedFile.url) {
                throw new Error("Upload failed");
            }

            // Save URL to collection 'description' (hack/convention for now) 
            // or a specific place if we defined one. 
            // Using 'description' is safe-ish for visualization if we parse it, 
            // but better acts as a convention: "COVER:url | description" or just assume description is meta JSON?
            // Let's just create a convention: description field holds the URL for now if it starts with http,
            // OR we just update the 'description' to be the URL.

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

                    <ContextMenuItem disabled>
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
        </>
    );
}
