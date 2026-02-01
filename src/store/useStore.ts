import { create } from 'zustand';

export interface Bookmark {
    id: string;
    title: string;
    url: string;
    favicon?: string;
}

export interface HistoryItem {
    url: string;
    title: string;
    visitCount: number;
    lastVisited: number;
    favicon?: string;
}

export interface SidebarSite {
    id: string;
    name: string;
    url: string;
    icon?: string;
}

export interface Settings {
    theme: 'light' | 'dark' | 'system';
    searchEngine: 'google' | 'duckduckgo' | 'brave';
    uiDensity: 'compact' | 'comfortable';
    showBookmarksBar: boolean;
    homePageConfig: {
        background: {
            type: 'solid' | 'gradient' | 'image';
            value: string;
        };
        showClock: boolean;
        clockFormat: '12h' | '24h';
        clockColor?: string;
        clockThickness?: string;
        showShortcuts: boolean;
        mode?: 'day' | 'night' | 'sunset' | null;
        gradientState?: {
            color1: string;
            color2: string;
            angle: number;
            point1: { x: number, y: number };
            point2: { x: number, y: number };
        };
        isEditMode: boolean;
        layout: Record<string, { x: number, y: number, scale?: number }>;
    };
    sidebarWidth: number;
    isSidebarCollapsed: boolean;
    isSplitScreen: boolean;
    primaryTabId: string | null;
    secondaryTabId: string | null;
    particleEffects: boolean;
    particleSettings: {
        amount: number;
        speed: number;
        colorVariation: number;
        bookmarksBarOpacity: number;
    };
    geminiPanelWidth: number;
    neverSavePasswords: string[];
    adBlockEnabled: boolean;
    adBlockWhitelist: string[];
    showHomeButton: boolean;
    // Cryo-Freeze
    cryoEnabled: boolean;
    cryoTimer: number; // in minutes
    liquidDropEnabled: boolean;
}

export interface Tab {
    id: string;
    url: string;
    title: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    favicon?: string;
    thumbnailUrl?: string;
    groupId?: string;
    // Cryo-Freeze State
    isFrozen?: boolean;
    lastAccessed?: number;
}

export interface TabGroup {
    id: string;
    title: string;
    color: string;
    isCollapsed: boolean;
}

export interface DownloadItem {
    id: string;
    filename: string;
    path: string;
    totalBytes: number;
    receivedBytes: number;
    startTime: number;
    endTime?: number;
    state: 'progressing' | 'interrupted' | 'completed' | 'cancelled';
    speed?: number; // bytes per second
    estimatedTimeRemaining?: number; // seconds
    isPaused?: boolean;
}

interface BrowserState {
    tabs: Tab[];
    tabGroups: TabGroup[];
    activeTabId: string;
    bookmarks: Bookmark[];
    favorites: Bookmark[];
    settings: Settings;
    settingsSection: 'general' | 'bookmarks' | 'appearance';
    navFeedback: 'back' | 'forward' | null;

    // UI State
    isDownloadsOpen: boolean;
    isGeminiPanelOpen: boolean;
    isAdBlockerOpen: boolean;
    blockedAdsCount: number;

    // Downloads
    activeDownloads: Record<string, DownloadItem>;
    downloadHistory: DownloadItem[];
    siteHistory: HistoryItem[];
    isIncognito: boolean;
    activeProfileId: string | null;
    selectionMode: boolean;
    activeInternalPage: 'history' | 'passwords' | null;
    capturedPassword: { url: string; username: string; password: string } | null;

    isGlassCardsOverviewOpen: boolean;
    isGhostSearchOpen: boolean;
    toggleGhostSearch: (open?: boolean) => void;

    // Liquid Drop Zone
    droppedFiles: { path: string; name: string; type: string }[];
    addDroppedFile: (file: { path: string; name: string; type: string }) => void;
    clearDroppedFiles: () => void;
    removeDroppedFile: (path: string) => void;

    // Updates
    updateStatus: 'available' | 'ready' | null;
    setUpdateStatus: (status: 'available' | 'ready' | null) => void;

