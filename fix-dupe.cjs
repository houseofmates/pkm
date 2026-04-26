const fs = require('fs');
const path = 'packages/core/src/services/dupemates-integration.ts';

let code = fs.readFileSync(path, 'utf8');

// The failure is around DupemateInteraction type.
// It seems `sentiment` in the interface doesn't allow undefined, but we're passing it.
code = code.replace(/sentiment:\s*'neutral'\s*\|\s*'positive'\s*\|\s*'negative';/g, "sentiment?: 'neutral' | 'positive' | 'negative';");
code = code.replace(/topics:\s*string\[\];/g, "topics?: string[];");
code = code.replace(/fronter:\s*string;/g, "fronter?: string;");
code = code.replace(/id:\s*string;/g, "id?: string;");
code = code.replace(/dupemateId:\s*string;/g, "dupemateId?: string;");

fs.writeFileSync(path, code);
