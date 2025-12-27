
import { useState } from 'react';
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
import { Trash2, Edit } from 'lucide-react';
import { CollectionDialog } from './collection-dialog';

interface DatabaseContextMenuProps {
    collection: Collection;
    children: React.ReactNode;
    onUpdate: () => void;
}

export function DatabaseContextMenu({ collection, children, onUpdate }: DatabaseContextMenuProps) {
    const { client } = useAuth();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = async () => {
        try {
            await client.deleteCollection(collection.name);
            toast.success(`deleted ${collection.title || collection.name}`);
            onUpdate();
        } catch (error) {
            console.error(error);
            toast.error("failed to delete database");
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

            {/* Delete Alert */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            this will permanently delete the <strong>{collection.title || collection.name}</strong> database and all its data.
                            this action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
