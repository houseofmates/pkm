
import { useState } from 'react';
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
import { Plus } from 'lucide-react';

interface CreateCollectionDialogProps {
    onCollectionCreated: () => void;
}

export function CreateCollectionDialog({ onCollectionCreated }: CreateCollectionDialogProps) {
    const { client } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Auto-generate name from display name if empty, ensuring it's lowercase/underscore
            const finalName = name || displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

            await client.createCollection({
                title: displayName,
                name: finalName,
            });

            toast.success("Collection created successfully");
            setOpen(false);
            setDisplayName('');
            setName('');
            onCollectionCreated();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create collection");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="outline" className="rounded-full w-10 h-10">
                    <Plus className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>create database</DialogTitle>
                    <DialogDescription>
                        Create a new collection to store your data.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">display name</Label>
                        <Input
                            id="title"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="My Books"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">system name (optional)</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my_books"
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            Leave blank to auto-generate from display name.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
