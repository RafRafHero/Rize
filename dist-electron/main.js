"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
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
// --- Global Shortcut Variables (Main Process Cache) ---
let currentPaletteKey = 'CommandOrControl+K';
let currentGhostSearchKey = 'CommandOrControl+Space';
let currentShowcaseKey = 'CommandOrControl+Shift+T';
let shortcutsEnabled = true;
async function refreshShortcutCache() {
    console.log('[Main] Refreshing shortcut cache...');
    try {
        const s = await initElectronStore();
        let settings = s.get('settings');
        if (!settings || typeof settings !== 'object')
            settings = { keybinds: {} };
        if (!settings.keybinds)
            settings.keybinds = {};
        let changed = false;
        if (settings.keybinds.commandPalette === 'CommandOrControl+K' || !settings.keybinds.commandPalette) {
            settings.keybinds.commandPalette = 'CommandOrControl+Alt+K';
            changed = true;
        }
        if (settings.keybinds.ghostSearch === 'CommandOrControl+Space' || !settings.keybinds.ghostSearch) {
            settings.keybinds.ghostSearch = 'CommandOrControl+Alt+Space';
            changed = true;
        }
        if (settings.keybinds.tabsShowcase === 'CommandOrControl+Shift+T' || !settings.keybinds.tabsShowcase) {
            settings.keybinds.tabsShowcase = 'CommandOrControl+Alt+Shift+T';
            changed = true;
        }
        if (changed)
            s.set('settings', settings);
        currentPaletteKey = settings.keybinds.commandPalette || 'CommandOrControl+Alt+K';
        currentGhostSearchKey = settings.keybinds.ghostSearch || 'CommandOrControl+Alt+Space';
        currentShowcaseKey = settings.keybinds.tabsShowcase || 'CommandOrControl+Alt+Shift+T';
        console.log('[Main] Shortcut cache ready:', { currentPaletteKey, currentGhostSearchKey, currentShowcaseKey });
    }
    catch (e) {
        console.error('[Main] ERROR in refreshShortcutCache:', e);
        currentPaletteKey = 'CommandOrControl+Alt+K';
        currentGhostSearchKey = 'CommandOrControl+Alt+Space';
        currentShowcaseKey = 'CommandOrControl+Alt+Shift+T';
    }
}
// Shortcuts are now handled via before-input-event in web-contents-created
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
        electron_1.app.setAsDefaultProtocolClient('http', process.execPath, [path_1.default.resolve(process.argv[1])]);
        electron_1.app.setAsDefaultProtocolClient('https', process.execPath, [path_1.default.resolve(process.argv[1])]);
    }
}
else {
    electron_1.app.setAsDefaultProtocolClient('rizo');
    electron_1.app.setAsDefaultProtocolClient('http');
    electron_1.app.setAsDefaultProtocolClient('https');
}
// Deep link URL holder (for external links)
let deeplinkUrl = null;
// Global User-Agent spoofing to bypass Google's Electron detection - Using a modern Chrome UA
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
electron_1.app.userAgentFallback = CHROME_UA;
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
// registerIpcHandlers is defined at the bottom of the file
// Profile Management Configuration
const originalUserDataPath = electron_1.app.getPath('userData');
const profilesDir = path_1.default.join(originalUserDataPath, 'profiles');
const rootConfigPath = path_1.default.join(originalUserDataPath, 'profiles-config.json');
if (!fs_1.default.existsSync(profilesDir)) {
    fs_1.default.mkdirSync(profilesDir, { recursive: true });
}
let currentProfileId = process.argv.find(arg => arg.startsWith('--profile-id='))?.split('=')[1];
const isSelectionMode = process.argv.includes('--selection-mode=true') || process.argv.includes('--selection-mode');
const isIncognitoProcess = process.argv.includes('--incognito');
// Auto-load Single Profile Logic (if not explicitly selecting or incognito)
if (!currentProfileId && !isSelectionMode && !isIncognitoProcess) {
    try {
        const s = new (require('electron-store'))();
        const profiles = s.get('profiles') || [];
        if (profiles.length === 1) {
            currentProfileId = profiles[0].id; // Auto-select the only profile
        }
        // Also check last active profile
        const lastActive = s.get('lastActiveProfileId');
        if (!currentProfileId && lastActive && profiles.find((p) => p.id === lastActive)) {
            currentProfileId = lastActive;
        }
    }
    catch (e) {
        console.error('Failed to auto-load profile', e);
    }
}
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
            partition: isIncognito ? 'incognito' : (currentProfileId ? `persist:profile_${currentProfileId}` : 'persist:rizo'),
        },
    });
    // Global Navigation & Window Protections (Apply to webviews too)
    mainWindow.webContents.setWindowOpenHandler(({ url, disposition, features }) => {
        // Allow Google Drive downloads and docs to open (they often trigger will-download)
        if (url.includes('drive.google.com/download') || url.includes('doc-')) {
            return { action: 'allow' };
        }
        // Handle Popups (forced by features or disposition)
        if (disposition === 'new-window' || (features && features !== '')) {
            console.log(`[Main] Allowing popup window for URL: ${url}`);
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    frame: true, // Native frame for popups
                    titleBarStyle: 'default',
                    show: true,
                    webPreferences: {
                        partition: isIncognitoProcess ? 'incognito' : (currentProfileId ? `persist:profile_${currentProfileId}` : 'persist:rizo'),
                        preload: path_1.default.join(__dirname, 'preload.js'),
                        contextIsolation: true,
                        nodeIntegration: false,
                        webviewTag: true,
                    }
                }
            };
        }
        // Default: Open in a new tab within the same window
        console.log(`[Main] Redirecting to new tab: ${url}`);
        mainWindow?.webContents.send('create-tab', { url });
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
    if ((!currentProfileId && !isIncognito) || isSelectionMode)
        queryParams.set('selectionMode', 'true');
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + queryString);
    }
    else {
        // Production Path Logic - User Requested Fix
        const prodPath = path_1.default.join(electron_1.app.getAppPath(), 'dist/index.html');
        mainWindow.loadFile(prodPath, { search: queryParams.toString() });
    }
    // mainWindow.webContents.openDevTools();
};
// Global Shortcut Fallback: Catch primary shortcuts even if focused inside any web-contents (webview/window)
electron_1.app.on('web-contents-created', (_event, contents) => {
    contents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown')
            return;
        if (input.control || input.meta || input.alt) {
            console.log(`[Shortcut EXTREME] Key: "${input.key}", Code: "${input.code}", Ctrl: ${input.control}, Shift: ${input.shift}, Meta: ${input.meta}, Alt: ${input.alt}, Enabled: ${shortcutsEnabled}`);
        }
        if (!shortcutsEnabled)
            return;
        const isMac = process.platform === 'darwin';
        const checkMatch = (keys, name) => {
            if (!keys)
                return false;
            const parts = keys.toLowerCase().split('+');
            const hasCmdOrCtrl = parts.includes('commandorcontrol');
            const needsCtrl = parts.includes('control') || parts.includes('ctrl') || (hasCmdOrCtrl && !isMac);
            const needsCmd = parts.includes('command') || parts.includes('cmd') || parts.includes('meta') || (hasCmdOrCtrl && isMac);
            const needsShift = parts.includes('shift');
            const needsAlt = parts.includes('alt');
            const targetKey = parts.find(p => !['control', 'ctrl', 'commandorcontrol', 'command', 'cmd', 'shift', 'alt', 'meta'].includes(p));
            const matchModifiers = (needsCtrl === !!input.control) &&
                (needsCmd === !!input.meta) &&
                (needsShift === !!input.shift) &&
                (needsAlt === !!input.alt);
            if (!matchModifiers)
                return false;
            if (targetKey) {
                const ik = input.key.toLowerCase();
                const ic = input.code.toLowerCase();
                const tk = targetKey.toLowerCase();
                const isKeyMatch = ik === tk || ic === `key${tk}` || ic === `digit${tk}` || ic === tk || (tk === ' ' && ik === ' ');
                if (isKeyMatch) {
                    console.log(`[Shortcut Match TEST] ${name} matched!`);
                    return true;
                }
                return false;
            }
            return true;
        };
        const win = electron_1.BrowserWindow.fromWebContents(contents) || electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
        if (!win)
            return;
        // --- Custom Action Shortcuts ---
        if (checkMatch(currentPaletteKey, 'Palette')) {
            win.webContents.send('trigger-command-palette', true); // Explicit ON
            event.preventDefault();
            return;
        }
        if (checkMatch(currentGhostSearchKey, 'Ghost')) {
            win.webContents.send('trigger-ghost-search', true); // Explicit ON
            event.preventDefault();
            return;
        }
        if (checkMatch(currentShowcaseKey, 'Showcase')) {
            win.webContents.send('toggle-tabs-showcase', true); // Explicit ON
            event.preventDefault();
            return;
        }
        // --- Standard Browser Shortcuts (Inside Listener) ---
        if (checkMatch('CommandOrControl+Shift+I', 'DevTools') || input.key === 'F12') {
            contents.openDevTools();
            event.preventDefault();
            return;
        }
        if (checkMatch('CommandOrControl+R', 'Refresh') || input.key === 'F5') {
            contents.reload();
            event.preventDefault();
            return;
        }
        if (checkMatch('CommandOrControl+F', 'Find')) {
            win.webContents.send('toggle-find-bar');
            event.preventDefault();
            return;
        }
        if (checkMatch('Alt+S', 'Gemini')) {
            win.webContents.send('gemini-get-context');
            event.preventDefault();
            return;
        }
        if (checkMatch('CommandOrControl+Plus', 'ZoomIn') || checkMatch('CommandOrControl+=', 'ZoomIn')) {
            win.webContents.send('zoom-in');
            event.preventDefault();
            return;
        }
        if (checkMatch('CommandOrControl+-', 'ZoomOut')) {
            win.webContents.send('zoom-out');
            event.preventDefault();
            return;
        }
        if (checkMatch('CommandOrControl+0', 'ZoomReset')) {
            win.webContents.send('zoom-reset');
            event.preventDefault();
            return;
        }
    });
});
// --- User Agent Spoofing (Fix Google CAPTCHA & YouTube) ---
const applyUASpoofing = (ses) => {
    const userAgent = CHROME_UA;
    ses.setUserAgent(userAgent);
    // We avoid onBeforeSendHeaders here to prevent conflicts with adblocker if possible, 
    // setUserAgent is usually enough for most sites.
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
const applyYouTubeNetworkBlocker = async (ses) => {
    // Instead of a separate onBeforeRequest (which conflicts with AdBlocker),
    // we add these patterns to the blocker engine if it's available.
    const adPatterns = [
        '||doubleclick.net^',
        '||googleads.g.doubleclick.net^',
        '||youtube.com/get_midroll_info^',
        '||youtube.com/api/stats/ads^'
    ];
    const blocker = await getBlocker();
    blocker.addFilters(adPatterns);
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
// --- Auto Updater Logic ---
electron_updater_1.autoUpdater.autoDownload = true;
electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
electron_updater_1.autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    mainWindow?.webContents.send('update-available', info.version);
});
electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    // Send ready signal for the "Restart to Install" button
    mainWindow?.webContents.send('update-ready', info.version);
});
electron_updater_1.autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
});
// Poll for updates every 30 minutes
setInterval(() => {
    electron_updater_1.autoUpdater.checkForUpdates();
}, 30 * 60 * 1000);
// Check once on startup (delayed slightly to ensure window is ready)
setTimeout(() => {
    electron_updater_1.autoUpdater.checkForUpdates();
}, 10000);
// Initialize app then setup store and optimizations
electron_1.app.whenReady().then(async () => {
    createWindow(isIncognitoProcess);
    // 2. Background initialization
    try {
        initElectronStore().then(() => refreshShortcutCache());
    }
    catch (e) {
        console.error('[Main] Store init failure', e);
    }
    // Register main preload script using modern API
    electron_1.session.defaultSession.registerPreloadScript({
        id: 'main-preload',
        type: 'frame',
        filePath: path_1.default.join(__dirname, 'preload.js')
    });
    setupOptimizations(electron_1.session.defaultSession);
    setupDownloadManager(electron_1.session.defaultSession);
    // Use a persistent partition for incognito to allow caching within the session
    const incognitoSession = electron_1.session.fromPartition('incognito');
    incognitoSession.registerPreloadScript({
        id: 'main-preload-incognito',
        type: 'frame',
        filePath: path_1.default.join(__dirname, 'preload.js')
    });
    setupOptimizations(incognitoSession);
    setupDownloadManager(incognitoSession);
    // Ensure any other sessions (like profile partitions) also get the spoofing and blocking
    electron_1.app.on('session-created', (ses) => {
        const p = ses.getStoragePath() || 'default';
        console.log(`[Main] Session created for partition: ${p}`);
        setupOptimizations(ses);
        setupDownloadManager(ses);
    });
    registerIpcHandlers(); // Consolidated registration
    // 3. Non-blocking shortcut registration
    setTimeout(() => {
        try {
            // --- Shortcut Strategy: Menu Accelerators ---
            const template = [
                {
                    label: 'Shortcuts',
                    submenu: [
                        {
                            label: 'Trigger Palette',
                            accelerator: currentPaletteKey,
                            click: () => {
                                const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
                                win?.webContents.send('trigger-command-palette', true);
                            }
                        },
                        {
                            label: 'Trigger Ghost Search',
                            accelerator: currentGhostSearchKey,
                            click: () => {
                                const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
                                win?.webContents.send('trigger-ghost-search', true);
                            }
                        },
                        {
                            label: 'Toggle Showcase',
                            accelerator: currentShowcaseKey,
                            click: () => {
                                const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
                                win?.webContents.send('toggle-tabs-showcase', true);
                            }
                        }
                    ]
                }
            ];
            const menu = electron_1.Menu.buildFromTemplate(template);
            electron_1.Menu.setApplicationMenu(menu);
            // --- Global Shortcut Fallbacks (Log only) ---
            electron_1.globalShortcut.unregisterAll();
            electron_1.globalShortcut.register(currentPaletteKey, () => {
                const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
                win?.webContents.send('trigger-command-palette', true);
            });
            electron_1.globalShortcut.register(currentGhostSearchKey, () => {
                const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
                win?.webContents.send('trigger-ghost-search', true);
            });
            electron_1.globalShortcut.register(currentShowcaseKey, () => {
                const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
                win?.webContents.send('toggle-tabs-showcase', true);
            });
            console.log('[Main] Keyboard Shortcuts Initialized Background');
        }
        catch (e) {
            console.error('[Main] Shortcut setup failure', e);
        }
    }, 2000);
});
// Handlers moved to registerIpcHandlers
// --- Tab Sleep Logic ---
// Track last accessed time per tab and check for inactive tabs
const tabAccessMap = new Map(); // tabId -> lastAccessed timestamp
// Handlers moved to registerIpcHandlers
// Hibernation checker runs every 30 seconds
setInterval(() => {
    const settings = store?.get('settings');
    if (!settings?.tabSleepEnabled)
        return;
    const freezeMinutes = settings?.freezeMinutes || 5;
    const thresholdMs = freezeMinutes * 60 * 1000;
    const now = Date.now();
    tabAccessMap.forEach((lastAccessed, tabId) => {
        if (now - lastAccessed > thresholdMs) {
            console.log(`[TabSleep] Tab ${tabId} is now sleeping (inactive for ${freezeMinutes}min)`);
            mainWindow?.webContents.send('sleep-tab', tabId);
            tabAccessMap.delete(tabId); // Remove so we don't keep sending
        }
    });
}, 30000);
// --- IPC Handlers ---
// Handlers moved to registerIpcHandlers
// --- AI Whisper Bar Handler ---
// Handlers moved to registerIpcHandlers
// Deep link handling for external URLs
const handleDeepLink = (url) => {
    // Focus the main window and open the URL
    if (mainWindow) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('open-url', url);
    }
    else {
        // Store URL to open after window is created
        deeplinkUrl = url;
    }
};
// Handle open-url event on macOS
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
});
// Handle second-instance (Windows deep linking)
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine) => {
        // Windows: URL is passed as argument
        const url = commandLine.find(arg => arg.startsWith('http://') || arg.startsWith('https://'));
        if (url) {
            handleDeepLink(url);
        }
        else if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
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
    // Window Open Handler: Handle popups and new tabs for all web contents
    contents.setWindowOpenHandler(({ url, disposition, features }) => {
        if (url.includes('drive.google.com/download') || url.includes('doc-')) {
            return { action: 'allow' };
        }
        if (disposition === 'new-window' || (features && features !== '')) {
            console.log(`[Main] Allowing popup for web-contents: ${url}`);
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    frame: true, // Native frame for popups
                    titleBarStyle: 'default',
                    show: true,
                    webPreferences: {
                        partition: isIncognitoProcess ? 'incognito' : (currentProfileId ? `persist:profile_${currentProfileId}` : 'persist:rizo'),
                        preload: path_1.default.join(__dirname, 'preload.js'),
                        contextIsolation: true,
                        nodeIntegration: false,
                    }
                }
            };
        }
        console.log(`[Main] Sending new-tab request for web-contents: ${url}`);
        mainWindow?.webContents.send('create-tab', { url });
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
// Handlers moved to registerIpcHandlers
const launchIncognito = () => {
    const { spawn } = require('child_process');
    const args = process.argv.slice(1).filter(a => a !== '--incognito');
    args.push('--incognito');
    spawn(process.execPath, args, {
        detached: true,
        stdio: 'ignore'
    }).unref();
};
// Handlers moved to registerIpcHandlers
// Context Menu IPC
// Handlers moved to registerIpcHandlers
// --- Profile Management IPC ---
// Handlers moved to registerIpcHandlers
// --- Import Data IPC ---
// Handlers moved to registerIpcHandlers
// Handlers moved to registerIpcHandlers
// --- Password Manager (Secure Vault) ---
const getPasswordsPath = () => path_1.default.join(electron_1.app.getPath('userData'), 'passwords.json');
// Handlers moved to registerIpcHandlers
// --- History System (Time Travel) ---
const getHistoryPath = () => path_1.default.join(electron_1.app.getPath('userData'), 'history.json');
// Handlers moved to registerIpcHandlers
// --- CONSOLIDATED IPC HANDLERS ---
const registerIpcHandlers = () => {
    // Auto Updater
    electron_1.ipcMain.removeHandler('get-app-version');
    electron_1.ipcMain.handle('get-app-version', () => electron_1.app.getVersion());
    electron_1.ipcMain.removeHandler('quit-and-install');
    electron_1.ipcMain.handle('quit-and-install', () => {
        electron_updater_1.autoUpdater.quitAndInstall(false, true);
    });
    // System
    electron_1.ipcMain.removeHandler('get-preload-path');
    electron_1.ipcMain.handle('get-preload-path', () => {
        return path_1.default.join(__dirname, 'preload.js');
    });
    electron_1.ipcMain.removeHandler('is-default-browser');
    electron_1.ipcMain.handle('is-default-browser', () => {
        return electron_1.app.isDefaultProtocolClient('http');
    });
    electron_1.ipcMain.removeHandler('set-as-default');
    electron_1.ipcMain.handle('set-as-default', () => {
        if (process.platform === 'win32') {
            electron_1.shell.openExternal('ms-settings:defaultapps');
        }
        else if (process.platform === 'darwin') {
            electron_1.app.setAsDefaultProtocolClient('http');
            electron_1.app.setAsDefaultProtocolClient('https');
        }
        else {
            const { exec } = require('child_process');
            exec('xdg-settings set default-web-browser rizo.desktop');
        }
        return true;
    });
    electron_1.ipcMain.on('open-default-browser-settings', () => {
        electron_1.app.setAsDefaultProtocolClient('http');
        electron_1.app.setAsDefaultProtocolClient('https');
        if (process.platform === 'win32')
            electron_1.shell.openExternal('ms-settings:defaultapps');
        else if (process.platform === 'darwin')
            electron_1.shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
        else
            electron_1.shell.openExternal('https://www.google.com/search?q=how+to+set+default+browser');
    });
    // Store
    electron_1.ipcMain.removeHandler('get-store-value');
    electron_1.ipcMain.handle('get-store-value', async (event, key) => {
        const s = await initElectronStore();
        return s.get(key);
    });
    electron_1.ipcMain.removeHandler('set-store-value');
    electron_1.ipcMain.handle('set-store-value', async (event, key, value) => {
        const s = await initElectronStore();
        s.set(key, value);
    });
    electron_1.ipcMain.removeHandler('get-extension-storage');
    electron_1.ipcMain.handle('get-extension-storage', async (event, key) => {
        const s = await initElectronStore();
        return s.get(key);
    });
    // Profile Management
    electron_1.ipcMain.removeHandler('get-profiles-list');
    electron_1.ipcMain.handle('get-profiles-list', async () => {
        const s = await initElectronStore();
        return s.get('profiles') || [];
    });
    electron_1.ipcMain.removeHandler('create-profile');
    electron_1.ipcMain.handle('create-profile', async (_event, profileData) => {
        const s = await initElectronStore();
        const profiles = s.get('profiles') || [];
        const newProfile = { id: (0, crypto_1.randomUUID)(), ...profileData, avatar: profileData.avatar || 'default' };
        profiles.push(newProfile);
        s.set('profiles', profiles); // PERSIST IMMEDIATELY
        return newProfile;
    });
    electron_1.ipcMain.removeHandler('set-active-profile');
    electron_1.ipcMain.handle('set-active-profile', async (_event, id) => {
        const s = await initElectronStore();
        s.set('lastActiveProfileId', id);
    });
    electron_1.ipcMain.removeHandler('delete-profile');
    electron_1.ipcMain.handle('delete-profile', async (_event, id) => {
        if (!fs_1.default.existsSync(rootConfigPath))
            return false;
        try {
            let config = JSON.parse(fs_1.default.readFileSync(rootConfigPath, 'utf-8'));
            config.profiles = (config.profiles || []).filter((p) => p.id !== id);
            if (config.alwaysOpenProfile === id) {
                delete config.alwaysOpenProfile;
                const s = await initElectronStore();
                // s.delete('settings'); // Optional
            }
            fs_1.default.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
            return true;
        }
        catch (e) {
            return false;
        }
    });
    electron_1.ipcMain.removeHandler('rename-profile');
    electron_1.ipcMain.handle('rename-profile', async (_event, { id, name }) => {
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
        delete config.alwaysOpenProfile;
        fs_1.default.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
        electron_1.app.relaunch({ args: process.argv.slice(1).filter(a => !a.startsWith('--profile-id=')).concat(['--selection-mode=true']) });
        electron_1.app.exit(0);
    });
    electron_1.ipcMain.on('open-incognito-window', () => {
        launchIncognito();
    });
    // AI & Suggestions
    electron_1.ipcMain.removeHandler('ask-ai');
    electron_1.ipcMain.handle('ask-ai', async (event, { text, prompt }) => {
        const settings = store.get('settings');
        const API_KEY = settings?.openRouterApiKey || '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';
        try {
            const response = await (0, cross_fetch_1.default)('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'HTTP-Referer': 'https://rizo.browser',
                    'X-Title': 'Rizo Browser',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a browser command palette assistant. 
              Output MUST be a valid JSON object ONLY. 
              DO NOT wrap in markdown code blocks. NO conversational filler.
              Required structure: { "results": [], "directAnswer": "" }
              - results: Array of {title, subtitle, type: "url"|"copy"|"action", url?, content?, actionType?}
              - directAnswer: string (if the user asks a question, put the text here).`
                        },
                        { role: 'user', content: `${prompt}\n\nInput Text:\n"${text}"` }
                    ]
                })
            });
            if (!response.ok)
                throw new Error('AI Request Failed');
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "No response generated.";
        }
        catch (error) {
            console.error('[Main] AI Error:', error);
            return "Sorry, I encountered an error connecting to the AI.";
        }
    });
    electron_1.ipcMain.removeHandler('get-suggestions');
    electron_1.ipcMain.handle('get-suggestions', async (_event, query) => {
        if (!query || !query.trim())
            return [];
        return new Promise((resolve) => {
            const request = electron_1.net.request(`http://google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
            request.on('response', (response) => {
                let body = '';
                response.on('data', (chunk) => body += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(body)[1] || []);
                    }
                    catch (e) {
                        resolve([]);
                    }
                });
            });
            request.on('error', () => resolve([]));
            request.end();
        });
    });
    // Browser Data & History
    electron_1.ipcMain.removeHandler('import-browser-data');
    electron_1.ipcMain.handle('import-browser-data', async (_event, browser) => {
        const localAppData = process.env.LOCALAPPDATA || '';
        let bookmarksPath = browser === 'chrome'
            ? path_1.default.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks')
            : path_1.default.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Bookmarks');
        if (!fs_1.default.existsSync(bookmarksPath))
            return { bookmarks: [] };
        try {
            const data = JSON.parse(fs_1.default.readFileSync(bookmarksPath, 'utf-8'));
            const bookmarks = [];
            const processNode = (node) => {
                if (node.type === 'url')
                    bookmarks.push({ id: (0, crypto_1.randomUUID)(), title: node.name, url: node.url, favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${node.url}` });
                else if (node.type === 'folder' && node.children)
                    node.children.forEach(processNode);
            };
            if (data.roots.bookmark_bar)
                processNode(data.roots.bookmark_bar);
            if (data.roots.other)
                processNode(data.roots.other);
            if (data.roots.synced)
                processNode(data.roots.synced);
            return { bookmarks };
        }
        catch (e) {
            return { bookmarks: [], error: 'Failed to read file' };
        }
    });
    electron_1.ipcMain.removeHandler('add-history-entry');
    electron_1.ipcMain.handle('add-history-entry', (_event, entry) => {
        const hPath = getHistoryPath();
        let history = [];
        if (fs_1.default.existsSync(hPath)) {
            try {
                history = JSON.parse(fs_1.default.readFileSync(hPath, 'utf-8'));
            }
            catch (e) { }
        }
        history.unshift({ ...entry, timestamp: Date.now() });
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        const prunedHistory = history.filter(h => h.timestamp > oneYearAgo).slice(0, 5000);
        fs_1.default.writeFileSync(hPath, JSON.stringify(prunedHistory, null, 2));
        return true;
    });
    electron_1.ipcMain.removeHandler('get-history');
    electron_1.ipcMain.handle('get-history', () => {
        const hPath = getHistoryPath();
        if (!fs_1.default.existsSync(hPath))
            return [];
        try {
            return JSON.parse(fs_1.default.readFileSync(hPath, 'utf-8'));
        }
        catch (e) {
            return [];
        }
    });
    electron_1.ipcMain.removeHandler('delete-history-entry');
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
    electron_1.ipcMain.removeHandler('clear-history');
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
    // Passwords
    electron_1.ipcMain.removeHandler('get-passwords');
    electron_1.ipcMain.handle('get-passwords', () => {
        const pPath = getPasswordsPath();
        if (!fs_1.default.existsSync(pPath))
            return [];
        try {
            const encryptedData = JSON.parse(fs_1.default.readFileSync(pPath, 'utf-8'));
            return encryptedData.map((p) => {
                try {
                    return { ...p, password: electron_1.safeStorage.decryptString(Buffer.from(p.password, 'hex')) };
                }
                catch (e) {
                    return { ...p, password: '' };
                }
            });
        }
        catch (e) {
            return [];
        }
    });
    electron_1.ipcMain.removeHandler('save-password');
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
        if (existingIndex > -1)
            passwords[existingIndex].password = encryptedPassword;
        else
            passwords.push({ domain, username, password: encryptedPassword, timestamp: Date.now() });
        fs_1.default.writeFileSync(pPath, JSON.stringify(passwords, null, 2));
        return true;
    });
    electron_1.ipcMain.removeHandler('delete-password');
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
    // Window Controls & UI
    electron_1.ipcMain.on('minimize-window', () => mainWindow?.minimize());
    electron_1.ipcMain.on('maximize-window', () => {
        if (mainWindow?.isMaximized())
            mainWindow.unmaximize();
        else
            mainWindow?.maximize();
    });
    electron_1.ipcMain.on('close-window', () => mainWindow?.close());
    electron_1.ipcMain.on('open-dev-tools', (event) => event.sender.openDevTools());
    electron_1.ipcMain.on('clear-cache', async (event) => {
        const ses = event.sender.session;
        await ses.clearCache();
        await ses.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage'] });
    });
    // Navigation
    electron_1.ipcMain.on('webview-go-back', (event) => {
        if (event.sender.canGoBack()) {
            event.sender.goBack();
            mainWindow?.webContents.send('navigation-feedback', 'back');
        }
    });
    electron_1.ipcMain.on('webview-go-forward', (event) => {
        if (event.sender.canGoForward()) {
            event.sender.goForward();
            mainWindow?.webContents.send('navigation-feedback', 'forward');
        }
    });
    // Downloads
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
        mainWindow?.webContents.send('download-progress', { id, receivedBytes: item.getReceivedBytes(), totalBytes: item.getTotalBytes(), state: 'progressing', isPaused: item.isPaused() });
    });
    electron_1.ipcMain.on('show-in-folder', (event, path) => electron_1.shell.showItemInFolder(path));
    electron_1.ipcMain.on('open-file', (event, path) => electron_1.shell.openPath(path));
    // Shortcuts handled via globalShortcut and before-input-event
    electron_1.ipcMain.on('set-shortcuts-enabled', (event, enabled) => {
        shortcutsEnabled = enabled;
        if (enabled) {
            // Re-register global shortcuts if enabled
            // (Assuming we call the registration function here or handle it elsewhere)
        }
        else {
            electron_1.globalShortcut.unregisterAll();
        }
        console.log('[Main] Shortcuts enabled:', enabled);
    });
    electron_1.ipcMain.on('toggle-command-palette-internal', () => {
        mainWindow?.webContents.send('trigger-command-palette');
    });
    electron_1.ipcMain.on('toggle-ghost-search-internal', () => {
        mainWindow?.webContents.send('trigger-ghost-search');
    });
    // Tab Sleep
    electron_1.ipcMain.on('tab-accessed', (event, tabId) => tabAccessMap.set(tabId, Date.now()));
    electron_1.ipcMain.on('wake-tab', (event, tabId) => tabAccessMap.set(tabId, Date.now()));
    // AdBlocker
    electron_1.ipcMain.on('update-adblocker-settings', async () => {
        blockerEngine = null;
        for (const ses of Array.from(activeSessions)) {
            const blocker = await getBlocker();
            blocker.disableBlockingInSession(ses);
            if (store.get('settings')?.adBlockEnabled)
                await enableAdBlocker(ses);
        }
    });
    // Gemini
    electron_1.ipcMain.on('gemini-summarize-request', () => mainWindow?.webContents.send('gemini-get-context'));
    electron_1.ipcMain.on('gemini-context-data', (_event, data) => {
        mainWindow?.webContents.send('gemini-inject-context', data);
        mainWindow?.webContents.send('open-gemini-panel');
    });
    electron_1.ipcMain.on('password-form-submit', (event, data) => mainWindow?.webContents.send('prompt-save-password', data));
    // Context Menu
    electron_1.ipcMain.on('show-context-menu', (event, params) => {
        const webContents = event.sender;
        const win = electron_1.BrowserWindow.fromWebContents(webContents);
        const template = [];
        const createTab = (url) => win?.webContents.send('create-tab', { url });
        if (params.linkURL) {
            template.push({ label: 'Open Link in New Tab', click: () => createTab(params.linkURL) });
            template.push({ label: 'Copy Link Address', click: () => electron_1.clipboard.writeText(params.linkURL) });
            template.push({ type: 'separator' });
        }
        if (params.mediaType === 'image' && params.srcURL) {
            template.push({ label: 'Open Image in New Tab', click: () => createTab(`rizo://view-image?src=${encodeURIComponent(params.srcURL)}`) });
            template.push({
                label: 'Save Image As...', click: async () => {
                    const { filePath } = await electron_1.dialog.showSaveDialog(win || mainWindow, { defaultPath: params.srcURL.split('/').pop()?.split('?')[0] || 'image.png' });
                    if (filePath) {
                        saveAsPaths.set(params.srcURL, filePath);
                        webContents.downloadURL(params.srcURL);
                    }
                }
            });
            template.push({ label: 'Copy Image', click: () => webContents.copyImageAt(Math.floor(params.x), Math.floor(params.y)) });
            template.push({ type: 'separator' });
        }
        if (params.selectionText) {
            template.push({ label: `Search Google for "${params.selectionText.substring(0, 20)}..."`, click: () => createTab(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`) });
            template.push({ type: 'separator' });
            template.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' });
        }
        if (!params.linkURL && !params.selectionText && params.mediaType === 'none') {
            template.push({ label: 'Back', enabled: params.editFlags?.canGoBack, click: () => webContents.send('execute-browser-backward') });
            template.push({ label: 'Forward', enabled: params.editFlags?.canGoForward, click: () => webContents.send('execute-browser-forward') });
            template.push({ label: 'Reload', click: () => webContents.send('reload') });
            template.push({ type: 'separator' }, { label: 'Print...', click: () => webContents.print() }, { type: 'separator' });
        }
        template.push({ label: 'Inspect Element', click: () => webContents.inspectElement(params.x, params.y) });
        electron_1.Menu.buildFromTemplate(template).popup({ window: win || undefined });
    });
};
//# sourceMappingURL=main.js.map