    // Tab Actions
    addTab: (url?: string) => void;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTab: (id: string, data: Partial<Tab>) => void;
    freezeTab: (id: string) => void;
    unfreezeTab: (id: string) => void;

    // Group Actions
    createGroup: (title: string, color: string) => string;
    deleteGroup: (id: string) => void;
    addTabToGroup: (tabId: string, groupId: string) => void;
    removeTabFromGroup: (tabId: string) => void;
    toggleGroupCollapse: (groupId: string, collapsed?: boolean) => void;
    updateGroup: (id: string, data: Partial<TabGroup>) => void;
    reorderTabs: (newTabs: Tab[]) => void;
    reorderGroups: (newGroups: TabGroup[]) => void;

    // Bookmark Actions
    addBookmark: (bookmark: Bookmark) => void;
    removeBookmark: (id: string) => void;

    // Favorite Actions
    addFavorite: (favorite: Bookmark) => void;
    removeFavorite: (id: string) => void;

    // Settings Actions
    updateSettings: (settings: Partial<Settings>) => void;
    toggleSettings: (section?: 'general' | 'bookmarks' | 'appearance') => void;
    triggerNavFeedback: (type: 'back' | 'forward') => void;

    // Gemini Actions
    toggleGeminiPanel: () => void;
    toggleGlassCards: (open?: boolean) => void;
    toggleAdBlocker: () => void;
    setInternalPage: (page: 'history' | 'passwords' | null) => void;
    clearCapturedPassword: () => void;
    toggleAdBlockerEnabled: () => void;
    addToWhitelist: (domain: string) => void;
    removeFromWhitelist: (domain: string) => void;
    updateBlockedCount: (count: number) => void;


    // Download Actions
    addDownload: (item: DownloadItem) => void;
    updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
    completeDownload: (item: DownloadItem) => void;
    setDownloadHistory: (history: DownloadItem[]) => void;
    clearDownloadHistory: () => void;

    // History Actions
    recordVisit: (url: string, title: string, favicon?: string) => void;

    // Permission Actions
    sitePermissions: Record<string, Record<string, boolean>>; // origin -> permission -> granted
    setSitePermission: (origin: string, permission: string, allowed: boolean) => void;

    // Onboarding
    firstRunCompleted: boolean | null; // null = loading/unknown
    setFirstRunCompleted: (completed: boolean) => void;
}

