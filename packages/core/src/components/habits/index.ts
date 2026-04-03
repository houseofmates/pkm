/**
 * Habits System - Component Index
 * 
 * Export all habit tracking components for easy imports.
 * 
 * Usage:
 *   import { FactBuffer, HabitsDashboard, HabitLoggerWidget } from '@/components/habits';
 */

export { FactBuffer, type FactBufferProps, type ActivityTip, getTipsByCategory, mapActivityToCategory } from './FactBuffer';
export { HabitsDashboard, type HabitMetric, type HabitDashboardProps } from './HabitsDashboard';
export { 
  HabitLoggerWidget, 
  type Habit, 
  type HabitLog, 
  type HabitLoggerWidgetProps,
  DEFAULT_HABITS 
} from './HabitLoggerWidget';
export { HabitsPanel, HabitsInlineWidget, type HabitsPanelProps } from './HabitsPanel';
