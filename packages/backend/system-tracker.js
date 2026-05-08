/**
 * system tracker backend api
 * handles all system tracker operations for the pkm:
 * - front tracking with depth
 * - headmate connections/relationships
 * - headmate notes
 * - system events
 * - inner world scenes
 * - image generation via freegen/playwright
 * 
 * follows nocobase best practices for data access
 */

import axios from 'axios';
import { Router } from 'express';
import { spawn } from 'child_process';

const NOCOBASE_URL = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';

// create authenticated nocobase client
function getNocoBaseClient(req) {
  const token = req.headers.authorization;
  return axios.create({
    baseURL: NOCOBASE_URL.replace(/\/$/, ''),
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  });
}

// ── front tracking ──────────────────────────────────────────────────────

const frontRouter = Router();

// get current front state (latest active entry)
frontRouter.get('/current', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const result = await client.get('/front_history:list', {
      params: {
        sort: '-startTime',
        pageSize: 1,
        filter: JSON.stringify({ is_active: true })
      }
    });
    
    const active = result.data?.data?.[0];
    if (!active) {
      return res.json({ active: false, members: [] });
    }
    
    // parse members if they're stored as a string
    let members = active.members;
    if (typeof members === 'string') {
      try { members = JSON.parse(members); } catch { members = []; }
    }
    
    // fetch full headmate details for each fronter
    if (members?.length > 0) {
      const headmateIds = members.map(m => m.id || m);
      const headmatesRes = await client.get('/headmates:list', {
        params: {
          filter: JSON.stringify({ id: { : headmateIds } }),
          pageSize: 100
        }
      });
      active.headmateDetails = headmatesRes.data?.data || [];
    }
    
    res.json({ active: true, front: active });
  } catch (err) {
    console.error('[front/current] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to get current front' });
  }
});

// get front history
frontRouter.get('/history', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { page = 1, pageSize = 50, since, until } = req.query;
    
    const filters = {};
    if (since) filters.startTime = { : since };
    if (until) filters.endTime = { : until };
    
    const result = await client.get('/front_history:list', {
      params: {
        page,
        pageSize,
        sort: '-startTime',
        ...(Object.keys(filters).length > 0 && { filter: JSON.stringify(filters) })
      }
    });
    
    res.json({ data: result.data?.data || [], meta: result.data?.meta });
  } catch (err) {
    console.error('[front/history] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to get front history' });
  }
});

// register a new front state
frontRouter.post('/switch', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { members: memberIds, comment, trigger, location, mood, energyLevel } = req.body;
    
    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'members must be an array of headmate ids' });
    }
    
    const timestamp = new Date().toISOString();
    
    // 1. close previous active front
    try {
      const activeResult = await client.get('/front_history:list', {
        params: {
          filter: JSON.stringify({ is_active: true }),
          pageSize: 1,
          sort: '-startTime'
        }
      });
      
      const active = activeResult.data?.data?.[0];
      if (active) {
        await client.post(, {
          endTime: timestamp,
          is_active: false,
          duration: Math.floor((new Date(timestamp) - new Date(active.startTime)) / 1000)
        });
      }
    } catch (closeErr) {
      console.warn('[front/switch] error closing previous front:', closeErr.message);
    }
    
    // 2. create new front entry with ordered members and depth
    const members = memberIds.map((id, index) => ({
      id,
      role: index === 0 ? 'primary' : 'secondary',
      order: index,
      depth: index + 1
    }));
    
    const newEntry = await client.post('/front_history:create', {
      startTime: timestamp,
      endTime: null,
      members: JSON.stringify(members),
      is_active: true,
      comment: comment || '',
      trigger: trigger || '',
      location: location || '',
      mood: mood || '',
      energy_level: energyLevel || null,
    });
    
    // 3. log system event
    await logSystemEvent(client, {
      event_type: 'front_change',
      description: ,
      headmates: memberIds,
      data: { comment, trigger, location, mood, members },
      timestamp: timestamp,
      source: 'system_tracker_api'
    });
    
    res.json({ success: true, front: newEntry.data?.data });
  } catch (err) {
    console.error('[front/switch] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to switch front' });
  }
});

// ── headmate connections ────────────────────────────────────────────────

const connectionsRouter = Router();

