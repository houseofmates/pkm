import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, UserPlus, LogOut, SwitchCamera, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { usePluralSystem } from '../../stores/use-plural-system';
import { formatDuration, formatDateTime } from '../../utils/time-utils';
import { blobToDataUrl } from '../../utils/image-utils';
import type { FrontType } from '../../types';

const frontTypeLabels: Record<FrontType, string> = {
  primary: 'primary',
  cofront: 'co-front',
  coconscious: 'co-conscious',
  influence: 'influence',
  watching: 'watching',
};

const frontTypeColors: Record<FrontType, string> = {
  primary: '#22c55e',
  cofront: '#3b82f6',
  coconscious: '#a855f7',
  influence: '#f59e0b',
  watching: '#6b7280',
};

export function FrontPanel() {
  const {
    members,
    currentFronters,
    activeSessionId,
    frontSessions,
    setCurrentFronters,
    endCurrentFront,
    quickSwitchFront,
    updateFrontSession,
  } = usePluralSystem();

  const [quickSelectOpen, setQuickSelectOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [frontTypes, setFrontTypes] = useState<Record<string, FrontType>>({});
  const [customStatuses, setCustomStatuses] = useState<Record<string, string>>({});
  const [frontNotes, setFrontNotes] = useState('');

  const activeSession = frontSessions.find(s => s.id === activeSessionId);

  const getMember = (id: string) => members.find(m => m.id === id);

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        const nextTypes = { ...frontTypes };
        delete nextTypes[id];
        setFrontTypes(nextTypes);
        return next;
      }
      return [...prev, id];
    });
    if (!frontTypes[id]) {
      setFrontTypes(prev => ({ ...prev, [id]: 'primary' }));
    }
  };

  const handleApplyFront = async () => {
    if (selectedMemberIds.length === 0) {
      toast.error('no members selected');
      return;
    }
    const entries = selectedMemberIds.map(id => ({
      memberId: id,
      frontType: frontTypes[id] || 'primary',
      customStatus: customStatuses[id] || undefined,
    }));
    await setCurrentFronters(entries, frontNotes || undefined);
    setQuickSelectOpen(false);
    setSelectedMemberIds([]);
    setFrontTypes({});
    setCustomStatuses({});
    setFrontNotes('');
    toast.success('front updated');
  };

  const handleQuickSwitch = async () => {
    if (selectedMemberIds.length === 0) {
      toast.error('no members selected');
      return;
    }
    const entries = selectedMemberIds.map(id => ({
      memberId: id,
      frontType: frontTypes[id] || 'primary',
      customStatus: customStatuses[id] || undefined,
    }));
    await quickSwitchFront(entries, frontNotes || undefined);
    setQuickSelectOpen(false);
    setSelectedMemberIds([]);
    setFrontTypes({});
    setCustomStatuses({});
    setFrontNotes('');
    toast.success('front switched');
  };

  const handleEndFront = async () => {
    await endCurrentFront();
    toast.success('front ended');
  };

  const handleRemoveOne = (memberId: string) => {
    const next = currentFronters.filter(f => f.memberId !== memberId);
    if (next.length === 0) {
      endCurrentFront();
    } else {
      setCurrentFronters(next);
    }
  };

  const handleUpdateSessionNotes = () => {
    if (activeSessionId) {
      updateFrontSession(activeSessionId, { notes: frontNotes });
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* current fronters */}
      <div>
        <h2 className="text-sm font-medium text-white/60 lowercase mb-3">current fronters</h2>
        {currentFronters.length === 0 ? (
          <div className="bg-white/5 rounded-lg p-6 text-center text-white/30 text-sm lowercase">
            no one is currently fronting
          </div>
        ) : (
          <div className="space-y-2">
            {currentFronters.map(entry => {
              const member = getMember(entry.memberId);
              if (!member) return null;
              return (
                <div
                  key={entry.memberId}
                  className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/5"
                >
                  <Avatar member={member} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium lowercase truncate" style={{ color: member.color }}>
                        {member.displayName || member.name}
                      </span>
                      <Badge
                        className="text-[10px] px-1.5 py-0 h-auto lowercase"
                        style={{
                          backgroundColor: frontTypeColors[entry.frontType] + '33',
                          color: frontTypeColors[entry.frontType],
                          borderColor: frontTypeColors[entry.frontType] + '44',
                        }}
                        variant="outline"
                      >
                        {frontTypeLabels[entry.frontType]}
                      </Badge>
                    </div>
                    {entry.customStatus && (
                      <p className="text-xs text-white/40 lowercase">{entry.customStatus}</p>
                    )}
                    {activeSession && (
                      <p className="text-xs text-white/30 lowercase">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDuration(activeSession.startedAt)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveOne(entry.memberId)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {activeSession?.notes && (
              <div className="bg-white/5 rounded-lg p-3 text-xs text-white/40 lowercase">
                notes: {activeSession.notes}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setFrontNotes(activeSession?.notes || ''); setQuickSelectOpen(true); }}
                className="border-white/10 text-white hover:bg-white/10 gap-1"
              >
                <SwitchCamera className="h-3.5 w-3.5" />
                <span className="lowercase">quick switch</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndFront}
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="lowercase">end front</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* quick select modal-ish panel */}
      {quickSelectOpen && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
          <h3 className="text-sm text-white/60 lowercase">select fronters</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {members.map(member => {
              const selected = selectedMemberIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => handleToggleMember(member.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${selected ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                >
                  <Avatar member={member} size="sm" />
                  <span className="text-xs lowercase truncate flex-1" style={{ color: selected ? member.color : undefined }}>
                    {member.name}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedMemberIds.length > 0 && (
            <div className="space-y-2">
              {selectedMemberIds.map(id => {
                const member = getMember(id);
                if (!member) return null;
                return (
                  <div key={id} className="flex items-center gap-2 bg-white/5 rounded p-2">
                    <span className="text-xs lowercase w-20 truncate">{member.name}</span>
                    <Select
                      value={frontTypes[id] || 'primary'}
                      onValueChange={(v: FrontType) => setFrontTypes(prev => ({ ...prev, [id]: v }))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-7 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {Object.entries(frontTypeLabels).map(([k, label]) => (
                          <SelectItem key={k} value={k} className="text-white lowercase text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="status note..."
                      value={customStatuses[id] || ''}
                      onChange={e => setCustomStatuses(prev => ({ ...prev, [id]: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white h-7 text-xs flex-1"
                    />
                  </div>
                );
              })}

              <Textarea
                placeholder="session notes..."
                value={frontNotes}
                onChange={e => setFrontNotes(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs resize-none"
                rows={2}
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleApplyFront}
                  className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase"
                >
                  {currentFronters.length > 0 ? 'update front' : 'set front'}
                </Button>
                {currentFronters.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQuickSwitch}
                    className="border-white/10 text-white hover:bg-white/10 lowercase"
                  >
                    quick switch
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setQuickSelectOpen(false)}
                  className="text-white/40 hover:text-white lowercase"
                >
                  cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* set front if none active */}
      {currentFronters.length === 0 && !quickSelectOpen && (
        <Button
          onClick={() => setQuickSelectOpen(true)}
          className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 gap-2"
        >
          <UserPlus className="h-4 w-4" />
          <span className="lowercase">set current fronters</span>
        </Button>
      )}
    </div>
  );
}

function Avatar({ member, size = 'md' }: { member: any; size?: 'sm' | 'md' }) {
  const [url, setUrl] = useState<string | null>(null);
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  React.useEffect(() => {
    if (member.avatarBlob) {
      blobToDataUrl(member.avatarBlob).then(setUrl);
    }
  }, [member.avatarBlob]);

  if (url) {
    return <img src={url} alt={member.name} className={`${dim} rounded-full object-cover`} />;
  }

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center text-[10px] font-bold`}
      style={{ backgroundColor: member.color + '33', color: member.color }}
    >
      {member.name.charAt(0)}
    </div>
  );
}
