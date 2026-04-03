/**
 * NocoBase Collection Schema: High-Granularity Activity Logging System
 * 
 * This file contains the complete collection configuration for the
 * multi-metric habits tracking system with timer support and
 * category-specific feedback.
 * 
 * Colors: background #050505, primary #f5af12, secondary #3c9fdd
 * Typography: Varela Round (all UI text lowercase)
 */

// ============================================================================
// COLLECTION 1: habits (activity definitions)
// ============================================================================

export const HABITS_COLLECTION_SCHEMA = {
  name: 'habits',
  title: 'habits',
  fields: [
    {
      name: 'id',
      type: 'bigInt',
      interface: 'id',
      autoIncrement: true,
      primaryKey: true,
    },
    {
      name: 'createdAt',
      type: 'date',
      interface: 'createdAt',
    },
    {
      name: 'updatedAt',
      type: 'date',
      interface: 'updatedAt',
    },
    {
      name: 'name',
      type: 'string',
      interface: 'input',
      required: true,
      uiSchema: {
        title: 'name',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: 'habit name (e.g., water floss)',
        },
      },
    },
    {
      name: 'emoji',
      type: 'string',
      interface: 'input',
      uiSchema: {
        title: 'emoji',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '🚿',
          maxLength: 2,
        },
      },
    },
    {
      name: 'category',
      type: 'string',
      interface: 'select',
      uiSchema: {
        title: 'category',
        'x-component': 'Select',
        enum: [
          { value: 'dental', label: 'dental' },
          { value: 'mindfulness', label: 'mindfulness' },
          { value: 'movement', label: 'movement' },
          { value: 'hydration', label: 'hydration' },
          { value: 'learning', label: 'learning' },
          { value: 'sleep', label: 'sleep' },
          { value: 'nutrition', label: 'nutrition' },
          { value: 'social', label: 'social' },
          { value: 'medication', label: 'medication' },
          { value: 'creative', label: 'creative' },
          { value: 'hygiene', label: 'hygiene' },
          { value: 'productivity', label: 'productivity' },
          { value: 'health', label: 'health' },
          { value: 'general', label: 'general' },
        ],
      },
    },
    {
      name: 'color',
      type: 'string',
      interface: 'color',
      uiSchema: {
        title: 'accent color',
        'x-component': 'ColorPicker',
        'x-component-props': {
          defaultValue: '#f5af12',
        },
      },
    },
    // multi-metric support flags
    {
      name: 'supports_duration',
      type: 'boolean',
      interface: 'checkbox',
      defaultValue: true,
      uiSchema: {
        title: 'supports timer/duration',
        'x-component': 'Checkbox',
      },
    },
    {
      name: 'supports_intensity',
      type: 'boolean',
      interface: 'checkbox',
      defaultValue: false,
      uiSchema: {
        title: 'supports intensity/volume tracking',
        'x-component': 'Checkbox',
      },
    },
    {
      name: 'supports_volume',
      type: 'boolean',
      interface: 'checkbox',
      defaultValue: false,
      uiSchema: {
        title: 'supports countable metrics',
        'x-component': 'Checkbox',
      },
    },
    {
      name: 'target_duration',
      type: 'integer',
      interface: 'number',
      uiSchema: {
        title: 'target duration (seconds)',
        'x-component': 'InputNumber',
        'x-component-props': {
          placeholder: 'e.g., 120 for 2 minutes',
          min: 0,
          step: 30,
        },
      },
    },
    {
      name: 'unit',
      type: 'string',
      interface: 'input',
      uiSchema: {
        title: 'volume unit',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: 'e.g., reps, pages, oz',
        },
      },
    },
    {
      name: 'description',
      type: 'text',
      interface: 'textarea',
      uiSchema: {
        title: 'description',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 2,
          placeholder: 'optional description',
        },
      },
    },
    {
      name: 'sort',
      type: 'float',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'sort order',
        'x-component': 'InputNumber',
      },
    },
    {
      name: 'active',
      type: 'boolean',
      interface: 'checkbox',
      defaultValue: true,
      uiSchema: {
        title: 'active',
        'x-component': 'Checkbox',
      },
    },
  ],
};