// get all connections
connectionsRouter.get('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const result = await client.get('/headmate_connections:list', {
      params: { pageSize: 500 }
    });
    res.json({ data: result.data?.data || [] });
  } catch (err) {
    console.error('[connections] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to get connections' });
  }
});

// create connection
connectionsRouter.post('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const {
      from_headmate_id,
      to_headmate_id,
      relationship_type,
      strength = 5,
      is_mutual = false,
      notes = '',
      style = {}
    } = req.body;
    
    if (!from_headmate_id || !to_headmate_id) {
      return res.status(400).json({ error: 'from_headmate_id and to_headmate_id required' });
    }
    
    const newConnection = await client.post('/headmate_connections:create', {
      from_headmate: from_headmate_id,
      to_headmate: to_headmate_id,
      relationship_type: relationship_type || 'friendship',
      strength: Math.max(1, Math.min(10, parseInt(strength))),
      is_mutual,
      notes,
      style: JSON.stringify(style),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // if mutual, create reverse connection
    if (is_mutual) {
      await client.post('/headmate_connections:create', {
        from_headmate: to_headmate_id,
        to_headmate: from_headmate_id,
        relationship_type: relationship_type || 'friendship',
        strength: Math.max(1, Math.min(10, parseInt(strength))),
        is_mutual,
        notes,
        style: JSON.stringify(style),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    // log event
    await logSystemEvent(client, {
      event_type: 'connection_change',
      description: ,
      headmates: [from_headmate_id, to_headmate_id],
      data: { relationship_type, strength, is_mutual },
      timestamp: new Date().toISOString(),
      source: 'system_tracker_api'
    });
    
    res.json({ success: true, connection: newConnection.data?.data });
  } catch (err) {
    console.error('[connections/create] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to create connection' });
  }
});

// update connection
connectionsRouter.put('/:id', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    
    if (updates.style && typeof updates.style !== 'string') {
      updates.style = JSON.stringify(updates.style);
    }
    
    const result = await client.post(, updates);
    res.json({ success: true, connection: result.data?.data });
  } catch (err) {
    console.error('[connections/update] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to update connection' });
  }
});

// delete connection
connectionsRouter.delete('/:id', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { id } = req.params;
    await client.post();
    res.json({ success: true });
  } catch (err) {
    console.error('[connections/delete] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to delete connection' });
  }
});

// ── headmate notes ──────────────────────────────────────────────────────

const notesRouter = Router();

notesRouter.get('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { headmate_id, page = 1, pageSize = 50 } = req.query;
    
    const filter = headmate_id ? { headmate_id } : {};
    
    const result = await client.get('/headmate_notes:list', {
      params: {
        page,
        pageSize,
        sort: '-created_at',
        ...(Object.keys(filter).length > 0 && { filter: JSON.stringify(filter) })
      }
    });
    
    res.json({ data: result.data?.data || [], meta: result.data?.meta });
  } catch (err) {
    console.error('[notes] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to get notes' });
  }
});

notesRouter.post('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { headmate_id, title, content, tags = [], visibility = 'private' } = req.body;
    
    if (!headmate_id || !title) {
      return res.status(400).json({ error: 'headmate_id and title required' });
    }
    
    const result = await client.post('/headmate_notes:create', {
      headmate_id,
      title,
      content: content || '',
      tags: JSON.stringify(tags),
      visibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    await logSystemEvent(client, {
      event_type: 'note_added',
      description: ,
      headmates: [headmate_id],
      data: { title, visibility },
      timestamp: new Date().toISOString(),
      source: 'system_tracker_api'
    });
    
    res.json({ success: true, note: result.data?.data });
  } catch (err) {
    console.error('[notes/create] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to create note' });
  }
});

notesRouter.put('/:id', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    
    if (updates.tags && typeof updates.tags !== 'string') {
      updates.tags = JSON.stringify(updates.tags);
    }
    
    const result = await client.post(, updates);
    res.json({ success: true, note: result.data?.data });
  } catch (err) {
    console.error('[notes/update] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to update note' });
  }
});

notesRouter.delete('/:id', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { id } = req.params;
    await client.post();
    res.json({ success: true });
  } catch (err) {
    console.error('[notes/delete] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to delete note' });
  }
});

// ── system events ───────────────────────────────────────────────────────

