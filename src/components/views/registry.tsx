
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
    collection?: any;
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

export const VIEW_OPTIONS: { id: ViewType; label: string; icon?: any }[] = [
    { id: 'table', label: 'Table' },
    { id: 'list', label: 'List' }, // Prioritizing List near Table
    { id: 'journal', label: 'Journal Stream' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'kanban', label: 'Kanban' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'gantt', label: 'Gantt' },
    { id: 'chart', label: 'Chart' },
    { id: 'network', label: 'Graph (Auto)' },
    { id: 'mindmap', label: 'Mind Map (Manual)' },
];
