import { Clock, Webhook, Database, Type, Activity, Scroll, BarChart3, Inbox, PlusCircle, Droplets, Pill, Cat, Timer, Sun, Moon, Zap, Flame, GitGraph, Anchor } from 'lucide-react';
import type { ComponentType } from 'react';
import { TrackerWidget } from './TrackerWidget';
import { MedicationWidget } from './MedicationWidget';
import { CatCareWidget } from './CatCareWidget';
import { TimerWidget } from './TimerWidget';
import { ContinuityMap } from './ContinuityMap';
import { StatusSummary } from './StatusSummary';
import { DailyReflection } from './DailyReflection';

export interface WidgetDefinition {
  id: string;
  label: string;
  icon: any;
  description: string;
  defaultData: any;
  defaultWidth: number;
  defaultHeight: number;
  component?: ComponentType<any>;
  category?: 'system' | 'tracker' | 'integration' | 'utility';
}

export interface TrackerSchema {
  timestamp: string;
  value: number | string;
  activity_type: string;
  duration?: number;
  notes?: string;
}

export interface NocoBaseCollection {
  name: string;
  title?: string;
  fields: Array<{
    name: string;
    type: string;
    options?: any;
  }>;
}

export interface WidgetDefinition {
  id: string;
  label: string;
  icon: any;
  description: string;
  defaultData: any;
  defaultWidth: number;
  defaultHeight: number;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  clock: {
    id: 'clock',
    label: 'clock',
    icon: Clock,
    description: 'digital time display',
    defaultData: { format: "EEE, MMM d, ''yy", color: '#f6b012' },
    defaultWidth: 200,
    defaultHeight: 100,
    category: 'system'
  },
  biometric: {
    id: 'biometric',
    label: 'biometric monitor',
    icon: Activity,
    description: 'log energy, friction, and focus levels',
    defaultData: { initialEnergy: 50, initialFriction: 50 },
    defaultWidth: 320,
    defaultHeight: 280,
    category: 'tracker'
  },
  narrative: {
    id: 'narrative',
    label: 'activity log',
    icon: Scroll,
    description: 'chronological activity record',
    defaultData: { cinematic: true },
    defaultWidth: 400,
    defaultHeight: 300,
    category: 'utility'
  },
  optimization: {
    id: 'optimization',
    label: 'efficiency analysis',
    icon: BarChart3,
    description: 'correlate habits with output',
    defaultData: { timeframe: '7d' },
    defaultWidth: 500,
    defaultHeight: 300,
    category: 'tracker'
  },
  n8n: {
    id: 'n8n',
    label: 'automation trigger',
    icon: Webhook,
    description: 'trigger external workflows',
    defaultData: { webhookUrl: '', label: 'execute' },
    defaultWidth: 300,
    defaultHeight: 150,
    category: 'integration'
  },
  embed_nocobase: {
    id: 'embed-nocobase',
    label: 'data view',
    icon: Database,
    description: 'embed live collection data',
    defaultData: { subType: 'nocobase', view: 'gallery', limit: 10 },
    defaultWidth: 600,
    defaultHeight: 400,
    category: 'integration'
  },
  text: {
    id: 'smart-text',
    label: 'note',
    icon: Type,
    description: 'rich text container',
    defaultData: { content: '', backgroundColor: 'transparent', borderColor: 'transparent' },
    defaultWidth: 300,
    defaultHeight: 100,
    category: 'utility'
  },
  capture: {
    id: 'capture',
    label: 'quick capture',
    icon: Inbox,
    description: 'rapid data entry',
    defaultData: { title: '', content: '', tags: '' },
    defaultWidth: 350,
    defaultHeight: 450,
    category: 'utility'
  },
  hygiene: {
    id: 'hygiene',
    label: 'hygiene tracker',
    icon: Droplets,
    description: 'log showers and self-care',
    defaultData: {
      lastShower: null,
      streak: 0,
      collectionName: 'hygiene_logs',
      fields: [
        { name: 'mood', label: 'mood', type: 'select', options: ['low', 'okay', 'good', 'great'] },
        { name: 'rating', label: 'session rating', type: 'number' },
        { name: 'notes', label: 'notes', type: 'text' },
      ]
    },
    defaultWidth: 320,
    defaultHeight: 360,
    component: TrackerWidget,
    category: 'tracker'
  },
  medication: {
    id: 'medication',
    label: 'medication tracker',
    icon: Pill,
    description: 'medication schedule and logging',
    defaultData: {
      collectionName: 'medication_logs',
      medications: [
        { id: 'morning', name: 'morning meds', time: '08:00', taken: false },
        { id: 'afternoon', name: 'afternoon meds', time: '14:00', taken: false },
        { id: 'evening', name: 'evening meds', time: '20:00', taken: false },
      ]
    },
    defaultWidth: 320,
    defaultHeight: 280,
    component: MedicationWidget,
    category: 'tracker'
  },
  cat_care: {
    id: 'cat_care',
    label: 'cat care tracker',
    icon: Cat,
    description: 'pet care schedule and logging',
    defaultData: {
      collectionName: 'cat_care_logs',
      tasks: [
        { id: 'feeding', name: 'feeding', frequency: 'daily', lastDone: null },
        { id: 'litter', name: 'litter box', frequency: 'daily', lastDone: null },
        { id: 'play', name: 'play session', frequency: 'daily', lastDone: null },
      ]
    },
    defaultWidth: 300,
    defaultHeight: 320,
    component: CatCareWidget,
    category: 'tracker'
  },
  timer: {
    id: 'timer',
    label: 'activity timer',
    icon: Timer,
    description: 'track duration for any activity',
    defaultData: { activityName: 'activity', targetDuration: 1800 },
    defaultWidth: 280,
    defaultHeight: 200,
    component: TimerWidget,
    category: 'utility'
  },
  continuity_map: {
    id: 'continuity_map',
    label: 'activity density',
    icon: GitGraph,
    description: 'heatmap of daily activity across all databases',
    defaultData: { collectionName: 'activity_logs', months: 6 },
    defaultWidth: 600,
    defaultHeight: 180,
    component: ContinuityMap,
    category: 'tracker'
  },
  status_summary: {
    id: 'status_summary',
    label: 'streak count',
    icon: Flame,
    description: 'unbroken streaks for survival tasks',
    defaultData: {},
    defaultWidth: 320,
    defaultHeight: 220,
    component: StatusSummary,
    category: 'tracker'
  },
  daily_reflection: {
    id: 'daily_reflection',
    label: 'daily anchor',
    icon: Anchor,
    description: 'one sentence to anchor the day',
    defaultData: { mode: 'input', limit: 5 },
    defaultWidth: 350,
    defaultHeight: 280,
    component: DailyReflection,
    category: 'utility'
  }
};

