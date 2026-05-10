import { create } from 'zustand';

export type DocumentRecord = { id: string; title?: string; content?: string; accentColor?: string; [k: string]: unknown; };

type DocumentState = {
  activeDoc: DocumentRecord | null;
  setActiveDoc: (doc: DocumentRecord | null) => void;
};

export const useDocumentStore = create<DocumentState>((set) => ({
  activeDoc: null,
  setActiveDoc: (doc) => set({ activeDoc: doc }),
}));
