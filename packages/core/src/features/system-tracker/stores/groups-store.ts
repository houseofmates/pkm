/* eslint-disable */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { Group } from '../types/schema';

interface GroupsState {
  groups: Group[];
  loading: boolean;
  error: string | null;
  selectedGroupId: string | null;
}

interface GroupsActions {
  loadGroups: () => Promise<void>;
  addGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  setSelectedGroup: (id: string | null) => void;
  getGroupById: (id: string) => Group | undefined;
  getGroupsForMember: (memberId: string) => Group[];
  addMemberToGroup: (groupId: string, memberId: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
  reset: () => void;
}

export const useGroupsStore = create<GroupsState & GroupsActions>()(
  subscribeWithSelector((set, get) => ({
    groups: [],
    loading: false,
    error: null,
    selectedGroupId: null,

    loadGroups: async () => {
      set({ loading: true, error: null });
      try {
        const groups = await db.getGroups();
        set({ groups, loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to load groups', 
          loading: false 
        });
      }
    },

    addGroup: async (groupData) => {
      set({ loading: true, error: null });
      try {
        const id = await db.addGroup(groupData);
        await get().loadGroups(); // Refresh groups list
        set({ loading: false });
        return id;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to add group', 
          loading: false 
        });
        throw error;
      }
    },

    updateGroup: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        await db.updateGroup(id, updates);
        await get().loadGroups(); // Refresh groups list
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to update group', 
          loading: false 
        });
      }
    },

    deleteGroup: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.deleteGroup(id);
        await get().loadGroups(); // Refresh groups list
        if (get().selectedGroupId === id) {
          set({ selectedGroupId: null });
        }
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to delete group', 
          loading: false 
        });
      }
    },

    setSelectedGroup: (id) => {
      set({ selectedGroupId: id });
    },

    getGroupById: (id) => {
      const { groups } = get();
      return groups.find(group => group.id === id);
    },

    getGroupsForMember: (memberId) => {
      const { groups } = get();
      return groups.filter(group => group.memberIds.includes(memberId));
    },

    addMemberToGroup: async (groupId, memberId) => {
      const { groups } = get();
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      if (!group.memberIds.includes(memberId)) {
        const updatedMemberIds = [...group.memberIds, memberId];
        await get().updateGroup(groupId, { memberIds: updatedMemberIds });
      }
    },

    removeMemberFromGroup: async (groupId, memberId) => {
      const { groups } = get();
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const updatedMemberIds = group.memberIds.filter(id => id !== memberId);
      await get().updateGroup(groupId, { memberIds: updatedMemberIds });
    },

    reset: () => {
      set({ 
        groups: [], 
        loading: false, 
        error: null, 
        selectedGroupId: null 
      });
    }
  }))
);