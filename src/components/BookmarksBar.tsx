import React from 'react';
import { useStore } from '../store/useStore';
import { Globe, X } from 'lucide-react';
import { cn } from '../lib/utils';

export const BookmarksBar: React.FC = () => {
    const { bookmarks, updateTab, activeTabId, settings, updateSettings } = useStore();

    if (bookmarks.length === 0) return null;

    return (
        <div className={cn(
            "flex items-center justify-between px-2 h-8 overflow-hidden transition-all duration-300 bg-transparent border-t border-white/5 group/bar"
        )}>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {bookmarks.map((bookmark) => (
                    <div
                        key={bookmark.id}
                        onClick={() => updateTab(activeTabId, { url: bookmark.url })}
                        className="group flex items-center gap-2 px-2 py-1 rounded-md transition-colors cursor-pointer max-w-[200px]"
                    >
                        <div className="w-4 h-4 rounded-sm bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {bookmark.favicon ? (
                                <img src={bookmark.favicon} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Globe size={10} className="text-white/70" />
                            )}
                        </div>
                        <span className={cn(
                            "text-[11px] truncate transition-colors",
                            settings.theme === 'light' ? "text-black/70 group-hover:text-black" : "text-white/80 group-hover:text-white"
                        )}>
                            {bookmark.title}
                        </span>
                    </div>
                ))}
            </div>

            <button
                onClick={() => updateSettings({ showBookmarksBar: false })}
                className="p-1 px-2 rounded-md transition-all opacity-0 group-hover/bar:opacity-100 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                title="Hide Bookmarks Bar"
            >
                <X size={14} />
            </button>
        </div>
    );
}
