import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Search, Plus, Pencil, Trash2, Eye, EyeOff, UserPlus, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { usePluralSystem } from '../../stores/use-plural-system';
import { MemberForm } from './MemberForm';
import type { Member, MemberStatus } from '../../types';
import { blobToDataUrl } from '../../utils/image-utils';

const statusColors: Record<MemberStatus, string> = {
  active: '#22c55e',
  dormant: '#a855f7',
  archived: '#6b7280',
  fused: '#f6b012',
};

export function MembersPanel() {
  const {
    members,
    groups,
    currentFronters,
    filter,
    searchQuery,
    setFilter,
    setSearchQuery,
    getFilteredMembers,
    deleteMember,
    updateMember,
    setCurrentFronters,
  } = usePluralSystem();

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = getFilteredMembers();
  const allTags = Array.from(new Set(members.flatMap(m => m.tags)));

  const handleAddToFront = useCallback((member: Member, type: string) => {
    const existing = currentFronters.find(f => f.memberId === member.id);
    if (existing) {
      toast.info(`${member.name} is already fronting`);
      return;
    }
    const newEntries = [
      ...currentFronters,
      { memberId: member.id, frontType: type as any },
    ];
    setCurrentFronters(newEntries);
    toast.success(`${member.name} added to front`);
  }, [currentFronters, setCurrentFronters]);

  const handleRemoveFromFront = useCallback((memberId: string) => {
    const newEntries = currentFronters.filter(f => f.memberId !== memberId);
    setCurrentFronters(newEntries);
  }, [currentFronters, setCurrentFronters]);

  const handleToggleStatus = async (member: Member) => {
    const next: MemberStatus = member.status === 'active' ? 'dormant' : 'active';
    await updateMember(member.id, { status: next });
    toast.success(`${member.name} is now ${next}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex flex-col gap-2 p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="search members..."
              className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`text-white/40 hover:text-white hover:bg-white/5 ${showFilters ? 'bg-white/10 text-white' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingMember(null); setFormOpen(true); }}
            className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline lowercase">new member</span>
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filter.status} onValueChange={(v: any) => setFilter({ status: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-32">
                <SelectValue placeholder="status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="all" className="text-white lowercase">all statuses</SelectItem>
                <SelectItem value="active" className="text-white lowercase">active</SelectItem>
                <SelectItem value="dormant" className="text-white lowercase">dormant</SelectItem>
                <SelectItem value="archived" className="text-white lowercase">archived</SelectItem>
                <SelectItem value="fused" className="text-white lowercase">fused</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.groupId} onValueChange={(v: any) => setFilter({ groupId: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-32">
                <SelectValue placeholder="group" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="all" className="text-white lowercase">all groups</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id} className="text-white lowercase">
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filter.tag} onValueChange={(v: any) => setFilter({ tag: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-32">
                <SelectValue placeholder="tag" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="all" className="text-white lowercase">all tags</SelectItem>
                {allTags.map(t => (
                  <SelectItem key={t} value={t} className="text-white lowercase">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filter.sortBy} onValueChange={(v: any) => setFilter({ sortBy: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-32">
                <SelectValue placeholder="sort by" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="name" className="text-white lowercase">name</SelectItem>
                <SelectItem value="lastFronted" className="text-white lowercase">last fronted</SelectItem>
                <SelectItem value="frontFrequency" className="text-white lowercase">front frequency</SelectItem>
                <SelectItem value="createdAt" className="text-white lowercase">created</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter({ sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc' })}
              className="text-white/40 hover:text-white h-8 px-2"
            >
              {filter.sortOrder === 'asc' ? 'asc' : 'desc'}
            </Button>
          </div>
        )}

        <div className="text-xs text-white/30 lowercase">
          {filtered.length} of {members.length} members
        </div>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/30">
            <p>no members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                isFronting={currentFronters.some(f => f.memberId === member.id)}
                onEdit={() => { setEditingMember(member); setFormOpen(true); }}
                onDelete={() => deleteMember(member.id)}
                onToggleStatus={() => handleToggleStatus(member)}
                onAddToFront={(type) => handleAddToFront(member, type)}
                onRemoveFromFront={() => handleRemoveFromFront(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      <MemberForm
        member={editingMember || undefined}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}

function MemberCard({
  member,
  isFronting,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddToFront,
  onRemoveFromFront,
}: {
  member: Member;
  isFronting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onAddToFront: (type: string) => void;
  onRemoveFromFront: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (member.avatarBlob) {
      blobToDataUrl(member.avatarBlob).then(setAvatarUrl);
    } else {
      setAvatarUrl(null);
    }
  }, [member.avatarBlob]);

  const frontType = usePluralSystem(s => s.currentFronters.find(f => f.memberId === member.id)?.frontType);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={`group relative flex flex-col gap-1.5 cursor-pointer ${isFronting ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
          onClick={onEdit}
        >
          <div
            className={`aspect-square rounded-lg overflow-hidden relative border-2 transition-all ${isFronting ? 'ring-2 ring-[#f6b012]/50 scale-[1.02]' : 'border-white/5 hover:border-white/20'
              }`}
            style={isFronting ? { borderColor: member.color } : undefined}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-bold"
                style={{ backgroundColor: member.color + '22', color: member.color }}
              >
                {member.name.charAt(0)}
              </div>
            )}

            {/* status dot */}
            <div
              className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/50"
              style={{ backgroundColor: statusColors[member.status] }}
            />

            {/* front badge */}
            {isFronting && (
              <div className="absolute top-1.5 right-1.5 bg-[#f6b012] text-black text-[10px] font-bold px-1.5 py-0.5 rounded lowercase">
                {frontType || 'front'}
              </div>
            )}

            {/* hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 bg-white/10 rounded-full hover:bg-red-500/50 text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium lowercase truncate" style={{ color: member.color }}>
              {member.displayName || member.name}
            </p>
            {member.pronouns && (
              <p className="text-[10px] text-white/30 lowercase truncate">{member.pronouns}</p>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48 bg-[#1a1a1a] border-white/10">
        <div className="px-2 py-1.5 text-xs text-white/40 lowercase truncate">{member.name}</div>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onEdit} className="text-white lowercase gap-2">
          <Pencil className="h-3.5 w-3.5" /> edit
        </ContextMenuItem>
        <ContextMenuItem onClick={onToggleStatus} className="text-white lowercase gap-2">
          {member.status === 'active' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {member.status === 'active' ? 'set dormant' : 'set active'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {!isFronting ? (
          <>
            <ContextMenuItem onClick={() => onAddToFront('primary')} className="text-white lowercase gap-2">
              <UserPlus className="h-3.5 w-3.5" /> front (primary)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAddToFront('cofront')} className="text-white lowercase gap-2">
              <UserPlus className="h-3.5 w-3.5" /> co-front
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAddToFront('coconscious')} className="text-white lowercase gap-2">
              <UserPlus className="h-3.5 w-3.5" /> co-conscious
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAddToFront('influence')} className="text-white lowercase gap-2">
              <UserPlus className="h-3.5 w-3.5" /> influence
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAddToFront('watching')} className="text-white lowercase gap-2">
              <UserPlus className="h-3.5 w-3.5" /> watching
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem onClick={onRemoveFromFront} className="text-red-400 lowercase gap-2">
            <UserPlus className="h-3.5 w-3.5" /> remove from front
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-red-400 lowercase gap-2">
          <Trash2 className="h-3.5 w-3.5" /> delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
