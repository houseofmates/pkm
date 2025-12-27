
import { RecordTable } from '@/components/record-table';
import { CalendarView } from './calendar-view';
import { KanbanView } from './kanban-view';
import { GalleryView } from './gallery-view';
import { GanttView } from './gantt-view';
import { ChartView } from './chart-view';
import { NetworkView } from './network-view';
import { MindMapView } from './mind-map-view';
import { ListView } from './list-view';
import { JournalView } from './journal-view';
import * as React from 'react';

export type ViewType = 'table' | 'calendar' | 'kanban' | 'gallery' | 'gantt' | 'chart' | 'network' | 'mindmap' | 'list' | 'journal';

export type ViewProps = {
    data: any[];
    loading?: boolean;
    collection: any;
    config?: any;
    onUpdateRecord?: (id: any, data: any) => Promise<void> | void;
    onDelete?: (id: any) => Promise<void> | void;
    onEdit?: (id: any) => void;
    onConfigChange?: (key: string, value: any) => void;
};

export const VIEW_REGISTRY: Record<ViewType, React.ComponentType<ViewProps>> = {
    table: RecordTable,
    calendar: CalendarView,
    kanban: KanbanView,
    gallery: GalleryView,
    gantt: GanttView,
    chart: ChartView,
    network: NetworkView,
    mindmap: MindMapView,
    list: ListView,
    journal: JournalView,
};

import {
    Table, List, BookOpen, Calendar, Kanban as KanbanIcon,
    LayoutGrid, GitGraph, BarChart3, Network, GitMerge
} from 'lucide-react';

export const VIEW_OPTIONS: { id: ViewType; label: string; icon?: any }[] = [
    { id: 'table', label: 'Table', icon: Table },
    { id: 'list', label: 'List', icon: List },
    { id: 'journal', label: 'Journal Stream', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'kanban', label: 'Kanban', icon: KanbanIcon },
    { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
    { id: 'gantt', label: 'Gantt', icon: GitGraph },
    { id: 'chart', label: 'Chart', icon: BarChart3 },
    { id: 'network', label: 'Graph (Auto)', icon: Network },
    { id: 'mindmap', label: 'Mind Map (Manual)', icon: GitMerge },
];
