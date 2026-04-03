const API_BASE = 'http://localhost:13000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc3NDY0NTY5MiwiZXhwIjoxNzc0NzMyMDkyfQ.ktX5jcezmLhxZISaBqqHS_eg45FIIogkW8NQb-EL7n4';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };
  
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      console.error(`Error ${res.status}:`, data);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Network error:', e);
    return null;
  }
}

// Create collection
async function createCollection(name, title) {
  console.log(`Creating collection: ${name}...`);
  return await apiCall('/collections:create', 'POST', {
    name,
    title,
    template: 'general',
    logging: true,
    autoGenId: true,
    createdAt: true,
    updatedAt: true,
    sortable: true
  });
}

// Create field
async function createField(collectionName, fieldConfig) {
  console.log(`  Creating field: ${fieldConfig.name} (${fieldConfig.interface})`);
  return await apiCall('/fields:create', 'POST', {
    collectionName,
    ...fieldConfig
  });
}

// Exercise Collection
async function createExerciseCollection() {
  const collection = await createCollection('exercise', 'exercise');
  if (!collection) return;

  const fields = [
    { name: 'date', interface: 'datetime', type: 'date', uiSchema: { title: 'date', 'x-component': 'DatePicker' } },
    { name: 'timestamp', interface: 'datetime', type: 'date', uiSchema: { title: 'timestamp', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'duration_minutes', interface: 'integer', type: 'integer', uiSchema: { title: 'duration minutes', 'x-component': 'InputNumber', 'x-component-props': { min: 1, max: 300 } } },
    { name: 'workout_type', interface: 'select', type: 'string', uiSchema: { title: 'workout type', 'x-component': 'Select', enum: [{ value: 'strength', label: 'strength' }, { value: 'cardio', label: 'cardio' }, { value: 'hiit', label: 'hiit' }, { value: 'yoga', label: 'yoga' }, { value: 'stretching', label: 'stretching' }, { value: 'sport', label: 'sport' }, { value: 'outdoor', label: 'outdoor' }, { value: 'custom', label: 'custom' }] } },
    { name: 'energy_level', interface: 'integer', type: 'integer', uiSchema: { title: 'energy level', 'x-component': 'InputNumber', 'x-component-props': { min: 1, max: 10 } } },
    { name: 'location', interface: 'input', type: 'string', uiSchema: { title: 'location', 'x-component': 'Input' } },
    { name: 'notes', interface: 'textarea', type: 'text', uiSchema: { title: 'notes', 'x-component': 'Input.TextArea' } },
    { name: 'exercises_json', interface: 'json', type: 'json', uiSchema: { title: 'exercises json', 'x-component': 'Json' } },
    { name: 'total_volume', interface: 'integer', type: 'integer', uiSchema: { title: 'total volume', 'x-component': 'InputNumber' } },
    { name: 'total_calories', interface: 'integer', type: 'integer', uiSchema: { title: 'total calories', 'x-component': 'InputNumber' } },
    { name: 'muscle_groups', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'muscle groups', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'chest', label: 'chest' }, { value: 'back', label: 'back' }, { value: 'shoulders', label: 'shoulders' }, { value: 'biceps', label: 'biceps' }, { value: 'triceps', label: 'triceps' }, { value: 'legs', label: 'legs' }, { value: 'glutes', label: 'glutes' }, { value: 'core', label: 'core' }, { value: 'calves', label: 'calves' }, { value: 'forearms', label: 'forearms' }, { value: 'full_body', label: 'full body' }, { value: 'cardio', label: 'cardio' }] } },
    { name: 'equipment_used', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'equipment used', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'none', label: 'none' }, { value: 'dumbbells', label: 'dumbbells' }, { value: 'barbell', label: 'barbell' }, { value: 'kettlebell', label: 'kettlebell' }, { value: 'machines', label: 'machines' }, { value: 'cables', label: 'cables' }, { value: 'bodyweight', label: 'bodyweight' }, { value: 'resistance_bands', label: 'resistance bands' }, { value: 'medicine_ball', label: 'medicine ball' }] } },
    { name: 'is_template', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'is template', 'x-component': 'Checkbox' } },
    { name: 'template_name', interface: 'input', type: 'string', uiSchema: { title: 'template name', 'x-component': 'Input' } },
    { name: 'completed', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'completed', 'x-component': 'Checkbox' } },
    { name: 'rpe', interface: 'integer', type: 'integer', uiSchema: { title: 'rpe', 'x-component': 'InputNumber', 'x-component-props': { min: 1, max: 10 } } },
    { name: 'heart_rate_avg', interface: 'integer', type: 'integer', uiSchema: { title: 'heart rate avg', 'x-component': 'InputNumber' } },
    { name: 'heart_rate_max', interface: 'integer', type: 'integer', uiSchema: { title: 'heart rate max', 'x-component': 'InputNumber' } },
    { name: 'weather', interface: 'input', type: 'string', uiSchema: { title: 'weather', 'x-component': 'Input' } }
  ];

  for (const field of fields) {
    await createField('exercise', field);
  }
  console.log('Exercise collection created!\n');
}

