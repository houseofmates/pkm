const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const contextServer = require('./context-server.cjs');

const isDev = !app.isPackaged; // or process.env.NODE_ENV === 'development'

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        },
    });

    // Open links in external browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    // Start the Context API Server
    contextServer.start();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // IPC Listener: Receive context updates from Renderer and update Server state
    ipcMain.on('context:update', (event, data) => {
        contextServer.updateContext(data);
    });
});

app.on('window-all-closed', () => {
    // Stop server when all windows closed
    contextServer.stop();
    if (process.platform !== 'darwin') app.quit();
});
