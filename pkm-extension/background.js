// background.js

const CONFIG = {
    // Default config, will be overridden by storage
    apiBase: 'https://db.houseofmates.space/api',
    collectionName: 'captures',
    defaultToken: 'PLACEHOLDER_KEY'
};

// Initialize Context Menu safely
function createMenu() {
    // Attempt to create, swallowing 'duplicate id' errors if they occur
    browser.contextMenus.create({
        id: "save-to-pkm",
        title: "save text to pkm",
        contexts: ["selection"]
    }, () => {
        if (browser.runtime.lastError) { /* ignore */ }
    });

    browser.contextMenus.create({
        id: "save-page-to-pkm",
        title: "save page to pkm",
        contexts: ["page"]
    }, () => {
        if (browser.runtime.lastError) { /* ignore */ }
    });

    browser.contextMenus.create({
        id: "save-image-to-pkm",
        title: "save image to pkm",
        contexts: ["image"]
    }, () => {
        if (browser.runtime.lastError) { /* ignore */ }
    });
}

// Ensure menu is created on install and startup
browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.removeAll(() => {
        createMenu();
    });
});

browser.runtime.onStartup.addListener(() => {
    // Re-create on startup just in case (though onInstalled usually persists)
    // Actually, Firefox persists context menus, but re-creating ensures they exist.
    // We try to create without removing to avoid flicker, relying on error suppression.
    createMenu();
});

// Also run once immediately for reload cases during dev
createMenu();

// Context Menu Handler
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    const pageTitle = tab.title;
    const pageUrl = tab.url;

    if (info.menuItemId === "save-to-pkm") {
        await handleCapture({
            selection: info.selectionText,
            title: pageTitle,
            url: pageUrl
        }, tab.id);
    }
    else if (info.menuItemId === "save-page-to-pkm") {
        await handleCapture({
            title: pageTitle,
            url: pageUrl
        }, tab.id);
    }
    else if (info.menuItemId === "save-image-to-pkm") {
        await handleCapture({
            title: `Image from ${pageTitle}`,
            url: pageUrl,
            imageUrl: info.srcUrl
        }, tab.id);
    }
});

async function handleCapture(captureData, tabId) {
    const { selection, title, url, imageUrl } = captureData;
    // 1. Get Token from Storage
    const data = await browser.storage.sync.get('apiToken');
    const apiToken = data.apiToken || CONFIG.defaultToken;

    // Check for missing key
    if (!apiToken || apiToken === 'PLACEHOLDER_KEY') {
        browser.tabs.create({ url: "/popup.html" });
        return;
    }

    // 2. Prepare Payload (Map to NocoBase 'captures' schema: label, url, text-content)
    const payload = {
        label: title || "Untitled Capture",
        url: url,
        "text-content": selection && selection.length > 0 ? selection : (imageUrl ? `Captured Image: ${imageUrl}` : ""),
    };

    // If it's an image, we try to put it in an 'image' or 'attachments' field if available.
    // However, since we don't have the exact schema, we'll append it to text-content for visibility
    // and also try to send it in a 'image_url' or 'img' field.
    if (imageUrl) {
        payload.image_url = imageUrl;
        payload.img_url = imageUrl; // fallback name
        // payload.img = [{ url: imageUrl }]; // NocoBase attachment format (requires client-side logic or server support)
    }

    console.log("sending payload:", payload);

    // 3. Notify "Saving..."
    notifyTab(tabId, 'connecting to brain...');

    // 4. Send Request
    try {
        const response = await fetch(`${CONFIG.apiBase}/${CONFIG.collectionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            notifyTab(tabId, 'saved to brain');
        } else {
            console.error('PKM API Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response Body:', text);

            if (response.status === 401) {
                notifyTab(tabId, 'error: unauthorized. opening settings...', true);
                browser.tabs.create({ url: "/popup.html" });
            }
            else {
                notifyTab(tabId, `error: ${response.status}`, true);
            }
        }
    } catch (error) {
        console.error('PKM Network Error:', error);
        notifyTab(tabId, 'network error', true);
    }
}

function notifyTab(tabId, message, isError = false) {
    if (tabId) {
        browser.tabs.sendMessage(tabId, {
            action: 'show_toast',
            message: message,
            isError: isError
        }).catch(err => {
            console.warn('Could not send toast:', err);
        });
    }
}
