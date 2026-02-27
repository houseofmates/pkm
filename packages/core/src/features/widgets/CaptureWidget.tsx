import { useState } from 'react';
import { useRecords } from '@/hooks/use-records';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Save, X } from 'lucide-react';
import { secureLogger } from '@/lib/secure-logger';

export default function CaptureWidget({ data, onUpdate }: { data: any, onUpdate?: (data: any) => void }) {
    const { createRecord } = useRecords('captures');
    const [title, setTitle] = useState(data.title || '');
    const [content, setContent] = useState(data.content || '');
    const [tags, setTags] = useState(data.tags || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!title && !content) return;
        setSaving(true);
        try {
            await createRecord({
                title,
                content,
                tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
                source: 'canvas-widget',
                createdAt: new Date().toISOString()
            });
            setSaved(true);
            secureLogger.info('[CaptureWidget] Saved capture');
        } catch (err) {
            secureLogger.error('[CaptureWidget] Failed to save', err);
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
                        onClick={() => setSaved(false)}
                    >
                        new capture
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="w-full h-full flex flex-col bg-black/60 backdrop-blur-xl border border-primary/20 p-4 gap-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                <span className="text-xs font-bold text-primary lowercase tracking-widest">quick capture</span>
                <span className="text-[10px] text-primary/40 uppercase">v.0.1</span>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar">
                <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-primary/60 font-mono">title</Label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="subject..."
                        className="bg-black/40 border-primary/20 text-primary placeholder:text-primary/20 h-8 text-sm"
                    />
                </div>

                <div className="flex-1 flex flex-col space-y-1 min-h-[100px]">
                    <Label className="text-[10px] uppercase text-primary/60 font-mono">content</Label>
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="log data..."
                        className="flex-1 bg-black/40 border-primary/20 text-primary placeholder:text-primary/20 resize-none text-sm no-scrollbar"
                    />
                </div>

                <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-primary/60 font-mono">tags (comma separated)</Label>
                    <Input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="pkm, idea, urgent..."
                        className="bg-black/40 border-primary/20 text-primary placeholder:text-primary/20 h-8 text-sm"
                    />
                </div>
            </div>

            <Button
                onClick={handleSave}
                disabled={saving || (!title && !content)}
                className="w-full bg-primary text-black hover:bg-primary/80 h-10 gap-2 font-bold lowercase"
            >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'transmitting...' : 'save to database'}
            </Button>
        </Card>
    );
}
