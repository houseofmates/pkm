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

    // open links in external browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    const remoteUrl = process.env.PKM_REMOTE_URL;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else if (remoteUrl) {
        mainWindow.loadURL(remoteUrl);
        console.log(`Loading remote PKM Hub: ${remoteUrl}`);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
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
});

app.on('window-all-closed', () => {
    // stop server when all windows closed
    contextServer.stop();
    if (process.platform !== 'darwin') app.quit();
});