export const useStore = create<BrowserState>((set, get) => ({
    tabs: [{ id: '1', url: '', title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false }],
    tabGroups: [],
    activeTabId: '1',
    bookmarks: [],
    favorites: [],
    settings: {
        theme: 'system',
        searchEngine: 'google',
        uiDensity: 'comfortable',
        showBookmarksBar: false,
        homePageConfig: {
            background: {
                type: 'gradient',
                value: 'linear-gradient(to bottom right, #e0e7ff, #f3e8ff)'
            },
            showClock: true,
            clockFormat: '12h',
            clockColor: '#ffffff',
            clockThickness: 'font-thin',
            showShortcuts: true,
            mode: undefined,
            gradientState: {
                color1: '#e0e7ff',
                color2: '#f3e8ff',
                angle: 135,
                point1: { x: 0, y: 0 },
                point2: { x: 100, y: 100 }
            },
            isEditMode: false,
            layout: {}
        },
        sidebarWidth: 260,
        isSidebarCollapsed: false,
        isSplitScreen: false,
        primaryTabId: null,
        secondaryTabId: null,
        particleEffects: true,
        particleSettings: {
            amount: 10,
            speed: 1,
            colorVariation: 50,
            bookmarksBarOpacity: 0.9
        },
        geminiPanelWidth: 400,
        neverSavePasswords: [],
        adBlockEnabled: true,
        adBlockWhitelist: [],
        showHomeButton: false,
        cryoEnabled: true,
        cryoTimer: 10,
        liquidDropEnabled: true,
    },
    settingsSection: 'general',
    isDownloadsOpen: false,
    isGeminiPanelOpen: false,
    isAdBlockerOpen: false,
    blockedAdsCount: 0,
    activeInternalPage: null,
    capturedPassword: null,
    navFeedback: null,
    activeDownloads: {},
    downloadHistory: [],
    siteHistory: [],
    isIncognito: false,
    activeProfileId: null,
    selectionMode: false,
    isGhostSearchOpen: false,
    isGlassCardsOverviewOpen: false,
    updateStatus: null,
    setUpdateStatus: (status) => set({ updateStatus: status }),

    // Liquid Drop Zone
    droppedFiles: [],
    addDroppedFile: (file) => set((state) => ({
        droppedFiles: [...state.droppedFiles.filter(f => f.path !== file.path), file]
    })),
    clearDroppedFiles: () => set({ droppedFiles: [] }),
    removeDroppedFile: (path) => set((state) => ({
        droppedFiles: state.droppedFiles.filter(f => f.path !== path)
    })),

    toggleGlassCards: (open) => set((state) => ({
        isGlassCardsOverviewOpen: open !== undefined ? open : !state.isGlassCardsOverviewOpen
    })),

    toggleGhostSearch: (open) => set((state) => ({
        isGhostSearchOpen: open !== undefined ? open : !state.isGhostSearchOpen
    })),

    addTab: (url = '') => set((state) => {
        const newTab: Tab = {
            id: Date.now().toString(),
            url,
            title: 'New Tab',
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
        };
        return { tabs: [...state.tabs, newTab], activeTabId: newTab.id };
    }),

    removeTab: (id) => set((state) => {
        // Prevent closing the last tab? Or just make a new one?
        // Chrome closes window if last tab. We'll just reset to one new tab.
        const newTabs = state.tabs.filter(t => t.id !== id);
        if (newTabs.length === 0) {
            const newTab: Tab = {
                id: Date.now().toString(),
                url: '',
                title: 'Home Page',
                isLoading: false,
                canGoBack: false,
                canGoForward: false,
            };
            return { tabs: [newTab], activeTabId: newTab.id };
        }

        // If we closed the active tab, pick the last one
        let newActiveId = state.activeTabId;
        if (id === state.activeTabId) {
            newActiveId = newTabs[newTabs.length - 1].id;
        }

        return { tabs: newTabs, activeTabId: newActiveId };
    }),

    setActiveTab: (id) => set({ activeTabId: id }),

    updateTab: (id, data) => set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, ...data } : t)
    })),

    freezeTab: (id) => set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, isFrozen: true, isLoading: false } : t)),
    })),

    unfreezeTab: (id) => set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, isFrozen: false, lastAccessed: Date.now() } : t)),
    })),

    createGroup: (title, color) => {
        const id = Date.now().toString();
        set((state) => {
            const newGroups = [...state.tabGroups, { id, title, color, isCollapsed: false }];
            (window as any).electron?.store.set('tabGroups', newGroups);
            return { tabGroups: newGroups };
        });
        return id;
    },

    deleteGroup: (id) => set((state) => {
        const newGroups = state.tabGroups.filter(g => g.id !== id);
        // Ungroup tabs that were in this group
        const newTabs = state.tabs.map(t => t.groupId === id ? { ...t, groupId: undefined } : t);

        (window as any).electron?.store.set('tabGroups', newGroups);
        // We probably don't need to persist tabs every single change unless we want full session restore, 
        // but removing group association matters if tabs are persisted.
        return { tabGroups: newGroups, tabs: newTabs };
    }),

    addTabToGroup: (tabId, groupId) => set((state) => ({
        tabs: state.tabs.map(t => t.id === tabId ? { ...t, groupId } : t)
    })),

    removeTabFromGroup: (tabId) => set((state) => ({
        tabs: state.tabs.map(t => t.id === tabId ? { ...t, groupId: undefined } : t)
    })),

    toggleGroupCollapse: (groupId, collapsed) => set((state) => {
        const newGroups = state.tabGroups.map(g => g.id === groupId ? { ...g, isCollapsed: collapsed !== undefined ? collapsed : !g.isCollapsed } : g);
        (window as any).electron?.store.set('tabGroups', newGroups);
        return { tabGroups: newGroups };
    }),

    updateGroup: (id, data) => set((state) => {
        const newGroups = state.tabGroups.map(g => g.id === id ? { ...g, ...data } : g);
        (window as any).electron?.store.set('tabGroups', newGroups);
        return { tabGroups: newGroups };
    }),

    reorderTabs: (newTabs) => set(() => {
        // We probably don't want to persist full tabs on every drag for perf, 
        // but for now let's assume valid state is passed
        return { tabs: newTabs };
    }),

    reorderGroups: (newGroups) => set(() => {
        (window as any).electron?.store.set('tabGroups', newGroups);
        return { tabGroups: newGroups };
    }),

    addBookmark: (bookmark) => set((state) => {
        if (!bookmark || !bookmark.id) return {};

        // If bookmark with same URL exists, update it instead of adding
        const existingIndex = state.bookmarks.findIndex(b => b.url === bookmark.url);
        let newBookmarks;
        if (existingIndex >= 0) {
            newBookmarks = state.bookmarks.map((b, i) => i === existingIndex ? { ...b, ...bookmark } : b);
        } else {
            newBookmarks = [...state.bookmarks, bookmark];
        }

        (window as any).electron?.store.set('bookmarks', newBookmarks);
        return { bookmarks: newBookmarks };
    }),

    removeBookmark: (id) => set((state) => {
        const newBookmarks = state.bookmarks.filter(b => b.id !== id);
        (window as any).electron?.store.set('bookmarks', newBookmarks);
        return { bookmarks: newBookmarks };
    }),

    addFavorite: (favorite) => set((state) => {
        if (!favorite || !favorite.id) return {};
        const existingIndex = state.favorites.findIndex(f => f.url === favorite.url);
        let newFavorites;
        if (existingIndex >= 0) {
            newFavorites = state.favorites.map((f, i) => i === existingIndex ? { ...f, ...favorite } : f);
        } else {
            newFavorites = [...state.favorites, favorite];
        }
        (window as any).electron?.store.set('favorites', newFavorites);
        return { favorites: newFavorites };
    }),

    removeFavorite: (id) => set((state) => {
        const newFavorites = state.favorites.filter(f => f.id !== id);
        (window as any).electron?.store.set('favorites', newFavorites);
        return { favorites: newFavorites };
    }),

    toggleGeminiPanel: () => set((state) => ({ isGeminiPanelOpen: !state.isGeminiPanelOpen })),

    toggleAdBlocker: () => set((state) => ({ isAdBlockerOpen: !state.isAdBlockerOpen })),

    toggleAdBlockerEnabled: () => set((state) => {
        const enabled = !state.settings.adBlockEnabled;
        const updated = { ...state.settings, adBlockEnabled: enabled };
        (window as any).electron?.store.set('settings', updated);
        (window as any).electron?.ipcRenderer.send('update-adblocker-settings');
        return { settings: updated };
    }),

    addToWhitelist: (domain) => set((state) => {
        if (state.settings.adBlockWhitelist.includes(domain)) return {};
        const whitelist = [...state.settings.adBlockWhitelist, domain];
        const updated = { ...state.settings, adBlockWhitelist: whitelist };
        (window as any).electron?.store.set('settings', updated);
        (window as any).electron?.ipcRenderer.send('update-adblocker-settings');
        return { settings: updated };
    }),

    removeFromWhitelist: (domain) => set((state) => {
        const whitelist = state.settings.adBlockWhitelist.filter(d => d !== domain);
        const updated = { ...state.settings, adBlockWhitelist: whitelist };
        (window as any).electron?.store.set('settings', updated);
        (window as any).electron?.ipcRenderer.send('update-adblocker-settings');
        return { settings: updated };
    }),

    updateBlockedCount: (count) => set({ blockedAdsCount: count }),

    setInternalPage: (page) => set({ activeInternalPage: page }),

    clearCapturedPassword: () => set({ capturedPassword: null }),

    updateSettings: (newSettings) => set((state) => {
        const updated = { ...state.settings, ...newSettings };
        (window as any).electron?.store.set('settings', updated);

        if (newSettings.homePageConfig?.mode === 'night' || newSettings.homePageConfig?.mode === 'sunset') {
            updated.theme = 'dark';
        } else if (newSettings.homePageConfig?.mode === 'day') {
            updated.theme = 'light';
        }

        if (updated.theme === 'dark' || (updated.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Apply Global Mode Classes
        const mode = updated.homePageConfig?.mode;
        document.documentElement.classList.remove('mode-day', 'mode-night', 'mode-sunset');
        if (mode) {
            document.documentElement.classList.add(`mode-${mode}`);
        } else if (updated.theme === 'dark' || (updated.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('mode-night');
        }

        return { settings: updated };
    }),

    toggleSettings: (section) => set((state) => {
        const settingsUrl = 'rizo://settings';
        const existingTab = state.tabs.find(t => t.url === settingsUrl);

        if (existingTab) {
            return { activeTabId: existingTab.id, settingsSection: section || 'general' };
        }

        const newTab: Tab = {
            id: Date.now().toString(),
            url: settingsUrl,
            title: 'Settings',
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            favicon: 'Rizo logo.png'
        };

        return {
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
            settingsSection: section || 'general'
        };
    }),

    triggerNavFeedback: (type) => {
        set({ navFeedback: type });
        setTimeout(() => set({ navFeedback: null }), 600);
    },

    addDownload: (item) => set((state) => {
        if (!item || !item.id) return {}; // Guard invalid item
        return {
            activeDownloads: { ...state.activeDownloads, [item.id]: { ...item, isPaused: false } }
        };
    }),

    updateDownload: (id, updates) => set((state) => {
        const current = state.activeDownloads[id];
        if (!current) return {};
        return {
            activeDownloads: { ...state.activeDownloads, [id]: { ...current, ...updates } }
        };
    }),

    completeDownload: (item) => set((state) => {
        if (!item || !item.id) return {};

        const { [item.id]: _, ...remaining } = state.activeDownloads;

        // Guard: Safe iteration
        const alreadyInHistory = state.downloadHistory.find(h => h && h.id === item.id);
        if (alreadyInHistory) {
            return { activeDownloads: remaining }; // Just clear active
        }

        return {
            activeDownloads: remaining,
            downloadHistory: [item, ...state.downloadHistory].slice(0, 50)
        };
    }),

    setDownloadHistory: (history) => set({ downloadHistory: history }),
    clearDownloadHistory: () => set({ downloadHistory: [] }),

    recordVisit: (url, title, favicon) => set((state) => {
        if (state.isIncognito) return {}; // Skip history in Incognito Mode
        if (!url || url === '' || url.startsWith('rizo://') || url === 'about:blank') return {};

        const existing = state.siteHistory.find(h => h.url === url);
        let newHistory;

        if (existing) {
            newHistory = state.siteHistory.map(h =>
                h.url === url
                    ? { ...h, title: title || h.title, visitCount: h.visitCount + 1, lastVisited: Date.now(), favicon: favicon || h.favicon }
                    : h
            );
        } else {
            newHistory = [{ url, title, visitCount: 1, lastVisited: Date.now(), favicon }, ...state.siteHistory].slice(0, 1000);
        }

        // Call Main Process IPC to persist to JSON file
        (window as any).electron?.ipcRenderer.invoke('add-history-entry', { url, title, favicon });

        (window as any).electron?.store.set('siteHistory', newHistory);
        return { siteHistory: newHistory };
    }),

    sitePermissions: {},
    setSitePermission: (origin, permission, allowed) => set((state) => {
        const newPermissions = {
            ...state.sitePermissions,
            [origin]: {
                ...(state.sitePermissions[origin] || {}),
                [permission]: allowed
            }
        };
        (window as any).electron?.store.set('sitePermissions', newPermissions);
        return { sitePermissions: newPermissions };
    }),

    firstRunCompleted: null, // Default to null (loading)
    setFirstRunCompleted: (completed) => set(() => {
        (window as any).electron?.store.set('firstRunCompleted', completed);
        return { firstRunCompleted: completed };
    }),
}));

