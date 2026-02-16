import { createContext, useContext } from 'react';

// --- TYPES ---
export interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  description?: string; // excerpt
  content: ElementData[]; // JSON in DB
  banner_image?: string;
  published: boolean;
  published_date?: string;
  tags?: string[]; // stored as JSON array
  mood?: string;
  energy_level?: string;
  blocks?: any;
  created_at?: string;
  updated_at?: string;
  // Compatibility with PageData for Canvas
  elements?: ElementData[];
  theme_color?: string;
  background?: string;
  height?: number;
  enable_sounds?: boolean;
  custom_pop_sound?: string;
  custom_exit_sound?: string;
}

export interface ElementData {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: any;
  styles: any;
  link?: string;
  clickAction?: any;
  zIndex: number;
  tablet?: any;
  mobile?: any;
  visibility?: any;
  copyContent?: string;
}

// --- CONTEXT ---
export interface BlogBuilderContextType {
  isAdmin: boolean;
  page: BlogPostData | null;
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  updateElement: (id: string, updates: Partial<ElementData>) => void;
  updateElements: (updates: { id: string; updates: Partial<ElementData> }[]) => void;
  deleteElements: (ids: string[]) => void;
  addElement: (element: Omit<ElementData, 'id' | 'zIndex'> & { zIndex?: number }) => void;
  handleElementContextMenu: (e: React.MouseEvent, elementId: string) => void;
  handleGlobalContextMenu: (e: React.MouseEvent) => void;
  previewMode: 'desktop' | 'mobile' | 'tablet';
  setPreviewMode: (mode: 'desktop' | 'mobile' | 'tablet') => void;
  viewWidth: number;
  selectionBox: any;
  setSelectionBox: (box: any) => void;
  savePost: () => Promise<void>;
}

export const BlogContext = createContext<BlogBuilderContextType | null>(null);

export const useBlogBuilder = () => {
  const ctx = useContext(BlogContext);
  if (!ctx) throw new Error('useBlogBuilder must be used within BlogEditor');
  return ctx;
};
