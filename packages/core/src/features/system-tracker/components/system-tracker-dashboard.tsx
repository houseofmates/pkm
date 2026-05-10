/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Clock,
  Calendar,
  MessageSquare,
  BookOpen,
  Settings,
  Plus,
  Activity,
  TrendingUp,
  UserPlus,
  Edit
} from 'lucide-react';
import { useSystemStore } from '../stores/system-store';
import { useMembersStore } from '../stores/members-store';
import { useFrontStore } from '../stores/front-store';
import { useGroupsStore } from '../stores/groups-store';
import { useJournalStore } from '../stores/journal-store';
import { MemberCard } from './members/member-card';
import { MemberForm } from './members/member-form';
import { FrontPanel } from './front/front-panel';
import { FrontTimeline } from './front/front-timeline';
import { GroupsView } from './groups/groups-view';
import { JournalView } from './journal/journal-view';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SystemMember } from '../types/schema';

export function SystemTrackerDashboard() {
  const { system, loadSystem } = useSystemStore();
  const { members, loadMembers, loadCustomFields, addMember } = useMembersStore();
  const { currentSession, loadCurrentSession, loadHistory, activeFronters } = useFrontStore();
  const { loadGroups } = useGroupsStore();
  const { loadEntries } = useJournalStore();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSystem();
    loadMembers();
    loadCustomFields();
    loadCurrentSession();
    loadHistory();
    loadGroups();
  }, [loadSystem, loadMembers, loadCustomFields, loadCurrentSession, loadHistory, loadGroups]);

  const handleAddMember = async (memberData: SystemMember) => {
    await addMember(memberData);
    setIsAddMemberOpen(false);
  };

  const activeMembers = members.filter(member => activeFronters.includes(member.id));
  const activeCount = activeMembers.length;
  const totalMembers = members.length;
  const dormantCount = members.filter(m => m.status === 'dormant').length;
  const archivedCount = members.filter(m => m.status === 'archived').length;

  return (
    <div className="container mx-auto p-4 md:p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold lowercase text-foreground">
              {system?.name || 'system tracker'}
            </h1>
            {system?.description && (
              <p className="text-muted-foreground mt-1 lowercase">{system.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              settings
            </Button>
            <Button onClick={() => setIsAddMemberOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              add member
            </Button>
          </div>
        </div>
      </div>

      {/* Current Front Status */}
      {currentSession && (
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg lowercase">currently fronting</h3>
                <div className="flex items-center gap-2 mt-2">
                  {activeMembers.map(member => (
                    <Badge key={member.id} variant="default" className="text-sm">
                      {member.name}
                    </Badge>
                  ))}
                  {activeCount === 0 && (
                    <Badge variant="secondary">no one</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  since {new Date(currentSession.startedAt).toLocaleTimeString()}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                end session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground lowercase">total members</p>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground lowercase">active now</p>
                <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground lowercase">dormant</p>
                <p className="text-2xl font-bold text-yellow-600">{dormantCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground lowercase">archived</p>
                <p className="text-2xl font-bold text-gray-600">{archivedCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="lowercase">overview</TabsTrigger>
          <TabsTrigger value="members" className="lowercase">members</TabsTrigger>
          <TabsTrigger value="groups" className="lowercase">groups</TabsTrigger>
          <TabsTrigger value="fronting" className="lowercase">fronting</TabsTrigger>
          <TabsTrigger value="journal" className="lowercase">journal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  recent members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {members.slice(0, 6).map(member => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      onClick={() => setActiveTab('members')}
                    />
                  ))}
                </div>
                {members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>no members yet</p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => setIsAddMemberOpen(true)}
                    >
                      add your first member
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  start front session
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  write journal entry
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  view front history
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  edit system info
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  all members ({members.length})
                </span>
                <Button onClick={() => setIsAddMemberOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  add member
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {members.map(member => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">no members yet</p>
                  <p className="mb-4">add your first system member to get started</p>
                  <Button onClick={() => setIsAddMemberOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    add member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <GroupsView />
        </TabsContent>

        <TabsContent value="fronting" className="space-y-6">
          <FrontPanel />
          <FrontTimeline />
        </TabsContent>

        <TabsContent value="journal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                system journal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">journal coming soon</p>
                <p className="mb-4">this will show system-wide and individual journals</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>add new member</DialogTitle>
          </DialogHeader>
          <MemberForm
            onSave={handleAddMember}
            onCancel={() => setIsAddMemberOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}