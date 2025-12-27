
import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import RichEditor, { markdownToHtml } from '@/components/ui/rich-editor';
import { sanitizeHTML } from '@/lib/utils';
import { format } from 'date-fns';
import { Send, Sparkles, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

const PROMPTS = [
    "What's on your mind right now?",
    "What was the best part of your day?",
    "What is something you are grateful for?",
    "What is a challenge you faced today?",
    "How are you feeling in your body?",
    "What is one thing you want to accomplish tomorrow?",
    "Who did you interact with today?",
    "What did you learn today?",
];

export function JournalView({ data, collection, onUpdateRecord: _onUpdateRecord, onEdit: _onEdit }: ViewProps) {
    const [entry, setEntry] = useState('');
    const [prompt, setPrompt] = useState(PROMPTS[0]);

    // Fields
    const contentField = collection.fields?.find((f: any) => f.interface === 'markdown' || f.interface === 'textarea' || f.name === 'content') || { name: 'content' };
    const dateField = collection.fields?.find((f: any) => f.interface === 'date' || f.interface === 'datetime' || f.name === 'created_at');

    const handleShufflePrompt = () => {
        setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    };

    const handleSubmit = async () => {
        if (!entry.trim()) return;

        // Emulate creation (in a real app, we'd call onCreate, but ViewProps only has update/edit usually)
        // We'll need to dispatch a create event or use a hook if passed
        // For now, let's assume this view is usually used where we can "Quick Add" or it relies on "onUpdateRecord" hack?
        // Actually, ViewProps doesn't have onCreate. We might need to use the `useCollections` hook here or emit an event?
        // Let's use the window event we added earlier for Dashboard! 'pkm:add-widget' was for widgets.
        // We need a proper create record method.
        // Let's assume the parent might pass it or we use a global store dispatch.
        // CHECK: collection-detail uses useNocoBase?

        // Fallback: Dispatch a custom event specifically for creating a record, which RootLayout or similar could pick up?
        // Or better: Just warn user this is a UI demo if create isn't wired.
        // But for "Automatic Journaling", it should work.

        // HACK: Dispatch an event that the App knows how to handle? 
        // Or modify ViewProps in registry to include `onCreate`? That's cleaner.
        // I will modify Registry next.

        // Temporary dispatch for now to show intent
        const newRecord = {
            [contentField.name]: `**${prompt}**\n\n${entry}`,
            status: 'published', // default
        };

        // We will assume onUpdateRecord with ID='new' might be treated as create? No.
        // I'll emit a custom event "pkm:create-record"
        window.dispatchEvent(new CustomEvent('pkm:create-record', {
            detail: {
                collection: collection.name,
                data: newRecord
            }
        }));

        setEntry('');
        toast.success("Entry captured!");
    };

    // Group by Date
    const grouped = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const sorted = [...data].sort((a, b) => {
            const da = a[dateField?.name] || a.created_at || 0;
            const db = b[dateField?.name] || b.created_at || 0;
            return new Date(db).getTime() - new Date(da).getTime();
        });

        sorted.forEach(rec => {
            const d = rec[dateField?.name] || rec.created_at || new Date();
            const key = format(new Date(d), 'yyyy-MM-dd');
            if (!groups[key]) groups[key] = [];
            groups[key].push(rec);
        });
        return groups;
    }, [data, dateField]);

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-8 p-4">

            {/* Daily Prompt / Entry Area */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-primary">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">{prompt}</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto opacity-50 hover:opacity-100" onClick={handleShufflePrompt}>
                        <Clock className="h-4 w-4" />
                    </Button>
                </div>

                <RichEditor
                    placeholder="Write your thoughts..."
                    className="min-h-[120px] bg-background/50 border-input/50 focus:bg-background transition-all resize-none text-lg leading-relaxed"
                    value={entry ? (String(entry).trim().startsWith('<') ? entry : markdownToHtml(entry)) : ''}
                    onChange={(html) => setEntry(sanitizeHTML(html))}
                />

                <div className="flex justify-end mt-4">
                    <Button onClick={handleSubmit} disabled={!entry || !String(entry).trim()}>
                        <Send className="h-4 w-4 mr-2" /> Save Entry
                    </Button>
                </div>
            </div>

            {/* Stream */}
            <div className="space-y-8">
                {Object.entries(grouped).map(([dateKey, records]) => (
                    <div key={dateKey} className="relative pl-8 border-l-2 border-muted">
                        {/* Date Header */}
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-muted border-4 border-background" />
                        <div className="mb-4 text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(dateKey), 'EEE, MMM do, yyyy')}
                        </div>

                        {/* Entries */}
                        <div className="space-y-4">
                            {records.map(rec => (
                                <div
                                    key={rec.id}
                                    className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group cursor-pointer hover:border-primary/50"
                                    onClick={() => window.dispatchEvent(new CustomEvent('pkm:edit-record', {
                                        detail: { record: rec, collectionName: collection.name }
                                    }))}
                                >
                                    <div className="prose dark:prose-invert prose-sm max-w-none">
                                        {/* Simple Markdown Render (Mock) */}
                                        <div className="whitespace-pre-wrap font-serif text-base text-foreground/90">
                                            <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(rec[contentField.name] || '')) }} />
                                        </div>
                                        {/* Prompt Was: */}
                                        <div className="text-[10px] text-muted-foreground mt-2 italic border-t pt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            {((String(rec[contentField.name] || '').match(/<strong>(.*?)<\/strong>/)?.[1]) || 'Free entry')}
                                            {' • '}
                                            {format(new Date(rec[dateField?.name] || rec.created_at), 'h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
