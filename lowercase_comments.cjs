const fs = require('fs');
const path = require('path');

const files = [
  'packages/core/src/lib/api-client.ts',
  'packages/core/src/lib/secure-logger.ts',
  'packages/core/src/lib/gamification.ts',
  'packages/core/src/hooks/use-socket.ts',
  'packages/core/src/hooks/use-journal-data.ts',
  'packages/core/src/hooks/use-collection-data.ts',
  'apps/web/src/lib/activity-sync.ts'
];

function lowercaseComments(content) {
  // regex for single line comments
  content = content.replace(/\/\/.*$/gm, (match) => match.toLowerCase());

  // regex for multi-line comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, (match) => match.toLowerCase());

  return content;
}

files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lowerContent = lowercaseComments(content);
    fs.writeFileSync(file, lowerContent);
    console.log('processed ' + file);
  } else {
    console.log('file not found ' + file);
  }
});
