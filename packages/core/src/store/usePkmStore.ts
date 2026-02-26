import { create } from 'zustand';

export type CollectionRecord = {
  name: string;
  title?: string;
  fields?: { name: string; type: string; }[];
};

export type DocumentRecord = {
  id: string;
  title?: string;
  content?: string;
  accentColor?: string;
  [k: string]: unknown;
};

export type SearchHit = { id: string; score: number };

type PkmState = {
  collections: CollectionRecord[];
  searchResults: SearchHit[];
  setCollections: (collections: CollectionRecord[]) => void;
  setSearchResults: (r: SearchHit[]) => void;
};

export const usePkmStore = create<PkmState>((set) => ({
  collections: [],
  searchResults: [],
  setCollections: (collections) => set({ collections }),
  setSearchResults: (r) => set({ searchResults: r }),
}));

export default usePkmStore;
