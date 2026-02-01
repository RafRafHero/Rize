"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
window.addEventListener('mouseup', (e) => {
    if (e.button === 3) {
        electron_1.ipcRenderer.send('webview-go-back');
    }
    else if (e.button === 4) {
        electron_1.ipcRenderer.send('webview-go-forward');
    }
});
// Password Autofill Logic
window.addEventListener('load', async () => {
    try {
        const domain = window.location.hostname;
        const passwords = await electron_1.ipcRenderer.invoke('get-passwords');
        const matches = passwords.filter((p) => p.domain === domain);
        if (matches.length > 0) {
            const passwordInputs = document.querySelectorAll('input[type="password"]');
            passwordInputs.forEach((passInput) => {
                // Try to find the closest username field
                const form = passInput.form;
                if (form) {
                    const userInput = form.querySelector('input[type="text"], input[type="email"], input:not([type])');
                    if (userInput) {
                        userInput.value = matches[0].username;
                        passInput.value = matches[0].password;
                    }
                }
            });
        }
    }
    catch (e) {
        console.error('[Preload] Autofill failed:', e);
    }
});
// Hardened YouTube Ad-Blocker
if (window.location.hostname.includes('youtube.com')) {
    // 1. CSS Cosmetic Surgery - Injected early via insertCSS too, but here for redundancy
    const style = document.createElement('style');
    style.innerHTML = `
        .video-ads, 
        .ytp-ad-module, 
        .ytp-ad-overlay-container,
        .ytp-ad-message-container,
        #player-ads,
        ytd-ad-slot-renderer,
        .ytp-ad-skip-button-slot,
        .ytd-promoted-sparkles-web-renderer { 
            display: none !important; 
        }
    `;
    document.head.appendChild(style);
    // 2. MutationObserver for instant ad-skipping
    const observer = new MutationObserver(() => {
        const video = document.querySelector('video');
        const adSkipButton = document.querySelector('.ytp-ad-skip-button');
        const adInterrupting = document.querySelector('.ad-interrupting');
        const adOverlay = document.querySelector('.ytp-ad-module');
        if (video) {
            if (adInterrupting || adSkipButton) {
                // Skips the ad by setting current time to duration
                if (Number.isFinite(video.duration)) {
                    video.currentTime = video.duration;
                }
                // Also try to click the skip button if it exists
                if (adSkipButton) {
                    adSkipButton.click();
                    console.log('[AdBlock] Ad Skipped Instantly');
                }
            }
        }
        // Aggressive removal of ad overlays
        if (adOverlay && adOverlay.innerHTML !== '') {
            adOverlay.innerHTML = ''; // Kill the ad content
        }
        // Handle overlay ads (static images/banners)
        const overlayAds = document.querySelectorAll('.ytp-ad-overlay-close-button');
        overlayAds.forEach((btn) => btn.click());
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
// Password Capture Logic for Webviews
window.addEventListener('submit', (e) => {
    try {
        const form = e.target;
        const passwordInput = form.querySelector('input[type="password"]');
        if (passwordInput && passwordInput.value) {
            const usernameInput = form.querySelector('input[type="text"], input[type="email"], input:not([type])');
            electron_1.ipcRenderer.send('password-form-submit', {
                url: window.location.href,
                username: usernameInput?.value || '',
                password: passwordInput.value
            });
        }
    }
    catch (e) {
        console.error('[Preload] Form capture failed:', e);
    }
});
electron_1.contextBridge.exposeInMainWorld('electron', {
    store: {
        get: (key) => electron_1.ipcRenderer.invoke('get-store-value', key),
        set: (key, value) => electron_1.ipcRenderer.invoke('set-store-value', key, value),
    },
    window: {
        minimize: () => electron_1.ipcRenderer.send('minimize-window'),
        maximize: () => electron_1.ipcRenderer.send('maximize-window'),
        close: () => electron_1.ipcRenderer.send('close-window'),
    },
    ipcRenderer: {
        send: (channel, ...args) => electron_1.ipcRenderer.send(channel, ...args),
        on: (channel, func) => {
            const subscription = (_event, ...args) => func(_event, ...args);
            electron_1.ipcRenderer.on(channel, subscription);
        },
        once: (channel, func) => {
            const subscription = (_event, ...args) => func(_event, ...args);
            electron_1.ipcRenderer.once(channel, subscription);
        },
        off: (channel, func) => {
            // Removing listeners via context bridge is tricky because the reference changes.
            // For now, simple apps often skip accurate off() or use a different pattern.
            // But we can verify if simple direct mapping works.
            electron_1.ipcRenderer.removeAllListeners(channel); // Brute force removal for this simplified bridge
        },
        invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    }
});
//# sourceMappingURL=preload.js.map