// Sleep Collection
async function createSleepCollection() {
  const collection = await createCollection('sleep', 'sleep');
  if (!collection) return;

  const fields = [
    { name: 'date', interface: 'datetime', type: 'date', uiSchema: { title: 'date', 'x-component': 'DatePicker' } },
    { name: 'bedtime', interface: 'datetime', type: 'date', uiSchema: { title: 'bedtime', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'wake_time', interface: 'datetime', type: 'date', uiSchema: { title: 'wake time', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'sleep_duration_minutes', interface: 'integer', type: 'integer', uiSchema: { title: 'sleep duration minutes', 'x-component': 'InputNumber' } },
    { name: 'time_to_fall_asleep_minutes', interface: 'integer', type: 'integer', uiSchema: { title: 'time to fall asleep minutes', 'x-component': 'InputNumber' } },
    { name: 'awakenings_count', interface: 'integer', type: 'integer', uiSchema: { title: 'awakenings count', 'x-component': 'InputNumber' } },
    { name: 'awake_duration_minutes', interface: 'integer', type: 'integer', uiSchema: { title: 'awake duration minutes', 'x-component': 'InputNumber' } },
    { name: 'sleep_quality', interface: 'integer', type: 'integer', uiSchema: { title: 'sleep quality', 'x-component': 'InputNumber', 'x-component-props': { min: 1, max: 10 } } },
    { name: 'sleep_efficiency_percent', interface: 'number', type: 'float', uiSchema: { title: 'sleep efficiency percent', 'x-component': 'InputNumber' } },
    { name: 'deep_sleep_percent', interface: 'number', type: 'float', uiSchema: { title: 'deep sleep percent', 'x-component': 'InputNumber' } },
    { name: 'rem_sleep_percent', interface: 'number', type: 'float', uiSchema: { title: 'rem sleep percent', 'x-component': 'InputNumber' } },
    { name: 'light_sleep_percent', interface: 'number', type: 'float', uiSchema: { title: 'light sleep percent', 'x-component': 'InputNumber' } },
    { name: 'sleep_stage_data', interface: 'json', type: 'json', uiSchema: { title: 'sleep stage data', 'x-component': 'Json' } },
    { name: 'sleep_environment', interface: 'json', type: 'json', uiSchema: { title: 'sleep environment', 'x-component': 'Json' } },
    { name: 'bedtime_routine', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'bedtime routine', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'no_screens', label: 'no screens' }, { value: 'meditation', label: 'meditation' }, { value: 'reading', label: 'reading' }, { value: 'shower', label: 'shower' }, { value: 'tea', label: 'tea' }, { value: 'supplements', label: 'supplements' }, { value: 'stretching', label: 'stretching' }] } },
    { name: 'sleep_disruptions', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'sleep disruptions', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'bathroom', label: 'bathroom' }, { value: 'partner', label: 'partner' }, { value: 'noise', label: 'noise' }, { value: 'temperature', label: 'temperature' }, { value: 'stress', label: 'stress' }, { value: 'pain', label: 'pain' }, { value: 'pet', label: 'pet' }, { value: 'alarm', label: 'alarm' }] } },
    { name: 'dreams_recorded', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'dreams recorded', 'x-component': 'Checkbox' } },
    { name: 'dream_notes', interface: 'textarea', type: 'text', uiSchema: { title: 'dream notes', 'x-component': 'Input.TextArea' } },
    { name: 'sleep_aid_used', interface: 'input', type: 'string', uiSchema: { title: 'sleep aid used', 'x-component': 'Input' } },
    { name: 'caffeine_last_consumed', interface: 'datetime', type: 'date', uiSchema: { title: 'caffeine last consumed', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'alcohol_consumed', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'alcohol consumed', 'x-component': 'Checkbox' } },
    { name: 'screen_time_before_bed_minutes', interface: 'integer', type: 'integer', uiSchema: { title: 'screen time before bed minutes', 'x-component': 'InputNumber' } },
    { name: 'stress_level', interface: 'integer', type: 'integer', uiSchema: { title: 'stress level', 'x-component': 'InputNumber', 'x-component-props': { min: 1, max: 10 } } },
    { name: 'mood_on_waking', interface: 'select', type: 'string', uiSchema: { title: 'mood on waking', 'x-component': 'Select', enum: [{ value: 'refreshed', label: 'refreshed' }, { value: 'groggy', label: 'groggy' }, { value: 'tired', label: 'tired' }, { value: 'energized', label: 'energized' }, { value: 'anxious', label: 'anxious' }] } },
    { name: 'snoring_recorded', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'snoring recorded', 'x-component': 'Checkbox' } },
    { name: 'device_synced', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'device synced', 'x-component': 'Checkbox' } },
    { name: 'device_data_source', interface: 'input', type: 'string', uiSchema: { title: 'device data source', 'x-component': 'Input' } }
  ];

  for (const field of fields) {
    await createField('sleep', field);
  }
  console.log('Sleep collection created!\n');
}

