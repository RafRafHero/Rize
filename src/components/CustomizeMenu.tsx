import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Image, Clock, Command, PaintBucket, Pencil, Star } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { GradientEditor } from './GradientEditor';

interface CustomizeMenuProps {
    onClose: () => void;
}

export const CustomizeMenu: React.FC<CustomizeMenuProps> = ({ onClose }) => {
    const { settings, updateSettings } = useStore();
    const config = settings.homePageConfig;

    const [activeTab, setActiveTab] = useState<'background' | 'widgets'>('background');

    const updateConfig = (updates: Partial<typeof config>) => {
        updateSettings({
            homePageConfig: { ...config, ...updates }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-16 right-8 w-80 liquid-glass border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 text-foreground"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h3 className="font-semibold text-sm">Customize Home</h3>
                <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="flex p-2 gap-1 bg-secondary/20">
                <button
                    onClick={() => setActiveTab('background')}
                    className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2",
                        activeTab === 'background' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Image size={12} /> Background
                </button>
                <button
                    onClick={() => setActiveTab('widgets')}
                    className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2",
                        activeTab === 'widgets' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Clock size={12} /> Widgets
                </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[400px]">
                {activeTab === 'background' && (
                    <div className="space-y-6">
                        {/* Mode Specific Elements Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Theme Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => updateConfig({ mode: null })}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                                        !config.mode
                                            ? "border-primary/50 bg-primary/5 shadow-sm"
                                            : "border-border/50 hover:bg-secondary/50"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm shadow-inner text-muted-foreground">
                                        <X size={14} />
                                    </div>
                                    <span className="text-xs font-medium">None</span>
                                    {!config.mode && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>

                                {(['day', 'night', 'sunset'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => updateConfig({ mode: m })}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                                            config.mode === m
                                                ? "border-primary/50 bg-primary/5 shadow-sm"
                                                : "border-border/50 hover:bg-secondary/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-inner",
                                            m === 'day' && "bg-blue-100 text-yellow-500",
                                            m === 'night' && "bg-slate-900 text-blue-200",
                                            m === 'sunset' && "bg-orange-100 text-orange-500"
                                        )}>
                                            {m === 'day' && "☀️"}
                                            {m === 'night' && "🌙"}
                                            {m === 'sunset' && "🌅"}
                                        </div>
                                        <span className="text-xs font-medium capitalize">{m}</span>
                                        {config.mode === m && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Appearance Section (Only when mode is None) */}
                        {!config.mode && (
                            <div className="space-y-3 pt-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Appearance</label>
                                <div className="flex bg-secondary/50 p-1 rounded-xl">
                                    {(['light', 'dark', 'system'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => updateSettings({ theme: t })}
                                            className={cn(
                                                "flex-1 py-1.5 text-xs rounded-lg transition-all capitalize",
                                                settings.theme === t ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Background Section */}
                        <div className={cn("space-y-3 transition-opacity duration-300", config.mode ? "opacity-50 pointer-events-none grayscale" : "opacity-100")}>
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Background</label>
                                {config.mode && <span className="text-[10px] text-muted-foreground italic">(Disabled by Mode)</span>}
                            </div>

                            <div className="flex bg-secondary/50 p-1 rounded-xl">
                                {(['solid', 'gradient', 'image'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            // Selecting a background type automatically disables Mode
                                            updateConfig({
                                                mode: null,
                                                background: {
                                                    type,
                                                    value: type === 'solid' ? '#ffffff' : type === 'gradient' ? 'linear-gradient(to bottom right, #e0e7ff, #f3e8ff)' : ''
                                                }
                                            })
                                        }}
                                        className={cn(
                                            "flex-1 py-1.5 text-xs rounded-lg transition-all capitalize",
                                            config.background.type === type ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {config.background.type === 'solid' && (
                                <div className="flex items-center justify-center py-4">
                                    <input
                                        type="color"
                                        value={config.background.value}
                                        onChange={(e) => updateConfig({ mode: null, background: { ...config.background, value: e.target.value } })}
                                        className="w-16 h-16 rounded-full cursor-pointer overflow-hidden border-2 border-border shadow-sm"
                                    />
                                </div>
                            )}

                            {config.background.type === 'gradient' && (
                                <GradientEditor
                                    value={config.gradientState || {
                                        color1: '#e0e7ff', color2: '#f3e8ff', angle: 135,
                                        point1: { x: 0, y: 0 }, point2: { x: 100, y: 100 }
                                    }}
                                    onChange={(newState) => {
                                        updateConfig({
                                            mode: null,
                                            gradientState: newState,
                                            background: {
                                                type: 'gradient',
                                                value: `linear-gradient(${newState.angle}deg, ${newState.color1}, ${newState.color2})`
                                            }
                                        })
                                    }}
                                />
                            )}

                            {config.background.type === 'image' && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Image URL</p>
                                    <input
                                        className="w-full p-2 bg-secondary rounded-md text-xs border border-transparent focus:border-primary/50 outline-none"
                                        placeholder="https://..."
                                        value={config.background.value.startsWith('data:') ? 'Uploaded Image' : config.background.value}
                                        onChange={(e) => updateConfig({ mode: null, background: { ...config.background, value: e.target.value } })}
                                    />
                                    <label className="flex items-center justify-center gap-2 p-2 bg-secondary/50 hover:bg-secondary rounded-md cursor-pointer transition-colors text-xs font-medium">
                                        <Image size={14} /> Upload Image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        updateConfig({ mode: null, background: { ...config.background, value: reader.result as string } })
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'widgets' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-background rounded-lg text-primary"><Clock size={16} /></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Show Clock</span>
                                    <span className="text-xs text-muted-foreground">Display time on home</span>
                                </div>
                            </div>
                            <Switch checked={config.showClock} onChange={v => updateConfig({ showClock: v })} />
                        </div>

                        {config.showClock && (
                            <div className="space-y-4 pl-4 border-l-2 border-secondary ml-4">
                                {/* Clock Format */}
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Format</p>
                                    <div className="flex bg-secondary/50 p-1 rounded-xl">
                                        {(['12h', '24h'] as const).map((format) => (
                                            <button
                                                key={format}
                                                onClick={() => updateConfig({ clockFormat: format })}
                                                className={cn(
                                                    "flex-1 py-1.5 text-xs rounded-lg transition-all",
                                                    config.clockFormat === format ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {format}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Clock Thickness */}
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Thickness</p>
                                    <div className="flex bg-secondary/50 p-1 rounded-xl">
                                        {[
                                            { label: 'Thin', value: 'font-thin' },
                                            { label: 'Normal', value: 'font-normal' },
                                            { label: 'Bold', value: 'font-bold' },
                                            { label: 'Heavy', value: 'font-black' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => updateConfig({ clockThickness: opt.value })}
                                                className={cn(
                                                    "flex-1 py-1.5 text-xs rounded-lg transition-all",
                                                    config.clockThickness === opt.value ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Clock Color */}
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Color</p>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={config.clockColor || '#ffffff'}
                                            onChange={(e) => updateConfig({ clockColor: e.target.value })}
                                            className="w-10 h-10 rounded-lg cursor-pointer border border-border shadow-sm overflow-hidden"
                                        />
                                        <span className="text-xs text-muted-foreground uppercase">{config.clockColor || '#ffffff'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-background rounded-lg text-primary"><Star size={16} /></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Bookmarks Bar</span>
                                    <span className="text-xs text-muted-foreground">Show bar below navbar</span>
                                </div>
                            </div>
                            <Switch checked={settings.showBookmarksBar} onChange={v => updateSettings({ showBookmarksBar: v })} />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-background rounded-lg text-primary"><Command size={16} /></div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Favorites</span>
                                    <span className="text-xs text-muted-foreground">Show shortcuts grid</span>
                                </div>
                            </div>
                            <Switch checked={config.showShortcuts} onChange={v => updateConfig({ showShortcuts: v })} />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-background rounded-lg text-purple-500"><Pencil size={16} /></div>
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-medium">Edit Mode</span>
                                    <span className="text-xs text-muted-foreground">Move and resize widgets</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {Object.keys(config.layout || {}).length > 0 && (
                                    <button
                                        onClick={() => updateConfig({ layout: {} })}
                                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
                                        title="Reset Layout"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <Switch checked={config.isEditMode} onChange={v => updateConfig({ isEditMode: v })} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const Switch = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!checked)}
        className={cn(
            "w-10 h-6 rounded-full relative transition-colors",
            checked ? "bg-primary" : "bg-muted"
        )}
    >
        <div className={cn(
            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
            checked ? "left-5" : "left-1"
        )} />
    </button>
)
