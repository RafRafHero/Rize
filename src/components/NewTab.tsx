import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Plus, X, Globe, Star, Search, Pencil, ChevronRight, Trash2 } from 'lucide-react';
import { formatUrl, isValidUrl } from '../lib/search';
import { cn } from '../lib/utils';
import { AnimatedBackground } from './AnimatedBackground';
import { CustomizeMenu } from './CustomizeMenu';

interface NewTabProps {
    tabId: string;
}

export const NewTab: React.FC<NewTabProps> = ({ tabId }) => {
    const { favorites, removeFavorite, addFavorite, settings, updateTab, siteHistory, updateSettings, addBookmark } = useStore();
    const config = settings.homePageConfig;

    // Local state for layout during interaction to prevent heavy store/disk updates freezing UI
    const [localLayout, setLocalLayout] = useState<Record<string, { x: number, y: number, scale?: number }>>(config.layout || {});

    // Sync local layout with store changes (e.g. from Reset button in CustomizeMenu)
    useEffect(() => {
        setLocalLayout(config.layout || {});
    }, [config.layout]);

    const updateConfig = (updates: Partial<typeof config>) => {
        updateSettings({
            homePageConfig: { ...config, ...updates }
        });
    };

    // Commit local changes to store only when needed (e.g. onDragEnd)
    const commitLayout = useCallback((layout: typeof localLayout) => {
        updateConfig({ layout });
    }, [config, updateSettings]);

    const [time, setTime] = useState(new Date());
    const [searchInput, setSearchInput] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
    const [snappingLines, setSnappingLines] = useState<{ vertical: boolean, horizontal: boolean }>({ vertical: false, horizontal: false });

    // Smart Omnibox State
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Custom shortcut form state
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [saveAsBookmark, setSaveAsBookmark] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!isFocused || !searchInput || searchInput.trim() === '' || isValidUrl(searchInput)) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const query = searchInput.toLowerCase();
                const historyMatches = siteHistory
                    .filter(h => h.url.toLowerCase().includes(query) || h.title.toLowerCase().includes(query))
                    .sort((a, b) => b.visitCount - a.visitCount)
                    .slice(0, 5)
                    .map(h => h.url);

                const googleResults = await (window as any).electron?.ipcRenderer.invoke('get-suggestions', searchInput);
                const allResults = [...new Set([...historyMatches, ...(googleResults || [])])].slice(0, 8);

                setSuggestions(allResults);
                setShowSuggestions(allResults.length > 0);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Failed to get suggestions:', error);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [searchInput, isFocused, siteHistory]);

    const handleNavigate = (url: string) => {
        const target = formatUrl(url, settings.searchEngine, settings.theme);
        updateTab(tabId, { url: target });
        setShowSuggestions(false);
    };

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const urlToLoad = selectedIndex >= 0 ? suggestions[selectedIndex] : searchInput;
            handleNavigate(urlToLoad);
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

    const handleAddShortcut = () => {
        if (newUrl && newTitle) {
            const formattedUrl = formatUrl(newUrl, 'google');
            const faviconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${formattedUrl}&size=128`;
            const id = Date.now().toString();

            const shortcutData = {
                id,
                title: newTitle,
                url: formattedUrl,
                favicon: faviconUrl
            };

            addFavorite(shortcutData);

            if (saveAsBookmark) {
                addBookmark(shortcutData);
            }

            setIsAdding(false);
            setNewTitle('');
            setNewUrl('');
            setSaveAsBookmark(false);
        }
    };

    const getBackgroundStyle = () => {
        if (config.mode) return undefined;
        const { type, value } = config.background;
        if (type === 'gradient') return value;
        if (type === 'image') return `url(${value}) center / cover no-repeat`;
        return value;
    };

    const appleSpring = { type: "spring", damping: 15, stiffness: 350, mass: 0.8 } as const;

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen w-full bg-transparent transition-colors duration-500 overflow-hidden relative"
            style={{ background: getBackgroundStyle() }}
        >
            {config.mode ? (
                <AnimatedBackground mode={config.mode as any} />
            ) : (
                config.background.type === 'image' && <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
            )}

            {/* Snapping Guidelines */}
            <AnimatePresence>
                {config.isEditMode && snappingLines.vertical && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-y-0 left-1/2 w-px bg-primary/40 shadow-[0_0_10px_rgba(var(--primary),0.5)] z-0"
                    />
                )}
                {config.isEditMode && snappingLines.horizontal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-x-0 top-1/2 h-px bg-primary/40 shadow-[0_0_10px_rgba(var(--primary),0.5)] z-0"
                    />
                )}
            </AnimatePresence>

            {/* Search Bar / Clock Widget */}
            <motion.div
                drag={config.isEditMode}
                dragMomentum={false}
                onDrag={(e, info) => {
                    const threshold = 15;
                    const l = localLayout.search || { x: 0, y: 0, scale: 1 };
                    const nextX = l.x + info.delta.x;
                    const nextY = l.y + info.delta.y;
                    const isSnapV = Math.abs(nextX) < threshold;
                    const isSnapH = Math.abs(nextY) < threshold;
                    setSnappingLines({ vertical: isSnapV, horizontal: isSnapH });

                    setLocalLayout(prev => ({
                        ...prev,
                        search: { ...l, x: isSnapV ? 0 : nextX, y: isSnapH ? 0 : nextY }
                    }));
                }}
                onDragEnd={() => {
                    setSnappingLines({ vertical: false, horizontal: false });
                    commitLayout(localLayout);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                    opacity: 1,
                    x: localLayout.search?.x || 0,
                    y: localLayout.search?.y || 0,
                    scale: localLayout.search?.scale || 1
                }}
                transition={appleSpring}
                className={cn(
                    "flex flex-col items-center gap-8 w-full max-w-2xl px-4 z-20 relative",
                    config.isEditMode && "cursor-move ring-2 ring-primary/30 ring-offset-8 ring-offset-transparent rounded-3xl"
                )}
            >
                {config.isEditMode && (
                    <>
                        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                            <motion.div
                                key={pos}
                                drag
                                dragMomentum={false}
                                onDrag={(e, info) => {
                                    const l = localLayout.search || { x: 0, y: 0, scale: 1 };
                                    const scaleFactor = 0.005;
                                    const direction = (pos.includes('right') ? 1 : -1) * (info.delta.x + info.delta.y * (pos.includes('bottom') ? 1 : -1));
                                    const nextScale = Math.max(0.4, Math.min(2.5, (l.scale || 1) + direction * scaleFactor));
                                    setLocalLayout(prev => ({
                                        ...prev,
                                        search: { ...l, scale: nextScale }
                                    }));
                                }}
                                onDragEnd={() => commitLayout(localLayout)}
                                className={cn(
                                    "absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg pointer-events-auto cursor-nwse-resize z-50",
                                    pos === 'top-left' && "-top-1.5 -left-1.5",
                                    pos === 'top-right' && "-top-1.5 -right-1.5",
                                    pos === 'bottom-left' && "-bottom-1.5 -left-1.5",
                                    pos === 'bottom-right' && "-bottom-1.5 -right-1.5"
                                )}
                            />
                        ))}
                    </>
                )}

                {/* Time */}
                {config.showClock && (
                    <motion.h1
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={appleSpring}
                        className={cn(
                            "text-6xl md:text-8xl tracking-tighter drop-shadow-xl select-none transition-all duration-300",
                            config.clockThickness || "font-thin"
                        )}
                        style={{ color: config.clockColor || '#ffffff', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                    >
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: config.clockFormat === '12h' })}
                    </motion.h1>
                )}

                {/* Search Input */}
                <div className="w-full relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-white transition-colors">
                        <Search size={20} />
                    </div>
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleSearch}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        className="w-full h-14 pl-12 pr-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl text-lg text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all hover:bg-white/15"
                        placeholder={`Search ${settings.searchEngine} or type a URL`}
                        autoFocus
                    />

                    <AnimatePresence>
                        {isFocused && showSuggestions && suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                transition={appleSpring}
                                className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden z-50 py-3"
                            >
                                {suggestions.map((suggestion, index) => {
                                    const isUrl = isValidUrl(suggestion) || (suggestion.includes('.') && !suggestion.includes(' '));
                                    const historyItem = siteHistory.find(h => h.url === suggestion);
                                    return (
                                        <motion.button
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            whileHover={{ scale: 1.01, x: 4, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleNavigate(suggestion)}
                                            onMouseMove={() => setSelectedIndex(index)}
                                            className={cn(
                                                "w-full flex items-center gap-4 px-6 py-3 text-sm transition-colors text-left relative",
                                                selectedIndex === index ? "bg-white/20 text-white" : "text-white/80"
                                            )}
                                        >
                                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                                {isUrl ? (
                                                    historyItem?.favicon ? (
                                                        <img src={historyItem.favicon} className="w-5 h-5 rounded-md" alt="" />
                                                    ) : (
                                                        <Globe size={18} className="text-blue-300" />
                                                    )
                                                ) : (
                                                    <Search size={18} className="opacity-60" />
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1 truncate">
                                                <span className="truncate font-medium text-base">{historyItem?.title || suggestion}</span>
                                                {(historyItem || isUrl) && suggestion !== historyItem?.title && (
                                                    <span className="text-xs opacity-50 truncate">{suggestion}</span>
                                                )}
                                            </div>
                                            {selectedIndex === index && (
                                                <motion.div layoutId="arrow-nt" className="opacity-50"><ChevronRight size={18} /></motion.div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Speed Dial Grid */}
            {config.showShortcuts && !useStore.getState().isIncognito && (
                <motion.div
                    drag={config.isEditMode}
                    dragMomentum={false}
                    onDrag={(e, info) => {
                        const threshold = 15;
                        const l = localLayout.shortcuts || { x: 0, y: 0, scale: 1 };
                        const nextX = l.x + info.delta.x;
                        const nextY = l.y + info.delta.y;
                        const isSnapV = Math.abs(nextX) < threshold;
                        const isSnapH = Math.abs(nextY) < threshold;
                        setSnappingLines({ vertical: isSnapV, horizontal: isSnapH });

                        setLocalLayout(prev => ({
                            ...prev,
                            shortcuts: { ...l, x: isSnapV ? 0 : nextX, y: isSnapH ? 0 : nextY }
                        }));
                    }}
                    onDragEnd={() => {
                        setSnappingLines({ vertical: false, horizontal: false });
                        commitLayout(localLayout);
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        x: localLayout.shortcuts?.x || 0,
                        y: localLayout.shortcuts?.y || 0,
                        scale: localLayout.shortcuts?.scale || 1
                    }}
                    transition={{ ...appleSpring, delay: 0.1 }}
                    className={cn(
                        "z-10 w-full max-w-4xl px-8 mt-12 relative",
                        config.isEditMode && "cursor-move ring-2 ring-primary/30 ring-offset-8 ring-offset-transparent rounded-3xl"
                    )}
                >
                    {config.isEditMode && (
                        <>
                            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                                <motion.div
                                    key={pos}
                                    drag
                                    dragMomentum={false}
                                    onDrag={(e, info) => {
                                        const l = localLayout.shortcuts || { x: 0, y: 0, scale: 1 };
                                        const scaleFactor = 0.005;
                                        const direction = (pos.includes('right') ? 1 : -1) * (info.delta.x + info.delta.y * (pos.includes('bottom') ? 1 : -1));
                                        const nextScale = Math.max(0.4, Math.min(2.5, (l.scale || 1) + direction * scaleFactor));
                                        setLocalLayout(prev => ({
                                            ...prev,
                                            shortcuts: { ...l, scale: nextScale }
                                        }));
                                    }}
                                    onDragEnd={() => commitLayout(localLayout)}
                                    className={cn(
                                        "absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg pointer-events-auto cursor-nwse-resize z-50",
                                        pos === 'top-left' && "-top-1.5 -left-1.5",
                                        pos === 'top-right' && "-top-1.5 -right-1.5",
                                        pos === 'bottom-left' && "-bottom-1.5 -left-1.5",
                                        pos === 'bottom-right' && "-bottom-1.5 -right-1.5"
                                    )}
                                />
                            ))}
                        </>
                    )}
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-center">
                        {favorites.map((favorite) => (
                            <motion.div
                                key={favorite.id}
                                whileHover={{ scale: 1.1, y: -5 }}
                                whileTap={{ scale: 0.9 }}
                                transition={appleSpring}
                                onClick={() => updateTab(tabId, { url: favorite.url })}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ x: e.clientX, y: e.clientY, id: favorite.id });
                                }}
                                className="group relative flex flex-col items-center gap-2 cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:bg-white/20 group-hover:border-white/40 transition-all overflow-hidden relative">
                                    {favorite.favicon ? (
                                        <img src={favorite.favicon} alt="" className="w-8 h-8 object-contain drop-shadow-md" />
                                    ) : (
                                        <Globe size={28} className="opacity-80" />
                                    )}
                                </div>
                                <span className="text-xs font-medium text-white/90 truncate w-full max-w-[80px] text-center drop-shadow-md">{favorite.title}</span>
                            </motion.div>
                        ))}

                        <motion.button
                            whileHover={{ scale: 1.1, y: -5 }}
                            whileTap={{ scale: 0.9 }}
                            transition={appleSpring}
                            onClick={() => setIsAdding(true)}
                            className="flex flex-col items-center gap-2 cursor-pointer"
                        >
                            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all">
                                <Plus size={24} />
                            </div>
                            <span className="text-xs font-medium text-white/70 group-hover:text-white">Add Shortcut</span>
                        </motion.button>
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
                {contextMenu && (
                    <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={appleSpring}
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                            className="fixed z-[101] bg-card/90 backdrop-blur-xl border border-border/50 shadow-2xl rounded-xl py-1.5 w-40 overflow-hidden"
                        >
                            <button
                                onClick={() => {
                                    const f = favorites.find(f => f.id === contextMenu.id);
                                    if (f) { setNewTitle(f.title); setNewUrl(f.url); removeFavorite(f.id); setIsAdding(true); }
                                    setContextMenu(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-primary/10 flex items-center gap-2 transition-colors"
                            >
                                <Pencil size={14} /> Edit
                            </button>
                            <button
                                onClick={() => { removeFavorite(contextMenu.id); setContextMenu(null); }}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="absolute bottom-6 right-6 z-50">
                <AnimatePresence>{isMenuOpen && <CustomizeMenu onClose={() => setIsMenuOpen(false)} />}</AnimatePresence>
                {!isMenuOpen && !useStore.getState().isIncognito && (
                    <motion.button
                        layout
                        whileHover={{ scale: 1.15, rotate: 15 }}
                        whileTap={{ scale: 0.85 }}
                        transition={appleSpring}
                        onClick={() => setIsMenuOpen(true)}
                        className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-lg text-white hover:bg-white/20 transition-all"
                    >
                        <Pencil size={20} />
                    </motion.button>
                )}
            </div>

            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 40 }} transition={appleSpring}
                            className="relative bg-card w-full max-w-sm p-6 rounded-2xl shadow-2xl z-50 space-y-4 text-foreground"
                        >
                            <h3 className="text-lg font-semibold">Add Shortcut</h3>
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-2 rounded-lg bg-secondary border border-transparent focus:border-primary/50 outline-none" placeholder="My Site" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">URL</label>
                                    <input value={newUrl} onChange={e => setNewUrl(e.target.value)} className="w-full p-2 rounded-lg bg-secondary border border-transparent focus:border-primary/50 outline-none" placeholder="https://example.com" />
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group" onClick={() => setSaveAsBookmark(!saveAsBookmark)}>
                                    <div className={cn(
                                        "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center shrink-0",
                                        saveAsBookmark ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"
                                    )}>
                                        {saveAsBookmark && <Plus size={12} className="text-white" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold">Add to bookmarks bar</span>
                                        <span className="text-[10px] text-muted-foreground">Appears below the address bar</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg">Cancel</button>
                                <button onClick={handleAddShortcut} disabled={!newUrl || !newTitle} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">Add Shortcut</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
