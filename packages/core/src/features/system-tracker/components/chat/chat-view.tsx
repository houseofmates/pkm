/* eslint-disable */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MessageSquare,
  Plus,
  Search,
  Users,
  Hash,
  Clock,
  Reply
} from 'lucide-react';
import { useChatStore } from '../../stores/chat-store';
import { useMembersStore } from '../../stores/members-store';
import { ChatWindow } from './chat-window';
import type { ChatMessage } from '../../types/schema';

export function ChatView() {
  const { messages, loadMessages, getThreads, searchMessages } = useChatStore();
  const { members } = useMembersStore();

  const [search, setSearch] = useState('');
  const [isCreateThreadOpen, setIsCreateThreadOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const threads = getThreads();
  const mainChatMessages = messages.filter(msg => !msg.threadId);

  const handleSearch = async () => {
    if (!search.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchMessages(search);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const getThreadPreview = (threadId: string) => {
    const threadMessages = messages.filter(msg => msg.threadId === threadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const latestMessage = threadMessages[0];
    if (!latestMessage) return null;

    const member = members.find(m => m.id === latestMessage.memberId);
    return {
      memberName: member?.name || 'unknown',
      memberColor: member?.color || '#3b82f6',
      preview: latestMessage.content.length > 50
        ? latestMessage.content.substring(0, 50) + '...'
        : latestMessage.content,
      timestamp: new Date(latestMessage.createdAt).toLocaleString(),
      messageCount: threadMessages.length
    };
  };

  const getMainChatPreview = () => {
    if (mainChatMessages.length === 0) return null;

    const latestMessage = mainChatMessages[mainChatMessages.length - 1];
    if (!latestMessage) return null;

    const member = members.find(m => m.id === latestMessage.memberId);

    return {
      memberName: member?.name || 'unknown',
      memberColor: member?.color || '#3b82f6',
      preview: latestMessage.content.length > 50
        ? latestMessage.content.substring(0, 50) + '...'
        : latestMessage.content,
      timestamp: new Date(latestMessage.createdAt).toLocaleString(),
      messageCount: mainChatMessages.length
    };
  };

  const createNewThread = () => {
    // For now, we'll just show the main chat
    // Thread creation could be expanded later
    setSelectedThreadId(null);
  };

  const displayedMessages = isSearching ? searchResults :
    selectedThreadId ? messages.filter(msg => msg.threadId === selectedThreadId) :
      mainChatMessages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold lowercase">system chat</h2>
          <p className="text-muted-foreground">internal communication between system members</p>
        </div>
        <Button onClick={createNewThread}>
          <Plus className="h-4 w-4 mr-2" />
          new conversation
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            search messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="search message content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!search.trim()}>
              search
            </Button>
            {isSearching && (
              <Badge variant="secondary">searching...</Badge>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {searchResults.map(message => {
                  const member = members.find(m => m.id === message.memberId);
                  return (
                    <div key={message.id} className="p-2 border rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: member?.color }}
                        />
                        <span className="font-medium text-sm">
                          {member?.name || 'unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Main Chat */}
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${!selectedThreadId ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                onClick={() => setSelectedThreadId(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">main chat</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {mainChatMessages.length}
                  </Badge>
                </div>
                {getMainChatPreview() && (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getMainChatPreview()?.memberColor }}
                      />
                      <span>{getMainChatPreview()?.memberName}</span>
                    </div>
                    <p className="truncate">{getMainChatPreview()?.preview}</p>
                    <p className="text-xs">{getMainChatPreview()?.timestamp}</p>
                  </div>
                )}
              </div>

              {/* Thread List */}
              {threads.map(threadId => {
                const preview = getThreadPreview(threadId);
                if (!preview) return null;

                return (
                  <div
                    key={threadId}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedThreadId === threadId ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                      }`}
                    onClick={() => setSelectedThreadId(threadId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span className="font-medium">thread {threadId.slice(0, 8)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {preview.messageCount}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: preview.memberColor }}
                        />
                        <span>{preview.memberName}</span>
                      </div>
                      <p className="truncate">{preview.preview}</p>
                      <p className="text-xs">{preview.timestamp}</p>
                    </div>
                  </div>
                );
              })}

              {threads.length === 0 && mainChatMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>no conversations yet</p>
                  <p className="text-sm">start the first conversation!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>total messages</span>
                <span className="font-medium">{messages.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>threads</span>
                <span className="font-medium">{threads.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>active members</span>
                <span className="font-medium">
                  {members.filter(m => m.status === 'active').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          <ChatWindow threadId={selectedThreadId} />
        </div>
      </div>

      {/* Create Thread Dialog */}
      <Dialog open={isCreateThreadOpen} onOpenChange={setIsCreateThreadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>create new thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              threads allow you to organize conversations by topic.
              start a thread from any message to begin.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCreateThreadOpen(false)}>
                cancel
              </Button>
              <Button onClick={() => setIsCreateThreadOpen(false)}>
                got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}