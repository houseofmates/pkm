import { create } from 'zustand';

export type DocumentRecord = {
  id: string;
  title?: string;
  content?: string;
  accentColor?: string;
  [k: string]: unknown;
};

export type SearchHit = { id: string; score: number };

type PkmState = {
  activeDoc: DocumentRecord | null;
  headmateColor: string;
  searchResults: SearchHit[];
  setActiveDoc: (doc: DocumentRecord | null) => void;
  setHeadmateColor: (color: string) => void;
  setSearchResults: (r: SearchHit[]) => void;
};

export const usePkmStore = create<PkmState>((set) => ({
  activeDoc: null,
  headmateColor: '#00bcd4',
  searchResults: [],
  setActiveDoc: (doc) => set({ activeDoc: doc }),
  setHeadmateColor: (color) => set({ headmateColor: color }),
  setSearchResults: (r) => set({ searchResults: r }),
}));

export default UsePkmStore;