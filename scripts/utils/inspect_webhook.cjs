const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
const apk = workflows.find(w => w.id === '3lfzGD6iW44gH7-b6lx5Q');
if (apk) {
    const webhook = apk.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    console.log(JSON.stringify(webhook, null, 2));
}
