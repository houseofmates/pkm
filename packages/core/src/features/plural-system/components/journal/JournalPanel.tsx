import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Tag, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePluralSystem } from '../../stores/use-plural-system';
import { formatDateTime } from '../../utils/time-utils';

export function JournalPanel() {
  const { members, journalEntries, activeSessionId, addJournalEntry, deleteJournalEntry } = usePluralSystem();
  const [mode, setMode] = useState<'all' | 'system' | 'member'>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [entryMemberId, setEntryMemberId] = useState<string>('');

  const filtered = journalEntries.filter(e => {
    if (mode === 'system') return !e.memberId;
    if (mode === 'member') return e.memberId === selectedMemberId;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const allTags = Array.from(new Set(journalEntries.flatMap(e => e.tags)));

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await addJournalEntry({
      memberId: entryMemberId || undefined,
      content: content.trim(),
      frontSessionId: activeSessionId || undefined,
      tags,
    });
    setContent('');
    setTags([]);
    setWriting(false);
    setEntryMemberId('');
    toast.success('journal entry saved');
  };

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/5">
        <Select value={mode} onValueChange={(v: any) => setMode(v)}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="all" className="text-white lowercase">all entries</SelectItem>
            <SelectItem value="system" className="text-white lowercase">system journal</SelectItem>
            <SelectItem value="member" className="text-white lowercase">per-member</SelectItem>
          </SelectContent>
        </Select>

        {mode === 'member' && (
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-40">
              <SelectValue placeholder="select member" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {members.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-white lowercase">
                  {m.displayName || m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          size="sm"
          onClick={() => setWriting(!writing)}
          className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 gap-1 ml-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="lowercase hidden sm:inline">new entry</span>
        </Button>
      </div>

      {/* composer */}
      {writing && (
        <div className="p-3 border-b border-white/5 bg-white/5">
          <div className="space-y-2">
            <Select value={entryMemberId} onValueChange={setEntryMemberId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-full">
                <SelectValue placeholder="system-wide entry (no member selected)" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="" className="text-white lowercase">system-wide</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-white lowercase">
                    {m.displayName || m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="write your entry..."
              rows={4}
              className="bg-white/5 border-white/10 text-white resize-none"
            />

            <div className="flex flex-wrap gap-1">
              {tags.map(t => (
                <Badge key={t} variant="secondary" className="bg-white/10 text-white/60 text-[10px] lowercase gap-1">
                  {t}
                  <button onClick={() => setTags(tags.filter(x => x !== t))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="add tag..."
                className="bg-white/5 border-white/10 text-white h-8 text-xs"
              />
              <Button variant="ghost" size="sm" onClick={handleAddTag} className="text-white/40 hover:text-white h-8 px-2">
                <Tag className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setWriting(false)} className="text-white/40 hover:text-white lowercase">cancel</Button>
              <Button size="sm" onClick={handleSubmit} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase">save entry</Button>
            </div>
          </div>
        </div>
      )}

      {/* entries list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-white/30 py-12 text-sm lowercase">no journal entries</div>
        ) : (
          filtered.map(entry => {
            const m = entry.memberId ? members.find(mem => mem.id === entry.memberId) : null;
            return (
              <div key={entry.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-white/30" />
                    {m ? (
                      <span className="text-xs lowercase" style={{ color: m.color }}>{m.displayName || m.name}</span>
                    ) : (
                      <span className="text-xs text-[#f6b012] lowercase">system</span>
                    )}
                    <span className="text-[10px] text-white/30">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <button onClick={() => { deleteJournalEntry(entry.id); toast.success('entry deleted'); }} className="text-white/20 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-white/70 whitespace-pre-wrap lowercase">{entry.content}</p>
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.tags.map(t => (
                      <Badge key={t} variant="secondary" className="bg-white/5 text-white/40 text-[10px] lowercase">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