// layout profiles for different times of day
export type LayoutProfile = 'morning' | 'active' | 'rest';

export interface ProfileConfig {
  id: LayoutProfile;
  label: string;
  icon: any;
  description: string;
  defaultWidgets: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    data?: any;
  }>;
}

export const LAYOUT_PROFILES: Record<LayoutProfile, ProfileConfig> = {
  morning: {
    id: 'morning',
    label: 'morning',
    icon: Sun,
    description: 'hygiene and medication priority with daily anchors',
    defaultWidgets: [
      { id: 'hygiene', x: 0, y: 0, w: 4, h: 4 },
      { id: 'medication', x: 4, y: 0, w: 4, h: 3 },
      { id: 'clock', x: 8, y: 0, w: 2, h: 1 },
      { id: 'biometric', x: 8, y: 1, w: 4, h: 3 },
      { id: 'timer', x: 0, y: 4, w: 3, h: 2, data: { activityName: 'shower', targetDuration: 900 } },
      { id: 'daily_reflection', x: 4, y: 3, w: 4, h: 3, data: { mode: 'display', limit: 5 } },
      { id: 'status_summary', x: 8, y: 4, w: 4, h: 2 },
    ]
  },
  active: {
    id: 'active',
    label: 'active',
    icon: Zap,
    description: 'productivity with activity density visualization',
    defaultWidgets: [
      { id: 'clock', x: 0, y: 0, w: 2, h: 1 },
      { id: 'biometric', x: 2, y: 0, w: 4, h: 3 },
      { id: 'n8n', x: 6, y: 0, w: 3, h: 2 },
      { id: 'capture', x: 9, y: 0, w: 3, h: 4 },
      { id: 'optimization', x: 0, y: 1, w: 6, h: 3 },
      { id: 'continuity_map', x: 0, y: 4, w: 8, h: 3, data: { collectionName: 'activity_logs', months: 6 } },
      { id: 'timer', x: 8, y: 4, w: 4, h: 3, data: { activityName: 'focused work', targetDuration: 1800 } },
    ]
  },
  rest: {
    id: 'rest',
    label: 'rest',
    icon: Moon,
    description: 'evening routine with reflection and streak tracking',
    defaultWidgets: [
      { id: 'cat_care', x: 0, y: 0, w: 4, h: 4 },
      { id: 'medication', x: 4, y: 0, w: 4, h: 3 },
      { id: 'clock', x: 8, y: 0, w: 2, h: 1 },
      { id: 'daily_reflection', x: 8, y: 1, w: 4, h: 4, data: { mode: 'input' } },
      { id: 'timer', x: 0, y: 4, w: 3, h: 2, data: { activityName: 'wind down', targetDuration: 600 } },
      { id: 'status_summary', x: 3, y: 4, w: 4, h: 2 },
      { id: 'continuity_map', x: 7, y: 4, w: 5, h: 2, data: { collectionName: 'cat_care_logs', months: 3 } },
    ]
  }
};

