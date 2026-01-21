import { app, BrowserWindow, ipcMain, screen, Menu, clipboard, session, shell, dialog, net, safeStorage } from 'electron';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
// Initialize electron store
let store: any;
const initElectronStore = async () => {
  if (store) return store;
  const { default: Store } = await import('electron-store');
  store = new Store();
  return store;
};

// Start initialization immediately
initElectronStore();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Security: Disable remote debugging port if accidentally passed
app.commandLine.removeSwitch('remote-debugging-port');

// Ensure Rizo is registered for URL protocols
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('rizo', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('rizo');
}

// Global User-Agent spoofing to bypass Google's Electron detection
const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';
app.userAgentFallback = FIREFOX_UA;

// Profile Management Configuration
const originalUserDataPath = app.getPath('userData');
const profilesDir = path.join(originalUserDataPath, 'profiles');
const rootConfigPath = path.join(originalUserDataPath, 'profiles-config.json');

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

let currentProfileId = process.argv.find(arg => arg.startsWith('--profile-id='))?.split('=')[1];
const isIncognitoProcess = process.argv.includes('--incognito');

if (isIncognitoProcess) {
  const incognitoPath = path.join(app.getPath('appData'), 'rizo-incognito-' + Date.now());
  app.setPath('userData', incognitoPath);
} else if (currentProfileId) {
  app.setPath('userData', path.join(profilesDir, currentProfileId));
} else {
  // Check for "always open" in root config
  if (fs.existsSync(rootConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8'));
      if (config.alwaysOpenProfile) {
        currentProfileId = config.alwaysOpenProfile;
        app.setPath('userData', path.join(profilesDir, currentProfileId));
      }
    } catch (e) { }
  }
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (isIncognito = false) => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width),
    height: Math.min(800, height),
    minWidth: 800,
    minHeight: 600,
    frame: false, // Frameless for custom titlebar
    titleBarStyle: 'hidden',
    transparent: false, // Windows doesn't handle transparency + blur well without hacks, keeping it solid for now but will style with CSS.
    backgroundColor: '#00000000', // Try for transparency if supported
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
  if (isIncognito) queryParams.set('incognito', 'true');
  if (currentProfileId) queryParams.set('profileId', currentProfileId);
  if (!currentProfileId && !isIncognito) queryParams.set('selectionMode', 'true');

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}${queryString}`);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadURL(`file://${indexPath}${queryString}`);
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

