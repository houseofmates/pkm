/* eslint-disable */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  Calendar, 
  Users, 
  Edit2, 
  Trash2, 
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Timer
} from 'lucide-react';
import { useFrontStore } from '../../stores/front-store';
import { useMembersStore } from '../../stores/members-store';
import type { FrontSession, FrontType } from '../../types/schema';

const FRONT_TYPE_COLORS: Record<FrontType, string> = {
  primary: 'bg-blue-500',
  cofront: 'bg-green-500',
  coconscious: 'bg-yellow-500',
  influence: 'bg-purple-500',
  watching: 'bg-gray-500'
};

const FRONT_TYPE_LABELS: Record<FrontType, string> = {
  primary: 'primary',
  cofront: 'co-front',
  coconscious: 'co-conscious',
  influence: 'influence',
  watching: 'watching'
};

export function FrontTimeline() {
  const { history, deleteSession, updateSession } = useFrontStore();
  const { members } = useMembersStore();
  
  const [filter, setFilter] = useState({
    memberId: '',
    frontType: 'all' as FrontType | 'all',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month' | 'custom',
    customStart: '',
    customEnd: ''
  });
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FrontSession>>({});

  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Member filter
    if (filter.memberId) {
      filtered = filtered.filter(session => 
        session.entries.some(entry => entry.memberId === filter.memberId)
      );
    }

    // Front type filter
    if (filter.frontType !== 'all') {
      filtered = filtered.filter(session => 
        session.entries.some(entry => entry.frontType === filter.frontType)
      );
    }

    // Date filter
    const now = new Date();
    if (filter.dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(session => 
        new Date(session.startedAt) >= today
      );
    } else if (filter.dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(session => 
        new Date(session.startedAt) >= weekAgo
      );
    } else if (filter.dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(session => 
        new Date(session.startedAt) >= monthAgo
      );
    } else if (filter.dateRange === 'custom' && filter.customStart && filter.customEnd) {
      const start = new Date(filter.customStart);
      const end = new Date(filter.customEnd);
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.startedAt);
        return sessionDate >= start && sessionDate <= end;
      });
    }

    return filtered.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [history, filter]);

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'unknown';
  };

  const getMemberColor = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.color || '#3b82f6';
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const toggleSessionExpanded = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const handleEditSession = (session: FrontSession) => {
    setEditingSession(session.id);
    setEditForm({
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      comment: session.comment,
      entries: session.entries
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    
    await updateSession(editingSession, editForm);
    setEditingSession(null);
    setEditForm({});
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('are you sure you want to delete this front session? this action cannot be undone.')) {
      await deleteSession(sessionId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>member</Label>
              <Select
                value={filter.memberId}
                onValueChange={(value) => setFilter(prev => ({ ...prev, memberId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="all members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">all members</SelectItem>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>front type</Label>
              <Select
                value={filter.frontType}
                onValueChange={(value: FrontType | 'all') => setFilter(prev => ({ ...prev, frontType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all types</SelectItem>
                  <SelectItem value="primary">primary</SelectItem>
                  <SelectItem value="cofront">co-front</SelectItem>
                  <SelectItem value="coconscious">co-conscious</SelectItem>
                  <SelectItem value="influence">influence</SelectItem>
                  <SelectItem value="watching">watching</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>date range</Label>
              <Select
                value={filter.dateRange}
                onValueChange={(value: any) => setFilter(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all time</SelectItem>
                  <SelectItem value="today">today</SelectItem>
                  <SelectItem value="week">past week</SelectItem>
                  <SelectItem value="month">past month</SelectItem>
                  <SelectItem value="custom">custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filter.dateRange === 'custom' && (
              <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>start date</Label>
                    <Input
                      type="datetime-local"
                      value={filter.customStart}
                      onChange={(e) => setFilter(prev => ({ ...prev, customStart: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>end date</Label>
                    <Input
                      type="datetime-local"
                      value={filter.customEnd}
                      onChange={(e) => setFilter(prev => ({ ...prev, customEnd: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              front history ({filteredHistory.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">no front sessions found</p>
              <p>try adjusting your filters or start a new front session</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map(session => (
                <Card key={session.id} className="border-l-4 border-l-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {new Date(session.startedAt).toLocaleDateString()}
                          </span>
                          <Timer className="h-4 w-4" />
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(session.startedAt, session.endedAt)}
                          </span>
                          {!session.endedAt && (
                            <Badge variant="default">active</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          {session.entries.map(entry => {
                            const member = members.find(m => m.id === entry.memberId);
                            return (
                              <Badge 
                                key={entry.memberId}
                                variant="secondary"
                                className="gap-1"
                                style={{ 
                                  backgroundColor: member?.color + '20',
                                  borderColor: member?.color
                                }}
                              >
                                {member?.name || 'unknown'}
                                <span className={`w-2 h-2 rounded-full ${FRONT_TYPE_COLORS[entry.frontType]}`} />
                                <span className="text-xs">
                                  {FRONT_TYPE_LABELS[entry.frontType]}
                                </span>
                                {entry.customStatus && (
                                  <span className="text-xs">: {entry.customStatus}</span>
                                )}
                              </Badge>
                            );
                          })}
                        </div>

                        {session.comment && (
                          <div className="text-sm text-muted-foreground mb-2">
                            <MessageSquare className="h-4 w-4 inline mr-1" />
                            {session.comment}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          {new Date(session.startedAt).toLocaleTimeString()}
                          {session.endedAt && ` - ${new Date(session.endedAt).toLocaleTimeString()}`}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSessionExpanded(session.id)}
                        >
                          {expandedSessions.has(session.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSession(session)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {editingSession === session.id && (
                      <div className="mt-4 p-4 border rounded space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>start time</Label>
                            <Input
                              type="datetime-local"
                              value={editForm.startedAt ? new Date(editForm.startedAt).toISOString().slice(0, 16) : ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, startedAt: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>end time</Label>
                            <Input
                              type="datetime-local"
                              value={editForm.endedAt ? new Date(editForm.endedAt).toISOString().slice(0, 16) : ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, endedAt: e.target.value || undefined }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>session note</Label>
                          <Input
                            value={editForm.comment || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, comment: e.target.value }))}
                            placeholder="add a note..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingSession(null)}>
                            cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}