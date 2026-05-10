/* eslint-disable */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Palette } from 'lucide-react';
import { useMembersStore } from '../../stores/members-store';
import type { Group } from '../../types/schema';

interface GroupFormProps {
  group?: Group;
  onSave: (group: Group) => void;
  onCancel: () => void;
}

export function GroupForm({ group, onSave, onCancel }: GroupFormProps) {
  const { members } = useMembersStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    memberIds: [] as string[],
    ...group
  });

  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    group?.memberIds || []
  );

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const groupData: Group = {
      id: group?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      memberIds: selectedMembers,
      createdAt: group?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(groupData);
  };

  const availableMembers = members.filter(member => 
    member.status === 'active' || selectedMembers.includes(member.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>group information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">group name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., protectors, littles, fictives"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="describe this group's purpose or characteristics"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="color">group color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                id="color"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>group members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>selected members ({selectedMembers.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedMembers.map(memberId => {
                const member = members.find(m => m.id === memberId);
                return (
                  <div
                    key={memberId}
                    className="flex items-center gap-2 px-3 py-1 rounded-full border"
                    style={{ 
                      backgroundColor: member?.color + '20',
                      borderColor: member?.color
                    }}
                  >
                    <span className="text-sm">{member?.name || 'unknown'}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMember(memberId)}
                      className="h-4 w-4 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {selectedMembers.length === 0 && (
              <p className="text-sm text-muted-foreground">no members selected</p>
            )}
          </div>

          <div>
            <Label>available members</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {availableMembers.map(member => (
                <Button
                  key={member.id}
                  type="button"
                  variant={selectedMembers.includes(member.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMember(member.id)}
                  className="justify-start"
                  style={selectedMembers.includes(member.id) ? {
                    backgroundColor: member.color,
                    borderColor: member.color
                  } : {}}
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: member.color }}
                  />
                  {member.name}
                  {member.status !== 'active' && (
                    <span className="text-xs opacity-70 ml-1">({member.status})</span>
                  )}
                </Button>
              ))}
            </div>
            {availableMembers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                no members available. add some members first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          cancel
        </Button>
        <Button type="submit" disabled={!formData.name.trim()}>
          {group ? 'update' : 'create'} group
        </Button>
      </div>
    </form>
  );
}