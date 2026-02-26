const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const contextServer = require('./context-server.cjs');

const isDev = !app.isPackaged;
let mainWindow = null;
let currentVersion = null;
let updateCheckInterval = null;

// Fetch version from server to detect updates
async function checkForUpdates() {
    if (!mainWindow || isDev) return;

    const remoteUrl = process.env.PKM_REMOTE_URL || 'http://pkm.houseofmates.space:3010';

    try {
        const response = await fetch(`${remoteUrl}/api/version`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = data.version || data.buildTime || data.hash;

        if (!serverVersion) return;

        // First check - just store the version
        if (!currentVersion) {
            currentVersion = serverVersion;
            console.log(`[Update Check] Initial version: ${currentVersion}`);
            return;
        }

        // Version changed - update available
        if (serverVersion !== currentVersion) {
            console.log(`[Update Check] Update available! ${currentVersion} -> ${serverVersion}`);

            const result = dialog.showMessageBoxSync(mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: 'A new version of PKM is available.',
                detail: 'The app will now reload to get the latest updates.',
                buttons: ['Reload Now', 'Later'],
                defaultId: 0,
                cancelId: 1
            });

            if (result === 0) {
                currentVersion = serverVersion;
                mainWindow.loadURL(remoteUrl);
            }
        }
    } catch (err) {
        // Silent fail - server might be down
        console.log('[Update Check] Could not reach server:', err.message);
    }
}

function startUpdateChecker() {
    if (updateCheckInterval) clearInterval(updateCheckInterval);
    // Check every 30 seconds for updates
    updateCheckInterval = setInterval(checkForUpdates, 30000);
    console.log('[Update Check] Started checking every 30 seconds');
}

function stopUpdateChecker() {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        },
    });

    // open links in external browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    const remoteUrl = process.env.PKM_REMOTE_URL || 'http://pkm.houseofmates.space:3010';

    if (isDev) {
        mainWindow.loadURL('http://localhost:3010');
        mainWindow.webContents.openDevTools();
    } else if (process.env.PKM_REMOTE_URL || !app.isPackaged) {
        // Live update mode: load from remote and check for updates
        mainWindow.loadURL(remoteUrl);
        console.log(`[PKM] Live-update mode: Loading from ${remoteUrl}`);
        console.log(`[PKM] The app will auto-reload when code changes are deployed.`);

        // Start checking for updates after initial load
        mainWindow.webContents.on('did-finish-load', () => {
            // Wait a bit then do first version check
            setTimeout(checkForUpdates, 5000);
            startUpdateChecker();
        });
    } else {
        // Offline mode: load bundled files
        mainWindow.loadFile(path.join(__dirname, '../../web/dist/index.html'));
        console.log('[PKM] Offline mode: Loading bundled files');
    }

    // Add reload menu
    const template = [
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                {
                    label: 'Check for Updates',
                    accelerator: 'CmdOrCtrl+U',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Update Check',
                            message: 'Checking for updates...',
                            buttons: ['OK']
                        });
                        checkForUpdates();
                    }
                },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
        stopUpdateChecker();
    });
}

app.whenReady().then(() => {
    createWindow();

    // start the context api server (serves llm context to renderer)
    contextServer.start();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // ipc listener: receive context updates from renderer and update server state
    ipcMain.on('context:update', (event, data) => {
        contextServer.updateContext(data);
    });

    // Handle update check from renderer
    ipcMain.on('app:check-update', () => {
        checkForUpdates();
    });
});

app.on('window-all-closed', () => {
    // stop server when all windows closed
    contextServer.stop();
    stopUpdateChecker();
    if (process.platform !== 'darwin') app.quit();
});
