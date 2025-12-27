
import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import RichEditor, { markdownToHtml } from '@/components/ui/rich-editor';
import { sanitizeHTML } from '@/lib/utils';
import { format } from 'date-fns';
import { Send, Sparkles, Clock } from 'lucide-react';
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
    if (!collection) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center bg-card rounded-lg border border-transparent animate-pulse">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm">loading journal metadata...</p>
                </div>
            </div>
        );
    }
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

    // Helper to extract preview
    const parseContent = (htmlOrMd: string) => {
        const text = htmlOrMd || '';
        // If markdown (starts with **), try to split prompt
        let promptText = '';
        let bodyText = text;

        // Naive Markdown check for our specific format
        const promptMatch = text.match(/^\*\*(.*?)\*\*\s*\n*(.*)/s);
        if (promptMatch) {
            promptText = promptMatch[1];
            bodyText = promptMatch[2];
        } else if (text.startsWith('<')) {
            // HTML handling if rich editor saved HTML
            const div = document.createElement('div');
            div.innerHTML = text;
            const strong = div.querySelector('strong');
            if (strong && div.firstChild === strong) {
                promptText = strong.textContent || '';
                strong.remove(); // Remove prompt from body
                bodyText = div.innerHTML;
            }
        }

        // Preview (First paragraph or truncated)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = bodyText.startsWith('<') ? bodyText : markdownToHtml(bodyText);
        const firstP = tempDiv.querySelector('p');
        const preview = firstP ? firstP.textContent : tempDiv.textContent?.slice(0, 150) + '...';

        return { prompt: promptText, body: bodyText, preview };
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-6 p-4">

            {/* Daily Prompt / Entry Area */}
            <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-primary/80">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <h3 className="font-medium text-sm">{prompt}</h3>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto opacity-50 hover:opacity-100" onClick={handleShufflePrompt}>
                        <Clock className="h-3 w-3" />
                    </Button>
                </div>

                <RichEditor
                    placeholder="Write your thoughts..."
                    className="min-h-[100px] bg-background border-input/50 focus:bg-background transition-all resize-none text-base"
                    value={entry ? (String(entry).trim().startsWith('<') ? entry : markdownToHtml(entry)) : ''}
                    onChange={(html) => setEntry(sanitizeHTML(html))}
                    showToolbar={false}
                />

                <div className="flex justify-end mt-3">
                    <Button size="sm" onClick={handleSubmit} disabled={!entry || !String(entry).trim()}>
                        <Send className="h-3 w-3 mr-2" /> Post Entry
                    </Button>
                </div>
            </div>

            {/* Stream */}
            <div className="space-y-8">
                {Object.keys(grouped).length === 0 && (
                    <div className="text-center text-muted-foreground py-10 opacity-50">
                        <p>no journal entries yet. start writing above!</p>
                    </div>
                )}

                {Object.entries(grouped).map(([dateKey, records]) => (
                    <div key={dateKey} className="relative pl-6 border-l-2 border-primary/10">
                        {/* Date Header */}
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-4 border-primary/20" />
                        <div className="mb-4 text-xs font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-2">
                            {format(new Date(dateKey), 'EEEE, MMMM do, yyyy')}
                        </div>

                        {/* Entries */}
                        <div className="space-y-3">
                            {records.map(rec => {
                                const { prompt, preview } = parseContent(String(rec[contentField.name] || ''));
                                return (
                                    <div
                                        key={rec.id}
                                        className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                        onClick={() => window.dispatchEvent(new CustomEvent('pkm:edit-record', {
                                            detail: { record: rec, collectionName: collection.name }
                                        }))}
                                    >
                                        <div className="space-y-2">
                                            {prompt && (
                                                <div className="text-xs font-medium text-primary/70 bg-primary/5 inline-block px-2 py-0.5 rounded">
                                                    {prompt}
                                                </div>
                                            )}
                                            <div className="text-base text-foreground/90 leading-relaxed line-clamp-3">
                                                {preview}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground pt-2 flex items-center justify-between opacity-60">
                                                <span>{format(new Date(rec[dateField?.name] || rec.created_at), 'h:mm a')}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
