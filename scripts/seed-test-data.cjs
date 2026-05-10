#!/usr/bin/env node
// seed initial data for testing comprehensive features

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

async function seed() {
  console.log('seeding test data...\n');

  try {
    // seed activities
    console.log('[activities]');
    const activities = [
      { name: 'exercise', category: 'health', icon: '💪', color: '#22c55e', loggable: true },
      { name: 'meditation', category: 'wellness', icon: '🧘', color: '#8b5cf6', loggable: true },
      { name: 'reading', category: 'learning', icon: '📚', color: '#3c9fdd', loggable: true },
      { name: 'coding', category: 'work', icon: '💻', color: '#f5af12', loggable: true },
      { name: 'sleep', category: 'health', icon: '😴', color: '#6366f1', loggable: true }
    ];

    for (const activity of activities) {
      try {
        await client.post('/activities:create', activity);
        console.log(`✓ created activity: ${activity.name}`);
      } catch (err) {
        if (err.response?.status === 400) {
          console.log(`- activity ${activity.name} already exists`);
        }
      }
    }

    // seed financial accounts
    console.log('\n[accounts]');
    const accounts = [
      { name: 'checking', type: 'checking', current_balance: 1250.00, currency: 'USD', color: '#22c55e', icon: '💳' },
      { name: 'savings', type: 'savings', current_balance: 5000.00, currency: 'USD', color: '#3c9fdd', icon: '🏦' },
      { name: 'credit card', type: 'credit', current_balance: -450.00, currency: 'USD', color: '#ef4444', icon: '💳' }
    ];

    for (const account of accounts) {
      try {
        await client.post('/accounts:create', account);
        console.log(`✓ created account: ${account.name}`);
      } catch (err) {
        if (err.response?.status === 400) {
          console.log(`- account ${account.name} already exists`);
        }
      }
    }

    // seed budgets
    console.log('\n[budgets]');
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const budgets = [
      { category: 'groceries', monthly_limit: 400, current_spent: 0, period_start: monthStart, period_end: monthEnd, color: '#22c55e' },
      { category: 'entertainment', monthly_limit: 150, current_spent: 0, period_start: monthStart, period_end: monthEnd, color: '#8b5cf6' },
      { category: 'transportation', monthly_limit: 200, current_spent: 0, period_start: monthStart, period_end: monthEnd, color: '#3c9fdd' },
      { category: 'utilities', monthly_limit: 300, current_spent: 0, period_start: monthStart, period_end: monthEnd, color: '#f59e0b' }
    ];

    for (const budget of budgets) {
      try {
        await client.post('/budgets:create', budget);
        console.log(`✓ created budget: ${budget.category}`);
      } catch (err) {
        if (err.response?.status === 400) {
          console.log(`- budget ${budget.category} already exists`);
        }
      }
    }

    // seed routine templates
    console.log('\n[routines]');
    const routines = [
      {
        name: 'morning routine',
        type: 'morning',
        items: [
          { id: 'item_1', label: 'brush teeth', icon: '🦷' },
          { id: 'item_2', label: 'exercise', icon: '💪' },
          { id: 'item_3', label: 'breakfast', icon: '🍳' },
          { id: 'item_4', label: 'plan day', icon: '📝' }
        ],
        reset_time: '06:00',
        active: true
      },
      {
        name: 'evening routine',
        type: 'evening',
        items: [
          { id: 'item_1', label: 'dinner', icon: '🍽️' },
          { id: 'item_2', label: 'journal', icon: '📔' },
          { id: 'item_3', label: 'brush teeth', icon: '🦷' },
          { id: 'item_4', label: 'read', icon: '📚' }
        ],
        reset_time: '18:00',
        active: true
      }
    ];

    for (const routine of routines) {
      try {
        await client.post('/routine_templates:create', routine);
        console.log(`✓ created routine: ${routine.name}`);
      } catch (err) {
        if (err.response?.status === 400) {
          console.log(`- routine ${routine.name} already exists`);
        }
      }
    }

    // seed sample activity logs (last 7 days)
    console.log('\n[sample logs]');
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        await client.post('/activity_logs:create', {
          activity_id: 1,
          activity_name: 'exercise',
          timestamp: date.toISOString(),
          date: dateStr,
          values: { duration: 30 },
          notes: 'morning workout'
        });
        console.log(`✓ logged exercise for ${dateStr}`);
      } catch (err) {
        // ignore duplicates
      }
    }

    console.log('\n✓ seed data complete');
    console.log('\ntest the features:');
    console.log('1. open journal and click dashboard button');
    console.log('2. view activities tab - should see exercise with 7-day streak');
    console.log('3. view financial tab - should see 3 accounts and 4 budgets');
    console.log('4. view routines tab - should see morning and evening routines');
    console.log('5. log a new activity to test xp system');

  } catch (err) {
    console.error('seed failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

seed();
