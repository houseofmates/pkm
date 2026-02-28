const axios = require('axios');
const fs = require('fs');

async function testPayloads() {
    // try to read the NOCOBASE_TOKEN from the ecosystem.config.js or .env
    let token = '';
    try {
        const env = fs.readFileSync('../../.env', 'utf8');
        const match = env.match(/NOCOBASE_ADMIN_TOKEN=(.+)/);
        if (match) token = match[1];
    } catch(e) {}

    // if no env token, let's login to nocobase using llm/llm
    if (!token) {
        try {
            const res = await axios.post('http://127.0.0.1:8091/api/users:signin', {
                account: 'llm',
                password: 'llm'
            });
            token = res.data.data.token;
            console.log("Logged in successfully, token acquired.");
        } catch(e) {
            console.log("Login failed:", e.response?.data || e.message);
            return;
        }
    }

    const client = axios.create({
        baseURL: 'http://127.0.0.1:8091/api',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    // Test payloads
    const payloads = [
        { name: 'fronter_test1', type: 'string' },
        { name: 'fronter_test2', type: 'string', interface: 'input' },
        { name: 'fronter_test3', type: 'string', interface: 'input', uiSchema: { type: 'string', title: 'Fronter', 'x-component': 'Input' } }
    ];

    for (let p of payloads) {
        console.log(`\nTesting payload: ${p.name}`);
        try {
            const res = await client.post('/collections/ai-convos/fields:create', p);
            console.log("SUCCESS:", res.data);
            break; // Stop on first success
        } catch (e) {
            console.log("FAILED:", JSON.stringify(e.response?.data, null, 2) || e.message);
        }
    }
}
testPayloads();
