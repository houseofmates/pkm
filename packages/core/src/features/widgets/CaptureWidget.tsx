import { useState } from 'react';
import { useRecords } from '@/hooks/use-records';
import { useCollection } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { secureLogger } from '@/lib/secure-logger';
import { SmartField } from '@/components/fields/smart-field';
import { toast } from 'sonner';

export default function CaptureWidget({ data, onUpdate }: { data: any, onUpdate?: (data: any) => void }) {
    const { createRecord } = useRecords('captures');
    const { data: collection, loading } = useCollection('captures');

    const [values, setValues] = useState<any>(data || {});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const fields = collection?.fields?.filter((f: any) =>
        !f.hidden &&
        f.interface !== 'subtable' &&
        !['createdat', 'updatedat', 'createdby', 'updatedby'].includes(f.name.toLowerCase())
    ) || [];

    const handleSave = async () => {
        // basic validation: ensure we have at least one field filled to avoid empty rows
        const hasData = Object.keys(values).some(k => values[k] !== undefined && values[k] !== '' && values[k] !== null);
        if (!hasData) {
            toast.error("please fill at least one field");
            return;
        }

        setSaving(true);
        try {
            await createRecord({
                ...values,
                source: 'canvas-widget',
                createdAt: new Date().toISOString()
            });
            setSaved(true);
            secureLogger.info('[CaptureWidget] Saved capture');
        } catch (err) {
            secureLogger.error('[CaptureWidget] Failed to save', err);
            toast.error("failed to save capture");
        } finally {
            setSaving(false);
        }
    };

    if (saved) {
        return (
            <Card className="w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-md border-primary/30 p-4 text-primary">
                <div className="text-center">
                    <p className="text-lg font-bold lowercase">capture signal locked</p>
                    <p className="text-sm opacity-60 lowercase">stored in database</p>
                    <Button
                        variant="ghost"
                        className="mt-4 lowercase text-xs"
                        onClick={() => {
                            setSaved(false);
                            setValues({});
                        }}
                    >
                        new capture
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="w-full h-full flex flex-col bg-black/60 backdrop-blur-xl border border-primary/20 p-4 gap-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-primary/10 pb-2 flex-shrink-0">
                <span className="text-xs font-bold text-primary lowercase tracking-widest">quick capture</span>
                <span className="text-[10px] text-primary/40 uppercase">v.0.2</span>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar scroll-smooth">
                {loading && <div className="text-xs text-primary/60 text-center py-4">loading databanks...</div>}

                {!loading && fields.length === 0 && (
                    <div className="text-xs text-primary/60 text-center py-4">no fields available</div>
                )}

                {fields.map((field: any) => (
                    <div key={field.name} className="flex flex-col space-y-1">
                        <Label className="text-[10px] uppercase text-primary/60 font-mono">
                            {field.uiSchema?.title || field.name}
                        </Label>
                        <SmartField
                            value={values[field.name]}
                            field={field}
                            onChange={(val) => setValues((v: any) => ({ ...v, [field.name]: val }))}
                            className="bg-black/40 border-primary/20 text-primary w-full text-sm"
                            inputClassName="bg-transparent"
                            size="md"
                        />
                    </div>
                ))}
            </div>

            <Button
                onClick={handleSave}
                disabled={saving || fields.length === 0}
                className="w-full bg-primary text-black hover:bg-primary/80 h-10 gap-2 font-bold lowercase flex-shrink-0 mt-2"
            >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'transmitting...' : 'save to database'}
            </Button>
        </Card>
    );
}
