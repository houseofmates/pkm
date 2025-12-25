import { ChartWidget } from './chart-widget';

export const WIDGET_TYPES = {
    STAT: 'stat',
    ACTIVITY: 'activity',
    CHART_LINE: 'chart-line',
    CHART_BAR: 'chart-bar',
} as const;

export type WidgetType = typeof WIDGET_TYPES[keyof typeof WIDGET_TYPES];

// ... (WidgetDefinition stays same)

export const COMPONENT_MAP: Record<WidgetType, React.ComponentType<any>> = {
    [WIDGET_TYPES.STAT]: StatWidget,
    [WIDGET_TYPES.ACTIVITY]: RecentActivityWidget,
    [WIDGET_TYPES.CHART_LINE]: (props) => <ChartWidget type="line" {...props} />,
    [WIDGET_TYPES.CHART_BAR]: (props) => <ChartWidget type="bar" {...props} />,
};
