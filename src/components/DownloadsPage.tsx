import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, File, Folder, Download, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';


export const DownloadsPage: React.FC = () => {
    const { isDownloadsOpen, downloadHistory, activeDownloads } = useStore();

    const close = () => useStore.setState({ isDownloadsOpen: false });

    // Format bytes helper
    const formatBytes = (bytes: number) => {
        if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Combine and filter out corrupted items
    const allDownloads = [...Object.values(activeDownloads), ...downloadHistory]
        .filter(item => item && item.id && item.filename);

    return (
        <AnimatePresence>
            {isDownloadsOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-8"
                >
                    <div className="w-full max-w-4xl h-full max-h-[800px] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Download size={24} />
                                Downloads
                            </h2>
                            <button onClick={close} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {allDownloads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <Download size={48} className="mb-4 opacity-20" />
                                    <p>No downloads yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Group by Date maybe? For now just flat list */}
                                    {allDownloads.map((item) => (
                                        <div key={item.id} className="group flex items-center gap-4 p-4 rounded-xl hover:bg-secondary/50 border border-transparent hover:border-border transition-all">
                                            <div className="p-3 bg-secondary rounded-lg shrink-0">
                                                <File size={24} className="text-primary" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-base">{item.filename}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <span>
                                                        {item.isPaused ? 'Paused' :
                                                            item.state === 'cancelled' ? 'Cancelled' :
                                                                item.state === 'interrupted' ? 'Failed' :
                                                                    formatBytes(item.totalBytes)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{item.path}</span>
                                                </div>
                                                {item.state === 'progressing' && (
                                                    <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-300"
                                                            style={{ width: item.totalBytes > 0 ? `${(item.receivedBytes / item.totalBytes) * 100}%` : '100%' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground whitespace-nowrap">
                                                {item.endTime && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={14} />
                                                        {new Date(item.endTime).toLocaleDateString()}
                                                    </div>
                                                )}

                                                {item.state === 'completed' && (
                                                    <button
                                                        onClick={() => (window as any).electron?.ipcRenderer.send('show-in-folder', item.path)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-foreground transition-colors font-medium opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Folder size={14} />
                                                        Show in Folder
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
