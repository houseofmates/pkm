#!/usr/bin/env node
// setup script for universal activity logger collections

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
  console.log('setting up activity logger collections...\n');

  // activities registry - defines what can be logged
  await createCollection('activities', [
    { name: 'name', type: 'string', required: true },
    { name: 'category', type: 'string' }, // exercise, health, social, etc
    { name: 'icon', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'default_fields', type: 'json' }, // schema for custom fields
    { name: 'loggable', type: 'boolean', defaultValue: true }
  ]);

  // activity_logs - individual log entries
  await createCollection('activity_logs', [
    { name: 'activity_id', type: 'bigInt', required: true },
    { name: 'activity_name', type: 'string' }, // denormalized for quick queries
    { name: 'timestamp', type: 'date', required: true },
    { name: 'date', type: 'string', required: true }, // yyyy-mm-dd for grouping
    { name: 'values', type: 'json' }, // flexible data per activity type
    { name: 'notes', type: 'text' }
  ]);

  // streaks - tracks consecutive days per activity
  await createCollection('streaks', [
    { name: 'activity_id', type: 'bigInt', required: true },
    { name: 'activity_name', type: 'string' },
    { name: 'current_streak', type: 'integer', defaultValue: 0 },
    { name: 'longest_streak', type: 'integer', defaultValue: 0 },
    { name: 'last_log_date', type: 'string' } // yyyy-mm-dd
  ]);

  console.log('\n✓ activity logger setup complete');
}

setup().catch(err => {
  console.error('setup failed:', err.message);
  process.exit(1);
});
