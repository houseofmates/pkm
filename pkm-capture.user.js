// ==UserScript==
// @name         PKM Capture
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Capture page context for PKM dashboard (Journal App)
// @author       Antigravity
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    // IMPORTANT: Generate an API Token in NocoBase (Users > Authentication > API Tokens)
    // and paste it below.
    const CONFIG = {
        apiBase: 'https://db.houseofmates.space/api',
        collectionName: 'captures',
        apiToken: 'YOUR_NOCOBASE_API_TOKEN_HERE', // <--- PASTE TOKEN HERE
        themeColor: '#f6b012',
        fontFamily: '"Varela Round", sans-serif'
    };

    // --- Asset Injection ---

    // 1. Font
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Varela+Round&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // 2. Styles
    const styles = `
        #pkm-capture-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            background-color: ${CONFIG.themeColor};
            border-radius: 16px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            z-index: 2147483647; 
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            user-select: none;
        }
        #pkm-capture-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        #pkm-capture-btn:active {
            transform: scale(0.95);
        }
        #pkm-capture-btn svg {
            width: 28px;
            height: 28px;
            fill: #ffffff; 
        }
        
        #pkm-toast {
            position: fixed;
            bottom: 96px; 
            right: 24px;
            background-color: #ffffff;
            color: #000000;
            padding: 12px 20px;
            border-radius: 12px;
            font-family: ${CONFIG.fontFamily};
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 2147483647;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            text-transform: lowercase; 
            border-left: 4px solid ${CONFIG.themeColor};
        }
        #pkm-toast.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    GM_addStyle(styles);

    // --- UI Elements ---

    // Button
    const btn = document.createElement('div');
    btn.id = 'pkm-capture-btn';
    btn.title = 'Capture to Brain (Alt+S)';
    btn.innerHTML = `
        <svg viewBox="0 0 24 24">
            <path d="M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z"/>
        </svg>
    `;

    document.body.appendChild(btn);

    // Toast
    const toast = document.createElement('div');
    toast.id = 'pkm-toast';
    document.body.appendChild(toast);

    // --- Logic ---

    function showToast(msg, isError = false) {
        toast.textContent = msg;
        toast.style.borderLeftColor = isError ? '#ef4444' : CONFIG.themeColor;
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }

    async function capturePage(contextSelection = null) {
        if (CONFIG.apiToken === 'YOUR_NOCOBASE_API_TOKEN_HERE') {
            alert('PKM Capture: Please set your API Token in the script first!');
            return;
        }

        const selection = contextSelection || window.getSelection().toString().trim();
        const title = document.title;
        const url = window.location.href;

        const payload = {
            title: title,
            url: url,
            note: selection.length > 0 ? selection : "",
            source: 'violentmonkey'
        };

        // Visual feedback
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => btn.style.transform = '', 150);

        GM_xmlhttpRequest({
            method: "POST",
            url: `${CONFIG.apiBase}/${CONFIG.collectionName}`,
            data: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CONFIG.apiToken}`
            },
            onload: function (response) {
                if (response.status >= 200 && response.status < 300) {
                    showToast('captured to brain');
                } else {
                    console.error('PKM Capture Error:', response);
                    showToast('error: ' + response.status, true);
                }
            },
            onerror: function (err) {
                console.error('PKM Capture Network Error:', err);
                showToast('network error', true);
            }
        });
    }

    // --- Event Listeners ---

    // Click
    btn.addEventListener('click', () => capturePage());

    // Shortcut (Alt + S)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === 'KeyS') {
            e.preventDefault();
            capturePage();
        }
    });

    // --- Context Menu Integration ---
    // 1. Extension Menu Command
    GM_registerMenuCommand("Save Selection to PKM", () => {
        const selection = window.getSelection().toString().trim();
        capturePage(selection);
    });

    // 2. Custom Right-Click Modifier (Ctrl + Right Click)
    // Because we cannot easily inject into the native browser context menu without a full extension,
    // we provide a shortcut override.
    document.addEventListener('contextmenu', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const selection = window.getSelection().toString().trim();
            capturePage(selection);
            return false; // Suppress native menu
        }
    });

})();
