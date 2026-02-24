// popup.js

const CONFIG = {
    apiBase: 'https://db.houseofmates.space/api',
    collectionName: 'captures'
};

const ext = (globalThis.browser ?? (globalThis.chrome as any)) as any;

function storageGet(area: 'local' | 'sync', key: string): Promise<Record<string, any>> {
    const storageArea = ext?.storage?.[area];
    if (!storageArea) return Promise.resolve({});

    try {
        const res = storageArea.get(key);
        if (res && typeof res.then === 'function') return res;
    } catch (_) {
        // fall through to callback form
    }

    return new Promise((resolve, reject) => {
        try {
            storageArea.get(key, (items: any) => {
                const err = ext?.runtime?.lastError;
                if (err) reject(err);
                else resolve(items || {});
            });
        } catch (e) {
            reject(e);
        }
    });
}

function storageSet(area: 'local' | 'sync', items: Record<string, any>): Promise<void> {
    const storageArea = ext?.storage?.[area];
    if (!storageArea) return Promise.resolve();

    try {
        const res = storageArea.set(items);
        if (res && typeof res.then === 'function') return res;
    } catch (_) {
        // fall through to callback form
    }

    return new Promise((resolve, reject) => {
        try {
            storageArea.set(items, () => {
                const err = ext?.runtime?.lastError;
                if (err) reject(err);
                else resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function getApiToken(): Promise<string> {
    const local = await storageGet('local', 'apiToken').catch(() => ({}));
    if (local?.apiToken) return String(local.apiToken);
    const sync = await storageGet('sync', 'apiToken').catch(() => ({}));
    return sync?.apiToken ? String(sync.apiToken) : '';
}

async function setApiToken(token: string): Promise<void> {
    await storageSet('local', { apiToken: token }).catch(() => undefined);
    await storageSet('sync', { apiToken: token }).catch(() => undefined);
}

// UI Elements
const views = {
    capture: document.getElementById('capture-view'),
    settings: document.getElementById('settings-view')
};
const inputs = {
    title: document.getElementById('title'),
    url: document.getElementById('url'),
    content: document.getElementById('content'),
    token: document.getElementById('token'),
    tags: document.getElementById('tags')
};

// Init
document.addEventListener('DOMContentLoaded', async () => {
    const token = await getApiToken();
    if (!token) {
        showSettings();
    } else {
        inputs.token.value = token;
        loadCurrentPageData();
    }
});

function showSettings() {
    views.capture.classList.add('hidden');
    views.settings.classList.remove('hidden');
}

function showCapture() {
    views.settings.classList.add('hidden');
    views.capture.classList.remove('hidden');
}

// Load Data from Content Script
async function loadCurrentPageData() {
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];

        // Try to get selection from content script
        try {
            const response = await browser.tabs.sendMessage(tab.id, { action: 'get_selection' });
            if (response) {
                inputs.title.value = response.title || tab.title;
                inputs.url.value = response.url || tab.url;
                inputs.content.value = response.selection || '';
            }
        } catch (e) {
            // Content script might not be running (e.g. strict page), fallback to tab info
            inputs.title.value = tab.title;
            inputs.url.value = tab.url;
        }
    } catch (e) {
        console.error("Failed to load page data", e);
    }
}

// Save Token
document.getElementById('save-token').addEventListener('click', async () => {
    const token = inputs.token.value.trim();
    if (token) {
        await setApiToken(token);
        showCapture();
        loadCurrentPageData(); // Retry loading data
    }
});

document.getElementById('cancel-settings').addEventListener('click', () => {
    showCapture();
});

document.getElementById('toggle-settings').addEventListener('click', () => {
    if (views.settings.classList.contains('hidden')) {
        showSettings();
    } else {
        showCapture();
    }
});

// Save Capture
document.getElementById('save-capture').addEventListener('click', async () => {
    const btn = document.getElementById('save-capture');
    btn.disabled = true;
    btn.textContent = 'saving...';

    try {
        const token = await getApiToken();

        if (!token) {
            showSettings();
            return;
        }

        const payload = {
            title: inputs.title.value,
            url: inputs.url.value,
            content: inputs.content.value,
            source: 'firefox-extension-popup',
            captured_at: new Date().toISOString(),
            domain: new URL(inputs.url.value).hostname,
            target: inputs.tags ? inputs.tags.value : 'inbox'
        };

        const response = await fetch(`${CONFIG.apiBase}/${CONFIG.collectionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const status = document.getElementById('status');
            status.style.opacity = 1;
            setTimeout(() => window.close(), 1000);
        } else {
            alert('Error saving: ' + response.status);
            btn.disabled = false;
            btn.textContent = 'save to brain';
        }
    } catch (e) {
        alert('Network error: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'save to brain';
    }
});
