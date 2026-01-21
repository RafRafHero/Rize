import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Globe, ChevronLeft, ChevronRight, Users, Minus } from 'lucide-react';
import { useStore, Tab } from '../store/useStore';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
    const { tabs, activeTabId, setActiveTab, addTab, removeTab, settings, updateSettings, isIncognito } = useStore();
    const isCompact = settings.isSidebarCollapsed;

    // Use local ref for immediate feedback during drag
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [localWidth, setLocalWidth] = useState(settings.sidebarWidth);
    const isResizing = useRef(false);

    // Sync from store if changed externally
    useEffect(() => {
        setLocalWidth(settings.sidebarWidth);
    }, [settings.sidebarWidth]);

    const handleResize = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = Math.max(200, Math.min(e.clientX, 400));
        setLocalWidth(newWidth);
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        updateSettings({ sidebarWidth: localWidth }); // Commit change
    }, [handleResize, localWidth, updateSettings]);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
    };

    const width = isCompact ? 52 : localWidth;

    const handleTabClick = (id: string) => {
        if (settings.isSplitScreen) {
            if (activeTabId === settings.secondaryTabId) {
                updateSettings({ secondaryTabId: id });
            } else {
                updateSettings({ primaryTabId: id });
            }
        }
        setActiveTab(id);
    };

    return (
        <motion.div
            style={{ width }}
            className={cn(
                "relative flex flex-col h-full z-20 overflow-hidden border-r border-white/5",
                isCompact
                    ? "items-center py-4 gap-4 shadow-none"
                    : "p-2 gap-2 shadow-none",
                "bg-transparent"
            )}
            layout
            transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
        >
            {/* Traffic Lights (MacOS Style) */}
            <motion.div
                layout={false}
                className={cn(
                    "flex items-center no-drag shrink-0 w-full transition-all duration-300 py-3",
                    isCompact ? "px-1 justify-center gap-1.5" : "px-4 justify-start gap-2"
                )}
            >
                <div
                    onClick={() => (window as any).electron?.window.close()}
                    className="traffic-light close"
                    title="Close"
                >
                    <X size={8} strokeWidth={4} />
                </div>
                <div
                    onClick={() => (window as any).electron?.window.minimize()}
                    className="traffic-light minimize"
                    title="Minimize"
                >
                    <Minus size={8} strokeWidth={4} />
                </div>
                <div
                    onClick={() => (window as any).electron?.window.maximize()}
                    className="traffic-light maximize"
                    title="Fullscreen"
                >
                    <Plus size={8} strokeWidth={4} />
                </div>
            </motion.div>

            {/* App Logo / Header */}
            <div className={cn("flex items-center gap-2 px-2 mb-2 titlebar-drag-region", isCompact ? "justify-center" : "")}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-sm overflow-hidden shrink-0">
                    <img src="Rizo logo.png" alt="Rizo" className="w-full h-full object-cover" />
                </div>
                {!isCompact && (
                    <span className="font-semibold text-lg tracking-tight flex-1 truncate">Rizo</span>
                )}
                {!isCompact && (
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", damping: 15, stiffness: 300 }}
                        onClick={() => updateSettings({ isSidebarCollapsed: true })}
                        className={cn(
                            "p-1 hover:bg-secondary rounded-md no-drag",
                            isIncognito ? "text-white" : ""
                        )}
                    >
                        <ChevronLeft size={16} />
                    </motion.button>
                )}
            </div>

            {isCompact && (
                <motion.button
                    whileHover={{ scale: 1.1, rotate: -180 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ type: "spring", damping: 15, stiffness: 300 }}
                    onClick={() => updateSettings({ isSidebarCollapsed: false })}
                    className={cn(
                        "p-1 hover:bg-secondary rounded-md mb-2",
                        isIncognito ? "text-white" : ""
                    )}
                >
                    <ChevronRight size={16} />
                </motion.button>
            )}

            {/* Tabs List */}
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar w-full">
                {tabs.map((tab) => (
                    <TabItem
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        isCompact={isCompact}
                        isIncognito={isIncognito}
                        onClick={() => handleTabClick(tab.id)}
                        onClose={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                    />
                ))}

                {/* Add Tab Button - inside scrollable list */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addTab()}
                    className={cn(
                        "flex items-center justify-center gap-2 p-2 rounded-xl transition-colors shrink-0", // Removed hover:bg-secondary/80, hover:text-foreground
                        isCompact ? "w-10 h-10 mx-auto" : "w-full",
                        isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground"
                    )}
                >
                    <Plus size={20} />
                    {!isCompact && <span className="text-sm font-medium">New Tab</span>}
                </motion.button>
            </div>

            {/* Profile Switcher Button */}
            {!isCompact ? (
                <div className="mt-auto pt-2 border-t border-white/5 w-full flex flex-col gap-1">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => (window as any).electron?.ipcRenderer.send('switch-to-profile-selector')}
                        className={cn(
                            "flex items-center gap-2 p-3 rounded-xl transition-colors hover:bg-white/5 no-drag",
                            isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Users size={18} />
                        </div>
                        <span className="text-sm font-semibold tracking-tight">Switch Profile</span>
                    </motion.button>
                </div>
            ) : (
                <div className="mt-auto py-2 border-t border-white/5 flex flex-col items-center">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => (window as any).electron?.ipcRenderer.send('switch-to-profile-selector')}
                        className={cn(
                            "p-2 rounded-xl hover:bg-white/5 transition-colors no-drag",
                            isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Users size={20} />
                    </motion.button>
                </div>
            )}

            {/* Resize Handle */}
            {!isCompact && (
                <div
                    onMouseDown={startResizing}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50"
                />
            )}
        </motion.div>
    );
};

// Sub-component for individual tab
const TabItem = ({ tab, isActive, isCompact, isIncognito, onClick, onClose }: { tab: Tab, isActive: boolean, isCompact: boolean, isIncognito: boolean, onClick: () => void, onClose: (e: React.MouseEvent) => void }) => {
    const { settings } = useStore();

    return (
        <div className={cn("relative group w-full flex", isCompact ? "justify-center" : "")}>
            <motion.div
                layout
                onClick={onClick}
                initial={false}
                animate={{
                    backgroundColor: isActive ? "var(--background)" : "transparent",
                    scale: isActive ? 1 : 0.98,
                }}
                onAuxClick={(e) => {
                    if (e.button === 1) {
                        e.stopPropagation(); // prevent default scroll
                        onClose(e);
                    }
                }}
                className={cn(
                    "relative flex items-center justify-center rounded-xl cursor-pointer transition-all duration-300",
                    isActive
                        ? (isCompact ? "bg-white/20 shadow-inner" : "bg-background border-border shadow-sm")
                        : "", // Removed hover:bg-white/10
                    // Shape and Layout
                    isCompact ? "w-10 h-10 p-0 rounded-2xl" : "h-12 w-full px-2 gap-3 border border-transparent",
                    isIncognito ? (isActive ? "text-white" : "text-white/60 hover:text-white") : ""
                )}
            >
                {isActive && !isCompact && (
                    <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full"
                    />
                )}

                {/* Active Indicator (Dot for Compact) */}
                {isActive && isCompact && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
                )}

                {/* Favicon */}
                <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded overflow-hidden text-muted-foreground">
                    {tab.favicon ? (
                        <img src={tab.favicon} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Globe size={16} />
                    )}
                </div>

                {/* Title & Split Side Label */}
                {!isCompact && (
                    <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate text-left select-none">
                            {tab.title || "Home Page"}
                        </span>
                        {settings.isSplitScreen && (tab.id === settings.primaryTabId || tab.id === settings.secondaryTabId) && (
                            <span className={cn(
                                "text-[10px] font-medium",
                                isIncognito ? "text-white/40" : "text-zinc-600"
                            )}>
                                {tab.id === settings.primaryTabId ? "Left Side" : "Right Side"}
                            </span>
                        )}
                    </div>
                )}

                {/* Close Button (Hover) */}
                {!isCompact && (
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-1 rounded-md transition-opacity", // Removed hover:bg-destructive
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                    >
                        <X size={14} />
                    </button>
                )}
            </motion.div>
        </div>
    );
}
