import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Globe,
    History,
    Bookmark,
    Layers,
    Settings as SettingsIcon,
    User,
    Shield,
    Trash2,
    Zap,
    ExternalLink,
    ArrowRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export const GhostSearch: React.FC = () => {
    const {
        tabs,
        activeTabId,
        setActiveTab,
        addTab,
        siteHistory,
        bookmarks,
        settings,
        isGhostSearchOpen,
        toggleGhostSearch,
        toggleSettings,
        setInternalPage
    } = useStore();

    const [search, setSearch] = useState('');
    const [profiles, setProfiles] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch profiles on mount or when opened
    useEffect(() => {
        if (isGhostSearchOpen) {
            (window as any).rizoAPI?.ipcRenderer.invoke('get-profiles-list').then(setProfiles);
        }
    }, [isGhostSearchOpen]);

    // Handle IPC toggle
    useEffect(() => {
        const handleIpcToggle = () => toggleGhostSearch();
        (window as any).rizoAPI?.ipcRenderer.on('trigger-ghost-search', handleIpcToggle);
        return () => {
            (window as any).rizoAPI?.ipcRenderer.off('trigger-ghost-search', handleIpcToggle);
        };
    }, [toggleGhostSearch]);

    // Close on outside click or Escape (cmdk handles Esc by default if configured, but we wrap it)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isGhostSearchOpen) {
                toggleGhostSearch(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGhostSearchOpen, toggleGhostSearch]);

    const handleSelectAction = (action: () => void) => {
        action();
        toggleGhostSearch(false);
        setSearch('');
    };

    const navigateTo = (url: string) => {
        if (!url) return;
        let targetUrl = url;
        if (!url.includes('://') && !url.startsWith('rizo://')) {
            // Check if it's a domain-like string
            if (url.includes('.') && !url.includes(' ')) {
                targetUrl = `https://${url}`;
            } else {
                // Search Google
                const engine = settings.searchEngine === 'google' ? 'https://google.com/search?q=' :
                    settings.searchEngine === 'duckduckgo' ? 'https://duckduckgo.com/?q=' :
                        'https://search.brave.com/search?q=';
                targetUrl = `${engine}${encodeURIComponent(url)}`;
            }
        }
        addTab(targetUrl);
        toggleGhostSearch(false);
        setSearch('');
    };

    if (!isGhostSearchOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2147483647] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full max-w-[640px] pointer-events-auto"
                >
                    <Command
                        className={cn(
                            "relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl",
                            "backdrop-blur-[30px] transition-all duration-300",
                            settings.theme === 'dark' || document.documentElement.classList.contains('dark')
                                ? "bg-black/40 text-white/90"
                                : "bg-white/20 text-black/80"
                        )}
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <div className="flex items-center px-4 border-b border-white/5 bg-white/5">
                            <Search className="w-5 h-5 opacity-50 mr-3" />
                            <Command.Input
                                value={search}
                                onValueChange={setSearch}
                                placeholder="Search tabs, history, bookmarks or type a command..."
                                className="flex-1 h-14 bg-transparent border-none outline-none text-[15px] placeholder:text-white/30"
                                autoFocus
                            />
                        </div>

                        <Command.List className="max-h-[450px] overflow-y-auto p-2 scrollbar-none focus:outline-none">
                            <Command.Empty className="py-6 text-center text-sm opacity-50">
                                No results found. Press Enter to search on {settings.searchEngine === 'google' ? 'Google' : settings.searchEngine}.
                            </Command.Empty>

                            {/* Command Group: General Navigation */}
                            {search && (
                                <Command.Group heading="Direct Action" className="px-2 py-1.5 text-[11px] font-medium tracking-wider uppercase opacity-40">
                                    <Command.Item
                                        onSelect={() => navigateTo(search)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        <span className="flex-1 truncate">Search or Navigate to "{search}"</span>
                                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded border border-white/20 bg-white/5 opacity-50">Enter</kbd>
                                    </Command.Item>
                                </Command.Group>
                            )}

                            {/* Tabs Group */}
                            <Command.Group heading="Open Tabs" className="px-2 py-1.5 text-[11px] font-medium tracking-wider uppercase opacity-40">
                                {tabs.map(tab => (
                                    <Command.Item
                                        key={tab.id}
                                        onSelect={() => handleSelectAction(() => setActiveTab(tab.id))}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                    >
                                        {tab.favicon ? (
                                            <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm" />
                                        ) : (
                                            <Layers className="w-4 h-4" />
                                        )}
                                        <span className="flex-1 truncate">{tab.title || "New Tab"}</span>
                                        <span className="text-[10px] opacity-30 truncate max-w-[150px]">{tab.url}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>

                            {/* Commands Group */}
                            <Command.Group heading="Actions" className="px-2 py-1.5 text-[11px] font-medium tracking-wider uppercase opacity-40">
                                <Command.Item
                                    onSelect={() => handleSelectAction(() => (window as any).rizoAPI?.ipcRenderer.send('open-incognito-window'))}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                >
                                    <Shield className="w-4 h-4 text-purple-400" />
                                    <span>New Incognito Window</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelectAction(() => toggleSettings())}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                >
                                    <SettingsIcon className="w-4 h-4 text-blue-400" />
                                    <span>Browser Settings</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelectAction(() => setInternalPage('history'))}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                >
                                    <History className="w-4 h-4 text-green-400" />
                                    <span>Show History</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelectAction(() => {
                                        (window as any).rizoAPI?.ipcRenderer.invoke('clear-history', 'all');
                                        // Update state locally too
                                        useStore.setState({ siteHistory: [] });
                                    })}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                >
                                    <Trash2 className="w-4 h-4 text-orange-400" />
                                    <span>Clear All History</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelectAction(() => {
                                        (window as any).rizoAPI?.ipcRenderer.send('clear-cache');
                                    })}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                >
                                    <Zap className="w-4 h-4 text-yellow-400" />
                                    <span>Clear Browser Cache</span>
                                </Command.Item>
                            </Command.Group>

                            {/* Profiles Group */}
                            <Command.Group heading="Switch Profile" className="px-2 py-1.5 text-[11px] font-medium tracking-wider uppercase opacity-40">
                                {profiles.map(p => (
                                    <Command.Item
                                        key={p.id}
                                        onSelect={() => handleSelectAction(() => {
                                            (window as any).rizoAPI?.ipcRenderer.send('select-profile', { id: p.id, alwaysOpen: false });
                                        })}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                    >
                                        <User className="w-4 h-4" />
                                        <span>Switch to {p.name} {p.id === useStore.getState().activeProfileId ? "(Current)" : ""}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>

                            {/* History Group */}
                            {siteHistory.length > 0 && (
                                <Command.Group heading="Recent History" className="px-2 py-1.5 text-[11px] font-medium tracking-wider uppercase opacity-40">
                                    {siteHistory.slice(0, 15).map((item, idx) => (
                                        <Command.Item
                                            key={`${item.url}-${idx}`}
                                            onSelect={() => handleSelectAction(() => addTab(item.url))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                        >
                                            {item.favicon ? (
                                                <img src={item.favicon} alt="" className="w-4 h-4" />
                                            ) : (
                                                <History className="w-4 h-4 opacity-40" />
                                            )}
                                            <span className="flex-1 truncate">{item.title || item.url}</span>
                                            <span className="text-[10px] opacity-30 truncate max-w-[150px]">{new URL(item.url).hostname}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            )}

                            {/* Bookmarks Group */}
                            {bookmarks.length > 0 && (
                                <Command.Group heading="Bookmarks" className="px-2 py-1.5 text-[11px] font-medium tracking-wider uppercase opacity-40">
                                    {bookmarks.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.url.toLowerCase().includes(search.toLowerCase())).slice(0, 10).map(b => (
                                        <Command.Item
                                            key={b.id}
                                            onSelect={() => handleSelectAction(() => addTab(b.url))}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                                        >
                                            <Bookmark className="w-4 h-4 text-yellow-400" />
                                            <span className="flex-1 truncate">{b.title}</span>
                                            <span className="text-[10px] opacity-30 truncate max-w-[150px]">{b.url}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            )}
                        </Command.List>

                        <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[10px] opacity-40 uppercase tracking-widest font-bold">
                            <div className="flex gap-4">
                                <span>↑↓ Navigate</span>
                                <span>⏎ Select</span>
                                <span>esc Close</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span>Ghost Search</span>
                            </div>
                        </div>
                    </Command>
                </motion.div>

                {/* Backdrop Click-to-close */}
                <div
                    className="absolute inset-0 -z-10 pointer-events-auto"
                    onClick={() => toggleGhostSearch(false)}
                />
            </div>
        </AnimatePresence>
    );
};
