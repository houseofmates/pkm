import { create } from 'zustand';

export type SearchHit = { id: string; score: number };

type SearchState = {
  searchResults: SearchHit[];
  setSearchResults: (r: SearchHit[]) => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  searchResults: [],
  setSearchResults: (r) => set({ searchResults: r }),
}));
