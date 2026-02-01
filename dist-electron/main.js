"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const adblocker_electron_1 = require("@cliqz/adblocker-electron");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Initialize electron store
let store;
const initElectronStore = async () => {
    if (store)
        return store;
    const { default: Store } = await import('electron-store');
    store = new Store();
    return store;
};
// initialization happens in app.ready
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
// Security: Disable remote debugging port if accidentally passed
electron_1.app.commandLine.removeSwitch('remote-debugging-port');
// Performance Mode: Increase parallelism for asset fetching
electron_1.app.commandLine.appendSwitch('max-connections-per-server', '10');
electron_1.app.commandLine.appendSwitch('enable-gpu-rasterization');
electron_1.app.commandLine.appendSwitch('enable-zero-copy');
electron_1.app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Ensure Rizo is registered for URL protocols
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        electron_1.app.setAsDefaultProtocolClient('rizo', process.execPath, [path_1.default.resolve(process.argv[1])]);
    }
}
else {
    electron_1.app.setAsDefaultProtocolClient('rizo');
}
// Global User-Agent spoofing to bypass Google's Electron detection
const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';
electron_1.app.userAgentFallback = FIREFOX_UA;
// Enterprise AdBlocker Logic
let blockerEngine = null;
const activeSessions = new Set();
const getBlocker = async () => {
    if (blockerEngine)
        return blockerEngine;
    const enginePath = path_1.default.join(electron_1.app.getPath('userData'), 'adblocker-engine.bin');
    if (fs_1.default.existsSync(enginePath)) {
        try {
            const buffer = fs_1.default.readFileSync(enginePath);
            blockerEngine = adblocker_electron_1.ElectronBlocker.deserialize(buffer);
            console.log('[Main] AdBlocker engine loaded from cache');
            return blockerEngine;
        }
        catch (e) {
            console.error('[Main] Failed to deserialize adblocker engine', e);
        }
    }
    console.log('[Main] Fetching prebuilt AdBlocker engine');
    blockerEngine = await adblocker_electron_1.ElectronBlocker.fromPrebuiltAdsAndTracking(cross_fetch_1.default);
    fs_1.default.writeFileSync(enginePath, blockerEngine.serialize());
    return blockerEngine;
};
const enableAdBlocker = async (ses) => {
    const blocker = await getBlocker();
    const settings = store.get('settings');
    // Re-initialize engine with current whitelist to ensure it's up to date
    // Note: ElectronBlocker.addFilters is additive, so we should ideally start fresh
    // or use a separate whitelist mechanism if available. 
    // For now, we will add the filters. To avoid duplicates, we could reset the engine, 
    // but let's try adding them first.
    if (settings?.adBlockWhitelist && settings.adBlockWhitelist.length > 0) {
        const filters = settings.adBlockWhitelist.map((d) => `@@||${d}^$document`);
        blocker.addFilters(filters);
    }
    // Use the modern preload script API for the adblocker
    blocker.enableBlockingInSession(ses, {
        usePreloadScript: true,
    });
    console.log('[Main] AdBlocker enabled for session with modern preload API');
};
electron_1.ipcMain.on('update-adblocker-settings', async () => {
    console.log('[Main] Updating AdBlocker settings...');
    blockerEngine = null; // Reset engine to clear previous whitelist filters
    const activeSessionsList = Array.from(activeSessions);
    for (const ses of activeSessionsList) {
        const blocker = await getBlocker();
        blocker.disableBlockingInSession(ses);
        const settings = store.get('settings');
        if (settings?.adBlockEnabled) {
            await enableAdBlocker(ses);
        }
    }
});
// Profile Management Configuration
const originalUserDataPath = electron_1.app.getPath('userData');
const profilesDir = path_1.default.join(originalUserDataPath, 'profiles');
const rootConfigPath = path_1.default.join(originalUserDataPath, 'profiles-config.json');
if (!fs_1.default.existsSync(profilesDir)) {
    fs_1.default.mkdirSync(profilesDir, { recursive: true });
}
let currentProfileId = process.argv.find(arg => arg.startsWith('--profile-id='))?.split('=')[1];
const isIncognitoProcess = process.argv.includes('--incognito');
if (isIncognitoProcess) {
    const incognitoPath = path_1.default.join(electron_1.app.getPath('appData'), 'rizo-incognito-' + Date.now());
    electron_1.app.setPath('userData', incognitoPath);
}
else if (currentProfileId) {
    electron_1.app.setPath('userData', path_1.default.join(profilesDir, currentProfileId));
}
else {
    // Check for "always open" in root config
    if (fs_1.default.existsSync(rootConfigPath)) {
        try {
            const config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
            if (config.alwaysOpenProfile) {
                currentProfileId = config.alwaysOpenProfile;
                electron_1.app.setPath('userData', path_1.default.join(profilesDir, currentProfileId));
            }
        }
        catch (e) { }
    }
}
let mainWindow = null;
const createWindow = (isIncognito = false) => {
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new electron_1.BrowserWindow({
        width: Math.min(1200, width),
        height: Math.min(800, height),
        minWidth: 800,
        minHeight: 600,
        frame: false, // Frameless for custom titlebar
        titleBarStyle: 'hidden',
        transparent: false, // Windows doesn't handle transparency + blur well without hacks, keeping it solid for now but will style with CSS.
        backgroundColor: '#00000000', // Try for transparency if supported
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            webviewTag: true, // Enable <webview> tag
            nodeIntegration: false,
            contextIsolation: true,
            partition: isIncognito ? 'incognito' : (currentProfileId ? `persist:profile_${currentProfileId}` : undefined),
        },
    });
    // Global Navigation & Window Protections (Apply to webviews too)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Allow Google Drive downloads and docs to open (they often trigger will-download)
        if (url.includes('drive.google.com/download') || url.includes('doc-')) {
            return { action: 'allow' };
        }
        return { action: 'deny' };
    });
    // Handle Mouse Back/Forward Buttons (Windows)
    mainWindow.on('app-command', (e, cmd) => {
        if (cmd === 'browser-backward' && mainWindow) {
            mainWindow.webContents.send('execute-browser-backward');
        }
        if (cmd === 'browser-forward' && mainWindow) {
            mainWindow.webContents.send('execute-browser-forward');
        }
    });
    const queryParams = new URLSearchParams();
    if (isIncognito)
        queryParams.set('incognito', 'true');
    if (currentProfileId)
        queryParams.set('profileId', currentProfileId);
    if (!currentProfileId && !isIncognito)
        queryParams.set('selectionMode', 'true');
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}${queryString}`);
    }
    else {
        const indexPath = path_1.default.join(__dirname, '../dist/index.html');
        mainWindow.loadURL(`file://${indexPath}${queryString}`);
    }
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
};
const applyUASpoofing = (ses) => {
    ses.setUserAgent(FIREFOX_UA);
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = FIREFOX_UA;
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
};
const applyAdBlocking = (ses) => {
    // Check if store is ready
    if (!store) {
        initElectronStore().then(() => applyAdBlocking(ses));
        return;
    }
    const settings = store.get('settings');
    if (settings?.adBlockEnabled) {
        enableAdBlocker(ses);
    }
};
const applyYouTubeNetworkBlocker = (ses) => {
    const adPatterns = [
        '*://*.doubleclick.net/*',
        '*://*.googleads.g.doubleclick.net/*',
        '*://youtube.com/get_midroll_info*',
        '*://youtube.com/api/stats/ads*'
    ];
    ses.webRequest.onBeforeRequest({ urls: adPatterns }, (details, callback) => {
        if (details.url.includes('doubleclick.net')) {
            console.log('[AdBlock] YouTube Ad Blocked (doubleclick.net)');
        }
        callback({ cancel: true });
    });
};
const setupOptimizations = (ses) => {
    activeSessions.add(ses);
    applyUASpoofing(ses);
    applyAdBlocking(ses);
    applyYouTubeNetworkBlocker(ses);
    // Inject Performance Optimization Script
    const optimizationPath = path_1.default.join(electron_1.app.getAppPath(), 'public', 'optimization-inject.js');
    ses.registerPreloadScript({
        id: 'performance-optimizations',
        type: 'frame',
        filePath: optimizationPath
    });
};
// Initialize app then setup store and optimizations
electron_1.app.whenReady().then(async () => {
    await initElectronStore();
    // Register main preload script using modern API
    electron_1.session.defaultSession.registerPreloadScript({
        id: 'main-preload',
        type: 'frame',
        filePath: path_1.default.join(__dirname, 'preload.js')
    });
    setupOptimizations(electron_1.session.defaultSession);
    // Use a persistent partition for incognito to allow caching within the session
    const incognitoSession = electron_1.session.fromPartition('incognito');
    incognitoSession.registerPreloadScript({
        id: 'main-preload-incognito',
        type: 'frame',
        filePath: path_1.default.join(__dirname, 'preload.js')
    });
    setupOptimizations(incognitoSession);
    // Ensure any other sessions (like profile partitions) also get the spoofing and blocking
    electron_1.app.on('session-created', (ses) => {
        setupOptimizations(ses);
    });
    // Register Incognito Shortcut
    electron_1.globalShortcut.register('CommandOrControl+Shift+N', () => {
        launchIncognito();
    });
    // Register Ghost Search Shortcut
    const searchRegistered = electron_1.globalShortcut.register('CommandOrControl+K', () => {
        mainWindow?.webContents.send('toggle-ghost-search');
    });
    if (searchRegistered) {
        console.log('Search Shortcut Registered: CommandOrControl+K');
    }
    else {
        console.warn('Failed to register Search Shortcut');
    }
    // Register Gemini Summarize Shortcut
    electron_1.globalShortcut.register('Alt+S', () => {
        // 1. Ask Main Window to get context from active view
        mainWindow?.webContents.send('gemini-get-context');
    });
    setupDownloadManager(electron_1.session.defaultSession);
    createWindow(isIncognitoProcess);
});
// Bypass certificate trust issues for local development/antivirus interference
electron_1.app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});
// Apply protections to every new web content (including webviews)
electron_1.app.on('web-contents-created', (event, contents) => {
    const forbidden = [
        'contacts.google.com/widget',
        'passiveSignin',
        'accounts.google.com/ServiceLogin'
    ];
    const blockRedirect = (event, url) => {
        if (forbidden.some(link => url.includes(link))) {
            console.log(`[Main] Blocked background redirect to: ${url}`);
            event.preventDefault();
        }
    };
    // Main Navigation Filter
    contents.on('will-navigate', (event, url) => blockRedirect(event, url));
    // Frame Navigation Filter: Prevent iframes from redirecting the main window
    contents.on('will-frame-navigate', (event, url, isMainFrame) => {
        if (!isMainFrame) {
            // If it's a subframe trying to navigate to a forbidden URL, block it
            blockRedirect(event, url);
        }
    });
    // Window Open Handler: Allow specific download-related windows
    contents.setWindowOpenHandler(({ url }) => {
        if (url.includes('drive.google.com/download') || url.includes('doc-')) {
            return { action: 'allow' };
        }
        return { action: 'deny' };
    });
});
// --- Download Manager ---
const downloadItems = new Map();
const saveAsPaths = new Map(); // URL -> FilePath
const setupDownloadManager = (ses) => {
    ses.on('will-download', async (event, item, webContents) => {
        // Try to get filename, fallback to parsing URL if empty
        let fileName = item.getFilename();
        const url = item.getURL();
        if (!fileName || fileName === '') {
            try {
                const urlPath = new URL(url).pathname;
                fileName = path_1.default.basename(urlPath);
            }
            catch (e) {
                fileName = 'download';
            }
        }
        const downloadId = (0, crypto_1.randomUUID)();
        const startTime = Date.now();
        let lastReceivedBytes = 0;
        let lastTime = startTime;
        let speed = 0;
        let estimatedTimeRemaining = 0;
        // 1. Setup Listeners IMMEDIATELY to catch fast downloads or cancellations
        item.on('updated', (event, state) => {
            const now = Date.now();
            const received = item.getReceivedBytes();
            const timeDiff = (now - lastTime) / 1000; // seconds
            if (timeDiff > 0.5) { // Update speed every 500ms
                speed = (received - lastReceivedBytes) / timeDiff;
                const remainingBytes = item.getTotalBytes() - received;
                estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;
                lastReceivedBytes = received;
                lastTime = now;
            }
            if (mainWindow) {
                mainWindow.webContents.send('download-progress', {
                    id: downloadId,
                    receivedBytes: item.getReceivedBytes(),
                    totalBytes: item.getTotalBytes(),
                    state: state,
                    speed,
                    estimatedTimeRemaining,
                    isPaused: item.isPaused()
                });
            }
        });
        item.once('done', (event, state) => {
            console.log(`[Main] Download Done: ${downloadId} ${state}`);
            downloadItems.delete(downloadId);
            // Final info might have the correct path now
            const finalPath = item.getSavePath();
            // Re-get filename as it might have changed after save path was set
            const finalFilename = item.getFilename() || path_1.default.basename(finalPath) || fileName;
            const downloadInfo = {
                id: downloadId,
                filename: finalFilename,
                path: finalPath,
                totalBytes: item.getReceivedBytes(), // Use received as total if completed
                state: state,
                endTime: Date.now()
            };
            // Update UI
            mainWindow?.webContents.send('download-complete', downloadInfo);
            // Persist to History
            initElectronStore().then(s => {
                const history = s.get('downloadHistory') || [];
                s.set('downloadHistory', [downloadInfo, ...history].slice(0, 50));
            });
        });
        downloadItems.set(downloadId, item);
        // 2. Send Initial State IMMEDIATELY
        console.log(`[Main] Download Started: ${downloadId} ${url}`);
        mainWindow?.webContents.send('download-started', {
            id: downloadId,
            filename: fileName,
            path: '',
            totalBytes: item.getTotalBytes(),
            startTime,
            isPaused: item.isPaused()
        });
        // 3. Handle Save Path Logic (Synchronous now)
        const originalUrl = item.getURLChain()[0]; // The URL that started the navigation
        const finalUrl = item.getURL();
        // Check both original and final URL to be safe
        let chosenPath;
        if (saveAsPaths.has(originalUrl)) {
            chosenPath = saveAsPaths.get(originalUrl);
            saveAsPaths.delete(originalUrl);
        }
        else if (saveAsPaths.has(finalUrl)) {
            chosenPath = saveAsPaths.get(finalUrl);
            saveAsPaths.delete(finalUrl);
        }
        if (chosenPath) {
            console.log(`[Main] Using chosen path for ${downloadId}: ${chosenPath}`);
            item.setSavePath(chosenPath);
        }
        else {
            // Auto-save to Downloads folder
            console.log(`[Main] Auto-saving ${downloadId}`);
            const downloadsPath = electron_1.app.getPath('downloads');
            let saveName = fileName;
            if (!saveName || saveName.trim() === '') {
                saveName = `download-${Date.now()}`;
                const mime = item.getMimeType();
                if (mime === 'image/png')
                    saveName += '.png';
                else if (mime === 'image/jpeg')
                    saveName += '.jpg';
                else if (mime === 'image/gif')
                    saveName += '.gif';
                else if (mime === 'image/webp')
                    saveName += '.webp';
            }
            const filePath = path_1.default.join(downloadsPath, saveName);
            item.setSavePath(filePath);
        }
    });
};
electron_1.ipcMain.on('download-control', (event, { id, action }) => {
    const item = downloadItems.get(id);
    if (!item)
        return;
    if (action === 'pause' && !item.isPaused())
        item.pause();
    if (action === 'resume' && item.isPaused())
        item.resume();
    if (action === 'cancel')
        item.cancel();
    // Send immediate update to sync isPaused state
    mainWindow?.webContents.send('download-progress', {
        id: id,
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state: 'progressing', // Or item.getState()
        isPaused: item.isPaused()
    });
});
electron_1.ipcMain.on('show-in-folder', (event, path) => {
    electron_1.shell.showItemInFolder(path);
});
electron_1.ipcMain.on('open-file', (event, path) => {
    electron_1.shell.openPath(path);
});
// --- IPC Handlers for Store ---
electron_1.ipcMain.handle('get-store-value', async (event, key) => {
    const s = await initElectronStore();
    return s.get(key);
});
electron_1.ipcMain.handle('set-store-value', async (event, key, value) => {
    const s = await initElectronStore();
    s.set(key, value);
});
electron_1.ipcMain.handle('get-extension-storage', async (event, key) => {
    const s = await initElectronStore();
    return s.get(key);
});
electron_1.ipcMain.handle('get-preload-path', () => {
    return path_1.default.join(__dirname, 'preload.js');
});
const launchIncognito = () => {
    const { spawn } = require('child_process');
    const args = process.argv.slice(1).filter(a => a !== '--incognito');
    args.push('--incognito');
    spawn(process.execPath, args, {
        detached: true,
        stdio: 'ignore'
    }).unref();
};
electron_1.ipcMain.on('open-incognito-window', () => {
    launchIncognito();
});
// Window Controls
electron_1.ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.on('close-window', () => {
    mainWindow?.close();
});
electron_1.ipcMain.on('clear-cache', async (event) => {
    const ses = event.sender.session;
    await ses.clearCache();
    await ses.clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage']
    });
    console.log('[Main] Cache and Storage cleared');
});
// Navigation IPC
electron_1.ipcMain.on('webview-go-back', (event) => {
    const wc = event.sender;
    if (wc.canGoBack()) {
        wc.goBack();
        mainWindow?.webContents.send('navigation-feedback', 'back');
    }
});
electron_1.ipcMain.on('webview-go-forward', (event) => {
    const wc = event.sender;
    if (wc.canGoForward()) {
        wc.goForward();
        mainWindow?.webContents.send('navigation-feedback', 'forward');
    }
});
// Context Menu IPC
electron_1.ipcMain.on('show-context-menu', (event, params) => {
    const template = [];
    const webContents = event.sender;
    const win = electron_1.BrowserWindow.fromWebContents(webContents);
    // Helper to generic create tab
    const createTab = (url) => {
        if (win) {
            win.webContents.send('create-tab', { url });
        }
    };
    // --- Link Context ---
    if (params.linkURL) {
        template.push({
            label: 'Open Link in New Tab',
            click: () => createTab(params.linkURL)
        });
        template.push({
            label: 'Copy Link Address',
            click: () => electron_1.clipboard.writeText(params.linkURL)
        });
        template.push({ type: 'separator' });
    }
    // --- Image Context ---
    if (params.mediaType === 'image' && params.srcURL) {
        template.push({
            label: 'Open Image in New Tab',
            click: () => createTab(`rizo://view-image?src=${encodeURIComponent(params.srcURL)}`)
        });
        template.push({
            label: 'Save Image As...',
            click: async () => {
                // Dialog First flow
                const defaultName = params.srcURL.split('/').pop()?.split('?')[0] || 'image.png';
                // Show dialog immediately
                const { filePath } = await electron_1.dialog.showSaveDialog(win || mainWindow, {
                    defaultPath: defaultName,
                    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', '*'] }]
                });
                if (filePath) {
                    // Store the decision
                    saveAsPaths.set(params.srcURL, filePath);
                    webContents.downloadURL(params.srcURL);
                }
            }
        });
        template.push({
            label: 'Copy Image',
            click: () => {
                // Use integer coordinates to be safe
                webContents.copyImageAt(Math.floor(params.x), Math.floor(params.y));
            }
        });
        template.push({
            label: 'Copy Image Address',
            click: () => electron_1.clipboard.writeText(params.srcURL)
        });
        template.push({ type: 'separator' });
    }
    // --- Selection Context ---
    if (params.selectionText) {
        template.push({
            label: `Search Google for "${params.selectionText.length > 20 ? params.selectionText.substring(0, 20) + '...' : params.selectionText}"`,
            click: () => createTab(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`)
        });
        template.push({ type: 'separator' });
        template.push({ role: 'cut' });
        template.push({ role: 'copy' });
        template.push({ role: 'paste' });
        template.push({ type: 'separator' });
    }
    // --- Generic / Page Context ---
    // Only show "Back/Forward/Reload" if not selecting text or image to keep it clean, 
    // OR show them always if standard browser behavior (usually they are at the top or bottom).
    if (!params.linkURL && !params.selectionText && params.mediaType === 'none') {
        template.push({
            label: 'Back',
            enabled: params.editFlags?.canGoBack,
            click: () => webContents.send('execute-browser-backward')
        });
        template.push({
            label: 'Forward',
            enabled: params.editFlags?.canGoForward,
            click: () => webContents.send('execute-browser-forward')
        });
        template.push({
            label: 'Reload',
            click: () => webContents.send('reload')
        });
        template.push({ type: 'separator' });
        template.push({
            label: 'Print...',
            click: () => webContents.print()
        });
        template.push({ type: 'separator' });
    }
    // --- Developer ---
    template.push({
        label: 'Inspect Element',
        click: () => {
            webContents.inspectElement(params.x, params.y);
        }
    });
    const menu = electron_1.Menu.buildFromTemplate(template);
    if (win) {
        menu.popup({ window: win });
    }
});
electron_1.ipcMain.on('open-dev-tools', (event) => {
    event.sender.openDevTools();
});
// --- Gemini Context Bridge ---
electron_1.ipcMain.on('gemini-summarize-request', () => {
    mainWindow?.webContents.send('gemini-get-context');
});
electron_1.ipcMain.on('gemini-context-data', (_event, data) => {
    // Forward to Gemini Panel (which is also in MainWindow renderer, but we broadcast it)
    // The GeminiPanel component will pick this up
    mainWindow?.webContents.send('gemini-inject-context', data);
    // Also ensure Gemini Panel is open
    mainWindow?.webContents.send('open-gemini-panel');
});
electron_1.ipcMain.handle('get-suggestions', async (_event, query) => {
    if (!query || !query.trim())
        return [];
    return new Promise((resolve) => {
        const request = electron_1.net.request(`http://google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
        request.on('response', (response) => {
            let body = '';
            response.on('data', (chunk) => {
                body += chunk;
            });
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    // Google returns [query, [list of suggestions], ...]
                    // We just want the list at index 1
                    resolve(parsed[1] || []);
                }
                catch (e) {
                    resolve([]); // Fail silently if JSON is bad
                }
            });
        });
        request.on('error', (err) => {
            console.error('[Main] Search suggestion failed:', err);
            resolve([]); // Don't crash the app, just return empty list
        });
        request.end();
    });
});
// --- Profile Management IPC ---
electron_1.ipcMain.handle('get-profiles-list', () => {
    if (!fs_1.default.existsSync(rootConfigPath))
        return [];
    try {
        const config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
        return config.profiles || [];
    }
    catch (e) {
        return [];
    }
});
electron_1.ipcMain.handle('create-profile', (_event, { name, avatar }) => {
    const id = (0, crypto_1.randomUUID)();
    let config = { profiles: [] };
    if (fs_1.default.existsSync(rootConfigPath)) {
        try {
            config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
        }
        catch (e) { }
    }
    const newProfile = { id, name, avatar: avatar || 'default' };
    config.profiles = [...(config.profiles || []), newProfile];
    // Ensure profile dir exists
    const profilePath = path_1.default.join(profilesDir, id);
    if (!fs_1.default.existsSync(profilePath)) {
        fs_1.default.mkdirSync(profilePath, { recursive: true });
    }
    fs_1.default.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
    return newProfile;
});
electron_1.ipcMain.on('select-profile', (_event, { id, alwaysOpen }) => {
    if (alwaysOpen) {
        let config = { profiles: [] };
        if (fs_1.default.existsSync(rootConfigPath)) {
            try {
                config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
            }
            catch (e) { }
        }
        config.alwaysOpenProfile = id;
        fs_1.default.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
    }
    // Relaunch
    electron_1.app.relaunch({ args: process.argv.slice(1).filter(a => !a.startsWith('--profile-id=')).concat([`--profile-id=${id}`]) });
    electron_1.app.exit(0);
});
electron_1.ipcMain.on('switch-to-profile-selector', () => {
    let config = { profiles: [] };
    if (fs_1.default.existsSync(rootConfigPath)) {
        try {
            config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
        }
        catch (e) { }
    }
    delete config.alwaysOpenProfile; // Reset always open if we explicitly go back
    fs_1.default.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
    // Relaunch
    electron_1.app.relaunch({ args: process.argv.slice(1).filter(a => !a.startsWith('--profile-id=')).concat(['--selection-mode=true']) });
    electron_1.app.exit(0);
});
// --- Import Data IPC ---
electron_1.ipcMain.handle('import-browser-data', async (_event, browser) => {
    const localAppData = process.env.LOCALAPPDATA || '';
    let bookmarksPath = '';
    if (browser === 'chrome') {
        bookmarksPath = path_1.default.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks');
    }
    else if (browser === 'edge') {
        bookmarksPath = path_1.default.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Bookmarks');
    }
    if (!fs_1.default.existsSync(bookmarksPath)) {
        console.log(`[Import] No bookmarks found for ${browser} at ${bookmarksPath}`);
        return { bookmarks: [] };
    }
    try {
        const data = JSON.parse(fs_1.default.readFileSync(bookmarksPath, 'utf-8'));
        const bookmarks = [];
        // Check checksum or roots to be valid?
        if (!data.roots) {
            return { bookmarks: [] };
        }
        const processNode = (node, folderName) => {
            if (node.type === 'url') {
                bookmarks.push({
                    id: (0, crypto_1.randomUUID)(),
                    title: node.name,
                    url: node.url,
                    favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${node.url}` // Auto-fetch favicon on frontend or store url
                });
            }
            else if (node.type === 'folder' && node.children) {
                node.children.forEach((child) => processNode(child, node.name));
            }
        };
        // Chrome structure has 'roots' -> 'bookmark_bar', 'other', 'synced'
        if (data.roots.bookmark_bar)
            processNode(data.roots.bookmark_bar);
        if (data.roots.other)
            processNode(data.roots.other);
        if (data.roots.synced)
            processNode(data.roots.synced);
        console.log(`[Import] Found ${bookmarks.length} bookmarks from ${browser}`);
        return { bookmarks };
    }
    catch (e) {
        console.error(`[Import] Failed to read ${browser} bookmarks`, e);
        return { bookmarks: [], error: 'Failed to read file' };
    }
});
electron_1.ipcMain.handle('delete-profile', async (_event, id) => {
    if (!fs_1.default.existsSync(rootConfigPath))
        return false;
    try {
        let config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
        config.profiles = (config.profiles || []).filter((p) => p.id !== id);
        if (config.alwaysOpenProfile === id) {
            delete config.alwaysOpenProfile;
            const s = await initElectronStore();
            s.delete('settings'); // Optional: clear local store for that profile if needed, but profiles are dir based now
        }
        fs_1.default.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
        // Optionally delete data dir (User didn't explicitly ask for deletion of physical files, 
        // but it's cleaner. Let's keep it safe and just remove from config for now unless they ask).
        return true;
    }
    catch (e) {
        return false;
    }
});
electron_1.ipcMain.handle('rename-profile', (_event, { id, name }) => {
    if (!fs_1.default.existsSync(rootConfigPath))
        return false;
    try {
        let config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
        config.profiles = (config.profiles || []).map((p) => p.id === id ? { ...p, name } : p);
        fs_1.default.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
        return true;
    }
    catch (e) {
        return false;
    }
});
electron_1.ipcMain.on('open-default-browser-settings', () => {
    // Attempt to register as default for http/https right before opening settings
    electron_1.app.setAsDefaultProtocolClient('http');
    electron_1.app.setAsDefaultProtocolClient('https');
    if (process.platform === 'win32') {
        electron_1.shell.openExternal('ms-settings:defaultapps');
    }
    else if (process.platform === 'darwin') {
        electron_1.shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
    }
    else {
        // Linux/Other
        electron_1.shell.openExternal('https://www.google.com/search?q=how+to+set+default+browser');
    }
});
// --- Password Manager (Secure Vault) ---
const getPasswordsPath = () => path_1.default.join(electron_1.app.getPath('userData'), 'passwords.json');
electron_1.ipcMain.handle('get-passwords', () => {
    const pPath = getPasswordsPath();
    if (!fs_1.default.existsSync(pPath))
        return [];
    try {
        const encryptedData = JSON.parse(fs_1.default.readFileSync(pPath, 'utf-8'));
        return encryptedData.map((p) => {
            try {
                return {
                    ...p,
                    password: electron_1.safeStorage.decryptString(Buffer.from(p.password, 'hex'))
                };
            }
            catch (e) {
                return { ...p, password: '' }; // Failed to decrypt (e.g. machine change)
            }
        });
    }
    catch (e) {
        return [];
    }
});
electron_1.ipcMain.handle('save-password', (_event, { url, username, password }) => {
    const pPath = getPasswordsPath();
    let passwords = [];
    if (fs_1.default.existsSync(pPath)) {
        try {
            passwords = JSON.parse(fs_1.default.readFileSync(pPath, 'utf-8'));
        }
        catch (e) { }
    }
    const encryptedPassword = electron_1.safeStorage.encryptString(password).toString('hex');
    let domain = url;
    try {
        domain = new URL(url).hostname;
    }
    catch (e) { }
    const existingIndex = passwords.findIndex(p => p.domain === domain && p.username === username);
    if (existingIndex > -1) {
        passwords[existingIndex].password = encryptedPassword;
    }
    else {
        passwords.push({ domain, username, password: encryptedPassword, timestamp: Date.now() });
    }
    fs_1.default.writeFileSync(pPath, JSON.stringify(passwords, null, 2));
    return true;
});
electron_1.ipcMain.handle('delete-password', (_event, { domain, username }) => {
    const pPath = getPasswordsPath();
    if (!fs_1.default.existsSync(pPath))
        return false;
    try {
        let passwords = JSON.parse(fs_1.default.readFileSync(pPath, 'utf-8'));
        passwords = passwords.filter((p) => !(p.domain === domain && p.username === username));
        fs_1.default.writeFileSync(pPath, JSON.stringify(passwords, null, 2));
        return true;
    }
    catch (e) {
        return false;
    }
});
// --- History System (Time Travel) ---
const getHistoryPath = () => path_1.default.join(electron_1.app.getPath('userData'), 'history.json');
electron_1.ipcMain.handle('add-history-entry', (_event, entry) => {
    const hPath = getHistoryPath();
    let history = [];
    if (fs_1.default.existsSync(hPath)) {
        try {
            history = JSON.parse(fs_1.default.readFileSync(hPath, 'utf-8'));
        }
        catch (e) { }
    }
    // Capture entry
    history.unshift({
        ...entry,
        timestamp: Date.now()
    });
    // Prune logic: 1 year retention
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const prunedHistory = history.filter(h => h.timestamp > oneYearAgo).slice(0, 5000); // Also cap at 5k for performance
    fs_1.default.writeFileSync(hPath, JSON.stringify(prunedHistory, null, 2));
    return true;
});
electron_1.ipcMain.handle('get-history', () => {
    const hPath = getHistoryPath();
    if (!fs_1.default.existsSync(hPath))
        return [];
    try {
        const data = fs_1.default.readFileSync(hPath, 'utf-8');
        return JSON.parse(data);
    }
    catch (e) {
        return [];
    }
});
electron_1.ipcMain.handle('delete-history-entry', (_event, timestamp) => {
    const hPath = getHistoryPath();
    if (!fs_1.default.existsSync(hPath))
        return false;
    try {
        let history = JSON.parse(fs_1.default.readFileSync(hPath, 'utf-8'));
        history = history.filter((h) => h.timestamp !== timestamp);
        fs_1.default.writeFileSync(hPath, JSON.stringify(history, null, 2));
        return true;
    }
    catch (e) {
        return false;
    }
});
electron_1.ipcMain.handle('clear-history', (_event, timeframe) => {
    const hPath = getHistoryPath();
    if (!fs_1.default.existsSync(hPath))
        return true;
    if (timeframe === 'all') {
        fs_1.default.writeFileSync(hPath, JSON.stringify([], null, 2));
        return true;
    }
    let cutoff = 0;
    const now = Date.now();
    if (timeframe === 'hour')
        cutoff = now - (60 * 60 * 1000);
    else if (timeframe === 'day')
        cutoff = now - (24 * 60 * 60 * 1000);
    else if (timeframe === 'week')
        cutoff = now - (7 * 24 * 60 * 60 * 1000);
    try {
        let history = JSON.parse(fs_1.default.readFileSync(hPath, 'utf-8'));
        history = history.filter((h) => h.timestamp < cutoff);
        fs_1.default.writeFileSync(hPath, JSON.stringify(history, null, 2));
        return true;
    }
    catch (e) {
        return false;
    }
});
electron_1.ipcMain.on('password-form-submit', (event, data) => {
    // Get the main window where the UI prompt should show
    mainWindow?.webContents.send('prompt-save-password', data);
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
//# sourceMappingURL=main.js.map