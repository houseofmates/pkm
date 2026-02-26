const fs = require('fs');
const workflows = JSON.parse(fs.readFileSync('all_workflows.json', 'utf8'));
let activeCount = 0;
workflows.forEach(w => {
    if (w.active) {
        console.log(`Active: ${w.id} | ${w.name}`);
        activeCount++;
    }
});
console.log('Total Active:', activeCount);
