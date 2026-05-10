import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Plus, Users, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { usePluralSystem } from '../../stores/use-plural-system';
import type { Group } from '../../types';

export function GroupManager() {
  const { members, groups, addGroup, updateGroup, deleteGroup } = usePluralSystem();
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#f6b012');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const openNew = () => {
    setEditingGroup(null);
    setName('');
    setColor('#f6b012');
    setDescription('');
    setSelectedMembers([]);
    setFormOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditingGroup(g);
    setName(g.name);
    setColor(g.color);
    setDescription(g.description || '');
    setSelectedMembers(g.memberIds);
    setFormOpen(true);
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingGroup) {
      await updateGroup(editingGroup.id, { name: name.trim(), color, description: description.trim(), memberIds: selectedMembers });
      toast.success('group updated');
    } else {
      await addGroup({ name: name.trim(), color, description: description.trim(), memberIds: selectedMembers });
      toast.success('group created');
    }
    setFormOpen(false);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-white/60 lowercase">groups & subsystems</h2>
        <Button size="sm" onClick={openNew} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 gap-1">
          <Plus className="h-4 w-4" />
          <span className="lowercase">new group</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map(group => (
          <div key={group.id} className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                <h3 className="font-medium lowercase" style={{ color: group.color }}>{group.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(group)} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { deleteGroup(group.id); toast.success('group deleted'); }} className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {group.description && (
              <p className="text-xs text-white/30 lowercase mb-2">{group.description}</p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Users className="h-3 w-3" />
              <span className="lowercase">{group.memberIds.length} members</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {group.memberIds.map(id => {
                const m = members.find(mem => mem.id === id);
                if (!m) return null;
                return (
                  <Badge key={id} variant="secondary" className="bg-white/10 text-white/60 text-[10px] lowercase">
                    {m.displayName || m.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center text-white/30 py-12 text-sm lowercase">no groups yet</div>
      )}

      <Dialog open={formOpen} onOpenChange={v => !v && setFormOpen(false)}>
        <DialogContent className="max-w-lg bg-[#111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="lowercase">{editingGroup ? 'edit group' : 'new group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label>color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent" />
                <span className="text-sm text-white/40">{color}</span>
              </div>
            </div>
            <div>
              <Label>description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="bg-white/5 border-white/10 text-white mt-1 resize-none" />
            </div>
            <div>
              <Label>members</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1 max-h-48 overflow-y-auto p-1">
                {members.map(m => {
                  const selected = selectedMembers.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-1.5 p-1.5 rounded text-left text-xs lowercase transition-colors ${selected ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.displayName || m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="text-white/60 hover:text-white hover:bg-white/5 lowercase">cancel</Button>
            <Button onClick={handleSave} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase">save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-white/40 lowercase block">{children}</span>;
}
