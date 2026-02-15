const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
const target = workflows.find(w => w.id === 'vjcV7eRabJVglaBlW5FHs');
if (target) {
    console.log(JSON.stringify(target, null, 2));
} else {
    console.log('Target not found');
}
