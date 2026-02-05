import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Command, MessageSquare, History, Globe, ArrowRight, Loader2, Copy } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

const BouncingDots = () => (
    <div className="flex gap-1 px-1">
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                animate={{ y: [0, -5, 0] }}
                transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                }}
                className="w-1.5 h-1.5 bg-purple-400/60 rounded-full"
            />
        ))}
    </div>
);

const MessageBubble = ({ children, isUser, isThinking }: { children?: React.ReactNode, isUser?: boolean, isThinking?: boolean }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10, x: isUser ? 20 : -20 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
        className={cn(
            "max-w-[85%] px-5 py-3 rounded-[1.5rem] text-sm relative mb-4 flex flex-col",
            isUser
                ? "ml-auto bg-purple-600/30 text-white rounded-tr-none border border-purple-500/20 shadow-[0_10px_20px_-5px_rgba(168,85,247,0.2)]"
                : "mr-auto bg-white/5 text-white/90 rounded-tl-none border border-white/10 backdrop-blur-md"
        )}
    >
        {!isUser && !isThinking && (
            <div className="flex items-center gap-2 mb-2 opacity-40">
                <Sparkles size={10} className="text-purple-300" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-purple-200">AI</span>
            </div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed font-medium">
            {isThinking ? <BouncingDots /> : children}
        </div>
    </motion.div>
);

export const CommandPalette: React.FC = () => {
    const { isCommandPaletteOpen, toggleCommandPalette, addTab, tabs, siteHistory } = useStore();
    const [query, setQuery] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [directAnswer, setDirectAnswer] = useState<string>('');
    const [userMessage, setUserMessage] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCommandPaletteOpen) {
            inputRef.current?.focus();
            setQuery('');
            setResults([]);
            setDirectAnswer('');
            setUserMessage('');
            setSelectedIndex(0);
        }
    }, [isCommandPaletteOpen]);

    const handleAction = async (item: any) => {
        if (item.type === 'url') {
            addTab(item.url);
        } else if (item.type === 'action') {
            item.action();
        } else if (item.type === 'copy') {
            navigator.clipboard.writeText(item.content);
        }
        toggleCommandPalette(false);
    };

    const cleanJsonResponse = (text: string) => {
        // Strip markdown backticks if present
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }
        return cleaned;
    };

    const searchAI = async (text: string) => {
        if (!text.trim()) return;
        const currentQuery = text;
        setQuery(''); // Clear input like iMessage
        setUserMessage(currentQuery);
        setIsThinking(true);
        setDirectAnswer('');
        setResults([]);

        try {
            const context = {
                currentTabs: tabs.map(t => ({ title: t.title, url: t.url })),
                history: siteHistory.slice(0, 5)
            };

            const response = await (window as any).rizoAPI?.ipcRenderer.invoke('ask-ai', {
                text: currentQuery,
                prompt: `Analyze intent: "Find [x]", "Write [x]", "Open [x]". Context: ${JSON.stringify(context)}`
            });

            const cleanedResponse = cleanJsonResponse(response);
            try {
                const parsed = JSON.parse(cleanedResponse);
                if (parsed.directAnswer) setDirectAnswer(parsed.directAnswer);
                if (parsed.results) setResults(parsed.results);
                else if (Array.isArray(parsed)) setResults(parsed);

                // If it parsed but both are empty, maybe it's still missing something
                if (!parsed.directAnswer && (!parsed.results || parsed.results.length === 0)) {
                    setDirectAnswer(cleanedResponse);
                }
            } catch (e) {
                // Not JSON, treat as direct answer
                setDirectAnswer(response);
            }
        } catch (error) {
            console.error('AI Command failed:', error);
            const local = siteHistory
                .filter(h => h.title.toLowerCase().includes(text.toLowerCase()) || h.url.toLowerCase().includes(text.toLowerCase()))
                .slice(0, 5)
                .map(h => ({ title: h.title, subtitle: h.url, type: 'url', url: h.url }));
            setResults(local);
        } finally {
            setIsThinking(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') toggleCommandPalette(false);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (results.length > 0) setSelectedIndex(prev => (prev + 1) % results.length);
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (results.length > 0) setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleAction(results[selectedIndex]);
            } else if (query.trim()) {
                searchAI(query);
            }
        }
    };

    return (
        <AnimatePresence>
            {isCommandPaletteOpen && (
                <div className="fixed inset-0 z-[2147483647] flex items-start justify-center pt-[12%] px-6 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => toggleCommandPalette(false)}
                        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] pointer-events-auto"
                    />

                    {/* Liquid Glass Container with Purple Gradient Atmosphere */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.98, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, scale: 0.98, filter: 'blur(10px)', transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 500, damping: 32, mass: 1 }}
                        className={cn(
                            "relative w-full max-w-xl rounded-[2rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]",
                            "flex flex-col pointer-events-auto liquid-glass border-purple-500/20"
                        )}
                        onKeyDown={onKeyDown}
                    >
                        {/* Animated Purple Gradient Layer */}
                        <div className="absolute inset-0 -z-10 overflow-hidden">
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, 0],
                                    x: [-10, 10, -10],
                                    y: [-5, 5, -5]
                                }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(168,85,247,0.1)_0deg,rgba(124,58,237,0.1)_120deg,rgba(79,70,229,0.1)_240deg,rgba(168,85,247,0.1)_360deg)] filter blur-3xl opacity-60"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5" />
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (results[selectedIndex]) handleAction(results[selectedIndex]);
                                else if (query.trim()) searchAI(query);
                            }}
                            className="flex items-center gap-3 px-8 py-6 relative group"
                        >
                            <div className="relative">
                                <Sparkles className={cn("text-purple-400 transition-all duration-500", isThinking ? "animate-spin scale-120 blur-[1px]" : "opacity-60")} size={22} />
                                {isThinking && <motion.div layoutId="glow" className="absolute inset-0 bg-purple-500/40 blur-xl rounded-full" />}
                            </div>
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search or ask Rizo anything..."
                                className="flex-1 bg-transparent border-none outline-none text-xl text-white/90 placeholder:text-white/20 font-medium tracking-tight"
                            />
                        </form>

                        {(userMessage || results.length > 0 || directAnswer || isThinking) && (
                            <div className="max-h-[60vh] overflow-y-auto no-scrollbar border-t border-purple-500/10 bg-black/30 p-6 flex flex-col">
                                {userMessage && (
                                    <MessageBubble isUser>
                                        {userMessage}
                                    </MessageBubble>
                                )}

                                {isThinking && (
                                    <MessageBubble isThinking />
                                )}

                                {directAnswer && (
                                    <MessageBubble>
                                        {directAnswer}
                                    </MessageBubble>
                                )}

                                {results.length > 0 && (
                                    <div className="py-2 mt-2">
                                        <div className="flex items-center gap-2 mb-3 opacity-20 ml-2">
                                            <Search size={10} className="text-purple-300" />
                                            <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-purple-200">Relevant Results</span>
                                        </div>
                                        {results.map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleAction(item)}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={cn(
                                                    "px-6 py-3 mx-2 my-1 flex items-center gap-4 cursor-pointer transition-all duration-300 rounded-2xl group",
                                                    idx === selectedIndex ? "bg-purple-500/15 translate-x-1 border border-purple-500/20" : "hover:bg-white/[0.03] border border-transparent"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 transition-all duration-500",
                                                    idx === selectedIndex ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105" : "bg-white/5 text-white/30"
                                                )}>
                                                    {item.type === 'url' ? <Globe size={18} /> : item.type === 'copy' ? <Copy size={18} /> : <Command size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={cn(
                                                        "text-sm font-semibold truncate transition-colors",
                                                        idx === selectedIndex ? "text-white" : "text-white/60"
                                                    )}>{item.title}</div>
                                                    {item.subtitle && <div className="text-[11px] text-white/20 truncate mt-0.5">{item.subtitle}</div>}
                                                </div>
                                                {idx === selectedIndex && (
                                                    <motion.div initial={{ x: -5, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="mr-2">
                                                        <ArrowRight size={14} className="text-purple-400 opacity-60" />
                                                    </motion.div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {!query && !userMessage && !results.length && !directAnswer && (
                            <div className="p-8 border-t border-purple-500/10 bg-black/20">
                                <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-purple-300/20 mb-5 ml-1 flex items-center gap-2">
                                    <Sparkles size={10} /> Fast Suggestions
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Check History', icon: History, action: 'Find my history' },
                                        { label: 'AI Writing', icon: MessageSquare, action: 'Write a professional email' }
                                    ].map((btn, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setQuery(btn.action)}
                                            className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-purple-500/10 hover:border-purple-500/20 cursor-pointer transition-all flex items-center gap-3 group"
                                        >
                                            <btn.icon size={16} className="text-white/10 group-hover:text-purple-400 transition-colors" />
                                            <span className="text-xs font-semibold text-white/30 group-hover:text-white/80">{btn.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="px-8 py-5 bg-purple-900/10 border-t border-purple-500/10 flex items-center justify-between overflow-hidden relative">
                            {/* Suble glow behind footer */}
                            <div className="absolute inset-0 bg-purple-500/5 blur-xl -z-10" />

                            <div className="flex gap-5 opacity-40 hover:opacity-100 transition-opacity duration-500">
                                <div className="flex items-center gap-2 text-[9px] font-bold text-purple-200 tracking-widest uppercase">
                                    <kbd className="bg-purple-500/20 px-1.5 rounded border border-purple-500/20 italic font-medium">↵</kbd> Select
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-purple-200 tracking-widest uppercase">
                                    <kbd className="bg-purple-500/20 px-1.5 rounded border border-purple-500/20 italic font-medium">esc</kbd> Dismiss
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                                <span className="text-[9px] font-black italic tracking-widest text-purple-400/80 uppercase">Powered by Gemini</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* SVG Filters for Liquid Glass */}
                    <svg className="hidden">
                        <defs>
                            <filter id="liquid-glass-filter">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                            </filter>
                        </defs>
                    </svg>
                </div>
            )}
        </AnimatePresence>
    );
};
