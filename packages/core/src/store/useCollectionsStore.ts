import { create } from 'zustand';

export type CollectionRecord = { name: string; title?: string; fields?: { name: string; type: string; }[]; };

type CollectionsState = {
  collections: CollectionRecord[];
  setCollections: (collections: CollectionRecord[]) => void;
};

export const useCollectionsStore = create<CollectionsState>((set) => ({
  collections: [],
  setCollections: (collections) => set({ collections }),
}));
