
import { RecordTable } from '@/components/record-table';
import { CalendarView } from './calendar-view';
import { KanbanView } from './kanban-view';
import { GalleryView } from './gallery-view';
import { GanttView } from './gantt-view';
import { ChartView } from './chart-view';
import * as React from 'react';

export type ViewType = 'table' | 'calendar' | 'kanban' | 'gallery' | 'gantt' | 'chart';

export interface ViewProps {
    data: any[];
    collection: any;
    loading?: boolean;
    onEdit?: (record: any) => void;
    onDelete?: (record: any) => void;
    onUpdateRecord?: (id: string | number, data: any) => void;
    config?: Record<string, any>;
    onConfigChange?: (key: string, value: any) => void;
}

export const VIEW_REGISTRY: Record<ViewType, React.ComponentType<ViewProps>> = {
    table: RecordTable, // Existing table adapted to interface
    calendar: CalendarView,
    kanban: KanbanView,
    gallery: GalleryView,
    gantt: GanttView,
    chart: ChartView,
};

export const VIEW_OPTIONS: { id: ViewType; label: string; icon?: any }[] = [
    { id: 'table', label: 'Table' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'kanban', label: 'Kanban' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'gantt', label: 'Gantt' },
    { id: 'chart', label: 'Chart' },
];
