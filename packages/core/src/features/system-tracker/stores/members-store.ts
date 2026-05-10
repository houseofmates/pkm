/* eslint-disable */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { SystemMember, CustomFieldDefinition, MemberStatus } from '../types/schema';

interface MembersState {
  members: SystemMember[];
  customFields: CustomFieldDefinition[];
  loading: boolean;
  error: string | null;
  selectedMemberId: string | null;
}

interface MembersActions {
  loadMembers: () => Promise<void>;
  loadCustomFields: () => Promise<void>;
  addMember: (member: Omit<SystemMember, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMember: (id: string, updates: Partial<SystemMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  addCustomField: (field: Omit<CustomFieldDefinition, 'id'>) => Promise<string>;
  updateCustomField: (id: string, updates: Partial<CustomFieldDefinition>) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  setSelectedMember: (id: string | null) => void;
  searchMembers: (query: string) => Promise<SystemMember[]>;
  getMembersByStatus: (status: MemberStatus) => SystemMember[];
  getMembersByGroup: (groupId: string) => Promise<SystemMember[]>;
  reset: () => void;
}

export const useMembersStore = create<MembersState & MembersActions>()(
  subscribeWithSelector((set, get) => ({
    members: [],
    customFields: [],
    loading: false,
    error: null,
    selectedMemberId: null,

    loadMembers: async () => {
      set({ loading: true, error: null });
      try {
        const members = await db.getMembers();
        set({ members, loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to load members', 
          loading: false 
        });
      }
    },

    loadCustomFields: async () => {
      set({ loading: true, error: null });
      try {
        const customFields = await db.getCustomFields();
        set({ customFields, loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to load custom fields', 
          loading: false 
        });
      }
    },

    addMember: async (memberData) => {
      set({ loading: true, error: null });
      try {
        const id = await db.addMember(memberData);
        await get().loadMembers(); // Refresh members list
        set({ loading: false });
        return id;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to add member', 
          loading: false 
        });
        throw error;
      }
    },

    updateMember: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        await db.updateMember(id, updates);
        await get().loadMembers(); // Refresh members list
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to update member', 
          loading: false 
        });
      }
    },

    deleteMember: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.deleteMember(id);
        await get().loadMembers(); // Refresh members list
        if (get().selectedMemberId === id) {
          set({ selectedMemberId: null });
        }
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to delete member', 
          loading: false 
        });
      }
    },

    addCustomField: async (fieldData) => {
      set({ loading: true, error: null });
      try {
        const id = await db.addCustomField(fieldData);
        await get().loadCustomFields(); // Refresh custom fields
        set({ loading: false });
        return id;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to add custom field', 
          loading: false 
        });
        throw error;
      }
    },

    updateCustomField: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        await db.updateCustomField(id, updates);
        await get().loadCustomFields(); // Refresh custom fields
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to update custom field', 
          loading: false 
        });
      }
    },

    deleteCustomField: async (id) => {
      set({ loading: true, error: null });
      try {
        await db.deleteCustomField(id);
        await get().loadCustomFields(); // Refresh custom fields
        set({ loading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to delete custom field', 
          loading: false 
        });
      }
    },

    setSelectedMember: (id) => {
      set({ selectedMemberId: id });
    },

    searchMembers: async (query) => {
      try {
        return await db.searchMembers(query);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to search members'
        });
        return [];
      }
    },

    getMembersByStatus: (status) => {
      const { members } = get();
      return members.filter(member => member.status === status);
    },

    getMembersByGroup: async (groupId) => {
      try {
        const groups = await db.getGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];

        const { members } = get();
        return members.filter(member => group.memberIds.includes(member.id));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'failed to get members by group'
        });
        return [];
      }
    },

    reset: () => {
      set({ 
        members: [], 
        customFields: [], 
        loading: false, 
        error: null, 
        selectedMemberId: null 
      });
    }
  }))
);