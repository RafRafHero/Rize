import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Search, Clock, Calendar, ChevronLeft, X, Globe, History, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

interface HistoryEntry {
    url: string;
    title: string;
    favicon?: string;
    timestamp: number;
}

export const HistoryPage: React.FC = () => {
    const { setInternalPage, activeTabId, updateTab, isIncognito } = useStore();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadHistory = async () => {
        setIsLoading(true);
        const data = await (window as any).electron?.ipcRenderer.invoke('get-history');
        if (data) setHistory(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const filteredHistory = useMemo(() => {
        if (!searchQuery) return history;
        const q = searchQuery.toLowerCase();
        return history.filter(h =>
            h.title?.toLowerCase().includes(q) ||
            h.url?.toLowerCase().includes(q)
        );
    }, [history, searchQuery]);

    const groupedHistory = useMemo(() => {
        const groups: { [key: string]: HistoryEntry[] } = {};

        filteredHistory.forEach(entry => {
            const date = new Date(entry.timestamp);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            let label = '';
            if (date.toDateString() === today.toDateString()) label = 'Today';
            else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
            else label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

            if (!groups[label]) groups[label] = [];
            groups[label].push(entry);
        });

        return groups;
    }, [filteredHistory]);

    const handleDelete = async (timestamp: number) => {
        const success = await (window as any).electron?.ipcRenderer.invoke('delete-history-entry', timestamp);
        if (success) {
            setHistory(prev => prev.filter(h => h.timestamp !== timestamp));
        }
    };

    const handleClear = async (timeframe: string) => {
        const success = await (window as any).electron?.ipcRenderer.invoke('clear-history', timeframe);
        if (success) {
            loadHistory();
        }
    };

    const handleNavigate = (url: string) => {
        updateTab(activeTabId, { url });
        setInternalPage(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/40 backdrop-blur-xl"
        >
            <div className="w-full max-w-4xl h-[80vh] bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col liquid-glass">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setInternalPage(null)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                                <History size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">History</h1>
                                <p className="text-xs text-white/50 uppercase tracking-widest font-semibold">Browsing Timeline</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => handleClear('all')}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-all border border-red-500/20"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-white/40 animate-pulse">Retrieving timeline...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-40">
                            <Clock size={64} className="mb-4" />
                            <h2 className="text-2xl font-semibold text-white">No history found</h2>
                            <p className="text-white/60">Your browsing journey begins here.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedHistory).map(([label, entries]) => (
                                <div key={label} className="space-y-3">
                                    <h3 className="text-sm font-bold text-white/30 uppercase tracking-[0.2em] pl-2">{label}</h3>
                                    <div className="grid gap-2">
                                        {entries.map((entry) => (
                                            <motion.div
                                                key={entry.timestamp}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
                                                onClick={() => handleNavigate(entry.url)}
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-white/10 transition-colors">
                                                        {entry.favicon ? (
                                                            <img src={entry.favicon} alt="" className="w-5 h-5 object-contain" />
                                                        ) : (
                                                            <Globe size={20} className="text-white/30" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                                                            {entry.title || entry.url}
                                                        </span>
                                                        <span className="text-xs text-white/30 truncate group-hover:text-white/50 transition-colors">
                                                            {new URL(entry.url).hostname} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(entry.timestamp);
                                                        }}
                                                        className="p-2 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-colors"
                                                        title="Remove from history"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <span className="text-white/20">
                                                        <ArrowRight size={16} />
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => setInternalPage(null)}
                className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
            >
                <X size={32} />
            </button>
        </motion.div>
    );
};
