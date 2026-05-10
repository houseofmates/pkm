import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePluralSystem } from '../../stores/use-plural-system';
import { formatTime } from '../../utils/time-utils';

export function ChatPanel() {
  const { members, chatMessages, addChatMessage, deleteChatMessage } = usePluralSystem();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedMessages = [...chatMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  const handleSend = async () => {
    if (!content.trim() || !selectedMemberId) return;
    await addChatMessage({ memberId: selectedMemberId, content: content.trim() });
    setContent('');
  };

  const getMember = (id: string) => members.find(m => m.id === id);

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/5">
        <MessageSquare className="h-4 w-4 text-[#f6b012]" />
        <span className="text-sm text-white/60 lowercase">internal communication</span>
        <div className="ml-auto">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-40">
              <SelectValue placeholder="posting as..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {members.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-white lowercase">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.displayName || m.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {sortedMessages.length === 0 ? (
          <div className="text-center text-white/30 py-12 text-sm lowercase">no messages yet. start a conversation.</div>
        ) : (
          sortedMessages.map(msg => {
            const m = getMember(msg.memberId);
            if (!m) return null;
            return (
              <div key={msg.id} className="flex gap-2 group">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: m.color + '33', color: m.color }}
                >
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium lowercase" style={{ color: m.color }}>{m.displayName || m.name}</span>
                    <span className="text-[10px] text-white/20">{formatTime(msg.createdAt)}</span>
                    {msg.editedAt && <span className="text-[10px] text-white/20">(edited)</span>}
                  </div>
                  <p className="text-sm text-white/70 lowercase whitespace-pre-wrap">{msg.content}</p>
                </div>
                <button
                  onClick={() => { deleteChatMessage(msg.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* composer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex gap-2">
          <Input
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="type a message..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Button onClick={handleSend} disabled={!content.trim()} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 px-3">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
