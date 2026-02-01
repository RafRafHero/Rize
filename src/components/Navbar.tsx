import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ArrowRight, RotateCw, Menu, X, Minus, Square, Star, SplitSquareHorizontal, Plus,
    Search, Globe, ChevronRight, Glasses, Users, GripVertical, Shield, Home
} from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { BookmarkPopover } from './BookmarkPopover';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { DownloadManager } from './DownloadManager';
import { MenuPopover } from './MenuPopover';
import { isValidUrl, formatUrl } from '../lib/search';
import { AdBlockerPanel } from './AdBlockerPanel';

interface NavbarProps {
    onReload: () => void;
    onBack: () => void;
    onForward: () => void;
    onStop: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReload, onBack, onForward }) => {
    const { tabs, activeTabId, setActiveTab, addTab, updateTab, toggleSettings, addBookmark, removeBookmark, bookmarks, favorites, settings, navFeedback, updateSettings, addDownload, updateDownload, completeDownload, siteHistory, isIncognito, isGeminiPanelOpen, toggleGeminiPanel, isAdBlockerOpen, toggleAdBlocker, showUpdateDot } = useStore();

    const activeTab = tabs.find(t => t.id === activeTabId);
    const currentUrl = activeTab?.url || '';
    const [inputUrl, setInputUrl] = useState(currentUrl);
    const [isFocused, setIsFocused] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showBookmarkPopover, setShowBookmarkPopover] = useState(false);

    // Smart Omnibox State
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isFocused) {
            setInputUrl(currentUrl);
            setShowSuggestions(false);
        }
    }, [currentUrl, isFocused]);

    // Handle Suggestions Fetching (Debounced)
    useEffect(() => {
        if (!isFocused || !inputUrl || inputUrl.trim() === '' || isValidUrl(inputUrl)) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                // 1. Fetch History Matches
                const query = inputUrl.toLowerCase();
                const historyMatches = siteHistory
                    .filter(h => h.url.toLowerCase().includes(query) || h.title.toLowerCase().includes(query))
                    .sort((a, b) => b.visitCount - a.visitCount)
                    .slice(0, 5)
                    .map(h => h.url); // We'll store URLs and titles separately or handle display logic

                // 2. Fetch Google Suggestions
                const googleResults = await (window as any).electron?.ipcRenderer.invoke('get-suggestions', inputUrl);

                // 3. Merge and Deduplicate
                const allResults = [...new Set([...historyMatches, ...(googleResults || [])])].slice(0, 10);

                setSuggestions(allResults);
                setShowSuggestions(allResults.length > 0);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Failed to get suggestions:', error);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [inputUrl, isFocused]);

    const handleNavigate = (url: string) => {
        const formattedUrl = formatUrl(url, settings.searchEngine, settings.theme);
        updateTab(activeTabId, { url: formattedUrl });
        setShowSuggestions(false);
        setIsFocused(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const urlToLoad = selectedIndex >= 0 ? suggestions[selectedIndex] : inputUrl;
            handleNavigate(urlToLoad);
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > -1 ? prev - 1 : prev));
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    // Listen for Download IPC events
    useEffect(() => {
        const onStarted = (_: any, item: any) => {
            addDownload({ ...item, state: 'progressing', receivedBytes: 0 });
        };
        const onProgress = (_: any, data: any) => {
            updateDownload(data.id, {
                receivedBytes: data.receivedBytes,
                totalBytes: data.totalBytes,
                state: data.state,
                estimatedTimeRemaining: data.estimatedTimeRemaining
            });
        };
        const onComplete = (_: any, data: any) => {
            completeDownload(data);
        };

        const ipc = (window as any).electron?.ipcRenderer;
        if (ipc) {
            ipc.on('download-started', onStarted);
            ipc.on('download-progress', onProgress);
            ipc.on('download-complete', onComplete);
        }

        return () => {
            if (ipc) {
                ipc.off('download-started', onStarted);
                ipc.off('download-progress', onProgress);
                ipc.off('download-complete', onComplete);
            }
        };
    }, []);

    const toggleSplitScreen = () => {
        if (!settings.isSplitScreen) {
            // Find current active tab to keep on left
            const currentTabId = activeTabId;
            // Add new tab for secondary (right) side
            addTab();
            // Get the new tab's ID
            const newTabId = useStore.getState().activeTabId;

            updateSettings({
                isSplitScreen: true,
                primaryTabId: currentTabId,
                secondaryTabId: newTabId
            });
        } else {
            const leftId = settings.primaryTabId;
            updateSettings({
                isSplitScreen: false,
                primaryTabId: null,
                secondaryTabId: null
            });
            if (leftId) setActiveTab(leftId);
        }
    };

    const isBookmarked = bookmarks.some(b => b.url === currentUrl) || favorites.some(f => f.url === currentUrl);

    return (
        <div className={cn(
            "flex flex-col w-full z-40 transition-colors duration-300 relative overflow-visible bg-transparent border-none"
        )}>
            {/* Titlebar / Drag Region */}
            <div className="flex items-center px-2 py-1 gap-2 h-9 w-full titlebar-drag-region">
                {/* Navigation Controls */}
                <div className="flex items-center gap-1 no-drag shrink-0">
                    <div className="titlebar-drag-region p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing">
                        <GripVertical size={14} />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        animate={navFeedback === 'back' ? { scale: [1, 0.8, 1.2, 1] } : {}}
                        transition={{ type: "spring", damping: 12, stiffness: 350, mass: 0.8 } as const}
                        disabled={!activeTab?.canGoBack}
                        onClick={onBack}
                        className={cn(
                            "p-1.5 rounded-full disabled:opacity-30 transition-colors hover:bg-secondary/80",
                            isIncognito && "text-white"
                        )}
                    >
                        <ArrowLeft size={16} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        animate={navFeedback === 'forward' ? { scale: [1, 0.8, 1.2, 1] } : {}}
                        transition={{ type: "spring", damping: 12, stiffness: 350, mass: 0.8 } as const}
                        disabled={!activeTab?.canGoForward}
                        onClick={onForward}
                        className={cn(
                            "p-1.5 rounded-full disabled:opacity-30 transition-colors hover:bg-secondary/80",
                            isIncognito && "text-white"
                        )}
                    >
                        <ArrowRight size={16} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onReload}
                        className={cn(
                            "p-1.5 rounded-full transition-colors hover:bg-secondary/80",
                            isIncognito && "text-white"
                        )}
                    >
                        <RotateCw size={16} className={cn(activeTab?.isLoading && "animate-spin")} />
                    </motion.button>

                    {settings.showHomeButton && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateTab(activeTabId, { url: '' })}
                            className={cn(
                                "p-1.5 rounded-full transition-colors hover:bg-secondary/80",
                                isIncognito && "text-white"
                            )}
                            title="Go to Home"
                        >
                            <Home size={16} />
                        </motion.button>
                    )}
                </div>

                <div className="flex-1 relative mx-2 no-drag">
                    <motion.div
                        id="url-bar"
                        layout
                        className={cn(
                            "flex items-center bg-secondary/50 rounded-lg px-3 transition-all duration-300 border border-transparent focus-within:border-primary/20",
                            isFocused ? "shadow-md bg-secondary" : ""
                        )}
                    >
                        {isIncognito && (
                            <div className="mr-2 text-white/90" title="Incognito Mode">
                                <Glasses size={18} />
                            </div>
                        )}
                        <label className="mr-2 text-muted-foreground">
                            <Search size={14} />
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            className={cn(
                                "flex-1 bg-transparent border-none outline-none text-sm h-8 placeholder:text-muted-foreground/50",
                                isIncognito && "text-white"
                            )}
                            value={inputUrl}
                            onChange={(e) => {
                                setInputUrl(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => {
                                // Delay blur to allow clicks on results
                                setTimeout(() => setIsFocused(false), 200);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={`Search or enter address`}
                        />
                        {currentUrl && (
                            <div className="relative">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowBookmarkPopover(!showBookmarkPopover)}
                                    className={cn("p-1 rounded-md transition-colors", isBookmarked ? "text-yellow-400" : "text-muted-foreground hover:text-foreground")}
                                >
                                    <Star size={14} fill={isBookmarked ? "currentColor" : "none"} />
                                </motion.button>

                                <AnimatePresence>
                                    {showBookmarkPopover && (
                                        <BookmarkPopover
                                            url={currentUrl}
                                            title={activeTab?.title || currentUrl}
                                            favicon={activeTab?.favicon}
                                            onClose={() => setShowBookmarkPopover(false)}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                        {isFocused && (showSuggestions || (inputUrl && !isValidUrl(inputUrl))) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                className="absolute top-[calc(100%+8px)] left-0 right-0 bg-card/80 backdrop-blur-2xl border border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden z-50 py-2"
                            >
                                {suggestions.length > 0 ? (
                                    suggestions.map((suggestion, index) => {
                                        const isUrl = isValidUrl(suggestion) || (suggestion.includes('.') && !suggestion.includes(' '));
                                        const historyItem = siteHistory.find(h => h.url === suggestion);

                                        return (
                                            <motion.button
                                                key={index}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                whileHover={{ scale: 1.005, x: 4, backgroundColor: "rgba(var(--primary), 0.05)" }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => handleNavigate(suggestion)}
                                                onMouseMove={() => setSelectedIndex(index)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left relative",
                                                    selectedIndex === index ? "bg-primary/10 text-primary" : "text-foreground"
                                                )}
                                            >
                                                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                                    {isUrl ? (
                                                        historyItem?.favicon ? (
                                                            <img src={historyItem.favicon} className="w-4 h-4 rounded" alt="" />
                                                        ) : (
                                                            <Globe size={14} className="text-blue-400" />
                                                        )
                                                    ) : (
                                                        <Search size={14} className="text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col flex-1 truncate">
                                                    <span className="truncate font-medium">
                                                        {historyItem?.title || suggestion}
                                                    </span>
                                                    {(historyItem || isUrl) && suggestion !== historyItem?.title && (
                                                        <span className="text-[10px] text-muted-foreground truncate opacity-70">
                                                            {suggestion}
                                                        </span>
                                                    )}
                                                </div>
                                                {selectedIndex === index && (
                                                    <motion.div layoutId="arrow" className="opacity-50">
                                                        <ChevronRight size={14} />
                                                    </motion.div>
                                                )}
                                            </motion.button>
                                        );
                                    })
                                ) : inputUrl && !isValidUrl(inputUrl) ? (
                                    <motion.button
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        whileHover={{ backgroundColor: "rgba(var(--primary), 0.05)" }}
                                        onClick={() => handleNavigate(inputUrl)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-primary transition-all text-left font-medium"
                                    >
                                        <Search size={14} />
                                        <span>Search Google for "{inputUrl}"</span>
                                    </motion.button>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* System Controls */}
                <div className="flex items-center gap-2 ml-2 no-drag">
                    <DownloadManager />

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleSplitScreen}
                        className={cn(
                            "p-1.5 rounded-full transition-colors",
                            settings.isSplitScreen ? "bg-primary/20 text-primary" : "hover:bg-secondary/80",
                            isIncognito && !settings.isSplitScreen && "text-white"
                        )}
                        title="Split Screen"
                    >
                        <SplitSquareHorizontal size={18} />
                    </motion.button>

                    <div className="relative">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={cn(
                                "p-1.5 rounded-full transition-colors",
                                isMenuOpen ? "bg-secondary" : "hover:bg-secondary/80",
                                isIncognito && "text-white"
                            )}
                        >
                            <Menu size={18} />
                            {showUpdateDot && (
                                <div className="absolute -top-1 -right-1">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-secondary shadow-sm"></span>
                                    </span>
                                </div>
                            )}
                        </motion.button>
                        <MenuPopover isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
                    </div>

                    <div className="relative">
                        <motion.button
                            id="adblock-shield"
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleAdBlocker}
                            className={cn(
                                "p-2 rounded-xl transition-all duration-300",
                                isAdBlockerOpen ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                            )}
                            title="Rizo Guard Protection"
                        >
                            <Shield size={18} />
                        </motion.button>
                        <AdBlockerPanel />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleGeminiPanel}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-300",
                            isGeminiPanelOpen ? "bg-white/20 text-blue-400" : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                        )}
                        title="Toggle Gemini AI"
                    >
                        <GeminiIcon size={20} />
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
