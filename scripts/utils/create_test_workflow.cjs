const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
const apk = workflows.find(w => w.id === '3lfzGD6iW44gH7-b6lx5Q');
if (apk) {
    apk.name = 'Test Webhook Registration';
    apk.nodes[0].parameters.path = 'minecraft-chat-sync';
    apk.nodes[0].webhookId = 'minecraft-chat-sync-uuid';
    fs.writeFileSync('test_apk.json', JSON.stringify(apk, null, 2));
    console.log('Created test_apk.json');
} else {
    console.log('APK not found');
}
