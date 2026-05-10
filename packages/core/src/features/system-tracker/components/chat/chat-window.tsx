/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  Edit,
  Trash2,
  Reply,
  Smile,
  MoreHorizontal,
  User
} from 'lucide-react';
import { useChatStore } from '../../stores/chat-store';
import { useMembersStore } from '../../stores/members-store';
import type { ChatMessage } from '../../types/schema';

interface ChatWindowProps {
  threadId?: string;
  className?: string;
}

export function ChatWindow({ threadId, className }: ChatWindowProps) {
  const {
    messages,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    selectedThreadId,
    typingMembers
  } = useChatStore();
  const { members } = useMembersStore();

  const [newMessage, setNewMessage] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const threadMessages = messages
    .filter(msg => threadId ? msg.threadId === threadId : !msg.threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    loadMessages(threadId);
  }, [loadMessages, threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'unknown';
  };

  const getMemberColor = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.color || '#3b82f6';
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedMember) return;

    await sendMessage({
      memberId: selectedMember,
      content: newMessage.trim(),
      threadId: threadId || undefined
    });

    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    await editMessage(messageId, editContent.trim());
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (confirm('are you sure you want to delete this message?')) {
      await deleteMessage(messageId);
    }
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const activeMembers = members.filter(member => member.status === 'active');

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          system chat
          {threadId && <Badge variant="secondary">thread</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>no messages yet</p>
              <p className="text-sm">start a conversation!</p>
            </div>
          ) : (
            <>
              {threadMessages.map((message, index) => {
                const showDate = index === 0 ||
                  (threadMessages[index - 1] && formatDate(threadMessages[index - 1].createdAt) !== formatDate(message.createdAt));

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center text-xs text-muted-foreground my-4">
                        {formatDate(message.createdAt)}
                      </div>
                    )}

                    <div className="flex gap-3 group">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: getMemberColor(message.memberId) }}
                      >
                        {getMemberName(message.memberId).charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {getMemberName(message.memberId)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.createdAt)}
                          </span>
                          {message.editedAt && (
                            <span className="text-xs text-muted-foreground italic">
                              (edited)
                            </span>
                          )}
                        </div>

                        {editingMessageId === message.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                            <Button size="sm" onClick={() => handleEditMessage(message.id)}>
                              save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(message)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMessage(message.id)}
                                className="h-6 w-6 p-0 text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Typing indicators */}
        {typingMembers.size > 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            {Array.from(typingMembers).map(memberId => getMemberName(memberId)).join(', ')}
            {typingMembers.size === 1 ? ' is' : ' are'} typing...
          </div>
        )}

        {/* Message input */}
        <div className="border-t p-4 space-y-3">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/50 rounded p-2">
              <span className="text-sm text-muted-foreground">
                replying to message
              </span>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                cancel
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="speaking as...">
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      {member.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="type a message..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
              disabled={!selectedMember}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !selectedMember}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {!selectedMember && (
            <p className="text-xs text-muted-foreground">
              select who is speaking to send a message
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}