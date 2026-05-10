import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Calendar, Trash2, Pencil, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { usePluralSystem } from '../../stores/use-plural-system';
import { formatDuration, formatDateTime, formatDate } from '../../utils/time-utils';
import type { FrontSession } from '../../types';

export function FrontHistory() {
  const { members, frontSessions, deleteFrontSession, updateFrontSession } = usePluralSystem();
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [search, setSearch] = useState('');
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const filtered = useMemo(() => {
    let result = [...frontSessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const now = new Date();
    if (dateFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(s => new Date(s.startedAt) >= todayStart);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(s => new Date(s.startedAt) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(s => new Date(s.startedAt) >= monthAgo);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.entries.some(e => {
          const m = members.find(mem => mem.id === e.memberId);
          return m && m.name.toLowerCase().includes(q);
        }) ||
        s.notes?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [frontSessions, dateFilter, search, members]);

  const handleEdit = (session: FrontSession) => {
    setEditingSession(session.id);
    setEditStart(session.startedAt.slice(0, 16)); // datetime-local format
    setEditEnd(session.endedAt ? session.endedAt.slice(0, 16) : '');
    setEditNotes(session.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    await updateFrontSession(editingSession, {
      startedAt: new Date(editStart).toISOString(),
      endedAt: editEnd ? new Date(editEnd).toISOString() : undefined,
      notes: editNotes,
    });
    setEditingSession(null);
    toast.success('session updated');
  };

  const handleExport = () => {
    const data = filtered.map(s => ({
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      duration: s.endedAt ? formatDuration(s.startedAt, s.endedAt) : 'active',
      members: s.entries.map(e => {
        const m = members.find(mem => mem.id === e.memberId);
        return { name: m?.name || 'unknown', frontType: e.frontType, customStatus: e.customStatus };
      }),
      notes: s.notes,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `front-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('exported front history');
  };

  const getMember = (id: string) => members.find(m => m.id === id);

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-white/5">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="filter by member or notes..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'today', 'week', 'month'] as const).map(f => (
            <Button
              key={f}
              variant={dateFilter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateFilter(f)}
              className={`text-xs lowercase ${dateFilter === f ? 'bg-[#f6b012] text-black hover:bg-[#f6b012]/90' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {f}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="text-white/40 hover:text-white hover:bg-white/5 gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="lowercase hidden sm:inline">export</span>
        </Button>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-white/30 py-12 text-sm lowercase">no front history entries</div>
        ) : (
          filtered.map(session => {
            const isEditing = editingSession === session.id;
            return (
              <ContextMenu key={session.id}>
                <ContextMenuTrigger>
                  <div className={`bg-white/5 rounded-lg p-3 border border-white/5 ${!session.endedAt ? 'border-l-2 border-l-[#f6b012]' : ''}`}>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>started</Label>
                            <Input
                              type="datetime-local"
                              value={editStart}
                              onChange={e => setEditStart(e.target.value)}
                              className="bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <Label>ended</Label>
                            <Input
                              type="datetime-local"
                              value={editEnd}
                              onChange={e => setEditEnd(e.target.value)}
                              className="bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                        </div>
                        <Textarea
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="notes..."
                          className="bg-white/5 border-white/10 text-white text-xs resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase">
                            save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSession(null)} className="text-white/40 hover:text-white lowercase">
                            cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateTime(session.startedAt)}</span>
                            {session.endedAt && (
                              <>
                                <span>-</span>
                                <span>{formatDateTime(session.endedAt)}</span>
                                <Badge variant="secondary" className="bg-white/10 text-white/60 text-[10px] lowercase">
                                  {formatDuration(session.startedAt, session.endedAt)}
                                </Badge>
                              </>
                            )}
                            {!session.endedAt && (
                              <Badge className="bg-[#f6b012]/20 text-[#f6b012] text-[10px] lowercase">active</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {session.entries.map(entry => {
                            const m = getMember(entry.memberId);
                            if (!m) return null;
                            return (
                              <Badge
                                key={entry.memberId}
                                variant="outline"
                                className="text-xs lowercase gap-1"
                                style={{
                                  borderColor: m.color + '44',
                                  color: m.color,
                                  backgroundColor: m.color + '11',
                                }}
                              >
                                {m.displayName || m.name}
                                <span className="text-white/40">({entry.frontType})</span>
                              </Badge>
                            );
                          })}
                        </div>

                        {session.notes && (
                          <p className="text-xs text-white/30 mt-2 lowercase">{session.notes}</p>
                        )}
                      </>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-40 bg-[#1a1a1a] border-white/10">
                  <ContextMenuItem onClick={() => handleEdit(session)} className="text-white lowercase gap-2">
                    <Pencil className="h-3.5 w-3.5" /> edit times
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => { deleteFrontSession(session.id); toast.success('session deleted'); }} className="text-red-400 lowercase gap-2">
                    <Trash2 className="h-3.5 w-3.5" /> delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-white/40 lowercase block mb-1">{children}</span>;
}
