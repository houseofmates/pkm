import { RecordTable } from '@/features/records/components/record-table';
import { CalendarView } from './calendar-view';
import { KanbanView } from './kanban-view';
import { GalleryView } from './gallery-view';
import { GanttView } from './gantt-view';
import { ChartView } from './chart-view';
import { NetworkView } from './network-view';
import { MindMapView } from './mind-map-view';
import { ListView } from './list-view';
import { JournalView } from './journal-view';
import { CanvasView } from '@/features/databases/components/views/CanvasView';
import { ContactsView } from '@/features/headmates/components/contacts-view';
import * as React from 'react';

export type ViewType = 'table' | 'calendar' | 'kanban' | 'gallery' | 'gantt' | 'canvas' | 'chart' | 'network' | 'mindmap' | 'list' | 'journal' | 'contacts';

export type ViewProps = {
  data: any[];
  loading?: boolean;
  collection: any;
  config?: any;
  onUpdateRecord?: (id: any, data: any) => promise<void> | void;
  onDelete?: (id: any) => promise<void> | void;
  onEdit?: (id: any) => void;
  onConfigChange?: (key: string, value: any) => void;
  onCreateRecord?: () => void;
  onCreate?: (data: any) => promise<void> | void;
  onCreateField?: () => void;
};

export const view_registry: record<ViewType, React.ComponentType<ViewProps>> = {
  table: RecordTable,
  calendar: CalendarView,
  kanban: KanbanView,
  gallery: GalleryView,
  gantt: GanttView,
  canvas: CanvasView,
  chart: ChartView,
  network: NetworkView,
  mindmap: MindMapView,
  list: ListView,
  journal: JournalView,
  contacts: ContactsView,
};

import {
  Table, List, BookOpen, Calendar, Kanban as KanbanIcon,
  LayoutGrid, GitGraph, BarChart3, Network, GitMerge,
  LayoutDashboard, Users // Added Users icon
} from 'lucide-react';

export const VIEW_OPTIONS: { id: ViewType; label: string; icon?: any }[] = [
  { id: 'table', label: 'table', icon: Table },
  { id: 'list', label: 'list', icon: List },
  { id: 'journal', label: 'journal stream', icon: BookOpen },
  { id: 'calendar', label: 'calendar', icon: Calendar },
  { id: 'kanban', label: 'kanban', icon: KanbanIcon },
  { id: 'gallery', label: 'gallery', icon: LayoutGrid },
  { id: 'gantt', label: 'gantt', icon: GitGraph },
  { id: 'canvas', label: 'canvas', icon: LayoutDashboard },
  { id: 'chart', label: 'chart', icon: BarChart3 },
  { id: 'network', label: 'graph (auto)', icon: Network },
  { id: 'mindmap', label: 'mind map (manual)', icon: GitMerge },
  { id: 'contacts', label: 'contacts', icon: Users },
];