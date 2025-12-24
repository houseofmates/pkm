
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface CreateFieldDialogProps {
    collectionName: string;
    onFieldCreated: () => void;
}

const FIELD_TYPES = [
    { label: 'Single Line Text', value: 'input' },
    { label: 'Long Text', value: 'textarea' },
    { label: 'Number', value: 'number' },
    { label: 'Checkbox (Boolean)', value: 'checkbox' },
    // { label: 'Date', value: 'datetime' }, // Needs more config usually
];

export function CreateFieldDialog({ collectionName, onFieldCreated }: CreateFieldDialogProps) {
    const { client } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [name, setName] = useState('');
    const [interfaceType, setInterfaceType] = useState('input');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const finalName = name || title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

            await client.createField(collectionName, {
                title,
                name: finalName,
                interface: interfaceType,
                type: getDBType(interfaceType), // Helper to map interface to DB type
                uiSchema: {
                    title,
                    'x-component': getComponentType(interfaceType),
                }
            });

            toast.success("Field created");
            setOpen(false);
            setTitle('');
            setName('');
            onFieldCreated();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create field");
        } finally {
            setLoading(false);
        }
    };

    // Simple mapping helper
    const getDBType = (uiType: string) => {
        switch (uiType) {
            case 'number': return 'integer'; // or float
            case 'checkbox': return 'boolean';
            case 'textarea': return 'text'; // or string since long text
            default: return 'string';
        }
    };

    const getComponentType = (uiType: string) => {
        switch (uiType) {
            case 'input': return 'Input';
            case 'textarea': return 'Markdown.Void'; // or Input.TextArea
            case 'number': return 'InputNumber';
            case 'checkbox': return 'Checkbox';
            default: return 'Input';
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Property
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Property</DialogTitle>
                    <DialogDescription>
                        Add a new column to the <strong>{collectionName}</strong> database.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={interfaceType} onValueChange={setInterfaceType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FIELD_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Property Name</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Status, Rating, Tags"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>System Key (Optional)</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my_field_name"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Adding..." : "Add Property"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