// ============================================================================
// COLLECTION 2: habit_logs (activity instances)
// ============================================================================

export const HABIT_LOGS_COLLECTION_SCHEMA = {
  name: 'habit_logs',
  title: 'habit logs',
  fields: [
    {
      name: 'id',
      type: 'bigInt',
      interface: 'id',
      autoIncrement: true,
      primaryKey: true,
    },
    {
      name: 'createdAt',
      type: 'date',
      interface: 'createdAt',
    },
    {
      name: 'updatedAt',
      type: 'date',
      interface: 'updatedAt',
    },
    // relationship to habits
    {
      name: 'habit_id',
      type: 'bigInt',
      interface: 'integer',
      isForeignKey: true,
      target: 'habits',
      uiSchema: {
        title: 'habit',
        'x-component': 'RemoteSelect',
        'x-component-props': {
          fieldNames: { label: 'name', value: 'id' },
        },
      },
    },
    {
      name: 'habit',
      type: 'belongsTo',
      interface: 'm2o',
      target: 'habits',
      foreignKey: 'habit_id',
    },
    // timestamps
    {
      name: 'timestamp',
      type: 'date',
      interface: 'datetime',
      required: true,
      defaultValue: '{{now}}',
      uiSchema: {
        title: 'timestamp',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      name: 'date',
      type: 'string',
      interface: 'input',
      required: true,
      uiSchema: {
        title: 'date',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: 'YYYY-MM-DD',
        },
      },
    },
    // multi-metric fields
    {
      name: 'duration_seconds',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'duration (seconds)',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 0,
          step: 30,
        },
      },
    },
    {
      name: 'duration_formatted',
      type: 'virtual',
      interface: 'formula',
      options: {
        formula: `CONCAT(
          FLOOR(duration_seconds / 60), 
          'm ', 
          MOD(duration_seconds, 60), 
          's'
        )`,
      },
      uiSchema: {
        title: 'duration',
        'x-component': 'Input',
        'x-read-pretty': true,
      },
    },
    {
      name: 'intensity',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'intensity (0-100)',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 0,
          max: 100,
          step: 5,
        },
      },
    },
    {
      name: 'volume',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'volume/count',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 0,
        },
      },
    },
    // meta-commentary
    {
      name: 'notes',
      type: 'text',
      interface: 'textarea',
      uiSchema: {
        title: 'session notes',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 3,
          placeholder: 'quick notes about this session...',
        },
      },
    },
    // flexible metadata for custom fields
    {
      name: 'metadata',
      type: 'json',
      interface: 'json',
      defaultValue: {},
      uiSchema: {
        title: 'additional data',
        'x-component': 'Input.JSON',
      },
    },
    // computed fields for dashboard
    {
      name: 'xp_earned',
      type: 'virtual',
      interface: 'formula',
      options: {
        formula: `FLOOR(duration_seconds / 60) + 10 + FLOOR(intensity / 10)`,
      },
      uiSchema: {
        title: 'xp earned',
        'x-component': 'InputNumber',
        'x-read-pretty': true,
      },
    },
  ],
};

// ============================================================================
// COLLECTION 3: habit_tips (category-specific facts)
// ============================================================================

