import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Monitor, Moon, Sun, Search, Book, Trash2, Check, Sparkles, Key } from 'lucide-react';
import { cn } from '../lib/utils';
import { PasswordsPage } from './PasswordsPage';

export const Settings: React.FC = () => {
    const { settings, updateSettings, bookmarks, removeBookmark, settingsSection } = useStore();
    const [appVersion, setAppVersion] = useState<string>('');

    useEffect(() => {
        (window as any).rizoAPI?.ipcRenderer.invoke('get-app-version').then((v: string) => setAppVersion(v));
    }, []);

    const activeSection = settingsSection;
    const setActiveSection = (section: 'general' | 'bookmarks' | 'appearance' | 'passwords') => {
        useStore.setState({ settingsSection: section });
    };

    // Tab switch animation
    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveSection(id)}
            className={cn(
                "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeSection === id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
        >
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-border/50 bg-secondary/10">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Configure your browsing experience</p>
                </div>
                {appVersion && (
                    <span className="text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                        v{appVersion}
                    </span>
                )}
            </div>

            <div className="flex px-8 border-b border-border/50 bg-secondary/5">
                <TabButton id="general" label="General" icon={Monitor} />
                <TabButton id="appearance" label="Appearance" icon={Sparkles} />
                <TabButton id="bookmarks" label="Bookmarks" icon={Book} />
                <TabButton id="passwords" label="Passwords" icon={Key} />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8">
                <div className="max-w-3xl">
                    {activeSection === 'general' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Search Engine */}
                            <section className="space-y-4">
                                <div className="flex flex-col">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Search size={18} className="text-primary" /> Search Engine
                                    </h3>
                                    <p className="text-xs text-muted-foreground ml-7">Default provider for search queries</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 ml-7">
                                    {(['google', 'duckduckgo', 'brave'] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => updateSettings({ searchEngine: s })}
                                            className={cn(
                                                "flex items-center justify-between px-5 py-4 rounded-xl border transition-all text-sm",
                                                settings.searchEngine === s
                                                    ? "border-primary/40 bg-primary/5 text-primary"
                                                    : "border-border/40 hover:bg-secondary/50 text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    settings.searchEngine === s ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                                                )} />
                                                <span className="capitalize font-medium">{s}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Selected</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <div className="h-px bg-border/40 ml-7" />

                        </div>
                    ) : activeSection === 'appearance' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Theme Section */}
                            <section className="space-y-4">
                                <div className="flex flex-col">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Sun size={18} className="text-primary" /> Theme
                                    </h3>
                                    <p className="text-xs text-muted-foreground ml-7">Choose how you want Rizo to look</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 ml-7">
                                    {(['light', 'dark', 'system'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => updateSettings({ theme: t })}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all group",
                                                settings.theme === t
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border/40 hover:border-border hover:bg-secondary/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                settings.theme === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:text-foreground"
                                            )}>
                                                {t === 'light' ? <Sun size={18} /> : t === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="text-sm font-medium capitalize">{t} Mode</span>
                                                <span className="text-[10px] text-muted-foreground">{t === 'system' ? 'Follows OS' : `Standard ${t} UI`}</span>
                                            </div>
                                            {settings.theme === t && (
                                                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <Check size={12} className="text-primary-foreground" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <div className="h-px bg-border/40 ml-7" />

                            {/* Toolbar Section */}
                            <section className="space-y-4">
                                <div className="flex flex-col">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Monitor size={18} className="text-primary" /> Toolbar
                                    </h3>
                                    <p className="text-xs text-muted-foreground ml-7">Customize the navigation bar</p>
                                </div>
                                <div className="ml-7 flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/5">
                                    <div className="flex flex-col">
                                        <label className="text-sm font-medium">Show Home Button</label>
                                        <span className="text-[10px] text-muted-foreground">Quick access to the home page</span>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ showHomeButton: !settings.showHomeButton })}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-colors relative",
                                            settings.showHomeButton ? "bg-primary" : "bg-secondary"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-sm",
                                            settings.showHomeButton ? "left-7" : "left-1"
                                        )} />
                                    </button>
                                </div>
                            </section>

                            <div className="h-px bg-border/40 ml-7" />

                            {/* UI Visuals */}
                            <section className="space-y-4">
                                <div className="flex flex-col">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Sparkles size={18} className="text-primary" /> Effects & Visuals
                                    </h3>
                                    <p className="text-xs text-muted-foreground ml-7">Animations and custom aesthetics</p>
                                </div>

                                <div className="ml-7 space-y-4">
                                    <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-secondary/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Particle Effects</span>
                                                <span className="text-[10px] text-muted-foreground">Interactive cursor fireworks</span>
                                            </div>
                                            <button
                                                onClick={() => updateSettings({ particleEffects: !settings.particleEffects })}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-colors relative",
                                                    settings.particleEffects ? "bg-primary" : "bg-secondary"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-sm",
                                                    settings.particleEffects ? "left-7" : "left-1"
                                                )} />
                                            </button>
                                        </div>

                                        {settings.particleEffects && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="space-y-6 pt-4 border-t border-border/10 overflow-hidden"
                                            >
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                            <span>Density</span>
                                                            <span className="text-primary">{settings.particleSettings.amount}</span>
                                                        </div>
                                                        <input
                                                            type="range" min="1" max="20"
                                                            value={settings.particleSettings.amount}
                                                            onChange={(e) => updateSettings({
                                                                particleSettings: { ...settings.particleSettings, amount: parseInt(e.target.value) }
                                                            })}
                                                            className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                            <span>Speed</span>
                                                            <span className="text-primary">{settings.particleSettings.speed.toFixed(1)}x</span>
                                                        </div>
                                                        <input
                                                            type="range" min="0.1" max="3" step="0.1"
                                                            value={settings.particleSettings.speed}
                                                            onChange={(e) => updateSettings({
                                                                particleSettings: { ...settings.particleSettings, speed: parseFloat(e.target.value) }
                                                            })}
                                                            className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Gradient Settings */}
                                    <div className="p-4 rounded-xl border border-border/40 bg-secondary/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Custom Background Gradient</span>
                                                <span className="text-[10px] text-muted-foreground">Applied to new tabs and UI</span>
                                            </div>
                                            <button
                                                onClick={() => updateSettings({
                                                    homePageConfig: {
                                                        ...settings.homePageConfig,
                                                        mode: null
                                                    }
                                                })}
                                                className={cn(
                                                    "text-[10px] px-3 py-1.5 rounded-full font-bold transition-all uppercase tracking-tight",
                                                    !settings.homePageConfig.mode
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                                                )}
                                            >
                                                {settings.homePageConfig.mode ? "Activate Custom" : "Active"}
                                            </button>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Color Start</label>
                                                <div className="flex items-center gap-3 bg-background border border-border/40 p-2 rounded-xl">
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
                                                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                                    />
                                                    <span className="text-xs font-mono">{settings.homePageConfig.gradientState?.color1}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Color End</label>
                                                <div className="flex items-center gap-3 bg-background border border-border/40 p-2 rounded-xl">
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
                                                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                                    />
                                                    <span className="text-xs font-mono">{settings.homePageConfig.gradientState?.color2}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : activeSection === 'passwords' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <PasswordsPage />
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col">
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    <Book size={18} className="text-primary" /> Manage Bookmarks
                                </h3>
                                <p className="text-xs text-muted-foreground ml-7">View and delete your saved pages</p>
                            </div>

                            <div className="ml-7 flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/5">
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium">Show Bookmarks Bar</label>
                                    <span className="text-[10px] text-muted-foreground">Display the bookmarks bar below the navigation bar</span>
                                </div>
                                <button
                                    onClick={() => updateSettings({ showBookmarksBar: !settings.showBookmarksBar })}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative",
                                        settings.showBookmarksBar ? "bg-primary" : "bg-secondary"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-sm",
                                        settings.showBookmarksBar ? "left-7" : "left-1"
                                    )} />
                                </button>
                            </div>

                            <div className="h-px bg-border/40 ml-7" />

                            <div className="ml-7">
                                {bookmarks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-border/40 text-muted-foreground gap-4">
                                        <div className="p-4 bg-background rounded-full">
                                            <Book size={40} className="opacity-20" />
                                        </div>
                                        <p className="text-sm">Your library is currently empty</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {bookmarks.map(bk => (
                                            <div key={bk.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all group bg-card shadow-sm">
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-semibold text-sm truncate">{bk.title}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{bk.url}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeBookmark(bk.id)}
                                                    className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0"
                                                    title="Delete Bookmark"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
