import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export const GeminiPanel: React.FC = () => {
    const { isGeminiPanelOpen, settings, updateSettings, toggleGeminiPanel } = useStore();
    const [localWidth, setLocalWidth] = useState(settings.geminiPanelWidth || 400);
    const isResizing = useRef(false);
    const webviewRef = useRef<any>(null);

    // Sync from store
    useEffect(() => {
        if (settings.geminiPanelWidth) {
            setLocalWidth(settings.geminiPanelWidth);
        }
    }, [settings.geminiPanelWidth]);

    const handleResize = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        // Gemini panel is on the right, so dragging the left edge 
        // means new width = window.innerWidth - mouseX
        const newWidth = Math.max(300, Math.min(window.innerWidth - e.clientX, 800));
        setLocalWidth(newWidth);
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        updateSettings({ geminiPanelWidth: localWidth });
    }, [handleResize, localWidth, updateSettings]);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
    };

    const handleRefresh = () => {
        if (webviewRef.current) {
            webviewRef.current.reload();
        }
    };

    return (
        <AnimatePresence>
            {isGeminiPanelOpen && (
                <motion.div
                    initial={{ x: 400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 400, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    style={{ width: localWidth }}
                    className="relative flex flex-col h-full z-30 bg-background border-l border-white/10 shadow-2xl overflow-hidden"
                >
                    {/* Resize Handle (Left Edge) */}
                    <div
                        onMouseDown={startResizing}
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors z-50 group"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-white/10 group-hover:bg-primary/50 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 h-12 bg-secondary/30 border-b border-white/5 no-drag">
                        <div className="flex items-center gap-2">
                            <GeminiIcon size={20} />
                            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">Gemini AI</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleRefresh}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                title="Refresh"
                            >
                                <RefreshCw size={14} />
                            </button>
                            <button
                                onClick={toggleGeminiPanel}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                title="Close Panel"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Webview Content */}
                    <div className="flex-1 w-full relative bg-white">
                        <webview
                            ref={webviewRef}
                            src="https://gemini.google.com"
                            className="w-full h-full"
                            style={{ background: 'white' }}
                            allowpopups={true}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
