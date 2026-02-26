const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
const target = workflows.find(w => w.id === '3lfzGD6iW44gH7-b6lx5Q');
if (target) {
    console.log(JSON.stringify(target, null, 2));
} else {
    console.log('Target not found');
}
