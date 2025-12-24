
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRecordDialogProps {
    collectionName: string;
    fields: any[];
    onRecordCreated: () => void;
}

export function CreateRecordDialog({ collectionName, fields, onRecordCreated }: CreateRecordDialogProps) {
    const { client } = useAuth();
    const { activeFronterId } = useFronter();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dataToSubmit = { ...formData };

        // Auto-inject fronter if applicable
        if (activeFronterId) {
            // Check if collection has a 'fronter' field
            // Note: NocoBase fields sometimes use 'name' key.
            const hasFronterField = fields.some(f => f.name === 'fronter');
            if (hasFronterField) {
                // If it's a text field, just save ID (or name if we had it, but ID is safer for ref)
                // ideally this would be a relationship, but text is simpler for now as requested "metadata"
                dataToSubmit['fronter'] = activeFronterId;
            }
        }

        try {
            await client.createRecord(collectionName, dataToSubmit);
            toast.success("Record created");
            setOpen(false);
            setFormData({});
            onRecordCreated();
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create record");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    // Filter editable fields
    // Exclude system fields and the 'fronter' field (auto-filled)
    const editableFields = (fields || []).filter(f =>
        !['id', 'createdAt', 'updatedAt', 'fronter', 'sort'].includes(f.name) &&
        !f.hidden &&
        f.interface !== 'subTable' && // Skip complex relations
        f.interface !== 'linkTo' // Skip complex relations
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Item
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {editableFields.length === 0 && (
                        <p className="text-muted-foreground">No editable fields found.</p>
                    )}
                    {editableFields.map(field => (
                        <div key={field.name} className="space-y-2">
                            <Label className="capitalize">{field.uiSchema?.title || field.name}</Label>
                            <Input
                                value={formData[field.name] || ''}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                placeholder={field.uiSchema?.title || field.name}
                                disabled={loading}
                            />
                        </div>
                    ))}
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
