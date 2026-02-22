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
  activeDoc: DocumentRecord | null;
  headmateColor: string;
  searchResults: SearchHit[];
  setCollections: (collections: CollectionRecord[]) => void;
  setActiveDoc: (doc: DocumentRecord | null) => void;
  setHeadmateColor: (color: string) => void;
  setSearchResults: (r: SearchHit[]) => void;
};

export const usePkmStore = create<PkmState>((set) => ({
  collections: [],
  activeDoc: null,
  headmateColor: '#00bcd4',
  searchResults: [],
  setCollections: (collections) => set({ collections }),
  setActiveDoc: (doc) => set({ activeDoc: doc }),
  setHeadmateColor: (color) => set({ headmateColor: color }),
  setSearchResults: (r) => set({ searchResults: r }),
}));

export default usePkmStore;
