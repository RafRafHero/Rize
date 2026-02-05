import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlignLeft, HelpCircle, Pencil, Copy, X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface WhisperBarProps {
    x: number;
    y: number;
    selectedText: string;
    onClose: () => void;
}

type AIAction = 'summarize' | 'explain' | 'rewrite';

export const WhisperBar: React.FC<WhisperBarProps> = ({ x, y, selectedText, onClose }) => {
    // ... logic ...
    const [mode, setMode] = useState<'pill' | 'thought-bubble'>('pill');
    const [responseText, setResponseText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [loadingAction, setLoadingAction] = useState<AIAction | null>(null);

    console.log("[WHISPER_BAR] Rendering at:", { x, y, text: selectedText });

    // Adjust position to stay within viewport
    const barRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState({ x, y });

    useEffect(() => {
        // Simple bounds checking (approximate width of pill/bubble)
        const width = mode === 'pill' ? 150 : 320;
        const height = mode === 'pill' ? 50 : 250;

        let newX = x;
        let newY = y - 60; // Default: above selection

        // Prevent going off-screen right
        if (newX + width > window.innerWidth) {
            newX = window.innerWidth - width - 20;
        }
        // Prevent going off-screen left
        if (newX < 20) {
            newX = 20;
        }
        // Prevent going off-screen top
        if (newY < 20) {
            newY = y + 30; // Flip to below if too close to top
        }

        setAdjustedPos({ x: newX, y: newY });
    }, [x, y, mode]);

    const handleAction = async (action: AIAction) => {
        setLoadingAction(action);
        setMode('thought-bubble');
        setIsStreaming(true);
        setResponseText('');

        try {
            // Using a streaming-like effect locally if backend doesn't support streaming yet,
            // or actually hooking up to the stream if available.
            // For now, let's assume `askAi` returns the full string and we animate it,
            // or we handle chunks if the API supports it.
            // Implementation Plan said: "Stream response back to renderer".
            // So let's listen for streaming chunks or a full response.
            // For simplicity in this step, I'll implement the full response call first,
            // then simulate streaming or handle it if I add streaming to preload.

            // Let's rely on the main process to do the heavy lifting.
            // But wait, the browser view needs to talk to main.
            // We can use `window.rizoAPI` if exposed, but this component is inside BrowserView (renderer),
            // which has access to the SAME preload as the App? No, BrowserView.tsx is part of the App renderer.
            // The `webview` has its OWN preload.
            // BUT `WhisperBar.tsx` is rendered in `BrowserView.tsx` (App Renderer).
            // So it uses `window.rizoAPI` of the App.

            const promptMap = {
                summarize: "Summarize this text in 2 concise sentences.",
                explain: "Explain this concept simply for a beginner.",
                rewrite: "Rewrite this text to be more professional and clear."
            };

            // Using the exposed API (we need to add this to preload.ts of the App renderer too?)
            // Actually App renderer already has `ipcRenderer` exposed.

            const ipc = (window as any).rizoAPI?.ipcRenderer;
            const response = await ipc.invoke('ask-ai', {
                text: selectedText,
                prompt: promptMap[action]
            });

            setLoadingAction(null);

            // Artificial streaming effect for "alive" feel
            const words = response.split(' ');
            for (let i = 0; i < words.length; i++) {
                setResponseText(prev => prev + (i === 0 ? '' : ' ') + words[i]);
                await new Promise(r => setTimeout(r, 50)); // 50ms per word
            }
            setIsStreaming(false);

        } catch (error) {
            console.error(error);
            setResponseText("Sorry, I couldn't reach the AI. Please try again.");
            setIsStreaming(false);
            setLoadingAction(null);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(responseText);
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                ref={barRef}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ left: adjustedPos.x, top: adjustedPos.y, zIndex: 9999999 }}
                className={cn(
                    "absolute rounded-2xl backdrop-blur-md shadow-xl border border-white/20 overflow-hidden pointer-events-auto",
                    "border-2 border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.5)]", // DEBUG BOX
                    mode === 'pill'
                        ? "bg-black/80 text-white flex items-center p-1.5 gap-1"
                        : "bg-black/60 text-foreground w-80 flex flex-col" // Glass card for bubble
                )}
            >
                {mode === 'pill' ? (
                    <>
                        <ActionButton
                            icon={AlignLeft}
                            label="Summarize"
                            onClick={() => handleAction('summarize')}
                        />
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <ActionButton
                            icon={HelpCircle}
                            label="Explain"
                            onClick={() => handleAction('explain')}
                        />
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <ActionButton
                            icon={Pencil}
                            label="Rewrite"
                            onClick={() => handleAction('rewrite')}
                        />
                    </>
                ) : (
                    // Thought Bubble Mode
                    <div className="flex flex-col relative bg-zinc-900/90 text-zinc-100 p-4 rounded-2xl w-full">
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-purple-300">
                                {loadingAction ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {loadingAction ? 'Thinking...' : 'AI Response'}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="text-sm leading-relaxed min-h-[60px] max-h-[200px] overflow-y-auto">
                            {responseText}
                            {isStreaming && <span className="animate-pulse inline-block w-1.5 h-3 bg-purple-400 ml-1 align-middle" />}
                        </div>

                        {!isStreaming && responseText && (
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Copy size={12} /> Copy
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

const ActionButton = ({ icon: Icon, onClick, label }: any) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className="p-2 hover:bg-white/20 rounded-xl transition-colors relative group"
        title={label}
    >
        <Icon size={18} strokeWidth={2.5} />
    </button>
);
