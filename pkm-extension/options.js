// options.js - handles saving/loading extension settings

// Saves options to browser.storage
const saveOptions = async () => {
    const token = document.getElementById('token').value;
    const apiUrl = document.getElementById('apiUrl').value || 'https://db.houseofmates.space/api';
    const ollamaUrl = document.getElementById('ollamaUrl').value || 'http://localhost:11434';

    await browser.storage.sync.set({
        apiToken: token,
        apiBaseUrl: apiUrl,
        ollamaUrl: ollamaUrl
    });

    const status = document.getElementById('status');
    status.style.opacity = 1;
    status.textContent = 'settings saved!';
    setTimeout(() => {
        status.style.opacity = 0;
    }, 1500);
};

// Restores state using the preferences stored in browser.storage
const restoreOptions = async () => {
    const data = await browser.storage.sync.get(['apiToken', 'apiBaseUrl', 'ollamaUrl']);
    document.getElementById('token').value = data.apiToken || '';
    document.getElementById('apiUrl').value = data.apiBaseUrl || 'https://db.houseofmates.space/api';
    document.getElementById('ollamaUrl').value = data.ollamaUrl || 'http://localhost:11434';
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
