// gamification api routes
// add to packages/backend/server.js after activity logger routes

// award xp and update user stats
app.post('/api/gamification/award-xp', requireAuth, async (req, res) => {
  const { user_id, amount, source, source_id, description } = req.body;
  
  if (!user_id || !amount) {
    return res.status(400).json({ error: 'user_id and amount required' });
  }

  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    // record xp transaction
    await client.post('/xp_transactions:create', {
      user_id,
      amount,
      source: source || 'manual',
      source_id: source_id || null,
      timestamp: new Date().toISOString(),
      description: description || ''
    });

    // get or create user stats
    const statsRes = await client.get(`/user_stats:list?filter[user_id]=${user_id}`);
    let stats = statsRes.data?.data?.[0];

    if (!stats) {
      const createRes = await client.post('/user_stats:create', {
        user_id,
        total_xp: amount,
        level: 1,
        activities_logged: 0,
        total_streaks: 0,
        unlocked_themes: [],
        unlocked_colors: [],
        last_updated: new Date().toISOString()
      });
      stats = createRes.data?.data;
    } else {
      const newXp = stats.total_xp + amount;
      const newLevel = calculateLevelFromXp(newXp);
      
      await client.post(`/user_stats:update?filterByTk=${stats.id}`, {
        total_xp: newXp,
        level: newLevel,
        last_updated: new Date().toISOString()
      });
      
      stats.total_xp = newXp;
      stats.level = newLevel;
    }

    res.json({ 
      success: true, 
      new_xp: stats.total_xp, 
      level: stats.level,
      level_up: false // todo: detect level changes
    });
  } catch (err) {
    console.error('[Gamification] award xp error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to award xp' });
  }
});

// get user stats
app.get('/api/gamification/stats/:user_id', requireAuth, async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: { 'Authorization': req.headers.authorization }
    });

    const statsRes = await client.get(`/user_stats:list?filter[user_id]=${user_id}`);
    const stats = statsRes.data?.data?.[0];

    if (!stats) {
      return res.json({ 
        total_xp: 0, 
        level: 1, 
        activities_logged: 0,
        unlocked_themes: [],
        unlocked_colors: []
      });
    }

    res.json(stats);
  } catch (err) {
    console.error('[Gamification] get stats error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch stats' });
  }
});

// unlock achievement
app.post('/api/gamification/unlock-achievement', requireAuth, async (req, res) => {
  const { user_id, achievement_id, achievement_name, xp_reward } = req.body;
  
  if (!user_id || !achievement_id) {
    return res.status(400).json({ error: 'user_id and achievement_id required' });
  }

  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    // check if already unlocked
    const existingRes = await client.get(
      `/achievements:list?filter[user_id]=${user_id}&filter[achievement_id]=${achievement_id}`
    );
    
    if (existingRes.data?.data?.length > 0) {
      return res.json({ already_unlocked: true });
    }

    // create achievement record
    await client.post('/achievements:create', {
      user_id,
      achievement_id,
      achievement_name: achievement_name || achievement_id,
      unlocked_at: new Date().toISOString(),
      xp_reward: xp_reward || 0
    });

    // award xp if specified
    if (xp_reward > 0) {
      await client.post('/xp_transactions:create', {
        user_id,
        amount: xp_reward,
        source: 'achievement',
        source_id: null,
        timestamp: new Date().toISOString(),
        description: `achievement: ${achievement_name || achievement_id}`
      });

      // update user stats
      const statsRes = await client.get(`/user_stats:list?filter[user_id]=${user_id}`);
      const stats = statsRes.data?.data?.[0];
      if (stats) {
        await client.post(`/user_stats:update?filterByTk=${stats.id}`, {
          total_xp: stats.total_xp + xp_reward,
          last_updated: new Date().toISOString()
        });
      }
    }

    res.json({ unlocked: true, xp_awarded: xp_reward || 0 });
  } catch (err) {
    console.error('[Gamification] unlock achievement error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to unlock achievement' });
  }
});

// helper function
function calculateLevelFromXp(xp) {
  const levels = [
    { level: 1, xp: 0 },
    { level: 2, xp: 100 },
    { level: 3, xp: 250 },
    { level: 4, xp: 500 },
    { level: 5, xp: 1000 },
    { level: 6, xp: 1750 },
    { level: 7, xp: 2500 },
    { level: 8, xp: 3500 },
    { level: 9, xp: 5000 },
    { level: 10, xp: 7500 },
    { level: 11, xp: 10000 },
    { level: 12, xp: 15000 }
  ];
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) return levels[i].level;
  }
  return 1;
}
