
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
import { CollectionDialog } from './collection-dialog';
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

import { useAppSetting } from '@/hooks/use-app-setting';

interface CollectionMetadata {
    color?: string;
    image?: string;
}

export function DatabaseContextMenu({ collection, children, onUpdate }: DatabaseContextMenuProps) {
    const { client } = useAuth();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const [metadata, setMetadata] = useAppSetting<Record<string, CollectionMetadata>>('collection_metadata', {});
    const currentMeta = metadata[collection.name] || {};

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

            setMetadata(prev => ({
                ...prev,
                [collection.name]: {
                    ...prev[collection.name],
                    image: uploadedFile.url
                }
            }));

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
                    <ContextMenuLabel className="lowercase">{collection.title || collection.name}</ContextMenuLabel>
                    <ContextMenuSeparator />

                    <ContextMenuItem onSelect={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        edit database
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        delete database
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <CollectionDialog
                collection={collection}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSuccess={onUpdate}
            />

            {/* Rename and Color dialogs removed and replaced by unified CollectionDialog */}
        </>
    );
}
