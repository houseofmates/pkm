const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    isElectron: true,
    syncState: (data) => ipcRenderer.send('sync-state', data),
    updateContext: (data) => ipcRenderer.send('context:update', data)
});
