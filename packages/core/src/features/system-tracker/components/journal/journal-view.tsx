/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Calendar,
  User,
  Hash,
  MessageSquare
} from 'lucide-react';
import { useJournalStore } from '../../stores/journal-store';
import { useMembersStore } from '../../stores/members-store';
import { JournalEditor } from './journal-editor';
import type { JournalEntry } from '../../types/schema';

export function JournalView() {
  const { entries, loadEntries, addEntry, updateEntry, deleteEntry, setFilterMember, filterMemberId } = useJournalStore();
  const { members } = useMembersStore();
  
  const [search, setSearch] = useState('');
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>('system');

  useEffect(() => {
    loadEntries(selectedMember === 'system' ? undefined : selectedMember);
  }, [loadEntries, selectedMember]);

  const filteredEntries = entries.filter(entry =>
    entry.content.toLowerCase().includes(search.toLowerCase()) ||
    entry.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddEntry = async (entryData: JournalEntry) => {
    await addEntry(entryData);
    setIsAddEntryOpen(false);
  };

  const handleEditEntry = async (entryData: JournalEntry) => {
    await updateEntry(entryData.id, entryData);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('are you sure you want to delete this journal entry? this action cannot be undone.')) {
      await deleteEntry(entryId);
    }
  };

  const getMemberName = (memberId?: string) => {
    if (!memberId) return 'system';
    const member = members.find(m => m.id === memberId);
    return member?.name || 'unknown';
  };

  const getMemberColor = (memberId?: string) => {
    if (!memberId) return '#6b7280';
    const member = members.find(m => m.id === memberId);
    return member?.color || '#3b82f6';
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const systemEntries = entries.filter(entry => !entry.memberId);
  const memberEntries = entries.filter(entry => entry.memberId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold lowercase">system journal</h2>
          <p className="text-muted-foreground">system-wide and individual member journals</p>
        </div>
        <Button onClick={() => setIsAddEntryOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          new entry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>journal type</Label>
              <Select
                value={selectedMember}
                onValueChange={(value) => setSelectedMember(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">system journal</SelectItem>
                  <SelectItem value="members">member journals</SelectItem>
                  {members.filter(m => memberEntries.some(e => e.memberId === m.id)).map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>search entries</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="search content and tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground lowercase">system entries</p>
                <p className="text-2xl font-bold">{systemEntries.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground lowercase">member entries</p>
                <p className="text-2xl font-bold">{memberEntries.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground lowercase">total entries</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-lg mb-2 text-muted-foreground">
                {search ? 'no entries found' : 'no journal entries yet'}
              </p>
              <p className="text-muted-foreground mb-4">
                {search ? 'try adjusting your search terms' : 'start by creating your first journal entry'}
              </p>
              {!search && (
                <Button onClick={() => setIsAddEntryOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  create entry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map(entry => (
            <Card key={entry.id} className="transition-all hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getMemberColor(entry.memberId) }}
                    />
                    <span className="font-medium">{getMemberName(entry.memberId)}</span>
                    <Badge variant="outline" className="text-xs">
                      {entry.memberId ? 'member' : 'system'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none mb-4">
                  {/* Simple markdown rendering */}
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: entry.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold">$1</h1>')
                        .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold">$1</h2>')
                        .replace(/^### (.*$)/gm, '<h3 class="text-sm font-medium">$1</h3>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>

                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {entry.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs gap-1">
                        <Hash className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                  {entry.updatedAt !== entry.createdAt && (
                    <span>edited {formatRelativeTime(entry.updatedAt)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>new journal entry</DialogTitle>
          </DialogHeader>
          <JournalEditor
            onSave={handleAddEntry}
            onCancel={() => setIsAddEntryOpen(false)}
            memberId={selectedMember === 'system' ? undefined : selectedMember}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>edit journal entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <JournalEditor
              entry={editingEntry}
              onSave={handleEditEntry}
              onCancel={() => setEditingEntry(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}