import { useState } from 'react';
import { useRecords } from '@/hooks/use-records';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Inbox, Loader2 } from 'lucide-react';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SmartField } from '@/components/fields/smart-field';
import { useCollection } from '@/hooks/use-collections';

interface CreateCaptureWidgetProps {
    data?: any;
}

export default function CreateCaptureWidget({ data }: CreateCaptureWidgetProps) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const { createRecord } = useRecords('captures');
    const { data: collection, loading } = useCollection('captures');

    const fields = collection?.fields?.filter((f: any) =>
        !f.hidden &&
        f.interface !== 'subtable' &&
        !['createdat', 'updatedat', 'createdby', 'updatedby', 'id'].includes(f.name.toLowerCase())
    ) || [];

    const handleOpen = () => {
        setValues({});
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setValues({});
    };

    const handleSave = async () => {
        const hasData = Object.keys(values).some(k => values[k] !== undefined && values[k] !== '' && values[k] !== null);
        if (!hasData) {
            toast.error("please fill at least one field");
            return;
        }

        setSaving(true);
        try {
            await createRecord({
                ...values,
                source: 'create-capture-widget',
                createdAt: new Date().toISOString()
            });
            toast.success("capture saved successfully");
            setOpen(false);
            setValues({});
        } catch (err) {
            secureLogger.error('[CreateCaptureWidget] Failed to save', err);
            toast.error("failed to save capture");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Card className="w-full h-full flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl border border-primary/20 p-4 gap-4 overflow-hidden shadow-2xl">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="p-4 rounded-full bg-primary/10 border border-primary/30">
                        <Inbox className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-primary lowercase">quick capture</p>
                        <p className="text-xs text-primary/60 lowercase mt-1">create a new capture entry</p>
                    </div>
                    <Button
                        onClick={handleOpen}
                        className="mt-2 bg-primary text-black hover:bg-primary/80 gap-2 lowercase"
                    >
                        <Plus className="h-4 w-4" />
                        create capture
                    </Button>
                </div>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-primary/30 max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between border-b border-primary/10 pb-4">
                        <div className="flex items-center gap-2">
                            <Inbox className="h-5 w-5 text-primary" />
                            <DialogTitle className="text-primary lowercase tracking-wide">new capture</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                        {loading && (
                            <div className="flex items-center justify-center py-8 text-primary/60">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                <span className="text-sm lowercase">loading fields...</span>
                            </div>
                        )}

                        {!loading && fields.length === 0 && (
                            <div className="text-center py-8 text-zinc-500">
                                <p className="text-sm lowercase">no fields available in captures collection</p>
                                <p className="text-xs text-zinc-600 mt-1">create fields in nocobase to capture data</p>
                            </div>
                        )}

                        {fields.map((field: any) => (
                            <div key={field.name} className="space-y-2">
                                <Label className="text-xs uppercase text-primary/60 font-mono tracking-wider">
                                    {field.uiSchema?.title || field.name}
                                    {field.allowNull === false && <span className="text-red-400 ml-1">*</span>}
                                </Label>
                                <SmartField
                                    value={values[field.name]}
                                    field={field}
                                    onChange={(val) => setValues((v: any) => ({ ...v, [field.name]: val }))}
                                    className="bg-black/40 border-primary/20 text-primary w-full"
                                    inputClassName="bg-transparent"
                                    size="md"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-primary/10">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1 border-white/10 hover:bg-white/5 lowercase"
                        >
                            cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || fields.length === 0}
                            className="flex-1 bg-primary text-black hover:bg-primary/80 gap-2 font-bold lowercase"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {saving ? 'saving...' : 'save capture'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
