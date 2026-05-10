const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
const target = workflows.find(w => w.id === 'BXTuXlAcDmY2XJnk');
if (target) {
    console.log('Shared:', JSON.stringify(target.shared));
} else {
    console.log('Target not found');
}