// Initialize store
export const initStore = async () => {
    const electron = (window as any).electron;
    if (electron) {
        const storedBookmarks = await electron.store.get('bookmarks');
        const storedGroups = await electron.store.get('tabGroups');
        const storedSettings = await electron.store.get('settings');

        const urlParams = new URLSearchParams(window.location.search);
        const profileId = urlParams.get('profileId');
        const selectionMode = urlParams.get('selectionMode') === 'true';
        const isIncognito = urlParams.get('incognito') === 'true';

        useStore.setState({ activeProfileId: profileId, selectionMode, isIncognito });

        if (storedBookmarks) {
            // Cleanup: Remove any corrupted bookmarks
            const cleanBookmarks = (storedBookmarks as Bookmark[]).filter(b => b && b.id && b.title);
            useStore.setState({ bookmarks: cleanBookmarks });

            if (cleanBookmarks.length !== storedBookmarks.length) {
                electron.store.set('bookmarks', cleanBookmarks);
            }
        }

        const storedFavorites = await electron.store.get('favorites');
        if (storedFavorites) {
            const cleanFavorites = (storedFavorites as Bookmark[]).filter(b => b && b.id && b.title);
            useStore.setState({ favorites: cleanFavorites });
            if (cleanFavorites.length !== storedFavorites.length) {
                electron.store.set('favorites', cleanFavorites);
            }
        }

        if (storedSettings) {
            useStore.setState((state) => {
                const updated = {
                    ...state.settings,
                    ...storedSettings,
                    homePageConfig: {
                        ...state.settings.homePageConfig,
                        ...(storedSettings.homePageConfig || {}),
                        isEditMode: false
                    }
                };
                if (updated.homePageConfig?.mode === 'night' || updated.homePageConfig?.mode === 'sunset') {
                    updated.theme = 'dark';
                } else if (updated.homePageConfig?.mode === 'day') {
                    updated.theme = 'light';
                }

                if (updated.theme === 'dark' || (updated.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }

                // Apply Global Mode Classes on Load
                const mode = updated.homePageConfig?.mode;
                document.documentElement.classList.remove('mode-day', 'mode-night', 'mode-sunset');
                if (mode) {
                    document.documentElement.classList.add(`mode-${mode}`);
                }

                return { settings: updated };
            });
        }

        const state = useStore.getState();
        if (!state.tabs || state.tabs.length === 0) {
            useStore.setState({
                tabs: [{ id: '1', url: '', title: 'Home Page', isLoading: false, canGoBack: false, canGoForward: false }],
                activeTabId: '1'
            });
        }

        // Restore Download History
        const history = await electron.store.get('downloadHistory');
        if (history) {
            // Cleanup: Remove any corrupted history items (zombies/empty) that might have persisted
            const cleanHistory = (history as DownloadItem[]).filter(h => h && h.id && h.filename && h.state !== 'progressing');
            useStore.setState({ downloadHistory: cleanHistory });

            // Update store if we cleaned anything (optional, but good practice)
            if (cleanHistory.length !== history.length) {
                electron.store.set('downloadHistory', cleanHistory);
            }
        }

        // Restore Site History
        const sites = await electron.store.get('siteHistory');
        if (sites) {
            useStore.setState({ siteHistory: sites as HistoryItem[] });
        }

        // Restore Site Permissions
        const permissions = await electron.store.get('sitePermissions');
        if (permissions) {
            useStore.setState({ sitePermissions: permissions });
        }
        if (permissions) {
            useStore.setState({ sitePermissions: permissions });
        }

        const firstRun = await electron.store.get('firstRunCompleted');
        if (firstRun !== undefined) {
            useStore.setState({ firstRunCompleted: firstRun });
        }

        if (storedGroups) {
            useStore.setState({ tabGroups: storedGroups });
        }
    }
};
