import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

let serverProcess = null;
let backendProcess = null;

// Function to start the server
function startServer() {
    if (serverProcess) return;

    console.log('[Auto-Deploy] Starting dev server with HMR...');
    serverProcess = spawn('node', ['./node_modules/.bin/vite', 'dev', '--port', '3010', '--host', '0.0.0.0', '--strictPort'], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        shell: false
    });

    serverProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`[Auto-Deploy] Server exited with code ${code}. Restarting in 5s...`);
            setTimeout(() => {
                serverProcess = null;
                startServer();
            }, 5000);
        } else {
            console.log('[Auto-Deploy] Server stopped.');
            serverProcess = null;
        }
    });

    if (!backendProcess) {
        startBackend();
    }
}

function startBackend() {
    if (backendProcess) return;

    console.log('[Auto-Deploy] Starting backend server...');
    backendProcess = spawn('npm', ['run', 'backend'], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        shell: true
    });

    backendProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`[Auto-Deploy] Backend exited with code ${code}. Restarting in 5s...`);
            setTimeout(() => {
                backendProcess = null;
                startBackend();
            }, 5000);
        } else {
            console.log('[Auto-Deploy] Backend stopped.');
            backendProcess = null;
        }
    });
}

// Initial start
startServer();

// Handle cleanup
process.on('SIGINT', () => {
    if (serverProcess) serverProcess.kill();
    if (backendProcess) backendProcess.kill();
    process.exit();
});