const eventsRouter = Router();

// get events
async function logSystemEvent(client, eventData) {
  try {
    await client.post('/system_events:create', {
      ...eventData,
      headmates: eventData.headmates ? JSON.stringify(eventData.headmates) : '[]',
      data: eventData.data ? JSON.stringify(eventData.data) : '{}'
    });
  } catch (err) {
    console.error('[system event logging] error:', err.message);
    // don't throw - event logging should not break main operations
  }
}

eventsRouter.get('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { page = 1, pageSize = 50, event_type, since } = req.query;
    
    const filter = {};
    if (event_type) filter.event_type = event_type;
    if (since) filter.timestamp = { : since };
    
    const result = await client.get('/system_events:list', {
      params: {
        page,
        pageSize,
        sort: '-timestamp',
        ...(Object.keys(filter).length > 0 && { filter: JSON.stringify(filter) })
      }
    });
    
    // parse json fields
    const events = (result.data?.data || []).map(ev => ({
      ...ev,
      headmates: safeJsonParse(ev.headmates, []),
      data: safeJsonParse(ev.data, {})
    }));
    
    res.json({ data: events, meta: result.data?.meta });
  } catch (err) {
    console.error('[events] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to get events' });
  }
});

eventsRouter.post('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { event_type, description, headmates = [], data = {}, timestamp, source } = req.body;
    
    const result = await client.post('/system_events:create', {
      event_type: event_type || 'other',
      description,
      headmates: JSON.stringify(headmates),
      data: JSON.stringify(data),
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'api',
      created_at: new Date().toISOString()
    });
    
    res.json({ success: true, event: result.data?.data });
  } catch (err) {
    console.error('[events/create] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to create event' });
  }
});

// ── inner world scenes ───────────────────────────────────────────────────

const scenesRouter = Router();

scenesRouter.get('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const result = await client.get('/inner_world_scenes:list', {
      params: { pageSize: 200, sort: 'name' }
    });
    res.json({ data: result.data?.data || [] });
  } catch (err) {
    console.error('[scenes] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to get scenes' });
  }
});

scenesRouter.post('/', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { name, description, location_type, atmosphere, lighting, soundscape, sensory_details, image_url, image_prompt } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }
    
    const result = await client.post('/inner_world_scenes:create', {
      name,
      description: description || '',
      location_type: location_type || 'other',
      atmosphere: atmosphere || '',
      lighting: lighting || '',
      soundscape: soundscape || '',
      sensory_details: sensory_details || '',
      image_url: image_url || '',
      image_prompt: image_prompt || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    await logSystemEvent(client, {
      event_type: 'scene_created',
      description: ,
      data: { name, location_type, atmosphere },
      timestamp: new Date().toISOString(),
      source: 'system_tracker_api'
    });
    
    res.json({ success: true, scene: result.data?.data });
  } catch (err) {
    console.error('[scenes/create] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to create scene' });
  }
});

scenesRouter.put('/:id', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    
    const result = await client.post(, updates);
    res.json({ success: true, scene: result.data?.data });
  } catch (err) {
    console.error('[scenes/update] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to update scene' });
  }
});

scenesRouter.delete('/:id', async (req, res) => {
  try {
    const client = getNocoBaseClient(req);
    const { id } = req.params;
    await client.post();
    res.json({ success: true });
  } catch (err) {
    console.error('[scenes/delete] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to delete scene' });
  }
});

// ── image generation ─────────────────────────────────────────────────────

const imagesRouter = Router();

async function generateImage(prompt, options = {}) {
  // freegen app / playwright integration
  // freegen produces images based on text prompts
  const freegenUrl = process.env.FREEGEN_URL || 'http://127.0.0.1:7860';
  
  try {
    // call freegen via playwright backend
    const response = await axios.post(, {
      prompt,
      width: options.width || 512,
      height: options.height || 768,
      steps: options.steps || 25,
      guidance: options.guidance || 7.5,
      seed: options.seed || -1,
      negative_prompt: options.negative || 'blurry, low quality, watermark'
    }, {
      timeout: 120000,
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data, 'binary');
  } catch (err) {
    console.error('[image generation] error:', err.message);
    throw err;
  }
}

imagesRouter.post('/generate', async (req, res) => {
  try {
    const { prompt, type = 'portrait', headmate_id, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'prompt required' });
    }
    
    const imageBuffer = await generateImage(prompt, { ...options, type });
    
    // save to storage and get url
    // for now, return base64
    const base64 = imageBuffer.toString('base64');
    
    // log event
    const client = getNocoBaseClient(req);
    await logSystemEvent(client, {
      event_type: 'image_generated',
      description: ,
      headmates: headmate_id ? [headmate_id] : [],
      data: { type, prompt: prompt.substring(0, 200) },
      timestamp: new Date().toISOString(),
      source: 'system_tracker_api'
    });
    
    res.json({ success: true, image_base64: base64, type });
  } catch (err) {
    console.error('[images/generate] error:', err.message);
    res.status(500).json({ error: 'failed to generate image' });
  }
});

