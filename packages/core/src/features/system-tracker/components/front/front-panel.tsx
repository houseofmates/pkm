/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Clock, 
  Plus, 
  X, 
  Edit2, 
  Save, 
  RotateCcw,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { useFrontStore } from '../../stores/front-store';
import { useMembersStore } from '../../stores/members-store';
import type { FrontType } from '../../types/schema';

const FRONT_TYPES: { value: FrontType; label: string }[] = [
  { value: 'primary', label: 'primary' },
  { value: 'cofront', label: 'co-front' },
  { value: 'coconscious', label: 'co-conscious' },
  { value: 'influence', label: 'influence' },
  { value: 'watching', label: 'watching' }
];

export function FrontPanel() {
  const { 
    currentSession, 
    startFrontSession, 
    endCurrentSession, 
    updateSession,
    activeFronters 
  } = useFrontStore();
  const { members } = useMembersStore();
  
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [frontEntries, setFrontEntries] = useState<Array<{memberId: string; frontType: FrontType; customStatus?: string}>>([]);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

  useEffect(() => {
    if (currentSession) {
      setFrontEntries(currentSession.entries);
      setComment(currentSession.comment || '');
      setSelectedMembers(currentSession.entries.map(entry => entry.memberId));
    } else {
      setFrontEntries([]);
      setComment('');
      setSelectedMembers([]);
    }
  }, [currentSession]);

  const availableMembers = members.filter(member => 
    member.status === 'active' && !selectedMembers.includes(member.id)
  );

  const addMemberToFront = (memberId: string) => {
    const newEntry = {
      memberId,
      frontType: 'primary' as FrontType,
      customStatus: ''
    };
    setFrontEntries([...frontEntries, newEntry]);
    setSelectedMembers([...selectedMembers, memberId]);
  };

  const removeMemberFromFront = (memberId: string) => {
    setFrontEntries(frontEntries.filter(entry => entry.memberId !== memberId));
    setSelectedMembers(selectedMembers.filter(id => id !== memberId));
  };

  const updateFrontEntry = (memberId: string, updates: Partial<typeof frontEntries[0]>) => {
    setFrontEntries(frontEntries.map(entry => 
      entry.memberId === memberId ? { ...entry, ...updates } : entry
    ));
  };

  const handleStartSession = async () => {
    if (frontEntries.length === 0) return;
    
    await startFrontSession(frontEntries, comment);
    setFrontEntries([]);
    setComment('');
    setSelectedMembers([]);
  };

  const handleEndSession = async () => {
    await endCurrentSession();
  };

  const handleUpdateSession = async () => {
    if (!currentSession) return;
    
    await updateSession(currentSession.id, {
      entries: frontEntries,
      comment
    });
    setIsEditing(false);
  };

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'unknown';
  };

  const getMemberColor = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.color || '#3b82f6';
  };

  if (isEditing && currentSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              edit current session
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                cancel
              </Button>
              <Button size="sm" onClick={handleUpdateSession}>
                <Save className="h-4 w-4 mr-2" />
                save
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>current fronters</Label>
            <div className="space-y-2 mt-2">
              {frontEntries.map(entry => (
                <div key={entry.memberId} className="flex items-center gap-2 p-2 border rounded">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getMemberColor(entry.memberId) }}
                  />
                  <span className="flex-1">{getMemberName(entry.memberId)}</span>
                  <Select
                    value={entry.frontType}
                    onValueChange={(value: FrontType) => updateFrontEntry(entry.memberId, { frontType: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FRONT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="status"
                    value={entry.customStatus || ''}
                    onChange={(e) => updateFrontEntry(entry.memberId, { customStatus: e.target.value })}
                    className="w-24"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMemberFromFront(entry.memberId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="session-comment">session note</Label>
            <Textarea
              id="session-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="add a note for this front session..."
              rows={3}
            />
          </div>

          <div>
            <Label>add member to session</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {availableMembers.map(member => (
                <Button
                  key={member.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addMemberToFront(member.id)}
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {currentSession ? (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                current front session
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleEndSession}>
                  end session
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">active fronters</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {frontEntries.map(entry => {
                  const member = members.find(m => m.id === entry.memberId);
                  return (
                    <Badge 
                      key={entry.memberId} 
                      variant="default"
                      className="gap-1"
                      style={{ backgroundColor: member?.color }}
                    >
                      {member?.name || 'unknown'}
                      {entry.frontType !== 'primary' && (
                        <span className="text-xs opacity-80">({entry.frontType})</span>
                      )}
                      {entry.customStatus && (
                        <span className="text-xs opacity-80">: {entry.customStatus}</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              started: {new Date(currentSession.startedAt).toLocaleString()}
            </div>

            {comment && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">session note</Label>
                <p className="text-sm mt-1">{comment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              start front session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>select fronters</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {availableMembers.map(member => (
                  <Button
                    key={member.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addMemberToFront(member.id)}
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
              {availableMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  no active members available. all active members are already selected or there are no members.
                </p>
              )}
            </div>

            {frontEntries.length > 0 && (
              <>
                <div>
                  <Label>selected fronters</Label>
                  <div className="space-y-2 mt-2">
                    {frontEntries.map(entry => (
                      <div key={entry.memberId} className="flex items-center gap-2 p-2 border rounded">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getMemberColor(entry.memberId) }}
                        />
                        <span className="flex-1">{getMemberName(entry.memberId)}</span>
                        <Select
                          value={entry.frontType}
                          onValueChange={(value: FrontType) => updateFrontEntry(entry.memberId, { frontType: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FRONT_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="status"
                          value={entry.customStatus || ''}
                          onChange={(e) => updateFrontEntry(entry.memberId, { customStatus: e.target.value })}
                          className="w-24"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMemberFromFront(entry.memberId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="session-comment">session note (optional)</Label>
                  <Textarea
                    id="session-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="add a note for this front session..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleStartSession} className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  start front session
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            quick actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              view front history
            </Button>
            <Button variant="outline" className="justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              front analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}