export const HABIT_TIPS_COLLECTION_SCHEMA = {
  name: 'habit_tips',
  title: 'habit tips',
  fields: [
    {
      name: 'id',
      type: 'bigInt',
      interface: 'id',
      autoIncrement: true,
      primaryKey: true,
    },
    {
      name: 'createdAt',
      type: 'date',
      interface: 'createdAt',
    },
    {
      name: 'updatedAt',
      type: 'date',
      interface: 'updatedAt',
    },
    {
      name: 'category',
      type: 'string',
      interface: 'select',
      required: true,
      uiSchema: {
        title: 'category',
        'x-component': 'Select',
        enum: [
          { value: 'dental', label: 'dental' },
          { value: 'mindfulness', label: 'mindfulness' },
          { value: 'movement', label: 'movement' },
          { value: 'hydration', label: 'hydration' },
          { value: 'learning', label: 'learning' },
          { value: 'sleep', label: 'sleep' },
          { value: 'nutrition', label: 'nutrition' },
          { value: 'social', label: 'social' },
          { value: 'medication', label: 'medication' },
          { value: 'creative', label: 'creative' },
          { value: 'hygiene', label: 'hygiene' },
          { value: 'productivity', label: 'productivity' },
          { value: 'health', label: 'health' },
        ],
      },
    },
    {
      name: 'text',
      type: 'text',
      interface: 'textarea',
      required: true,
      uiSchema: {
        title: 'tip text',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 2,
          placeholder: 'e.g., water flossing removes 99.9% of plaque',
        },
      },
    },
    {
      name: 'emoji',
      type: 'string',
      interface: 'input',
      uiSchema: {
        title: 'emoji',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '🦷',
          maxLength: 2,
        },
      },
    },
    {
      name: 'source',
      type: 'string',
      interface: 'input',
      uiSchema: {
        title: 'source (optional)',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: 'research paper, article, etc.',
        },
      },
    },
    {
      name: 'active',
      type: 'boolean',
      interface: 'checkbox',
      defaultValue: true,
      uiSchema: {
        title: 'active',
        'x-component': 'Checkbox',
      },
    },
    {
      name: 'sort',
      type: 'float',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'sort order',
        'x-component': 'InputNumber',
      },
    },
  ],
};

// ============================================================================
// COLLECTION 4: habit_streaks (aggregated streak data)
// ============================================================================

export const HABIT_STREAKS_COLLECTION_SCHEMA = {
  name: 'habit_streaks',
  title: 'habit streaks',
  fields: [
    {
      name: 'id',
      type: 'bigInt',
      interface: 'id',
      autoIncrement: true,
      primaryKey: true,
    },
    {
      name: 'createdAt',
      type: 'date',
      interface: 'createdAt',
    },
    {
      name: 'updatedAt',
      type: 'date',
      interface: 'updatedAt',
    },
    {
      name: 'habit_id',
      type: 'bigInt',
      interface: 'integer',
      isForeignKey: true,
      target: 'habits',
    },
    {
      name: 'habit',
      type: 'belongsTo',
      interface: 'm2o',
      target: 'habits',
      foreignKey: 'habit_id',
    },
    {
      name: 'current_streak',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'current streak (days)',
        'x-component': 'InputNumber',
      },
    },
    {
      name: 'longest_streak',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'longest streak (days)',
        'x-component': 'InputNumber',
      },
    },
    {
      name: 'last_logged_date',
      type: 'string',
      interface: 'input',
      uiSchema: {
        title: 'last logged',
        'x-component': 'Input',
      },
    },
    {
      name: 'total_sessions',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'total sessions',
        'x-component': 'InputNumber',
      },
    },
    {
      name: 'total_duration',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'total duration (seconds)',
        'x-component': 'InputNumber',
      },
    },
    {
      name: 'level',
      type: 'integer',
      interface: 'number',
      defaultValue: 1,
      uiSchema: {
        title: 'current level',
        'x-component': 'InputNumber',
      },
    },
    {
      name: 'total_xp',
      type: 'integer',
      interface: 'number',
      defaultValue: 0,
      uiSchema: {
        title: 'total xp',
        'x-component': 'InputNumber',
      },
    },
  ],
};

// ============================================================================
// NOCOBASE SETUP INSTRUCTIONS
// ============================================================================

