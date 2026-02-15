const fs = require('fs');
try {
    const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
    console.log('Total workflows:', workflows.length);
    workflows.forEach(w => {
        const s = JSON.stringify(w);
        if (s.includes('minecraft-chat-sync')) {
            console.log(`Found: ${w.id} | ${w.name} | Active: ${w.active}`);
        }
    });
} catch (e) {
    console.error(e);
}
