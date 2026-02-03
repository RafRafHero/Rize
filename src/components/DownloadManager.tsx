import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download as DownloadIcon, X, Pause, Play, Folder, File } from 'lucide-react';
import { useStore, DownloadItem } from '../store/useStore';
import { cn } from '../lib/utils';

const formatTime = (seconds?: number) => {
    if (!seconds || !isFinite(seconds)) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${Math.round(seconds % 60)}s`;
};

export const DownloadManager: React.FC = () => {
    const { activeDownloads, downloadHistory } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Safety: Filter out any undefined/null items that might have crept into the store
    const activeList = Object.values(activeDownloads).filter(item => item && item.id);
    const safeHistory = downloadHistory.filter(item => item && item.id);

    const hasActive = activeList.length > 0;

    // Calculate total progress for the circular icon
    const totalProgress = hasActive
        ? activeList.reduce((acc, item) => {
            if (item.totalBytes > 0) return acc + (item.receivedBytes / item.totalBytes);
            return acc; // Don't add progress for unknown size
        }, 0) / activeList.length
        : 0;

    // Toggle popover
    const toggleOpen = () => setIsOpen(!isOpen);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Format bytes helper (if not in utils, define here locally for now)
    const formatBytesLocal = (bytes: number) => {
        if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="relative z-50" ref={containerRef}>
            {/* Navbar Icon */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleOpen}
                className={cn(
                    "relative flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                    isOpen ? "bg-secondary" : "hover:bg-secondary/80",
                    hasActive ? "text-primary" : "text-muted-foreground"
                )}
            >
                {/* Circular Progress (only when active) */}
                {hasActive && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                        <circle
                            cx="18" cy="18" r="16"
                            fill="none"
                            className="stroke-secondary-foreground/10"
                            strokeWidth="3"
                        />
                        <circle
                            cx="18" cy="18" r="16"
                            fill="none"
                            className="stroke-primary transition-all duration-300 ease-linear"
                            strokeWidth="3"
                            strokeDasharray="100"
                            strokeDashoffset={100 - (totalProgress * 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                )}

                {/* Inner Icon */}
                <motion.div
                    animate={hasActive ? { y: [0, 2, 0] } : {}}
                    transition={{ repeat: hasActive ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                >
                    <DownloadIcon size={hasActive ? 14 : 18} strokeWidth={hasActive ? 3 : 2} />
                </motion.div>
            </motion.button>

            {/* Popover Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="absolute right-0 top-12 w-80 bg-background/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[500px]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/30">
                            <span className="font-medium text-sm">Downloads</span>
                            {hasActive && (
                                <span className="text-xs text-muted-foreground">
                                    {activeList.length} active
                                </span>
                            )}
                        </div>

                        {/* Content List */}
                        <div className="overflow-y-auto p-2 flex flex-col gap-2">
                            {/* Empty State */}
                            {!hasActive && safeHistory.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <DownloadIcon size={32} className="mb-2 opacity-20" />
                                    <span className="text-xs">No downloads yet</span>
                                </div>
                            )}

                            {/* Active Downloads */}
                            {activeList.map(item => (
                                <div key={item.id} className="bg-secondary/50 rounded-xl p-3 flex flex-col gap-2 border border-border/50">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-background rounded-lg shrink-0">
                                            <File size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate" title={item.filename}>
                                                {item.filename}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span>
                                                    {item.state === 'interrupted' ? 'Failed' :
                                                        item.state === 'cancelled' ? 'Cancelled' :
                                                            item.totalBytes > 0
                                                                ? `${formatBytesLocal(item.receivedBytes)} of ${formatBytesLocal(item.totalBytes)}`
                                                                : (item.receivedBytes > 0 ? formatBytesLocal(item.receivedBytes) : 'Starting...')
                                                    }
                                                </span>
                                                {item.state === 'progressing' && item.estimatedTimeRemaining && item.totalBytes > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatTime(item.estimatedTimeRemaining)} left</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {/* Controls */}
                                        <div className="flex items-center gap-1">
                                            {!item.isPaused ? (
                                                <button
                                                    onClick={() => (window as any).rizoAPI?.ipcRenderer.send('download-control', { id: item.id, action: 'pause' })}
                                                    className="p-1 hover:bg-background rounded-full transition-colors"
                                                >
                                                    <Pause size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => (window as any).rizoAPI?.ipcRenderer.send('download-control', { id: item.id, action: 'resume' })}
                                                    className="p-1 hover:bg-background rounded-full transition-colors"
                                                >
                                                    <Play size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => (window as any).rizoAPI?.ipcRenderer.send('download-control', { id: item.id, action: 'cancel' })}
                                                className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-1 w-full bg-background rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: item.totalBytes > 0 ? `${(item.receivedBytes / item.totalBytes) * 100}%` : '100%' }}
                                            transition={{ type: "tween", ease: "linear", duration: item.totalBytes > 0 ? 0.2 : 1, repeat: item.totalBytes > 0 ? 0 : Infinity }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Divider if both exist */}
                            {hasActive && safeHistory.length > 0 && (
                                <div className="h-px bg-border/50 my-1" />
                            )}

                            {/* History List */}
                            {safeHistory.map(item => (
                                <div key={item.id} className="group flex items-center gap-3 p-2 hover:bg-secondary/30 rounded-lg transition-colors">
                                    <div className="p-2 bg-secondary/50 rounded-lg shrink-0 text-muted-foreground">
                                        {item.state === 'cancelled' ? <X size={16} /> : <File size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate opacity-90" title={item.filename}>
                                            {item.filename}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {item.state === 'cancelled' ? 'Cancelled' : formatBytesLocal(item.totalBytes)} • {new Date(item.endTime || 0).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {item.state === 'completed' && (
                                        <button
                                            onClick={() => (window as any).rizoAPI?.ipcRenderer.send('show-in-folder', item.path)}
                                            className="p-2 hover:bg-secondary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                            title="Show in Folder"
                                        >
                                            <Folder size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-border/50 bg-secondary/30 flex justify-end">
                            <button
                                onClick={() => {
                                    useStore.setState({ isDownloadsOpen: true });
                                    setIsOpen(false);
                                }}
                                className="text-xs text-primary hover:underline px-2"
                            >
                                Show all downloads
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
