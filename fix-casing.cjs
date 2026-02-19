const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'fix.log');
const logContent = fs.readFileSync(logPath, 'utf8');

const lines = logContent.split('\n');
const errors = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(.+?):(\d+):(\d+) - error TS(\d+): (.*)$/);
    if (match) {
        errors.push({
            file: match[1],
            line: parseInt(match[2], 10),
            col: parseInt(match[3], 10),
            code: match[4],
            msg: match[5],
            full: line
        });
    }
}

const fileFixes = {};
let totalReplacements = 0;

function addFix(file, searchWord, replacementWord) {
    if (!fileFixes[file]) fileFixes[file] = new Set();
    const key = JSON.stringify({ searchWord, replacementWord });
    fileFixes[file].add(key);
}

// 1. Process "Cannot find name 'X'" errors
errors.forEach(err => {
    const m = err.msg.match(/Cannot find name '([^']+)'/);
    if (m) {
        const ident = m[1];
        if (ident !== ident.toLowerCase()) {
            // The usage is camelCase/PascalCase, meaning the declaration was lowercased.
            // So search for the lowercase version and replace it with the camelCase version.
            addFix(err.file, ident.toLowerCase(), ident);
        }
    }
});

// 2. Also build a dictionary from all source files to find missing camelCase identifiers
const dict = new Map();
const srcDir = path.join(__dirname, 'src');
function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
            const content = fs.readFileSync(full, 'utf8');
            const words = content.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
            for (const w of words) {
                if (w !== w.toLowerCase() && w !== w.toUpperCase()) {
                    dict.set(w.toLowerCase(), w);
                }
            }
        }
    }
}
walk(srcDir);
// Hardcode some known React/DOM types if they are missing
dict.set('react', 'React');
dict.set('usestate', 'useState');
dict.set('useeffect', 'useEffect');
dict.set('usecontext', 'useContext');
dict.set('usecallback', 'useCallback');
dict.set('usememo', 'useMemo');
dict.set('useref', 'useRef');
dict.set('array', 'Array');
dict.set('object', 'Object');
dict.set('string', 'String');
dict.set('number', 'Number');
dict.set('boolean', 'Boolean');
dict.set('date', 'Date');
dict.set('json', 'JSON');
dict.set('math', 'Math');
dict.set('window', 'window');
dict.set('document', 'document');
dict.set('customevent', 'CustomEvent');
dict.set('event', 'Event');

// Map "Cannot find name 'lower'" or "Property 'lower' does not exist" -> replace with DICT camelCase
errors.forEach(err => {
    if (err.msg.includes("Cannot find name '") || err.msg.includes("does not exist on type")) {
        const wordsInLineError = Array.from(lines.slice(Math.max(0, err.line - 1), err.line).join('\n').matchAll(/[a-zA-Z_$][a-zA-Z0-9_$]*/g)).map(m => m[0]);
        for (const w of wordsInLineError) {
            if (w === w.toLowerCase() && dict.has(w)) {
                addFix(err.file, w, dict.get(w));
            }
        }
    }

    // Specific TS errors for common properties
    // e.g., TS2551: Property 'xxx' does not exist... Did you mean 'Xxx'?
    const didYouMean = err.msg.match(/Did you mean '([^']+)'\?/);
    if (didYouMean) {
        const correct = didYouMean[1];
        addFix(err.file, correct.toLowerCase(), correct);
    }
});

for (const file of Object.keys(fileFixes)) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;

    for (const fixStr of fileFixes[file]) {
        const fix = JSON.parse(fixStr);
        // Replace with word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${fix.searchWord}\\b`, 'g');
        content = content.replace(regex, fix.replacementWord);
    }

    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        totalReplacements++;
    }
}

console.log('Fixed', totalReplacements, 'files based on tsc errors.');
