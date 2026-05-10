const axios = require('axios');
const fs = require('fs');

async function testPayloads() {
    let token = '';
    try {
        const env = fs.readFileSync('../../.env', 'utf8');
        const match = env.match(/NOCOBASE_ADMIN_TOKEN=(.+)/);
        if (match) token = match[1];
    } catch(e) {}

    if (!token) {
        console.log("No token in .env");
        return;
    }

    const client = axios.create({
        baseURL: 'http://127.0.0.1:8091/api',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const payloads = [
        { name: 'fronter_t1', type: 'string' },
        { name: 'fronter_t2', type: 'string', interface: 'input' },
        { name: 'fronter_t3', type: 'string', interface: 'input', uiSchema: { type: 'string', title: 'Fronter', 'x-component': 'Input' } },
        { name: 'fronter_t4', type: 'hasMany', target: 'headmates' },
        { name: 'fronter_t5', type: 'json' }
    ];

    for (let p of payloads) {
        console.log(`\nTesting payload: ${p.name}`);
        try {
            const res = await client.post('/collections/ai-convos/fields:create', p);
            console.log("SUCCESS");
        } catch (e) {
            console.log("FAILED:", JSON.stringify(e.response?.data, null, 2) || e.message);
        }
    }
}
testPayloads();
