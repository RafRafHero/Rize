import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Globe, Star, Trash2 } from 'lucide-react';
import { useStore, Bookmark } from '../store/useStore';
import { cn } from '../lib/utils';

interface BookmarkPopoverProps {
    url: string;
    title: string;
    favicon?: string;
    onClose: () => void;
}

export const BookmarkPopover: React.FC<BookmarkPopoverProps> = ({ url, title, favicon, onClose }) => {
    const {
        bookmarks, addBookmark, removeBookmark,
        favorites, addFavorite, removeFavorite
    } = useStore();

    // Find if this URL already exists in either system
    const existingBookmark = bookmarks.find(b => b.url === url);
    const existingFavorite = favorites.find(f => f.url === url);

    const [editTitle, setEditTitle] = useState(existingBookmark?.title || existingFavorite?.title || title);
    const [editUrl, setEditUrl] = useState(existingBookmark?.url || existingFavorite?.url || url);

    const [inBookmarks, setInBookmarks] = useState(!!existingBookmark);
    const [inFavorites, setInFavorites] = useState(!!existingFavorite);

    const handleSave = () => {
        if (!editTitle.trim() || !editUrl.trim()) return;

        const data = {
            id: existingBookmark?.id || existingFavorite?.id || Date.now().toString(),
            title: editTitle,
            url: editUrl,
            favicon: favicon || existingBookmark?.favicon || existingFavorite?.favicon
        };

        // Handle Bookmarks system
        if (inBookmarks) {
            addBookmark(data);
        } else if (existingBookmark) {
            removeBookmark(existingBookmark.id);
        }

        // Handle Favorites system
        if (inFavorites) {
            addFavorite(data);
        } else if (existingFavorite) {
            removeFavorite(existingFavorite.id);
        }

        onClose();
    };

    const handleDeleteAll = () => {
        if (existingBookmark) removeBookmark(existingBookmark.id);
        if (existingFavorite) removeFavorite(existingFavorite.id);
        onClose();
    };

    const isExisting = !!existingBookmark || !!existingFavorite;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-full right-0 mt-2 w-80 liquid-glass border border-white/10 shadow-2xl rounded-2xl p-4 z-50 flex flex-col gap-4 text-foreground"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Star size={14} className="text-yellow-400 fill-current" />
                    {isExisting ? 'Edit Page' : 'Save Page'}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                    <X size={14} />
                </button>
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Name</label>
                    <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                        placeholder="Page Title"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">URL</label>
                    <input
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                        placeholder="https://..."
                    />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                    <button
                        onClick={() => setInFavorites(!inFavorites)}
                        className="group flex items-center gap-3 w-full p-2.5 rounded-xl border border-transparent hover:bg-white/5 transition-all text-left"
                    >
                        <div className={cn(
                            "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                            inFavorites ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"
                        )}>
                            {inFavorites && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">Show in Favorites Widget</span>
                            <span className="text-[10px] text-muted-foreground">Appears as shortcut on New Tab</span>
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                {isExisting ? (
                    <button
                        onClick={handleDeleteAll}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Remove from everywhere"
                    >
                        <Trash2 size={16} />
                    </button>
                ) : <div />}

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors shadow-lg shadow-primary/20"
                    >
                        {isExisting ? 'Update' : 'Done'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
