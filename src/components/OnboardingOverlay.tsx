import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Import, Check, ArrowRight, X, LayoutTemplate, Search, Ghost, Shield, Sidebar as SidebarIcon, MousePointerClick } from 'lucide-react';
import { cn } from '../lib/utils';

export const OnboardingOverlay = () => {
    const { firstRunCompleted, setFirstRunCompleted, addBookmark } = useStore();

    // Steps: Welcome -> Import -> Ghost -> Sidebar -> Url -> AdBlock -> GlassCards -> Finish
    const [step, setStep] = useState<'welcome' | 'import' | 'ghost' | 'sidebar' | 'url' | 'adblock' | 'glasscards' | 'completed'>('welcome');
    const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
    const [importedCount, setImportedCount] = useState(0);
    const [spotlight, setSpotlight] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    // Don't render until persistence is loaded (not null) and only if false
    if (firstRunCompleted !== false) return null;

    // Helper to calculate spotlight position
    const updateSpotlight = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const rect = el.getBoundingClientRect();
            setSpotlight({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
        } else {
            setSpotlight(null);
        }
    };

    useEffect(() => {
        if (step === 'sidebar') updateSpotlight('sidebar');
        else if (step === 'url') updateSpotlight('url-bar');
        else if (step === 'adblock') updateSpotlight('adblock-shield');
        else setSpotlight(null);

        // Window resize listener
        const handleResize = () => {
            if (step === 'sidebar') updateSpotlight('sidebar');
            else if (step === 'url') updateSpotlight('url-bar');
            else if (step === 'adblock') updateSpotlight('adblock-shield');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [step]);

    const handleImport = async (browser: 'chrome' | 'edge') => {
        setImportStatus('importing');
        try {
            const result = await (window as any).electron?.ipcRenderer.invoke('import-browser-data', browser);
            if (result && result.bookmarks) {
                result.bookmarks.forEach((b: any) => addBookmark(b));
                setImportedCount(result.bookmarks.length);
                setImportStatus('done');
                setTimeout(() => setStep('ghost'), 1500);
            } else {
                setImportStatus('error');
            }
        } catch (e) {
            console.error('Import failed', e);
            setImportStatus('error');
        }
    };

    const handleComplete = () => {
        // Trigger exit animation then persisting state
        setStep('completed');
        setTimeout(() => {
            setFirstRunCompleted(true);
            // Trigger Profile Selector if needed via App.tsx logic or IPC
            // (User requested fade to profile selection, but usually we are ALREADY in a profile or default.
            //  Safe bet: Just end tutorial. App.tsx will show normal UI or Profile Selector based on URL usage.)
            // If the user meant "Show Profile Selector NOW", we can force it:
            // (window as any).electron?.ipcRenderer.send('switch-to-profile-selector'); 
            // But let's stick to just completing for now as the request was "The persist check logic".
        }, 800);
    };

    // Glass Card Style (User Requested)
    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        borderRadius: '16px',
    };

    return (
        <AnimatePresence>
            {step !== 'completed' && (
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.8 } }} // Slow fade out
                    className="fixed inset-0 z-[9999] bg-black/60 pointer-events-auto"
                >
                    {/* Spotlight Cutout (SVG Mask effect or simple highlighted layering) */}
                    {/* Simpler: We render a "Hole" using clip-path on the overlay OR simply just render the card and let the background be dark.
                        User requested "Spotlight" (dimming rest). The overlay bg-black/60 does the dimming.
                        To "Highlight" the element, we can draw a glowing box at its coordinates.
                    */}
                    {spotlight && (
                        <motion.div
                            layoutId="spotlight-box"
                            className="absolute border-2 border-primary shadow-[0_0_30px_rgba(59,130,246,0.5)] rounded-xl pointer-events-none z-10"
                            initial={false}
                            animate={{
                                x: spotlight.x - 4,
                                y: spotlight.y - 4,
                                width: spotlight.w + 8,
                                height: spotlight.h + 8
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}

                    {/* Step Content */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Wrapper for pointer events */}
                        <div className="pointer-events-auto">

                            {/* WELCOME */}
                            {step === 'welcome' && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: -20 }}
                                    style={glassStyle}
                                    className="p-10 max-w-lg text-center"
                                >
                                    <h1 className="text-4xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-4">
                                        Welcome to Rizo
                                    </h1>
                                    <p className="text-white/80 text-lg mb-8 leading-relaxed">
                                        The browser reframed. Experience a fluid, Liquid Glass interface designed for focus and speed.
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={() => setFirstRunCompleted(true)}
                                            className="px-6 py-3 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all font-medium text-sm"
                                        >
                                            Skip Tour
                                        </button>
                                        <button
                                            onClick={() => setStep('import')}
                                            className="px-8 py-3 rounded-full bg-white text-black hover:scale-105 transition-all font-bold shadow-lg shadow-white/20 flex items-center gap-2"
                                        >
                                            Get Started <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* IMPORT */}
                            {step === 'import' && (
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -50, opacity: 0 }}
                                    style={glassStyle}
                                    className="p-10 max-w-xl text-center"
                                >
                                    <div className="mb-6 flex justify-center">
                                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                            <Import size={32} />
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white mb-2">Import Data</h2>
                                    <p className="text-white/60 mb-8">Seamlessly transfer bookmarks from your old browser.</p>

                                    {importStatus === 'idle' && (
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <button
                                                onClick={() => handleImport('chrome')}
                                                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 transition-all flex flex-col items-center gap-3 group"
                                            >
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" className="w-10 h-10 group-hover:scale-110 transition-transform" />
                                                <span className="font-medium text-white">Chrome</span>
                                            </button>
                                            <button
                                                onClick={() => handleImport('edge')}
                                                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 transition-all flex flex-col items-center gap-3 group"
                                            >
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/9/98/Microsoft_Edge_logo_%282019%29.svg" className="w-10 h-10 group-hover:scale-110 transition-transform" />
                                                <span className="font-medium text-white">Edge</span>
                                            </button>
                                        </div>
                                    )}

                                    {importStatus === 'importing' && (
                                        <div className="py-12 flex flex-col items-center">
                                            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
                                            <span className="text-white/80">Importing...</span>
                                        </div>
                                    )}

                                    {importStatus === 'done' && (
                                        <div className="py-8 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-4 border border-green-500/30">
                                                <Check size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Success!</h3>
                                            <p className="text-white/60 mt-2">Imported {importedCount} bookmarks.</p>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-4">
                                        <button onClick={() => setStep('ghost')} className="text-white/40 hover:text-white text-sm">Skip</button>
                                        {importStatus === 'done' && (
                                            <button onClick={() => setStep('ghost')} className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-medium transition-all shadow-lg shadow-blue-500/25">
                                                Next
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* GHOST SEARCH */}
                            {step === 'ghost' && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={glassStyle}
                                    className="p-8 max-w-md text-center"
                                >
                                    <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mb-6 border border-purple-500/30">
                                        <Ghost size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-4">Ghost Search</h2>
                                    <p className="text-white/70 mb-6">
                                        Press <kbd className="px-2 py-1 bg-white/10 rounded-lg text-white font-mono mx-1 border border-white/10">Ctrl + K</kbd> anywhere to summon the search bar.
                                    </p>
                                    <button onClick={() => setStep('sidebar')} className="px-6 py-2 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform">
                                        Continue
                                    </button>
                                </motion.div>
                            )}

                            {/* SIDEBAR */}
                            {step === 'sidebar' && (
                                <motion.div
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 200, opacity: 1 }} // Offset from sidebar
                                    exit={{ opacity: 0 }}
                                    style={glassStyle}
                                    className="p-6 max-w-sm text-center relative"
                                >
                                    {/* Arrow pointing left */}
                                    <motion.div
                                        animate={{ x: [-5, 5, -5] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="absolute top-1/2 -left-12 text-white"
                                    >
                                        <ArrowRight size={48} className="rotate-180 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                    </motion.div>

                                    <h2 className="text-xl font-bold text-white mb-2">Vertical Tabs & Sidebar</h2>
                                    <p className="text-white/70 text-sm mb-4">
                                        Manage your tabs and profiles here. You can resize it or collapse it for more space.
                                    </p>
                                    <button onClick={() => setStep('url')} className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm">
                                        Next
                                    </button>
                                </motion.div>
                            )}

                            {/* URL BAR */}
                            {step === 'url' && (
                                <motion.div
                                    initial={{ y: -50, opacity: 0 }}
                                    animate={{ y: 150, opacity: 1 }} // Offset from top
                                    exit={{ opacity: 0 }}
                                    style={glassStyle}
                                    className="p-6 max-w-md text-center relative mx-auto"
                                >
                                    {/* Arrow pointing up */}
                                    <motion.div
                                        animate={{ y: [-5, 5, -5] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="absolute -top-12 left-1/2 -translate-x-1/2 text-white"
                                    >
                                        <ArrowRight size={48} className="-rotate-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                    </motion.div>

                                    <h2 className="text-xl font-bold text-white mb-2">Smart Omnibox</h2>
                                    <p className="text-white/70 text-sm mb-4">
                                        Search history, bookmarks, and the web instantly.
                                    </p>
                                    <button onClick={() => setStep('adblock')} className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm">
                                        Next
                                    </button>
                                </motion.div>
                            )}

                            {/* ADBLOCK */}
                            {step === 'adblock' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: -200 }} // Offset from right side
                                    exit={{ opacity: 0 }}
                                    style={{
                                        position: 'absolute',
                                        top: 80,
                                        right: 150,
                                        ...glassStyle
                                    }}
                                    className="p-6 max-w-sm text-center"
                                >
                                    {/* Arrow pointing right-ish/up towards shield */}
                                    <motion.div
                                        animate={{ x: [5, -5, 5], y: [-5, 5, -5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -top-10 -right-8 text-white"
                                    >
                                        <ArrowRight size={48} className="-rotate-45 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                    </motion.div>

                                    <div className="w-12 h-12 mx-auto bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-4 border border-green-500/30">
                                        <Shield size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">Rizo Guard</h2>
                                    <p className="text-white/70 text-sm mb-4">
                                        Rizo automatically blocks ads. Click the shield to toggle protection for specific sites.
                                    </p>
                                    <button onClick={() => setStep('glasscards')} className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm">
                                        Got it
                                    </button>
                                </motion.div>
                            )}

                            {/* GLASS CARDS */}
                            {step === 'glasscards' && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={glassStyle}
                                    className="p-8 max-w-md text-center"
                                >
                                    <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-6 border border-blue-500/30">
                                        <LayoutTemplate size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-4">Glass Cards Overview</h2>
                                    <p className="text-white/70 mb-6">
                                        Press <kbd className="px-2 py-1 bg-white/10 rounded-lg text-white font-mono mx-1 border border-white/10">Ctrl + Shift + T</kbd> to view all your tabs as beautiful glass cards.
                                    </p>
                                    <button
                                        onClick={handleComplete}
                                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all text-lg"
                                    >
                                        Start Browsing
                                    </button>
                                </motion.div>
                            )}

                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
