const express = require('express');
const cors = require('cors');
const axios = require('axios');

let app;
let server;
let state = {
    token: null,
    activeFronterId: null,
    apiUrl: 'https://db.houseofmates.space/api'
};

const NOCOBASE_COLLECTIONS = {
    MEMBERS: ['members', 'plural_members', 'headmates'],
    MOODS: ['moods', 'mood_log', 'emotions'],
    ACTIVITIES: ['activities', 'journal', 'entries']
};

function startServer(port = 3030) {
    if (server) return;

    app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/context', async (req, res) => {
        if (!state.token) {
            return res.status(503).json({
                status: 'unavailable',
                message: 'No auth token available. Please login to the main application.',
                timestamp: new Date().toISOString()
            });
        }

        try {
            const context = await buildContext();
            res.json(context);
        } catch (error) {
            console.error('Error building context:', error);
            res.status(500).json({
                status: 'error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    server = app.listen(port, () => {
        console.log(`Context server running on port ${port}`);
    });
}

function updateState(key, value) {
    state[key] = value;
    // console.log(`state updated: ${key} = ${value}`);
}

async function buildContext() {
    const client = axios.create({
        baseURL: state.apiUrl,
        headers: {
            'Authorization': state.token.startsWith('Bearer ') ? state.token : `Bearer ${state.token}`
        }
    });

    // helper to find collection name
    // caching this would be better but for now we fetch list if needed or just try known names
    // to minimize latency, let's assume standard names for now or do a quick check?
    // let's do a quick lookup of collections first to map them.
    // optimization: cache collection mapping?
    // for this mvp, let's just fetch collections first.
    let collections = [];
    try {
        const res = await client.get('/collections:list', { params: { paginate: false } });
        collections = res.data.data || [];
    } catch (e) {
        console.warn("Failed to list collections", e.message);
    }

    const findCollection = (candidates) => {
        return collections.find(c => candidates.includes(c.name) || candidates.includes(c.title?.toLowerCase()))?.name || candidates[0];
    };

    const membersCol = findCollection(NOCOBASE_COLLECTIONS.MEMBERS);
    const moodsCol = findCollection(NOCOBASE_COLLECTIONS.MOODS);
    const activitiesCol = findCollection(NOCOBASE_COLLECTIONS.ACTIVITIES);

    const context = {
        timestamp: new Date().toISOString(),
        identity_context: {
            active_headmate: null,
            is_unknown: true
        },
        affective_context: {
            current_mood: null,
            intensity: null
        },
        activity_context: {
            current_activity: null
        }
    };

    // 1. identity
    if (state.activeFronterId) {
        // fetch specific member
        try {
            // if activefronterid is an id, fetch it.
            // but checking if it's a uuid or just a name?
            // assuming id.
            const res = await client.get(`/${membersCol}/${state.activeFronterId}`);
            const member = res.data.data;
            context.identity_context = {
                active_headmate: member.name,
                pronouns: member.pronouns,
                description: member.description,
                is_unknown: false
            };
        } catch (e) {
            console.warn("Failed to fetch active fronter", e.message);
        }
    } else {
        // try to fetch 'front' or 'active' status from somewhere? 
        // for now, if no local state, it's unknown.
    }

    // 2. affect (mood)
    try {
        const res = await client.get(`/${moodsCol}`, {
            params: {
                pageSize: 1,
                sort: ['-createdAt']
            }
        });
        const mood = res.data.data?.[0];
        if (mood) {
            context.affective_context = {
                current_mood: mood.name || mood.mood || mood.title,
                intensity: mood.intensity || null,
                timestamp: mood.createdAt
            };
        }
    } catch (e) {
        // ignore
    }

    // 3. activity
    try {
        const res = await client.get(`/${activitiesCol}`, {
            params: {
                pageSize: 1,
                sort: ['-createdAt']
            }
        });
        const activity = res.data.data?.[0];
        if (activity) {
            context.activity_context = {
                current_activity: activity.title || activity.name || activity.content,
                timestamp: activity.createdAt
            };
        }
    } catch (e) {
        // ignore
    }

    return context;
}

module.exports = { startServer, updateState };
