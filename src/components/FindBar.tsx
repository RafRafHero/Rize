import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface FindBarProps {
    isOpen: boolean;
    onClose: () => void;
    onFind: (text: string, forward: boolean) => void;
    onStopFind: () => void;
    matches: { active: number, total: number };
}

export const FindBar: React.FC<FindBarProps> = ({ isOpen, onClose, onFind, onStopFind, matches }) => {
    const [searchText, setSearchText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            onStopFind();
        }
    }, [isOpen, onStopFind]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter') {
            if (searchText.trim()) {
                onFind(searchText, !e.shiftKey); // Shift+Enter = backwards
            }
        }
    };

    const handleSearch = (forward: boolean) => {
        if (searchText.trim()) {
            onFind(searchText, forward);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cn(
            "absolute top-2 right-2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg",
            "bg-background/95 backdrop-blur-md border border-white/10 shadow-xl"
        )}>
            <input
                ref={inputRef}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Find on page..."
                className="w-48 px-2 py-1 text-sm bg-white/5 border border-white/10 rounded outline-none focus:border-blue-500/50 text-black placeholder:text-black/50"
            />

            <span className="text-xs text-foreground/70 font-mono w-16 text-center border-r border-white/10 pr-2 mr-1">
                {matches.total > 0 ? `${matches.active}/${matches.total}` : '0/0'}
            </span>

            <button
                onClick={() => handleSearch(true)}
                className="p-1 rounded hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors"
                title="Find next (Enter)"
            >
                <ChevronDown size={16} />
            </button>
            <button
                onClick={() => handleSearch(false)}
                className="p-1 rounded hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors"
                title="Find previous (Shift+Enter)"
            >
                <ChevronUp size={16} />
            </button>
            <button
                onClick={onClose}
                className="p-1 rounded hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors"
                title="Close (Esc)"
            >
                <X size={16} />
            </button>
        </div>
    );
};
