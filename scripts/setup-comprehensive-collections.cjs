#!/usr/bin/env node
// comprehensive setup for phases 2-4: gamification, financial hub, mood/energy tracking

const axios = require('axios');

const NOCOBASE_URL = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
const API_KEY = process.env.ADMIN_API_KEY || process.env.NOCOBASE_API_KEY;

if (!API_KEY) {
  console.error('error: ADMIN_API_KEY or NOCOBASE_API_KEY required');
  process.exit(1);
}

const client = axios.create({
  baseURL: NOCOBASE_URL.replace(/\/$/, ''),
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function createCollection(name, fields) {
  try {
    await client.post('/collections:create', { name, fields });
    console.log(`✓ created collection: ${name}`);
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data?.message?.includes('exists')) {
      console.log(`- collection ${name} already exists`);
    } else {
      console.error(`✗ failed to create ${name}:`, err.response?.data || err.message);
    }
  }
}

async function setup() {
  console.log('setting up comprehensive pkm collections...\n');

  // ── gamification ──
  console.log('[gamification]');
  
  await createCollection('user_stats', [
    { name: 'user_id', type: 'string', required: true },
    { name: 'total_xp', type: 'integer', defaultValue: 0 },
    { name: 'level', type: 'integer', defaultValue: 1 },
    { name: 'activities_logged', type: 'integer', defaultValue: 0 },
    { name: 'total_streaks', type: 'integer', defaultValue: 0 },
    { name: 'unlocked_themes', type: 'json' }, // array of theme ids
    { name: 'unlocked_colors', type: 'json' }, // array of color hex codes
    { name: 'last_updated', type: 'date' }
  ]);

  await createCollection('achievements', [
    { name: 'user_id', type: 'string', required: true },
    { name: 'achievement_id', type: 'string', required: true },
    { name: 'achievement_name', type: 'string' },
    { name: 'unlocked_at', type: 'date', required: true },
    { name: 'xp_reward', type: 'integer', defaultValue: 0 }
  ]);

  await createCollection('xp_transactions', [
    { name: 'user_id', type: 'string', required: true },
    { name: 'amount', type: 'integer', required: true },
    { name: 'source', type: 'string' }, // activity_log, achievement, streak_bonus
    { name: 'source_id', type: 'bigInt' },
    { name: 'timestamp', type: 'date', required: true },
    { name: 'description', type: 'text' }
  ]);

  // ── financial hub ──
  console.log('\n[financial hub]');
  
  await createCollection('accounts', [
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'string' }, // checking, savings, credit, cash
    { name: 'current_balance', type: 'float', defaultValue: 0 },
    { name: 'currency', type: 'string', defaultValue: 'USD' },
    { name: 'color', type: 'string' },
    { name: 'icon', type: 'string' }
  ]);

  await createCollection('transactions', [
    { name: 'account_id', type: 'bigInt', required: true },
    { name: 'amount', type: 'float', required: true },
    { name: 'category', type: 'string' },
    { name: 'description', type: 'text' },
    { name: 'date', type: 'string', required: true }, // yyyy-mm-dd
    { name: 'timestamp', type: 'date', required: true },
    { name: 'type', type: 'string' }, // income, expense, transfer
    { name: 'tags', type: 'json' }
  ]);

  await createCollection('budgets', [
    { name: 'category', type: 'string', required: true },
    { name: 'monthly_limit', type: 'float', required: true },
    { name: 'current_spent', type: 'float', defaultValue: 0 },
    { name: 'period_start', type: 'string' }, // yyyy-mm-dd
    { name: 'period_end', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'alert_threshold', type: 'float', defaultValue: 0.8 } // 80%
  ]);

  // ── mood & energy tracking ──
  console.log('\n[mood & energy]');
  
  await createCollection('mood_logs', [
    { name: 'mood', type: 'integer', required: true }, // 1-5 (terrible to amazing)
    { name: 'timestamp', type: 'date', required: true },
    { name: 'date', type: 'string', required: true },
    { name: 'notes', type: 'text' },
    { name: 'context', type: 'json' } // related activities, location, etc
  ]);

  await createCollection('energy_logs', [
    { name: 'physical_energy', type: 'integer', required: true }, // 0-100
    { name: 'mental_energy', type: 'integer', required: true }, // 0-100
    { name: 'timestamp', type: 'date', required: true },
    { name: 'date', type: 'string', required: true },
    { name: 'notes', type: 'text' }
  ]);

  // ── routines ──
  console.log('\n[routines]');
  
  await createCollection('routine_templates', [
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'string' }, // morning, evening, custom
    { name: 'items', type: 'json', required: true }, // array of {id, label, icon}
    { name: 'reset_time', type: 'string' }, // HH:MM
    { name: 'active', type: 'boolean', defaultValue: true }
  ]);

  await createCollection('routine_completions', [
    { name: 'routine_id', type: 'bigInt', required: true },
    { name: 'date', type: 'string', required: true },
    { name: 'completed_items', type: 'json' }, // array of item ids
    { name: 'completion_percentage', type: 'float' },
    { name: 'completed_at', type: 'date' }
  ]);

  console.log('\n✓ comprehensive setup complete');
}

setup().catch(err => {
  console.error('setup failed:', err.message);
  process.exit(1);
});
