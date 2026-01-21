import React from 'react';
import { useStore } from '../store/useStore';
import { Globe } from 'lucide-react';
import { cn } from '../lib/utils';

export const BookmarksBar: React.FC = () => {
    const { bookmarks, updateTab, activeTabId, settings } = useStore();

    if (bookmarks.length === 0) return null;

    return (
        <div className={cn(
            "flex items-center gap-1 px-1 h-7 overflow-x-auto no-scrollbar transition-all duration-300 bg-transparent border-t border-white/5"
        )}>
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
                        "text-xs truncate transition-colors",
                        settings.theme === 'light' ? "text-black/70 group-hover:text-black" : "text-white/80 group-hover:text-white"
                    )}>
                        {bookmark.title}
                    </span>
                </div>
            ))}
        </div>
    );
}
