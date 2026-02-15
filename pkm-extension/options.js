// options.js

// Saves options to browser.storage
const saveOptions = async () => {
    const token = document.getElementById('token').value;

    await browser.storage.sync.set({
        apiToken: token
    });

    const status = document.getElementById('status');
    status.style.opacity = 1;
    setTimeout(() => {
        status.style.opacity = 0;
    }, 1500);
};

// Restores select box and checkbox state using the preferences
// stored in browser.storage.
const restoreOptions = async () => {
    const data = await browser.storage.sync.get('apiToken');
    document.getElementById('token').value = data.apiToken || '';
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
