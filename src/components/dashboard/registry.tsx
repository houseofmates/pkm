
import { StatWidget, RecentActivityWidget } from './widgets';
// We will import Chart widgets here later

export const WIDGET_TYPES = {
    STAT: 'stat',
    ACTIVITY: 'activity',
    CHART_LINE: 'chart-line',
} as const;

export type WidgetType = typeof WIDGET_TYPES[keyof typeof WIDGET_TYPES];

export interface WidgetDefinition {
    id: string; // instance id
    type: WidgetType;
    title: string;
    props?: Record<string, any>;
    grid: { x: number, y: number, w: number, h: number };
}

export const COMPONENT_MAP: Record<WidgetType, React.ComponentType<any>> = {
    [WIDGET_TYPES.STAT]: StatWidget,
    [WIDGET_TYPES.ACTIVITY]: RecentActivityWidget,
    [WIDGET_TYPES.CHART_LINE]: () => <div className="p-4 text-center opacity-50">Chart Placeholder</div>,
};
