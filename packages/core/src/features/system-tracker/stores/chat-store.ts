/* eslint-disable */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { ChatMessage } from '../types/schema';

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  selectedThreadId: string | null;
  typingMembers: Set<string>;
}

interface ChatActions {
  loadMessages: (threadId?: string) => Promise<void>;
  sendMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => Promise<string>;
  editMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  setSelectedThread: (threadId: string | null) => void;
  addTypingMember: (memberId: string) => void;
  removeTypingMember: (memberId: string) => void;
  getThreads: () => string[];
  getMessagesForThread: (threadId?: string) => ChatMessage[];
  searchMessages: (query: string) => Promise<ChatMessage[]>;
  reset: () => void;
}

export const useChatStore = create<ChatState & ChatActions>()(
  subscribeWithSelector((set, get) => ({
    messages: [],
    loading: false,
    error: null,
    selectedThreadId: null,
    typingMembers: new Set(),

    loadMessages: async (threadId) => {
      set({ loading: true, error: null });
      try {
        const messages = await db.getChatMessages(threadId);
        set({ messages, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'failed to load chat messages',
          loading: false
        });
      }
    },

    sendMessage: async (messageData) => {
      set({ loading: true, error: null });
      try {
        const id = await db.addChatMessage(messageData);
        await get().loadMessages(messageData.threadId); // Refresh messages
        set({ loading: false });
        return id;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'failed to send message',
          loading: false
        });
        throw error;
      }
    },

    editMessage: async (id, content) => {
      set({ loading: true, error: null });
      try {
        await db.updateChatMessage(id, { content });
        await get().loadMessages(get().selectedThreadId || undefined); // Refresh messages
        set({ loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'failed to edit message',
          loading: false
        });
      }
    },

    deleteMessage: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.deleteChatMessage(id);
        await get().loadMessages(get().selectedThreadId || undefined); // Refresh messages
        set({ loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'failed to delete message',
          loading: false
        });
      }
    },

    setSelectedThread: (threadId) => {
      set({ selectedThreadId: threadId });
      get().loadMessages(threadId);
    },

    addTypingMember: (memberId) => {
      set(state => ({
        typingMembers: new Set([...state.typingMembers, memberId])
      }));
    },

    removeTypingMember: (memberId) => {
      set(state => {
        const newTyping = new Set(state.typingMembers);
        newTyping.delete(memberId);
        return { typingMembers: newTyping };
      });
    },

    getThreads: () => {
      const { messages } = get();
      const threadIds = new Set(messages.map(msg => msg.threadId).filter(Boolean));
      return Array.from(threadIds) as string[];
    },

    getMessagesForThread: (threadId) => {
      const { messages } = get();
      return messages.filter(msg =>
        threadId ? msg.threadId === threadId : !msg.threadId
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    searchMessages: async (query) => {
      try {
        return await db.searchChat(query);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'failed to search chat messages'
        });
        return [];
      }
    },

    reset: () => {
      set({
        messages: [],
        loading: false,
        error: null,
        selectedThreadId: null,
        typingMembers: new Set()
      });
    }
  }))
);