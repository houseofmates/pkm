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
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateFieldDialogProps {
  collectionName: string;
  onFieldCreated: () => void;
  /** controlled open state */
  open?: boolean;
  /** callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

const FIELD_TYPES = [
  { value: 'input', label: 'Single Line Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'richText', label: 'Rich Text' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'percent', label: 'Percent' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date Time' },
  { value: 'time', label: 'Time' },
  { value: 'attachment', label: 'Attachment' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'color', label: 'Color' },
  { value: 'icon', label: 'Icon' },
  { value: 'password', label: 'Password' },
  { value: 'select', label: 'Single Select' },
  { value: 'multipleSelect', label: 'Multiple Select' },
  { value: 'radioGroup', label: 'Radio Group' },
  { value: 'checkboxGroup', label: 'Checkbox Group' },
  { value: 'formula', label: 'Formula' },
  { value: 'linkTo', label: 'Relation (Link To)' },
];

export function CreateFieldDialog({ collectionName, onFieldCreated, open: controlledOpen, onOpenChange }: CreateFieldDialogProps) {
  const { client } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);

  // use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [interfaceType, setInterfaceType] = useState('input');
  const [expression, setExpression] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalName = name || title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      const fieldConfig: any = {
        title,
        name: finalName,
        interface: interfaceType,
        type: getDBType(interfaceType),
        uiSchema: {
          title,
          'x-component': getComponentType(interfaceType),
        }
      };

      if (interfaceType === 'formula') {
        fieldConfig.params = { expression };
      }

      await client.createField(collectionName, fieldConfig);

      toast.success("field created");
      setIsOpen(false);
      setTitle('');
      setName('');
      onFieldCreated();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "failed to create field");
    } finally {
      setLoading(false);
    }
  };

  const getDBType = (uiType: string) => {
    switch (uiType) {
      case 'number': return 'integer';
      case 'checkbox': return 'boolean';
      case 'textarea': return 'text';
      case 'formula': return 'formula';
      default: return 'string';
    }
  };

  const getComponentType = (uiType: string) => {
    switch (uiType) {
      case 'input': return 'input';
      case 'textarea': return 'input.textarea';
      case 'number': return 'inputNumber';
      case 'checkbox': return 'checkbox';
      case 'formula': return 'input'; // generic field to show formula result or define it
      default: return 'input';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>add new property</DialogTitle>
          <DialogDescription>
            add a new column to the <strong>{collectionName}</strong> database.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>type</Label>
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
          {interfaceType === 'formula' && (
            <div className="space-y-2">
              <Label>expression</Label>
              <Input
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. {{price}} * {{quantity}}"
                className="font-mono text-xs"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>property name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. status, rating, tags"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>system key (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my_field_name"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "adding..." : "add property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