// ── utility ─────────────────────────────────────────────────────────────

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ── main router ──────────────────────────────────────────────────────────

const systemTrackerRouter = Router();

systemTrackerRouter.use('/front', frontRouter);
systemTrackerRouter.use('/connections', connectionsRouter);
systemTrackerRouter.use('/notes', notesRouter);
systemTrackerRouter.use('/events', eventsRouter);
systemTrackerRouter.use('/scenes', scenesRouter);
systemTrackerRouter.use('/images', imagesRouter);

// mcp-compatible endpoints
systemTrackerRouter.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      { name: 'get_current_fronters', description: 'get currently fronting headmates with depth info' },
      { name: 'get_front_history', description: 'get historical front records' },
      { name: 'switch_front', description: 'switch to a new set of fronters with depth' },
      { name: 'get_headmate_connections', description: 'get relationship connections between headmates' },
      { name: 'get_headmate_notes', description: 'get notes for a specific headmate' },
      { name: 'add_headmate_note', description: 'add a note to a headmate' },
      { name: 'get_system_events', description: 'get system activity log' },
      { name: 'get_inner_world_scenes', description: 'get inner world locations' },
      { name: 'generate_image', description: 'generate an image using freegen' }
    ]
  });
});

systemTrackerRouter.post('/mcp/:tool', async (req, res) => {
  const client = getNocoBaseClient(req);
  const tool = req.params.tool;
  const params = req.body;
  
  try {
    switch (tool) {
      case 'get_current_fronters': {
        const result = await client.get('/front_history:list', {
          params: { sort: '-startTime', pageSize: 1, filter: JSON.stringify({ is_active: true }) }
        });
        const active = result.data?.data?.[0];
        res.json({ fronters: active?.members || [] });
        break;
      }
      case 'get_front_history': {
        const result = await client.get('/front_history:list', {
          params: { sort: '-startTime', pageSize: params.limit || 50 }
        });
        res.json({ history: result.data?.data || [] });
        break;
      }
      case 'get_headmate_connections': {
        const result = await client.get('/headmate_connections:list', { params: { pageSize: 500 } });
        res.json({ connections: result.data?.data || [] });
        break;
      }
      case 'get_headmate_notes': {
        const result = await client.get('/headmate_notes:list', {
          params: { filter: JSON.stringify({ headmate: params.headmate_id }), pageSize: 50 }
        });
        res.json({ notes: result.data?.data || [] });
        break;
      }
      case 'add_headmate_note': {
        const result = await client.post('/headmate_notes:create', {
          headmate: params.headmate_id,
          title: params.title,
          content: params.content,
          created_at: new Date().toISOString()
        });
        res.json({ note: result.data?.data });
        break;
      }
      case 'get_system_events': {
        const result = await client.get('/system_events:list', {
          params: { sort: '-timestamp', pageSize: params.limit || 50 }
        });
        res.json({ events: result.data?.data || [] });
        break;
      }
      case 'get_inner_world_scenes': {
        const result = await client.get('/inner_world_scenes:list', { params: { pageSize: 200 } });
        res.json({ scenes: result.data?.data || [] });
        break;
      }
      case 'generate_image': {
        const img = await generateImage(params.prompt, params.options || {});
        res.json({ image_base64: img.toString('base64') });
        break;
      }
      default:
        res.status(404).json({ error: 'tool not found' });
    }
  } catch (err) {
    console.error('[mcp] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export { systemTrackerRouter, logSystemEvent };
export default systemTrackerRouter;
