import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Maximize2, Minimize2, Sparkles } from 'lucide-react';
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

    const handleSummarize = () => {
        (window as any).rizoAPI?.ipcRenderer.send('gemini-summarize-request');
    };

    useEffect(() => {
        const ipc = (window as any).rizoAPI?.ipcRenderer;
        if (!ipc) return;

        const onInjectContext = (_: any, data: { title: string, url: string, content: string }) => {
            if (!webviewRef.current) return;

            // Open panel if closed
            if (!isGeminiPanelOpen) {
                toggleGeminiPanel();
            }

            // construct prompt
            const prompt = `Context from my current tab: "${data.title}" (${data.url}).\n\nContent:\n${data.content}\n\n--- \nNow, based on this, please summarize the key points.`;

            webviewRef.current.executeJavaScript(`
                (() => {
                    // Try to find the input box. Gemini's structure changes, but rich-textarea is common
                    const input = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
                    
                    if (input) {
                        input.focus();
                        document.execCommand('insertText', false, \`${prompt.replace(/`/g, '\\`')}\`);
                        
                        // Optional: Try to find send button
                        setTimeout(() => {
                            const sendBtn = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[aria-label="Send"]');
                            if (sendBtn) sendBtn.click();
                        }, 500);
                    } else {
                        console.error('Gemini input not found');
                    }
                })()
            `);
        };

        ipc.on('gemini-inject-context', onInjectContext);
        return () => {
            ipc.off('gemini-inject-context', onInjectContext);
        };
    }, [isGeminiPanelOpen, toggleGeminiPanel]);

    return (
        <AnimatePresence>
            {isGeminiPanelOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: localWidth, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 250 }}
                    className="relative flex flex-col h-full z-30 bg-background border-l border-white/10 shadow-2xl overflow-hidden shrink-0"
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
                            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[#8000FF] to-[#FFA256] bg-clip-text text-transparent">Gemini AI</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleSummarize}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300"
                                title="Summarize active tab (Alt+S)"
                            >
                                <Sparkles size={14} />
                            </button>
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
