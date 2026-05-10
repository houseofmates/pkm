/* eslint-disable */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { useGroupsStore } from '../../stores/groups-store';
import { useMembersStore } from '../../stores/members-store';
import { GroupForm } from './group-form';
import type { Group } from '../../types/schema';

export function GroupsView() {
  const { groups, loadGroups, addGroup, updateGroup, deleteGroup, getGroupsForMember } = useGroupsStore();
  const { members } = useMembersStore();
  
  const [search, setSearch] = useState('');
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(search.toLowerCase()) ||
    group.description?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null;

  const handleAddGroup = async (groupData: Group) => {
    await addGroup(groupData);
    setIsAddGroupOpen(false);
  };

  const handleEditGroup = async (groupData: Group) => {
    await updateGroup(groupData.id, groupData);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (confirm(`are you sure you want to delete the group "${group?.name}"? this action cannot be undone.`)) {
      await deleteGroup(groupId);
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    }
  };

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'unknown';
  };

  const getMemberColor = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.color || '#3b82f6';
  };

  const getMembersNotInGroup = (group: Group) => {
    return members.filter(member => 
      !group.memberIds.includes(member.id) && member.status === 'active'
    );
  };

  const addMemberToGroup = async (groupId: string, memberId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const updatedMemberIds = [...group.memberIds, memberId];
    await updateGroup(groupId, { memberIds: updatedMemberIds });
  };

  const removeMemberFromGroup = async (groupId: string, memberId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const updatedMemberIds = group.memberIds.filter(id => id !== memberId);
    await updateGroup(groupId, { memberIds: updatedMemberIds });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold lowercase">groups & subsystems</h2>
          <p className="text-muted-foreground">organize your members into groups</p>
        </div>
        <Button onClick={() => setIsAddGroupOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          create group
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                groups ({filteredGroups.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredGroups.map(group => (
                <div
                  key={group.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedGroupId === group.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="font-medium">{group.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGroup(group);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>no groups found</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setIsAddGroupOpen(true)}
                  >
                    create your first group
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Group Details */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: selectedGroup.color }}
                  />
                  {selectedGroup.name}
                </CardTitle>
                {selectedGroup.description && (
                  <p className="text-muted-foreground">{selectedGroup.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">group members ({selectedGroup.memberIds.length})</h4>
                  <div className="space-y-2">
                    {selectedGroup.memberIds.map(memberId => {
                      const member = members.find(m => m.id === memberId);
                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-2 border rounded"
                          style={{ 
                            backgroundColor: member?.color + '10',
                            borderColor: member?.color + '30'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: member?.color }}
                            />
                            <span>{member?.name || 'unknown'}</span>
                            {member?.status !== 'active' && (
                              <Badge variant="secondary" className="text-xs">
                                {member.status}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberFromGroup(selectedGroup.id, memberId)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">add members</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {getMembersNotInGroup(selectedGroup).map(member => (
                      <Button
                        key={member.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addMemberToGroup(selectedGroup.id, member.id)}
                        className="justify-start"
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: member.color }}
                        />
                        {member.name}
                      </Button>
                    ))}
                  </div>
                  {getMembersNotInGroup(selectedGroup).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      all available members are already in this group
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg mb-2 text-muted-foreground">select a group</p>
                <p className="text-muted-foreground">choose a group from the list to view and edit its details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Group Dialog */}
      <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>create new group</DialogTitle>
          </DialogHeader>
          <GroupForm
            onSave={handleAddGroup}
            onCancel={() => setIsAddGroupOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>edit group: {editingGroup?.name}</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <GroupForm
              group={editingGroup}
              onSave={handleEditGroup}
              onCancel={() => setEditingGroup(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}