// dynamic widget factory - generates tracker widgets from nocobase collections
export function createTrackerWidgetFromCollection(
  collection: NocoBaseCollection
): WidgetDefinition | null {
  const fields = collection.fields || [];
  
  // check if collection matches tracker schema
  const hasTimestamp = fields.some(f => f.name === 'timestamp' || f.name === 'created_at');
  const hasActivityType = fields.some(f => f.name === 'activity_type' || f.name === 'type');
  
  if (!hasTimestamp || !hasActivityType) {
    return null;
  }

  // determine icon based on collection name
  let icon = Activity;
  const name = collection.name.toLowerCase();
  if (name.includes('hygiene') || name.includes('shower')) icon = Droplets;
  else if (name.includes('med') || name.includes('pill')) icon = Pill;
  else if (name.includes('cat') || name.includes('pet')) icon = Cat;
  else if (name.includes('timer') || name.includes('duration')) icon = Timer;

  return {
    id: `tracker_${collection.name}`,
    label: collection.title || collection.name,
    icon,
    description: `auto-generated tracker for ${collection.name}`,
    defaultData: {
      collectionName: collection.name,
      fields: fields.map(f => ({
        name: f.name,
        type: f.type,
        label: f.name.replace(/_/g, ' ')
      }))
    },
    defaultWidth: 320,
    defaultHeight: 280,
    component: TrackerWidget,
    category: 'tracker'
  };
}

// registry manager class for dynamic widget discovery
export class WidgetRegistryManager {
  private static instance: WidgetRegistryManager;
  private dynamicWidgets: Map<string, WidgetDefinition> = new Map();
  private registeredCollections: Set<string> = new Set();

  static getInstance(): WidgetRegistryManager {
    if (!WidgetRegistryManager.instance) {
      WidgetRegistryManager.instance = new WidgetRegistryManager();
    }
    return WidgetRegistryManager.instance;
  }

  registerCollection(collection: NocoBaseCollection): boolean {
    if (this.registeredCollections.has(collection.name)) {
      return false;
    }

    const widget = createTrackerWidgetFromCollection(collection);
    if (widget) {
      this.dynamicWidgets.set(widget.id, widget);
      this.registeredCollections.add(collection.name);
      return true;
    }
    return false;
  }

  unregisterCollection(collectionName: string): void {
    this.dynamicWidgets.delete(`tracker_${collectionName}`);
    this.registeredCollections.delete(collectionName);
  }

  getAllWidgets(): Record<string, WidgetDefinition> {
    return {
      ...WIDGET_REGISTRY,
      ...Object.fromEntries(this.dynamicWidgets)
    };
  }

  getStaticWidgets(): Record<string, WidgetDefinition> {
    return WIDGET_REGISTRY;
  }

  getDynamicWidgets(): Record<string, WidgetDefinition> {
    return Object.fromEntries(this.dynamicWidgets);
  }

  getWidget(id: string): WidgetDefinition | undefined {
    return WIDGET_REGISTRY[id] || this.dynamicWidgets.get(id);
  }

  getWidgetsByCategory(category: WidgetDefinition['category']): WidgetDefinition[] {
    return Object.values(this.getAllWidgets()).filter(w => w.category === category);
  }

  getProfileWidgets(profile: LayoutProfile): Array<{ definition: WidgetDefinition; x: number; y: number; w: number; h: number; data?: any }> {
    const config = LAYOUT_PROFILES[profile];
    const allWidgets = this.getAllWidgets();
    
    return config.defaultWidgets
      .map(item => {
        const definition = allWidgets[item.id];
        if (!definition) return null;
        return {
          definition,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          data: item.data
        };
      })
      .filter(Boolean) as Array<{ definition: WidgetDefinition; x: number; y: number; w: number; h: number; data?: any }>;
  }
}

export const widgetRegistry = WidgetRegistryManager.getInstance();
