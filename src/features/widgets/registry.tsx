import { Clock, Webhook, Database, Type } from 'lucide-react';

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
  }
};
