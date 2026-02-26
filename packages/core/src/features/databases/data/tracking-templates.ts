
export interface TrackingTemplate {
  id: string;
  label: string;
  icon: string; // lucide icon name
  description: string;
  fields: {
  name: string;
  title: string;
  interface: string;
  type: string;
  uiSchema?: any;
  }[];
  metadata: {
  color: string;
  }
}

export const TRACKING_TEMPLATES: TrackingTemplate[] = [
  {
  id: 'hobbies',
  label: 'hobbies & projects',
  icon: 'Palette',
  description: 'Track your creative projects, hobbies, and learning goals.',
  metadata: { color: '#ec4899' }, // Pink
  fields: [
  { name: 'status', title: 'status', interface: 'select', type: 'string', uiSchema: { 'x-component': 'Select', enum: [{ label: 'idea', value: 'idea' }, { label: 'in progress', value: 'in_progress' }, { label: 'completed', value: 'completed' }] } },
  { name: 'category', title: 'category', interface: 'select', type: 'string', uiSchema: { 'x-component': 'Select', enum: [{ label: 'art', value: 'art' }, { label: 'code', value: 'code' }, { label: 'writing', value: 'writing' }, { label: 'gaming', value: 'gaming' }] } },
  { name: 'rating', title: 'rating', interface: 'rating', type: 'integer', uiSchema: { 'x-component': 'Rate' } },
  { name: 'link', title: 'related link', interface: 'url', type: 'string', uiSchema: { 'x-component': 'Input' } },
  ]
  },
  {
  id: 'tasks',
  label: 'tasks & chores',
  icon: 'CheckSquare',
  description: 'Manage daily chores, habit tracking, and to-do lists.',
  metadata: { color: '#22c55e' }, // Green
  fields: [
  { name: 'done', title: 'done', interface: 'checkbox', type: 'boolean', uiSchema: { 'x-component': 'Checkbox' } },
  { name: 'due_date', title: 'due date', interface: 'datetime', type: 'date', uiSchema: { 'x-component': 'DatePicker' } },
  { name: 'priority', title: 'priority', interface: 'select', type: 'string', uiSchema: { 'x-component': 'Select', enum: [{ label: 'high', value: 'high' }, { label: 'medium', value: 'medium' }, { label: 'low', value: 'low' }] } },
  { name: 'category', title: 'category', interface: 'select', type: 'string', uiSchema: { 'x-component': 'Select', enum: [{ label: 'hygiene', value: 'hygiene' }, { label: 'chore', value: 'chore' }, { label: 'work', value: 'work' }] } },
  ]
  },
  {
  id: 'finance',
  label: 'financial tracking',
  icon: 'DollarSign',
  description: 'Track expenses, income, and budget.',
  metadata: { color: '#eab308' }, // Yellow
  fields: [
  { name: 'amount', title: 'amount', interface: 'number', type: 'double', uiSchema: { 'x-component': 'InputNumber' } },
  { name: 'type', title: 'type', interface: 'select', type: 'string', uiSchema: { 'x-component': 'Select', enum: [{ label: 'expense', value: 'expense' }, { label: 'income', value: 'income' }] } },
  { name: 'category', title: 'category', interface: 'select', type: 'string', uiSchema: { 'x-component': 'Select', enum: [{ label: 'food', value: 'food' }, { label: 'rent', value: 'rent' }, { label: 'fun', value: 'fun' }, { label: 'utilities', value: 'utilities' }] } },
  { name: 'date', title: 'date', interface: 'datetime', type: 'date', uiSchema: { 'x-component': 'DatePicker' } },
  ]
  },
  {
  id: 'mood',
  label: 'mood & health',
  icon: 'Smile',
  description: 'Log your daily mood and health metrics.',
  metadata: { color: '#8b5cf6' }, // Violet
  fields: [
  { name: 'mood_rating', title: 'mood (1-10)', interface: 'number', type: 'integer', uiSchema: { 'x-component': 'InputNumber', min: 1, max: 10 } },
  { name: 'tags', title: 'tags', interface: 'multipleSelect', type: 'json', uiSchema: { 'x-component': 'Select', 'x-component-props': { mode: 'multiple' }, enum: [{ label: 'happy', value: 'happy' }, { label: 'anxious', value: 'anxious' }, { label: 'tired', value: 'tired' }, { label: 'energetic', value: 'energetic' }] } },
  { name: 'note', title: 'note', interface: 'textarea', type: 'text', uiSchema: { 'x-component': 'Input.TextArea' } },
  ]
  },
  {
  id: 'gifts',
  label: 'gift tracker',
  icon: 'Gift',
  description: 'Track gift ideas and purchases for others.',
  metadata: { color: '#ef4444' }, // Red
  fields: [
  { name: 'recipient', title: 'recipient', interface: 'text', type: 'string', uiSchema: { 'x-component': 'Input' } },
  { name: 'price', title: 'price', interface: 'number', type: 'double', uiSchema: { 'x-component': 'InputNumber' } },
  { name: 'occasion', title: 'occasion', interface: 'text', type: 'string', uiSchema: { 'x-component': 'Input' } },
  { name: 'status', title: 'status', interface: 'select', type: 'string', uiSchema: { 'x-component': 'Select', enum: [{ label: 'idea', value: 'idea' }, { label: 'bought', value: 'bought' }, { label: 'given', value: 'given' }] } },
  ]
  },
  {
  id: 'contacts',
  label: 'contacts (crm)',
  icon: 'Users',
  description: 'Simple CRM for tracking people outside of the main system.',
  metadata: { color: '#3b82f6' }, // Blue
  fields: [
  { name: 'email', title: 'email', interface: 'email', type: 'string', uiSchema: { 'x-component': 'Input' } },
  { name: 'phone', title: 'phone', interface: 'phone', type: 'string', uiSchema: { 'x-component': 'Input' } },
  { name: 'birthday', title: 'birthday', interface: 'datetime', type: 'date', uiSchema: { 'x-component': 'DatePicker' } },
  { name: 'address', title: 'address', interface: 'text', type: 'string', uiSchema: { 'x-component': 'Input.TextArea' } },
  ]
  }
];