app.on('ready', () => {
  // Global User-Agent spoofing for both default and incognito sessions
  const applyUASpoofing = (ses: Electron.Session) => {
    ses.setUserAgent(FIREFOX_UA);
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = FIREFOX_UA;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
  };

  applyUASpoofing(session.defaultSession);
  applyUASpoofing(session.fromPartition('incognito'));

  // Ensure any other sessions (like profile partitions) also get the spoofing
  app.on('session-created', (ses) => {
    applyUASpoofing(ses);
  });

  createWindow(isIncognitoProcess);

  // Register Incognito Shortcut
  const { globalShortcut } = require('electron');
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    launchIncognito();
  });

  // Apply protections to every new web content (including webviews)
  app.on('web-contents-created', (event, contents) => {
    const forbidden = [
      'contacts.google.com/widget',
      'passiveSignin',
      'accounts.google.com/ServiceLogin'
    ];

    const blockRedirect = (event: Electron.Event, url: string) => {
      if (forbidden.some(link => url.includes(link))) {
        console.log(`[Main] Blocked background redirect to: ${url}`);
        event.preventDefault();
      }
    };

    // Main Navigation Filter
    contents.on('will-navigate', (event: Electron.Event, url: string) => blockRedirect(event, url));

    // Frame Navigation Filter: Prevent iframes from redirecting the main window
    (contents as any).on('will-frame-navigate', (event: any, url: string, isMainFrame: boolean) => {
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
  // --- Download Manager ---
  const downloadItems = new Map<string, Electron.DownloadItem>();
  const saveAsPaths = new Map<string, string>(); // URL -> FilePath

  session.defaultSession.on('will-download', async (event, item, webContents) => {
    // Try to get filename, fallback to parsing URL if empty
    let fileName = item.getFilename();
    const url = item.getURL();
    if (!fileName || fileName === '') {
      try {
        const urlPath = new URL(url).pathname;
        fileName = path.basename(urlPath);
      } catch (e) {
        fileName = 'download';
      }
    }
    const downloadId = randomUUID();
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
      const finalFilename = item.getFilename() || path.basename(finalPath) || fileName;

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
    let chosenPath: string | undefined;
    if (saveAsPaths.has(originalUrl)) {
      chosenPath = saveAsPaths.get(originalUrl);
      saveAsPaths.delete(originalUrl);
    } else if (saveAsPaths.has(finalUrl)) {
      chosenPath = saveAsPaths.get(finalUrl);
      saveAsPaths.delete(finalUrl);
    }

    if (chosenPath) {
      console.log(`[Main] Using chosen path for ${downloadId}: ${chosenPath}`);
      item.setSavePath(chosenPath);
    } else {
      // Auto-save to Downloads folder
      console.log(`[Main] Auto-saving ${downloadId}`);
      const downloadsPath = app.getPath('downloads');
      let saveName = fileName;
      if (!saveName || saveName.trim() === '') {
        saveName = `download-${Date.now()}`;
        const mime = item.getMimeType();
        if (mime === 'image/png') saveName += '.png';
        else if (mime === 'image/jpeg') saveName += '.jpg';
        else if (mime === 'image/gif') saveName += '.gif';
        else if (mime === 'image/webp') saveName += '.webp';
      }
      const filePath = path.join(downloadsPath, saveName);
      item.setSavePath(filePath);
    }
  });

  ipcMain.on('download-control', (event, { id, action }) => {
    const item = downloadItems.get(id);
    if (!item) return;

    if (action === 'pause' && !item.isPaused()) item.pause();
    if (action === 'resume' && item.isPaused()) item.resume();
    if (action === 'cancel') item.cancel();

    // Send immediate update to sync isPaused state
    mainWindow?.webContents.send('download-progress', {
      id: id,
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes(),
      state: 'progressing', // Or item.getState()
      isPaused: item.isPaused()
    });
  });

  ipcMain.on('show-in-folder', (event, path) => {
    shell.showItemInFolder(path);
  });

  ipcMain.on('open-file', (event, path) => {
    shell.openPath(path);
  });

  // --- IPC Handlers for Store ---
  ipcMain.handle('get-store-value', async (event, key) => {
    const s = await initElectronStore();
    return s.get(key);
  });

  ipcMain.handle('set-store-value', async (event, key, value) => {
    const s = await initElectronStore();
    s.set(key, value);
  });

  ipcMain.handle('get-preload-path', () => {
    return path.join(__dirname, 'preload.js');
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

  ipcMain.on('open-incognito-window', () => {
    launchIncognito();
  });

  // Window Controls
  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('close-window', () => {
    mainWindow?.close();
  });

  // Navigation IPC
  ipcMain.on('webview-go-back', (event) => {
    const wc = event.sender;
    if (wc.canGoBack()) {
      wc.goBack();
      mainWindow?.webContents.send('navigation-feedback', 'back');
    }
  });

  ipcMain.on('webview-go-forward', (event) => {
    const wc = event.sender;
    if (wc.canGoForward()) {
      wc.goForward();
      mainWindow?.webContents.send('navigation-feedback', 'forward');
    }
  });

  // Context Menu IPC
  ipcMain.on('show-context-menu', (event, params) => {
    const template: Array<Electron.MenuItemConstructorOptions | Electron.MenuItem> = [];
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);

    // Helper to generic create tab
    const createTab = (url: string) => {
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
        click: () => clipboard.writeText(params.linkURL)
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
          const { filePath } = await dialog.showSaveDialog(win || mainWindow!, {
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
        click: () => clipboard.writeText(params.srcURL)
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

    const menu = Menu.buildFromTemplate(template);
    if (win) {
      menu.popup({ window: win });
    }
  });
});

ipcMain.on('open-dev-tools', (event) => {
  event.sender.openDevTools();
});

ipcMain.handle('get-suggestions', async (_event, query) => {
  if (!query || !query.trim()) return [];

  return new Promise((resolve) => {
    const request = net.request(`http://google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);

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
        } catch (e) {
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
ipcMain.handle('get-profiles-list', () => {
  if (!fs.existsSync(rootConfigPath)) return [];
  try {
    const config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8'));
    return config.profiles || [];
  } catch (e) {
    return [];
  }
});

ipcMain.handle('create-profile', (_event, { name, avatar }) => {
  const id = randomUUID();
  let config: any = { profiles: [] };
  if (fs.existsSync(rootConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8'));
    } catch (e) { }
  }

  const newProfile = { id, name, avatar: avatar || 'default' };
  config.profiles = [...(config.profiles || []), newProfile];

  // Ensure profile dir exists
  const profilePath = path.join(profilesDir, id);
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }

  fs.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
  return newProfile;
});

ipcMain.on('select-profile', (_event, { id, alwaysOpen }) => {
  if (alwaysOpen) {
    let config: any = { profiles: [] };
    if (fs.existsSync(rootConfigPath)) {
      try { config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8')); } catch (e) { }
    }
    config.alwaysOpenProfile = id;
    fs.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
  }

  // Relaunch
  app.relaunch({ args: process.argv.slice(1).filter(a => !a.startsWith('--profile-id=')).concat([`--profile-id=${id}`]) });
  app.exit(0);
});

ipcMain.on('switch-to-profile-selector', () => {
  let config: any = { profiles: [] };
  if (fs.existsSync(rootConfigPath)) {
    try { config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8')); } catch (e) { }
  }
  delete config.alwaysOpenProfile; // Reset always open if we explicitly go back
  fs.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));

  app.relaunch({ args: process.argv.slice(1).filter(a => !a.startsWith('--profile-id=')) });
  app.exit(0);
});

ipcMain.handle('delete-profile', async (_event, id) => {
  if (!fs.existsSync(rootConfigPath)) return false;
  try {
    let config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8'));
    config.profiles = (config.profiles || []).filter((p: any) => p.id !== id);
    if (config.alwaysOpenProfile === id) {
      delete config.alwaysOpenProfile;
      const s = await initElectronStore();
      s.delete('settings'); // Optional: clear local store for that profile if needed, but profiles are dir based now
    }
    fs.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));

    // Optionally delete data dir (User didn't explicitly ask for deletion of physical files, 
    // but it's cleaner. Let's keep it safe and just remove from config for now unless they ask).
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('rename-profile', (_event, { id, name }) => {
  if (!fs.existsSync(rootConfigPath)) return false;
  try {
    let config = JSON.parse(fs.readFileSync(rootConfigPath, 'utf-8'));
    config.profiles = (config.profiles || []).map((p: any) =>
      p.id === id ? { ...p, name } : p
    );
    fs.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.on('open-default-browser-settings', () => {
  // Attempt to register as default for http/https right before opening settings
  app.setAsDefaultProtocolClient('http');
  app.setAsDefaultProtocolClient('https');

  if (process.platform === 'win32') {
    shell.openExternal('ms-settings:defaultapps');
  } else if (process.platform === 'darwin') {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.general');
  } else {
    // Linux/Other
    shell.openExternal('https://www.google.com/search?q=how+to+set+default+browser');
  }
});

// --- Password Manager (Secure Vault) ---
const getPasswordsPath = () => path.join(app.getPath('userData'), 'passwords.json');

ipcMain.handle('get-passwords', () => {
  const pPath = getPasswordsPath();
  if (!fs.existsSync(pPath)) return [];
  try {
    const encryptedData = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
    return encryptedData.map((p: any) => {
      try {
        return {
          ...p,
          password: safeStorage.decryptString(Buffer.from(p.password, 'hex'))
        };
      } catch (e) {
        return { ...p, password: '' }; // Failed to decrypt (e.g. machine change)
      }
    });
  } catch (e) {
    return [];
  }
});

ipcMain.handle('save-password', (_event, { url, username, password }) => {
  const pPath = getPasswordsPath();
  let passwords: any[] = [];
  if (fs.existsSync(pPath)) {
    try { passwords = JSON.parse(fs.readFileSync(pPath, 'utf-8')); } catch (e) { }
  }

  const encryptedPassword = safeStorage.encryptString(password).toString('hex');
  let domain = url;
  try { domain = new URL(url).hostname; } catch (e) { }

  const existingIndex = passwords.findIndex(p => p.domain === domain && p.username === username);
  if (existingIndex > -1) {
    passwords[existingIndex].password = encryptedPassword;
  } else {
    passwords.push({ domain, username, password: encryptedPassword, timestamp: Date.now() });
  }

  fs.writeFileSync(pPath, JSON.stringify(passwords, null, 2));
  return true;
});

ipcMain.handle('delete-password', (_event, { domain, username }) => {
  const pPath = getPasswordsPath();
  if (!fs.existsSync(pPath)) return false;
  try {
    let passwords = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
    passwords = passwords.filter((p: any) => !(p.domain === domain && p.username === username));
    fs.writeFileSync(pPath, JSON.stringify(passwords, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

// --- History System (Time Travel) ---
const getHistoryPath = () => path.join(app.getPath('userData'), 'history.json');

ipcMain.handle('add-history-entry', (_event, entry) => {
  const hPath = getHistoryPath();
  let history: any[] = [];
  if (fs.existsSync(hPath)) {
    try { history = JSON.parse(fs.readFileSync(hPath, 'utf-8')); } catch (e) { }
  }

  // Capture entry
  history.unshift({
    ...entry,
    timestamp: Date.now()
  });

  // Prune logic: 1 year retention
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  const prunedHistory = history.filter(h => h.timestamp > oneYearAgo).slice(0, 5000); // Also cap at 5k for performance

  fs.writeFileSync(hPath, JSON.stringify(prunedHistory, null, 2));
  return true;
});

ipcMain.handle('get-history', () => {
  const hPath = getHistoryPath();
  if (!fs.existsSync(hPath)) return [];
  try {
    const data = fs.readFileSync(hPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('delete-history-entry', (_event, timestamp) => {
  const hPath = getHistoryPath();
  if (!fs.existsSync(hPath)) return false;
  try {
    let history = JSON.parse(fs.readFileSync(hPath, 'utf-8'));
    history = history.filter((h: any) => h.timestamp !== timestamp);
    fs.writeFileSync(hPath, JSON.stringify(history, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('clear-history', (_event, timeframe) => {
  const hPath = getHistoryPath();
  if (!fs.existsSync(hPath)) return true;
  if (timeframe === 'all') {
    fs.writeFileSync(hPath, JSON.stringify([], null, 2));
    return true;
  }

  let cutoff = 0;
  const now = Date.now();
  if (timeframe === 'hour') cutoff = now - (60 * 60 * 1000);
  else if (timeframe === 'day') cutoff = now - (24 * 60 * 60 * 1000);
  else if (timeframe === 'week') cutoff = now - (7 * 24 * 60 * 60 * 1000);

  try {
    let history = JSON.parse(fs.readFileSync(hPath, 'utf-8'));
    history = history.filter((h: any) => h.timestamp < cutoff);
    fs.writeFileSync(hPath, JSON.stringify(history, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.on('password-form-submit', (event, data) => {
  // Get the main window where the UI prompt should show
  mainWindow?.webContents.send('prompt-save-password', data);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