export const NOCOBASE_SETUP_INSTRUCTIONS = `
# NocoBase Activity Logging Schema Setup

## Step 1: Create Collections

1. Go to NocoBase Admin > Collection Manager
2. Create collection: 'habits' using HABITS_COLLECTION_SCHEMA
3. Create collection: 'habit_logs' using HABIT_LOGS_COLLECTION_SCHEMA
4. Create collection: 'habit_tips' using HABIT_TIPS_COLLECTION_SCHEMA (optional)
5. Create collection: 'habit_streaks' using HABIT_STREAKS_COLLECTION_SCHEMA (optional)

## Step 2: Configure UI

For each collection, configure:
- Table view: show relevant fields
- Form view: organize fields with tabs
- Kanban view (habits): group by category

## Step 3: Seed Default Data

Insert default habits via API or CSV import:

\`\`\`json
[
  {
    "name": "water floss",
    "emoji": "🚿",
    "category": "dental",
    "color": "#3c9fdd",
    "supports_duration": true,
    "target_duration": 120
  },
  {
    "name": "meditate",
    "emoji": "🧘",
    "category": "mindfulness", 
    "color": "#f5af12",
    "supports_duration": true,
    "target_duration": 600
  },
  {
    "name": "exercise",
    "emoji": "💪",
    "category": "movement",
    "color": "#22c55e",
    "supports_duration": true,
    "supports_intensity": true,
    "supports_volume": true,
    "unit": "reps",
    "target_duration": 1800
  }
]
\`\`\`

## Step 4: Workflow (Optional)

Create workflow: "Update Streak on Log"
- Trigger: After Create on habit_logs
- Action: Update habit_streaks.current_streak

## Step 5: API Endpoints

The system uses standard NocoBase REST API:

- POST /api/habit_logs:create - Log activity
- GET /api/habit_logs:list - Fetch logs  
- GET /api/habits:list - Fetch habit definitions
- POST /api/habits:create - Create new habit
`;

// ============================================================================
// EXAMPLE API CALLS
// ============================================================================

export const EXAMPLE_API_CALLS = {
  // Create a habit log with full metrics
  createHabitLog: {
    method: 'POST',
    endpoint: '/api/habit_logs:create',
    body: {
      habit_id: 1,
      habit_name: 'water floss',
      timestamp: '2026-03-25T14:30:00.000Z',
      date: '2026-03-25',
      duration_seconds: 135,
      intensity: 75,
      volume: 0,
      notes: 'focused on back molars today',
      metadata: {
        location: 'bathroom',
        mood: 'focused'
      }
    }
  },
  
  // Query habit stats
  getHabitStats: {
    method: 'GET',
    endpoint: '/api/habit_logs:list',
    params: {
      filter: { habit_id: 1 },
      sort: '-timestamp',
      pageSize: 100
    }
  },
  
  // Get today's logs
  getTodayLogs: {
    method: 'GET',
    endpoint: '/api/habit_logs:list',
    params: {
      filter: { date: '2026-03-25' }
    }
  }
};

// ============================================================================
// TYPE DEFINITIONS FOR FRONTEND
// ============================================================================

export interface HabitRecord {
  id: number;
  name: string;
  emoji: string;
  category: string;
  color: string;
  supports_duration: boolean;
  supports_intensity: boolean;
  supports_volume: boolean;
  target_duration?: number;
  unit?: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLogRecord {
  id: number;
  habit_id: number;
  habit_name: string;
  timestamp: string;
  date: string;
  duration_seconds: number;
  intensity: number;
  volume: number;
  notes: string;
  metadata: Record<string, any>;
  xp_earned: number;
  createdAt: string;
  updatedAt: string;
  habit?: HabitRecord;
}

export interface HabitStreakRecord {
  id: number;
  habit_id: number;
  current_streak: number;
  longest_streak: number;
  last_logged_date: string;
  total_sessions: number;
  total_duration: number;
  level: number;
  total_xp: number;
  habit?: HabitRecord;
}

export interface HabitTipRecord {
  id: number;
  category: string;
  text: string;
  emoji: string;
  source?: string;
  active: boolean;
}

export default {
  HABITS_COLLECTION_SCHEMA,
  HABIT_LOGS_COLLECTION_SCHEMA,
  HABIT_TIPS_COLLECTION_SCHEMA,
  HABIT_STREAKS_COLLECTION_SCHEMA,
  NOCOBASE_SETUP_INSTRUCTIONS,
  EXAMPLE_API_CALLS,
};
