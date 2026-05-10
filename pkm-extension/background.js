// background.js - service worker for pkm capture extension

// Configuration - will be loaded from storage
let CONFIG = {
    ollamaEndpoint: 'http://localhost:11434/api/generate',
    model: 'qwen2.5vl:7b-q4_K_M',
    nocobaseApi: 'https://db.houseofmates.space/api',
    collectionName: 'ai-convos'
};

// Load config from storage on startup
async function loadConfig() {
    try {
        const data = await browser.storage.sync.get(['apiBaseUrl', 'ollamaUrl']);
        if (data.apiBaseUrl) {
            CONFIG.nocobaseApi = data.apiBaseUrl;
        }
        if (data.ollamaUrl) {
            CONFIG.ollamaEndpoint = `${data.ollamaUrl}/api/generate`;
        }
        console.log('[pkm] config loaded:', CONFIG);
    } catch (e) {
        console.log('[pkm] using default config');
    }
}

// supported ai platforms for context menu
const AI_PLATFORMS = [
    'gemini.google.com',
    'jules.google.com',
    'perplexity.ai',
    'lumo.proton.me',
    'chatgpt.com',
    'chat.deepseek.com',
    'claude.ai',
    'duck.ai',
    'copilot.microsoft.com',
    'ai.houseofmates.space',
    'aistudio.google.com',
    'grok.com'
];

// function to create context menus
function createContextMenus() {
    console.log('[pkm] creating context menus...');
    
    // remove existing menu items first
    browser.contextMenus.removeAll().then(() => {
        console.log('[pkm] removed existing menus');
        
        // create "save to pkm" menu for all pages
        browser.contextMenus.create({
            id: 'save-to-pkm',
            title: 'save to pkm',
            contexts: ['page', 'selection', 'link', 'image'],
            documentUrlPatterns: ['<all_urls>']
        }, () => {
            if (browser.runtime.lastError) {
                console.error('[pkm] error creating save menu:', browser.runtime.lastError);
            } else {
                console.log('[pkm] created save-to-pkm menu');
            }
        });
        
        // create "summarize" menu for ai platforms only
        const aiPatterns = AI_PLATFORMS.map(host => `https://${host}/*`);
        console.log('[pkm] ai patterns:', aiPatterns);
        
        browser.contextMenus.create({
            id: 'summarize-conversation',
            title: '🤖 summarize',
            contexts: ['page'],
            documentUrlPatterns: aiPatterns
        }, () => {
            if (browser.runtime.lastError) {
                console.error('[pkm] error creating summarize menu:', browser.runtime.lastError);
            } else {
                console.log('[pkm] created summarize menu for ai platforms');
            }
        });
    });
}

// create menus on install
browser.runtime.onInstalled.addListener(() => {
    console.log('[pkm] extension installed/updated');
    loadConfig();
    createContextMenus();
});

// also create menus on startup (browser restart)
browser.runtime.onStartup.addListener(() => {
    console.log('[pkm] browser started');
    loadConfig();
    createContextMenus();
});

// immediate creation for when background script loads
loadConfig().then(() => createContextMenus());

// handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'save-to-pkm') {
        handleSaveToPKM(info, tab);
    } else if (info.menuItemId === 'summarize-conversation') {
        handleSummarize(tab);
    }
});

// handle save to pkm - saves to captures collection
async function handleSaveToPKM(info, tab) {
    try {
        // ensure config is loaded
        await loadConfig();
        
        // get selection from content script
        const results = await browser.tabs.sendMessage(tab.id, { action: 'get_selection' });
        
        if (!results || !results.selection) {
            showToast(tab.id, 'no content selected', true);
            return;
        }
        
        // get api token and base url
        const { apiToken, apiBaseUrl } = await browser.storage.sync.get(['apiToken', 'apiBaseUrl']);
        if (!apiToken) {
            showToast(tab.id, 'no api token configured', true);
            return;
        }
        
        const apiBase = apiBaseUrl || CONFIG.nocobaseApi;
        
        // prepare payload
        const payload = {
            title: results.title || 'captured content',
            content: results.selection,
            url: results.url,
            captured_at: new Date().toISOString(),
            source: 'extension-context-menu',
            domain: new URL(results.url).hostname
        };
        
        // send to nocobase captures collection
        const response = await fetch(`${apiBase}/captures`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`nocobase error: ${response.status}`);
        }
        
        showToast(tab.id, 'saved to captures!');
        
    } catch (error) {
        console.error('[pkm] save error:', error);
        showToast(tab.id, 'failed to save', true);
    }
}

// handle summarize conversation
async function handleSummarize(tab) {
    try {
        showToast(tab.id, '🤖 extracting conversation...');
        
        // inject ai-summarizer.js to extract and summarize
        await browser.tabs.executeScript(tab.id, {
            file: 'ai-summarizer.js'
        });
        
        console.log('[pkm] summarizer injected, triggering...');
        
        // send message to trigger the summarization
        await browser.tabs.sendMessage(tab.id, { action: 'trigger_summarize' });
        
    } catch (error) {
        console.error('[pkm] summarize error:', error);
        showToast(tab.id, 'failed to summarize: ' + error.message, true);
    }
}

// show toast notification in tab
function showToast(tabId, message, isError = false) {
    browser.tabs.sendMessage(tabId, {
        action: 'show_toast',
        message: message,
        isError: isError
    }).catch(err => {
        // content script might not be loaded, ignore
        console.log('[pkm] toast failed (content script not ready):', err);
    });
}

// listen for messages from content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'show_toast' && sender.tab) {
        showToast(sender.tab.id, request.message, request.isError);
    }
    if (request.action === 'summarize_complete' && sender.tab) {
        showToast(sender.tab.id, '🤖 conversation saved!');
    }
    if (request.action === 'summarize_error' && sender.tab) {
        showToast(sender.tab.id, `🤖 error: ${request.error}`, true);
    }
});

// system prompt for summarization
function getSystemPrompt() {
    return `you are a conversation analysis expert. your task is to create a comprehensive, detailed summary of the provided ai conversation.

requirements:
- extract all key information, insights, and decisions made
- preserve important technical details, code snippets, and data
- identify action items and next steps mentioned
- note any questions that were asked and how they were answered
- capture the full context so re-reading the original is unnecessary
- use structured bullet points and clear headings
- be thorough - include everything of value from the conversation

output format:
# conversation summary

## overview
brief description of what this conversation was about

## key points
- detailed point 1 with full context
- detailed point 2 with full context
- all significant information captured

## technical details
- code snippets, data, or technical explanations
- specific configurations or parameters discussed

## action items
- [ ] task 1 (if mentioned)
- [ ] task 2 (if mentioned)

## insights & takeaways
- important conclusions reached
- recommendations made by the ai

## follow-up questions
- any questions that arose from this conversation that need further exploration

remember: the user should be able to understand the entire conversation from this summary alone. be comprehensive.`;
}

console.log('[pkm] background script loaded');
