import { contextBridge, ipcRenderer } from 'electron';

window.addEventListener('mouseup', (e) => {
    if (e.button === 3) {
        ipcRenderer.send('webview-go-back');
    } else if (e.button === 4) {
        ipcRenderer.send('webview-go-forward');
    }
});

// Password Autofill Logic
window.addEventListener('load', async () => {
    try {
        const domain = window.location.hostname;
        const passwords = await ipcRenderer.invoke('get-passwords');
        const matches = passwords.filter((p: any) => p.domain === domain);

        if (matches.length > 0) {
            const passwordInputs = document.querySelectorAll('input[type="password"]');
            passwordInputs.forEach((passInput: any) => {
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
    } catch (e) {
        console.error('[Preload] Autofill failed:', e);
    }
});

// Password Capture Logic for Webviews
window.addEventListener('submit', (e) => {
    try {
        const form = e.target as HTMLFormElement;
        const passwordInput = form.querySelector('input[type="password"]') as HTMLInputElement;
        if (passwordInput && passwordInput.value) {
            const usernameInput = form.querySelector('input[type="text"], input[type="email"], input:not([type])') as HTMLInputElement;
            ipcRenderer.send('password-form-submit', {
                url: window.location.href,
                username: usernameInput?.value || '',
                password: passwordInput.value
            });
        }
    } catch (e) {
        console.error('[Preload] Form capture failed:', e);
    }
});

contextBridge.exposeInMainWorld('electron', {
    store: {
        get: (key: string) => ipcRenderer.invoke('get-store-value', key),
        set: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
    },
    window: {
        minimize: () => ipcRenderer.send('minimize-window'),
        maximize: () => ipcRenderer.send('maximize-window'),
        close: () => ipcRenderer.send('close-window'),
    },
    ipcRenderer: {
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
        on: (channel: string, func: (...args: any[]) => void) => {
            const subscription = (_event: any, ...args: any[]) => func(_event, ...args);
            ipcRenderer.on(channel, subscription);
        },
        once: (channel: string, func: (...args: any[]) => void) => {
            const subscription = (_event: any, ...args: any[]) => func(_event, ...args);
            ipcRenderer.once(channel, subscription);
        },
        off: (channel: string, func: (...args: any[]) => void) => {
            // Removing listeners via context bridge is tricky because the reference changes.
            // For now, simple apps often skip accurate off() or use a different pattern.
            // But we can verify if simple direct mapping works.
            ipcRenderer.removeAllListeners(channel); // Brute force removal for this simplified bridge
        },
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    }
});