// Finances Collection
async function createFinancesCollection() {
  const collection = await createCollection('finances', 'finances');
  if (!collection) return;

  const fields = [
    { name: 'transaction_date', interface: 'datetime', type: 'date', uiSchema: { title: 'transaction date', 'x-component': 'DatePicker' } },
    { name: 'timestamp', interface: 'datetime', type: 'date', uiSchema: { title: 'timestamp', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'transaction_type', interface: 'select', type: 'string', uiSchema: { title: 'transaction type', 'x-component': 'Select', enum: [{ value: 'income', label: 'income' }, { value: 'expense', label: 'expense' }, { value: 'transfer', label: 'transfer' }, { value: 'refund', label: 'refund' }, { value: 'investment', label: 'investment' }] } },
    { name: 'amount', interface: 'number', type: 'float', uiSchema: { title: 'amount', 'x-component': 'InputNumber', 'x-component-props': { precision: 2 } } },
    { name: 'currency', interface: 'input', type: 'string', uiSchema: { title: 'currency', 'x-component': 'Input', default: 'USD' } },
    { name: 'description', interface: 'input', type: 'string', uiSchema: { title: 'description', 'x-component': 'Input' } },
    { name: 'merchant', interface: 'input', type: 'string', uiSchema: { title: 'merchant', 'x-component': 'Input' } },
    { name: 'category', interface: 'select', type: 'string', uiSchema: { title: 'category', 'x-component': 'Select', enum: [{ value: 'housing', label: 'housing' }, { value: 'food', label: 'food' }, { value: 'transportation', label: 'transportation' }, { value: 'utilities', label: 'utilities' }, { value: 'healthcare', label: 'healthcare' }, { value: 'entertainment', label: 'entertainment' }, { value: 'shopping', label: 'shopping' }, { value: 'personal_care', label: 'personal care' }, { value: 'education', label: 'education' }, { value: 'savings', label: 'savings' }, { value: 'investments', label: 'investments' }, { value: 'income', label: 'income' }, { value: 'gifts', label: 'gifts' }, { value: 'travel', label: 'travel' }, { value: 'pets', label: 'pets' }, { value: 'other', label: 'other' }] } },
    { name: 'subcategory', interface: 'input', type: 'string', uiSchema: { title: 'subcategory', 'x-component': 'Input' } },
    { name: 'account', interface: 'select', type: 'string', uiSchema: { title: 'account', 'x-component': 'Select', enum: [{ value: 'checking', label: 'checking' }, { value: 'savings', label: 'savings' }, { value: 'credit_card', label: 'credit card' }, { value: 'investment', label: 'investment' }, { value: 'cash', label: 'cash' }, { value: 'crypto', label: 'crypto' }, { value: 'venmo', label: 'venmo' }, { value: 'paypal', label: 'paypal' }, { value: 'other', label: 'other' }] } },
    { name: 'payment_method', interface: 'select', type: 'string', uiSchema: { title: 'payment method', 'x-component': 'Select', enum: [{ value: 'credit_card', label: 'credit card' }, { value: 'debit_card', label: 'debit card' }, { value: 'cash', label: 'cash' }, { value: 'check', label: 'check' }, { value: 'bank_transfer', label: 'bank transfer' }, { value: 'paypal', label: 'paypal' }, { value: 'venmo', label: 'venmo' }, { value: 'crypto', label: 'crypto' }, { value: 'apple_pay', label: 'apple pay' }, { value: 'google_pay', label: 'google pay' }] } },
    { name: 'is_recurring', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'is recurring', 'x-component': 'Checkbox' } },
    { name: 'recurrence_pattern', interface: 'json', type: 'json', uiSchema: { title: 'recurrence pattern', 'x-component': 'Json' } },
    { name: 'is_planned', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'is planned', 'x-component': 'Checkbox' } },
    { name: 'budget_category', interface: 'input', type: 'string', uiSchema: { title: 'budget category', 'x-component': 'Input' } },
    { name: 'tags', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'tags', 'x-component': 'Select', mode: 'tags' } },
    { name: 'notes', interface: 'textarea', type: 'text', uiSchema: { title: 'notes', 'x-component': 'Input.TextArea' } },
    { name: 'tax_deductible', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'tax deductible', 'x-component': 'Checkbox' } },
    { name: 'tax_category', interface: 'input', type: 'string', uiSchema: { title: 'tax category', 'x-component': 'Input' } },
    { name: 'split_transaction', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'split transaction', 'x-component': 'Checkbox' } },
    { name: 'split_details', interface: 'json', type: 'json', uiSchema: { title: 'split details', 'x-component': 'Json' } },
    { name: 'linked_transaction_id', interface: 'input', type: 'string', uiSchema: { title: 'linked transaction id', 'x-component': 'Input' } },
    { name: 'is_pending', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'is pending', 'x-component': 'Checkbox' } },
    { name: 'cleared_date', interface: 'datetime', type: 'date', uiSchema: { title: 'cleared date', 'x-component': 'DatePicker' } },
    { name: 'running_balance', interface: 'number', type: 'float', uiSchema: { title: 'running balance', 'x-component': 'InputNumber' } },
    { name: 'import_source', interface: 'input', type: 'string', uiSchema: { title: 'import source', 'x-component': 'Input' } }
  ];

  for (const field of fields) {
    await createField('finances', field);
  }
  console.log('Finances collection created!\n');
}

