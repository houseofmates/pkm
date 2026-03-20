// activity logger api endpoints
// add to packages/backend/server.js

// log activity endpoint
app.post('/api/activities/log', requireAuth, async (req, res) => {
  const { activity_id, activity_name, values, notes } = req.body;
  
  if (!activity_id || !activity_name) {
    return res.status(400).json({ error: 'activity_id and activity_name required' });
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const date = now.toISOString().split('T')[0]; // yyyy-mm-dd

  try {
    // create log entry
    const logPayload = {
      activity_id,
      activity_name,
      timestamp,
      date,
      values: values || {},
      notes: notes || ''
    };

    await axios.post(`${process.env.NOCOBASE_URL}/activity_logs:create`, logPayload, {
      headers: { 'Authorization': req.headers.authorization }
    });

    // update streak
    const streakRes = await axios.get(
      `${process.env.NOCOBASE_URL}/streaks:list?filter[activity_id]=${activity_id}`,
      { headers: { 'Authorization': req.headers.authorization } }
    );

    let streak = streakRes.data?.data?.[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (!streak) {
      // create new streak
      await axios.post(`${process.env.NOCOBASE_URL}/streaks:create`, {
        activity_id,
        activity_name,
        current_streak: 1,
        longest_streak: 1,
        last_log_date: date
      }, { headers: { 'Authorization': req.headers.authorization } });
      
      res.json({ logged: true, streak: 1, new_record: true });
    } else {
      // update existing streak
      let newStreak = streak.current_streak;
      
      if (streak.last_log_date === date) {
        // already logged today, no streak change
        res.json({ logged: true, streak: newStreak, already_logged_today: true });
        return;
      } else if (streak.last_log_date === yesterdayStr) {
        // consecutive day
        newStreak += 1;
      } else {
        // streak broken
        newStreak = 1;
      }

      const longestStreak = Math.max(newStreak, streak.longest_streak);

      await axios.post(
        `${process.env.NOCOBASE_URL}/streaks:update?filterByTk=${streak.id}`,
        {
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_log_date: date
        },
        { headers: { 'Authorization': req.headers.authorization } }
      );

      res.json({ 
        logged: true, 
        streak: newStreak, 
        longest: longestStreak,
        streak_increased: newStreak > streak.current_streak
      });
    }
  } catch (err) {
    console.error('[ActivityLog] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to log activity' });
  }
});

// get streaks for all activities
app.get('/api/activities/streaks', requireAuth, async (req, res) => {
  try {
    const streakRes = await axios.get(`${process.env.NOCOBASE_URL}/streaks:list?pageSize=100`, {
      headers: { 'Authorization': req.headers.authorization }
    });
    res.json(streakRes.data?.data || []);
  } catch (err) {
    console.error('[ActivityStreaks] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch streaks' });
  }
});

// get activity history
app.get('/api/activities/history', requireAuth, async (req, res) => {
  const { activity_id, days = 30 } = req.query;
  
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    let filter = `filter[date][$gte]=${cutoffStr}`;
    if (activity_id) {
      filter += `&filter[activity_id]=${activity_id}`;
    }

    const logsRes = await axios.get(
      `${process.env.NOCOBASE_URL}/activity_logs:list?${filter}&sort=-timestamp&pageSize=500`,
      { headers: { 'Authorization': req.headers.authorization } }
    );

    res.json(logsRes.data?.data || []);
  } catch (err) {
    console.error('[ActivityHistory] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch history' });
  }
});
