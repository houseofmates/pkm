/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Save, Edit3, Hash } from 'lucide-react';
import { useJournalStore } from '../../stores/journal-store';
import { useMembersStore } from '../../stores/members-store';
import { useFrontStore } from '../../stores/front-store';
import type { JournalEntry } from '../../types/schema';

interface JournalEditorProps {
  entry?: JournalEntry;
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
  memberId?: string; // For member-specific journals
}

export function JournalEditor({ entry, onSave, onCancel, memberId }: JournalEditorProps) {
  const { members } = useMembersStore();
  const { currentSession } = useFrontStore();
  
  const [formData, setFormData] = useState({
    content: '',
    memberId: memberId || null as string | null,
    tags: [] as string[],
    frontSessionId: currentSession?.id || null,
    ...entry
  });

  const [newTag, setNewTag] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (currentSession && !formData.frontSessionId) {
      setFormData(prev => ({ ...prev, frontSessionId: currentSession.id }));
    }
  }, [currentSession, formData.frontSessionId]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    const entryData: JournalEntry = {
      id: entry?.id || crypto.randomUUID(),
      content: formData.content.trim(),
      memberId: formData.memberId,
      tags: formData.tags,
      frontSessionId: formData.frontSessionId,
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(entryData);
  };

  const availableMembers = members.filter(member => member.status === 'active');

  const renderPreview = () => {
    // Simple markdown-like preview
    let content = formData.content;
    
    // Bold
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Headers
    content = content.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    content = content.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    content = content.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    // Line breaks
    content = content.replace(/\n/g, '<br>');

    return { __html: content };
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{entry ? 'edit entry' : 'new entry'}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
              >
                {isPreview ? 'edit' : 'preview'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Member Selection (for system-wide journal) */}
          {!memberId && (
            <div>
              <Label>author (optional)</Label>
              <Select
                value={formData.memberId || ''}
                onValueChange={(value) => handleInputChange('memberId', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="system entry (no specific author)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">system entry</SelectItem>
                  {availableMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Content */}
          <div>
            <Label htmlFor="content">content *</Label>
            {!isPreview ? (
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="write your journal entry here... you can use markdown formatting like **bold** and *italic*"
                rows={12}
                className="font-mono"
              />
            ) : (
              <div 
                className="min-h-[300px] p-4 border rounded-md bg-muted/50"
                dangerouslySetInnerHTML={renderPreview()}
              />
            )}
          </div>

          {/* Tags */}
          <div>
            <Label>tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Hash className="h-3 w-3" />
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Front Session Association */}
          {currentSession && (
            <div>
              <Label>front session</Label>
              <div className="text-sm text-muted-foreground">
                This entry will be associated with the current front session
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              cancel
            </Button>
            <Button type="submit" disabled={!formData.content.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {entry ? 'update' : 'save'} entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Markdown Help */}
      {!isPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">markdown formatting</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><code>**bold**</code> → <strong>bold</strong></div>
            <div><code>*italic*</code> → <em>italic</em></div>
            <div><code># heading</code> → heading</div>
            <div><code>## subheading</code> → subheading</div>
          </CardContent>
        </Card>
      )}
    </form>
  );
}