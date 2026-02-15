// content.js

(function () {
    // Prevent multiple injections
    if (window.hasPKMToast) return;
    window.hasPKMToast = true;

    // --- Config & Styles ---
    const themeColor = '#f6b012';
    const fontFamily = '"Varela Round", sans-serif';

    // Inject Font
    if (!document.querySelector('link[href*="Varela+Round"]')) {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Varela+Round&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }

    // Create Toast Element
    const toast = document.createElement('div');
    toast.id = 'pkm-extension-toast';

    // Inline Styles to avoid external CSS processing requirement
    toast.style.cssText = `
        position: fixed;
        bottom: 96px; 
        right: 24px;
        background-color: #ffffff;
        color: #000000;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: ${fontFamily};
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 2147483647;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
        text-transform: lowercase; 
        border-left: 4px solid ${themeColor};
        display: block;
    `;

    document.body.appendChild(toast);

    // --- Message Listener ---
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'show_toast') {
            showToast(request.message, request.isError);
        }
        if (request.action === 'get_selection') {
            sendResponse({
                selection: window.getSelection().toString(),
                title: document.title,
                url: window.location.href
            });
        }
    });

    function showToast(msg, isError = false) {
        toast.textContent = msg;
        toast.style.borderLeftColor = isError ? '#ef4444' : themeColor;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        // Hide after 3s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
        }, 3000);
    }

})();
