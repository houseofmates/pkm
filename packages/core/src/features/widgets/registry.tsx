import { Clock, Webhook, Database, Type, Activity, Scroll, BarChart3, Inbox, PlusCircle, Droplets } from 'lucide-react';

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
    label: 'Clock',
    icon: Clock,
    description: 'A stylized digital clock',
    defaultData: { format: "EEE, MMM d, ''yy", color: '#f6b012' },
    defaultWidth: 300,
    defaultHeight: 150
  },
  biometric: {
    id: 'biometric',
    label: 'Biometric Tracker',
    icon: Activity,
    description: 'Log energy, friction, and focus',
    defaultData: { initialEnergy: 50, initialFriction: 50 },
    defaultWidth: 320,
    defaultHeight: 280
  },
  narrative: {
    id: 'narrative',
    label: 'Narrative Log',
    icon: Scroll,
    description: 'Cinematic captain\'s log',
    defaultData: { cinematic: true },
    defaultWidth: 400,
    defaultHeight: 300
  },
  optimization: {
    id: 'optimization',
    label: 'Optimization Dash',
    icon: BarChart3,
    description: 'Correlate habits with efficiency',
    defaultData: { timeframe: '7d' },
    defaultWidth: 500,
    defaultHeight: 300
  },
  n8n: {
    id: 'n8n',
    label: 'n8n Workflow',
    icon: Webhook,
    description: 'Trigger automation or display status',
    defaultData: { webhookUrl: '', label: 'Run Workflow' },
    defaultWidth: 300,
    defaultHeight: 150
  },
  embed_nocobase: {
    id: 'embed-nocobase',
    label: 'Database View',
    icon: Database,
    description: 'Embed a live NocoBase collection',
    defaultData: { subType: 'nocobase', view: 'gallery', limit: 10 },
    defaultWidth: 600,
    defaultHeight: 400
  },
  text: {
    id: 'smart-text',
    label: 'Text Box',
    icon: Type,
    description: 'Rich text with styling',
    defaultData: { content: 'New text...', backgroundColor: 'transparent', borderColor: 'transparent' },
    defaultWidth: 300,
    defaultHeight: 100
  },
  capture: {
    id: 'capture',
    label: 'Capture',
    icon: Inbox,
    description: 'Quickly log data into captures db',
    defaultData: { title: '', content: '', tags: '' },
    defaultWidth: 350,
    defaultHeight: 450
  },
  create_capture: {
    id: 'create_capture',
    label: 'Create Capture',
    icon: PlusCircle,
    description: 'Button to open capture creation dialog',
    defaultData: {},
    defaultWidth: 280,
    defaultHeight: 200
  },
  hygiene: {
    id: 'hygiene',
    label: 'Hygiene Tracker',
    icon: Droplets,
    description: 'Log showers and self-care rituals',
    defaultData: { lastShower: null, streak: 0 },
    defaultWidth: 320,
    defaultHeight: 360
  }
};
