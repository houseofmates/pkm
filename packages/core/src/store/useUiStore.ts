import { create } from 'zustand';

type UiState = {
  headmateColor: string;
  setHeadmateColor: (color: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  headmateColor: '#00bcd4',
  setHeadmateColor: (color) => set({ headmateColor: color }),
}));
