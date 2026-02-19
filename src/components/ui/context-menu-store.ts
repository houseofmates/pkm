import { create } from 'zustand';

export type ContextMenuTargetType = 'canvas-object' | 'dashboard-card' | 'block';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetId: string | null;
  targetType: ContextMenuTargetType | null;
  data?: any; // Flexible payload (e.g. current color, title)
  openMenu: (x: number, y: number, targetId: string, targetType: ContextMenuTargetType, data?: any) => void;
  closeMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  x: 0,
  y: 0,
  targetId: null,
  targetType: null,
  data: null,
  openMenu: (x, y, targetId, targetType, data) => set({ isOpen: true, x, y, targetId, targetType, data }),
  closeMenu: () => set({ isOpen: false, targetId: null, targetType: null, data: null }),
}));