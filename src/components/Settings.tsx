import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { X, Monitor, Moon, Sun, Search, Book, Trash2, Edit2, Check, Sparkles, Layout } from 'lucide-react';
import { cn } from '../lib/utils';

export const Settings: React.FC = () => {
    const { isSettingsOpen, toggleSettings, settings, updateSettings, bookmarks, removeBookmark, settingsSection } = useStore();
    const [editingId, setEditingId] = useState<string | null>(null);

    const activeSection = settingsSection;
    const setActiveSection = (section: 'general' | 'bookmarks') => {
        useStore.setState({ settingsSection: section });
    };

    // Tab switch animation
    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveSection(id)}
            className={cn(
                "flex-1 pb-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                activeSection === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
        >
            <Icon size={14} /> {label}
        </button>
    );

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => toggleSettings()}
                        className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' } as any}
                        exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' } as any}
                        className="fixed top-1/2 left-1/2 w-[90%] max-w-2xl h-[80vh] liquid-glass border border-border/50 shadow-2xl rounded-2xl z-[70] overflow-hidden flex flex-col"
                        style={{ transform: 'translate(-50%, -50%)' }}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border/50">
                            <h2 className="text-lg font-semibold">Settings</h2>
                            <button onClick={() => toggleSettings()} className="p-1 hover:bg-secondary rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex px-4 pt-4 gap-2">
                            <TabButton id="general" label="General" icon={Monitor} />
                            <TabButton id="bookmarks" label="Bookmarks" icon={Book} />
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {activeSection === 'general' ? (
                                <div className="space-y-6">
                                    {/* Theme */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Sun size={14} /> Appearance
                                        </label>
                                        <div className="flex bg-secondary/50 p-1 rounded-xl">
                                            {(['light', 'dark'] as const).map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => updateSettings({ theme: t })}
                                                    className={cn(
                                                        "flex-1 py-2 text-sm rounded-lg transition-all flex items-center justify-center gap-2 capitalize",
                                                        settings.theme === t ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {t === 'light' && <Sun size={14} />}
                                                    {t === 'dark' && <Moon size={14} />}
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Search Engine */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Search size={14} /> Search Engine
                                        </label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {(['google', 'duckduckgo', 'brave'] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => updateSettings({ searchEngine: s })}
                                                    className={cn(
                                                        "flex items-center justify-between px-4 py-2 rounded-lg border transition-all text-sm capitalize",
                                                        settings.searchEngine === s
                                                            ? "border-primary/50 bg-primary/5 text-primary"
                                                            : "border-border/50 hover:bg-secondary/50 text-foreground"
                                                    )}
                                                >
                                                    {s}
                                                    {settings.searchEngine === s && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bookmarks Bar Toggle */}
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-border/50">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Book size={14} /> Show Bookmarks Bar
                                        </label>
                                        <button
                                            onClick={() => updateSettings({ showBookmarksBar: !settings.showBookmarksBar })}
                                            className={cn(
                                                "w-10 h-6 rounded-full transition-colors relative",
                                                settings.showBookmarksBar ? "bg-primary" : "bg-secondary"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute w-4 h-4 bg-white rounded-full top-1 transition-all",
                                                settings.showBookmarksBar ? "left-5" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {/* Set Default Browser */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Monitor size={14} /> System
                                        </label>
                                        <button
                                            onClick={() => (window as any).electron?.ipcRenderer.send('open-default-browser-settings')}
                                            className="w-full flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group"
                                        >
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-sm font-semibold text-primary text-left">Set as Default Browser</span>
                                                <span className="text-xs text-muted-foreground text-left">Make Rizo your primary way to browse the web</span>
                                            </div>
                                            <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                                <Check size={16} className="text-primary" />
                                            </div>
                                        </button>
                                    </div>

                                    {/* UI Visuals */}
                                    <div className="space-y-3 pt-2">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Sparkles size={14} /> UI Visuals
                                        </label>

                                        <div className="space-y-2">
                                            <div className="space-y-4 p-3 rounded-xl border border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium flex items-center gap-2">
                                                            <Sparkles size={14} /> Particle Effects
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">Fireworks follow your cursor</span>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ particleEffects: !settings.particleEffects })}
                                                        className={cn(
                                                            "w-10 h-6 rounded-full transition-colors relative",
                                                            settings.particleEffects ? "bg-primary" : "bg-secondary"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "absolute w-4 h-4 bg-white rounded-full top-1 transition-all",
                                                            settings.particleEffects ? "left-5" : "left-1"
                                                        )} />
                                                    </button>
                                                </div>

                                                {settings.particleEffects && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        className="space-y-4 pt-2 border-t border-border/10 overflow-hidden"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                                <span>Amount</span>
                                                                <span>{settings.particleSettings.amount}</span>
                                                            </div>
                                                            <input
                                                                type="range" min="1" max="20"
                                                                value={settings.particleSettings.amount}
                                                                onChange={(e) => updateSettings({
                                                                    particleSettings: { ...settings.particleSettings, amount: parseInt(e.target.value) }
                                                                })}
                                                                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                                <span>Speed</span>
                                                                <span>{settings.particleSettings.speed.toFixed(1)}x</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0.1" max="3" step="0.1"
                                                                value={settings.particleSettings.speed}
                                                                onChange={(e) => updateSettings({
                                                                    particleSettings: { ...settings.particleSettings, speed: parseFloat(e.target.value) }
                                                                })}
                                                                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                                <span>Color Variation</span>
                                                                <span>{settings.particleSettings.colorVariation}</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="360"
                                                                value={settings.particleSettings.colorVariation}
                                                                onChange={(e) => updateSettings({
                                                                    particleSettings: { ...settings.particleSettings, colorVariation: parseInt(e.target.value) }
                                                                })}
                                                                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Gradient Editor */}
                                            <div className="space-y-2 p-3 rounded-xl border border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium flex items-center gap-2">
                                                        <Search size={14} /> Custom Gradient
                                                    </span>
                                                    <button
                                                        onClick={() => updateSettings({
                                                            homePageConfig: {
                                                                ...settings.homePageConfig,
                                                                mode: null // Switch to custom gradient mode
                                                            }
                                                        })}
                                                        className={cn(
                                                            "text-xs px-2 py-1 rounded-md transition-colors",
                                                            !settings.homePageConfig.mode ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                                                        )}
                                                    >
                                                        Activate
                                                    </button>
                                                </div>

                                                <div className="flex gap-2">
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-xs text-muted-foreground">Color 1</label>
                                                        <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded-lg">
                                                            <input
                                                                type="color"
                                                                value={settings.homePageConfig.gradientState?.color1 || '#a1c4fd'}
                                                                onChange={(e) => updateSettings({
                                                                    homePageConfig: {
                                                                        ...settings.homePageConfig,
                                                                        gradientState: {
                                                                            ...settings.homePageConfig.gradientState!,
                                                                            color1: e.target.value
                                                                        }
                                                                    }
                                                                })}
                                                                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                                            />
                                                            <span className="text-xs font-mono">{settings.homePageConfig.gradientState?.color1}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-xs text-muted-foreground">Color 2</label>
                                                        <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded-lg">
                                                            <input
                                                                type="color"
                                                                value={settings.homePageConfig.gradientState?.color2 || '#c2e9fb'}
                                                                onChange={(e) => updateSettings({
                                                                    homePageConfig: {
                                                                        ...settings.homePageConfig,
                                                                        gradientState: {
                                                                            ...settings.homePageConfig.gradientState!,
                                                                            color2: e.target.value
                                                                        }
                                                                    }
                                                                })}
                                                                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                                            />
                                                            <span className="text-xs font-mono">{settings.homePageConfig.gradientState?.color2}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {bookmarks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                                            <Book size={32} className="opacity-20" />
                                            <p>No bookmarks yet</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            {bookmarks.map(bk => (
                                                <div key={bk.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border hover:bg-secondary/10 transition-colors group">
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-medium text-sm truncate">{bk.title}</span>
                                                        <span className="text-xs text-muted-foreground truncate">{bk.url}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {/* TODO: Add Edit Dialog */}
                                                        <button
                                                            onClick={() => removeBookmark(bk.id)}
                                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-md"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
