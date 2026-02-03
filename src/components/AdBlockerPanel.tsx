import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldOff, Power, List, Trash2, Layout, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export const AdBlockerPanel: React.FC = () => {
    const {
        isAdBlockerOpen, toggleAdBlocker,
        settings, toggleAdBlockerEnabled,
        addToWhitelist, removeFromWhitelist,
        blockedAdsCount, updateBlockedCount,
        tabs, activeTabId
    } = useStore();

    const activeTab = tabs.find(t => t.id === activeTabId);
    const domain = activeTab?.url ? new URL(activeTab.url).hostname : '';
    const isWhitelisted = settings.adBlockWhitelist.includes(domain);

    // Sync with extension storage for blocked count
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const result = await (window as any).rizoAPI?.ipcRenderer.invoke('get-extension-storage', 'blockedCount');
                if (result !== undefined && result !== null) {
                    updateBlockedCount(result);
                }
            } catch (e) {
                console.error('Failed to sync blocked count:', e);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleWhitelist = () => {
        if (isWhitelisted) {
            removeFromWhitelist(domain);
            console.log(`[${domain}] toggled adblocker`);
        } else if (domain) {
            addToWhitelist(domain);
            console.log(`[${domain}] untoggled adblocker`);
        }
    };

    return (
        <AnimatePresence>
            {isAdBlockerOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={toggleAdBlocker} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="absolute top-14 right-4 w-80 liquid-glass border border-white/10 shadow-2xl rounded-2xl p-4 z-50 flex flex-col gap-4 text-foreground overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    settings.adBlockEnabled ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-400"
                                )}>
                                    <Shield size={18} />
                                </div>
                                <span className="font-bold tracking-tight">Rizo Guard</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Blocked</span>
                                <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    {blockedAdsCount.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Power Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">Global Protection</span>
                                <span className="text-[10px] text-muted-foreground">Block ads on all websites</span>
                            </div>
                            <button
                                onClick={() => {
                                    toggleAdBlockerEnabled();
                                    console.log(`Adblocker ${!settings.adBlockEnabled ? 'toggled' : 'untoggled'} globally`);
                                }}
                                className={cn(
                                    "p-2 rounded-xl transition-all duration-300",
                                    settings.adBlockEnabled
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "bg-white/10 text-muted-foreground"
                                )}
                            >
                                <Power size={20} />
                            </button>
                        </div>

                        {/* Current Site Action */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Current Website</span>
                            </div>
                            <button
                                onClick={handleToggleWhitelist}
                                disabled={!domain || !settings.adBlockEnabled}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group",
                                    isWhitelisted
                                        ? "bg-red-400/10 border-red-400/20 text-red-400 hover:bg-red-400/20"
                                        : "bg-green-400/10 border-green-400/20 text-green-400 hover:bg-green-400/20"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {isWhitelisted ? <ShieldOff size={18} /> : <CheckCircle2 size={18} />}
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs font-bold truncate max-w-[140px]">{domain || "Unknown Site"}</span>
                                        <span className="text-[10px] opacity-70">
                                            {isWhitelisted ? "Protection Disabled" : "Protection Active"}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-1 px-2 rounded-lg bg-white/5 text-[10px] group-hover:bg-white/10 transition-colors">
                                    Toggle
                                </div>
                            </button>
                        </div>

                        {/* Info Footer */}
                        <div className="flex items-center gap-2 mt-1 px-1">
                            <Layout size={12} className="text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                                High-performance network-level blocking active.
                            </span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