// Habits Collection
async function createHabitsCollection() {
  const collection = await createCollection('habits', 'habits');
  if (!collection) return;

  const fields = [
    { name: 'habit_type', interface: 'select', type: 'string', uiSchema: { title: 'habit type', 'x-component': 'Select', enum: [{ value: 'habit', label: 'habit' }, { value: 'task', label: 'task' }, { value: 'goal_milestone', label: 'goal milestone' }] } },
    { name: 'name', interface: 'input', type: 'string', uiSchema: { title: 'name', 'x-component': 'Input' } },
    { name: 'description', interface: 'textarea', type: 'text', uiSchema: { title: 'description', 'x-component': 'Input.TextArea' } },
    { name: 'category', interface: 'select', type: 'string', uiSchema: { title: 'category', 'x-component': 'Select', enum: [{ value: 'health', label: 'health' }, { value: 'productivity', label: 'productivity' }, { value: 'learning', label: 'learning' }, { value: 'social', label: 'social' }, { value: 'creativity', label: 'creativity' }, { value: 'finance', label: 'finance' }, { value: 'household', label: 'household' }, { value: 'mindfulness', label: 'mindfulness' }, { value: 'fitness', label: 'fitness' }, { value: 'hygiene', label: 'hygiene' }] } },
    { name: 'frequency_type', interface: 'select', type: 'string', uiSchema: { title: 'frequency type', 'x-component': 'Select', enum: [{ value: 'daily', label: 'daily' }, { value: 'weekly', label: 'weekly' }, { value: 'weekdays_only', label: 'weekdays only' }, { value: 'weekends_only', label: 'weekends only' }, { value: 'every_x_days', label: 'every x days' }, { value: 'specific_days', label: 'specific days' }] } },
    { name: 'frequency_config', interface: 'json', type: 'json', uiSchema: { title: 'frequency config', 'x-component': 'Json' } },
    { name: 'target_count_per_period', interface: 'integer', type: 'integer', uiSchema: { title: 'target count per period', 'x-component': 'InputNumber' } },
    { name: 'time_of_day', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'time of day', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'morning', label: 'morning' }, { value: 'afternoon', label: 'afternoon' }, { value: 'evening', label: 'evening' }, { value: 'night', label: 'night' }, { value: 'anytime', label: 'anytime' }] } },
    { name: 'estimated_duration_minutes', interface: 'integer', type: 'integer', uiSchema: { title: 'estimated duration minutes', 'x-component': 'InputNumber' } },
    { name: 'color', interface: 'color', type: 'string', uiSchema: { title: 'color', 'x-component': 'ColorPicker' } },
    { name: 'icon', interface: 'input', type: 'string', uiSchema: { title: 'icon', 'x-component': 'Input' } },
    { name: 'priority', interface: 'select', type: 'string', uiSchema: { title: 'priority', 'x-component': 'Select', enum: [{ value: 'low', label: 'low' }, { value: 'medium', label: 'medium' }, { value: 'high', label: 'high' }, { value: 'critical', label: 'critical' }] } },
    { name: 'is_active', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'is active', 'x-component': 'Checkbox' } },
    { name: 'archived_at', interface: 'datetime', type: 'date', uiSchema: { title: 'archived at', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'start_date', interface: 'datetime', type: 'date', uiSchema: { title: 'start date', 'x-component': 'DatePicker' } },
    { name: 'end_date', interface: 'datetime', type: 'date', uiSchema: { title: 'end date', 'x-component': 'DatePicker' } },
    { name: 'reminder_enabled', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'reminder enabled', 'x-component': 'Checkbox' } },
    { name: 'reminder_time', interface: 'time', type: 'string', uiSchema: { title: 'reminder time', 'x-component': 'TimePicker' } },
    { name: 'reminder_days', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'reminder days', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'mon', label: 'mon' }, { value: 'tue', label: 'tue' }, { value: 'wed', label: 'wed' }, { value: 'thu', label: 'thu' }, { value: 'fri', label: 'fri' }, { value: 'sat', label: 'sat' }, { value: 'sun', label: 'sun' }] } },
    { name: 'current_streak', interface: 'integer', type: 'integer', uiSchema: { title: 'current streak', 'x-component': 'InputNumber', default: 0 } },
    { name: 'longest_streak', interface: 'integer', type: 'integer', uiSchema: { title: 'longest streak', 'x-component': 'InputNumber', default: 0 } },
    { name: 'total_completions', interface: 'integer', type: 'integer', uiSchema: { title: 'total completions', 'x-component': 'InputNumber', default: 0 } },
    { name: 'completion_rate_percent', interface: 'number', type: 'float', uiSchema: { title: 'completion rate percent', 'x-component': 'InputNumber' } },
    { name: 'last_completed_at', interface: 'datetime', type: 'date', uiSchema: { title: 'last completed at', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'streak_history', interface: 'json', type: 'json', uiSchema: { title: 'streak history', 'x-component': 'Json' } },
    { name: 'linked_goal', interface: 'input', type: 'string', uiSchema: { title: 'linked goal', 'x-component': 'Input' } },
    { name: 'linked_media', interface: 'input', type: 'string', uiSchema: { title: 'linked media', 'x-component': 'Input' } },
    { name: 'success_criteria', interface: 'textarea', type: 'text', uiSchema: { title: 'success criteria', 'x-component': 'Input.TextArea' } },
    { name: 'failure_criteria', interface: 'textarea', type: 'text', uiSchema: { title: 'failure criteria', 'x-component': 'Input.TextArea' } },
    { name: 'reward_description', interface: 'textarea', type: 'text', uiSchema: { title: 'reward description', 'x-component': 'Input.TextArea' } },
    { name: 'punishment_description', interface: 'textarea', type: 'text', uiSchema: { title: 'punishment description', 'x-component': 'Input.TextArea' } },
    { name: 'is_public', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'is public', 'x-component': 'Checkbox' } }
  ];

  for (const field of fields) {
    await createField('habits', field);
  }
  console.log('Habits collection created!\n');
}

