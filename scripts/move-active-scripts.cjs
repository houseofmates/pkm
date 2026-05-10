#!/usr/bin/env node
// move-active-scripts.cjs
// Moves active utility/maintenance scripts from root to /scripts/utils and updates references in package.json and .github workflows.

const fs = require('fs');
const path = require('path');

// List of active scripts to move (edit as needed)
const scriptsToMove = [
  'pkm-sync.sh',
  'pkm-control.sh',
  'preflight-check.sh',
  'deploy.sh',
  'build-native.sh',
  'watch-build.sh',
  'watch-pkm.sh',
  'auto-sync.sh',
  'autosync.sh',
  'daily-build.sh',
  'update-api-key.sh',
  'audit_keys.sh',
  'create-apk.sh',
  'setup-env.cjs',
  'check_active.cjs',
  'check_ownership.cjs',
  'generate_icons.cjs',
  'debug-rgl.cjs',
  'debug-draggable.cjs',
  'fix_form_dropdowns_v3.cjs',
  'extract_apk.cjs',
  'extract_pkm.cjs',
  'extract_workflow.cjs',
  'create_test_workflow.cjs',
  'inspect_webhook.cjs',
];

const rootDir = path.resolve(__dirname, '..');
const utilsDir = path.join(rootDir, 'scripts', 'utils');

function moveScript(script) {
  const src = path.join(rootDir, script);
  const dest = path.join(utilsDir, script);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved: ${script} -> scripts/utils/`);
  }
}

// Move scripts
scriptsToMove.forEach(moveScript);

// Update references in package.json
const pkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  let pkg = fs.readFileSync(pkgPath, 'utf8');
  scriptsToMove.forEach(script => {
    const regex = new RegExp(`(["'` + '`' + `\s])${script}(["'` + '`' + `\s])`, 'g');
    pkg = pkg.replace(regex, `$1scripts/utils/${script}$2`);
  });
  fs.writeFileSync(pkgPath, pkg);
  console.log('Updated package.json references.');
}

// Update .github workflows
toUpdateWorkflows();

function toUpdateWorkflows() {
  const workflowsDir = path.join(rootDir, '.github', 'workflows');
  if (!fs.existsSync(workflowsDir)) return;
  fs.readdirSync(workflowsDir).forEach(file => {
    if (!file.endsWith('.yml')) return;
    const wfPath = path.join(workflowsDir, file);
    let wf = fs.readFileSync(wfPath, 'utf8');
    let changed = false;
    scriptsToMove.forEach(script => {
      const regex = new RegExp(`([\s:])${script}([\s\n])`, 'g');
      if (regex.test(wf)) {
        wf = wf.replace(regex, `$1scripts/utils/${script}$2`);
        changed = true;
      }
    });
    if (changed) {
      fs.writeFileSync(wfPath, wf);
      console.log(`Updated references in .github/workflows/${file}`);
    }
  });
}

console.log('Script migration complete. Review /scripts/utils and test your build.');