// Media Collection
async function createMediaCollection() {
  const collection = await createCollection('media', 'media');
  if (!collection) return;

  const fields = [
    { name: 'media_type', interface: 'select', type: 'string', uiSchema: { title: 'media type', 'x-component': 'Select', enum: [{ value: 'book', label: 'book' }, { value: 'movie', label: 'movie' }, { value: 'tv_show', label: 'tv show' }, { value: 'documentary', label: 'documentary' }, { value: 'podcast', label: 'podcast' }, { value: 'music_album', label: 'music album' }, { value: 'video_game', label: 'video game' }, { value: 'article', label: 'article' }, { value: 'comic_manga', label: 'comic/manga' }, { value: 'audiobook', label: 'audiobook' }, { value: 'youtube_video', label: 'youtube video' }, { value: 'course', label: 'course' }, { value: 'live_event', label: 'live event' }] } },
    { name: 'title', interface: 'input', type: 'string', uiSchema: { title: 'title', 'x-component': 'Input' } },
    { name: 'creator', interface: 'input', type: 'string', uiSchema: { title: 'creator', 'x-component': 'Input' } },
    { name: 'series', interface: 'input', type: 'string', uiSchema: { title: 'series', 'x-component': 'Input' } },
    { name: 'series_number', interface: 'number', type: 'float', uiSchema: { title: 'series number', 'x-component': 'InputNumber' } },
    { name: 'release_year', interface: 'integer', type: 'integer', uiSchema: { title: 'release year', 'x-component': 'InputNumber' } },
    { name: 'genre', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'genre', 'x-component': 'Select', mode: 'tags' } },
    { name: 'tags', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'tags', 'x-component': 'Select', mode: 'tags' } },
    { name: 'format', interface: 'select', type: 'string', uiSchema: { title: 'format', 'x-component': 'Select', enum: [{ value: 'physical', label: 'physical' }, { value: 'digital', label: 'digital' }, { value: 'streaming', label: 'streaming' }, { value: 'live', label: 'live' }] } },
    { name: 'platform', interface: 'input', type: 'string', uiSchema: { title: 'platform', 'x-component': 'Input' } },
    { name: 'language', interface: 'input', type: 'string', uiSchema: { title: 'language', 'x-component': 'Input', default: 'en' } },
    { name: 'length', interface: 'json', type: 'json', uiSchema: { title: 'length', 'x-component': 'Json' } },
    { name: 'cover_image_url', interface: 'url', type: 'string', uiSchema: { title: 'cover image url', 'x-component': 'Input.URL' } },
    { name: 'external_id', interface: 'json', type: 'json', uiSchema: { title: 'external id', 'x-component': 'Json' } },
    { name: 'status', interface: 'select', type: 'string', uiSchema: { title: 'status', 'x-component': 'Select', enum: [{ value: 'wishlist', label: 'wishlist' }, { value: 'backlog', label: 'backlog' }, { value: 'in_progress', label: 'in progress' }, { value: 'paused', label: 'paused' }, { value: 'completed', label: 'completed' }, { value: 'abandoned', label: 'abandoned' }, { value: 'rewatching', label: 'rewatching' }, { value: 'rereading', label: 'rereading' }] } },
    { name: 'priority', interface: 'integer', type: 'integer', uiSchema: { title: 'priority', 'x-component': 'InputNumber', 'x-component-props': { min: 1, max: 10 } } },
    { name: 'started_at', interface: 'datetime', type: 'date', uiSchema: { title: 'started at', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'completed_at', interface: 'datetime', type: 'date', uiSchema: { title: 'completed at', 'x-component': 'DatePicker', 'x-component-props': { showTime: true } } },
    { name: 'completion_percent', interface: 'number', type: 'float', uiSchema: { title: 'completion percent', 'x-component': 'InputNumber', 'x-component-props': { min: 0, max: 100 } } },
    { name: 'current_position', interface: 'json', type: 'json', uiSchema: { title: 'current position', 'x-component': 'Json' } },
    { name: 'rating', interface: 'integer', type: 'integer', uiSchema: { title: 'rating', 'x-component': 'InputNumber', 'x-component-props': { min: 1, max: 10 } } },
    { name: 'would_recommend', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'would recommend', 'x-component': 'Checkbox' } },
    { name: 'review_text', interface: 'textarea', type: 'text', uiSchema: { title: 'review text', 'x-component': 'Input.TextArea' } },
    { name: 'review_public', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'review public', 'x-component': 'Checkbox' } },
    { name: 'key_takeaways', interface: 'json', type: 'json', uiSchema: { title: 'key takeaways', 'x-component': 'Json' } },
    { name: 'favorite_quotes', interface: 'json', type: 'json', uiSchema: { title: 'favorite quotes', 'x-component': 'Json' } },
    { name: 'mood_while_consuming', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'mood while consuming', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'excited', label: 'excited' }, { value: 'relaxed', label: 'relaxed' }, { value: 'inspired', label: 'inspired' }, { value: 'educational', label: 'educational' }, { value: 'entertained', label: 'entertained' }, { value: 'bored', label: 'bored' }, { value: 'frustrated', label: 'frustrated' }, { value: 'emotional', label: 'emotional' }] } },
    { name: 'consumed_with', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'consumed with', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'alone', label: 'alone' }, { value: 'partner', label: 'partner' }, { value: 'family', label: 'family' }, { value: 'friends', label: 'friends' }, { value: 'public', label: 'public' }] } },
    { name: 'time_of_day_consumed', interface: 'multipleSelect', type: 'array', uiSchema: { title: 'time of day consumed', 'x-component': 'Select', mode: 'multiple', enum: [{ value: 'morning', label: 'morning' }, { value: 'afternoon', label: 'afternoon' }, { value: 'evening', label: 'evening' }, { value: 'night', label: 'night' }] } },
    { name: 'reconsume_count', interface: 'integer', type: 'integer', uiSchema: { title: 'reconsume count', 'x-component': 'InputNumber', default: 0 } },
    { name: 'linked_habit', interface: 'input', type: 'string', uiSchema: { title: 'linked habit', 'x-component': 'Input' } },
    { name: 'source_recommendation', interface: 'input', type: 'string', uiSchema: { title: 'source recommendation', 'x-component': 'Input' } },
    { name: 'cost', interface: 'number', type: 'float', uiSchema: { title: 'cost', 'x-component': 'InputNumber' } },
    { name: 'owned', interface: 'checkbox', type: 'boolean', uiSchema: { title: 'owned', 'x-component': 'Checkbox' } },
    { name: 'lent_to', interface: 'input', type: 'string', uiSchema: { title: 'lent to', 'x-component': 'Input' } },
    { name: 'return_date', interface: 'datetime', type: 'date', uiSchema: { title: 'return date', 'x-component': 'DatePicker' } }
  ];

  for (const field of fields) {
    await createField('media', field);
  }
  console.log('Media collection created!\n');
}

// Main execution
async function main() {
  console.log('Creating NocoBase collections...\n');
  
  await createExerciseCollection();
  await createSleepCollection();
  await createFinancesCollection();
  await createHabitsCollection();
  await createMediaCollection();
  
  console.log('All collections created successfully!');
}

main().catch(console.error);
