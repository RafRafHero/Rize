import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Code, Book, History, X, Monitor, Glasses, RefreshCw, RotateCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

interface MenuPopoverProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MenuPopover: React.FC<MenuPopoverProps> = ({ isOpen, onClose }) => {
    const { toggleSettings, setActiveTab, settings, hasUpdate, latestVersion } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const menuItems = [
        ...(hasUpdate ? [{
            label: `Update to ${latestVersion || 'New Version'}`,
            icon: RotateCw,
            onClick: () => {
                (window as any).electron?.ipcRenderer.invoke('restart-and-update');
            },
            isUpdate: true
        }] : []),
        {
            label: 'Settings',
            icon: Settings,
            onClick: () => {
                toggleSettings('general');
                onClose();
            }
        },
        {
            label: 'Incognito Mode',
            icon: Glasses,
            onClick: () => {
                (window as any).electron?.ipcRenderer.send('open-incognito-window');
                onClose();
            }
        },
        {
            label: 'Dev Tools',
            icon: Code,
            onClick: () => {
                (window as any).electron?.ipcRenderer.send('open-dev-tools');
                onClose();
            }
        },
        {
            label: settings.showBookmarksBar ? 'Hide Bookmarks Bar' : 'Show Bookmarks Bar',
            icon: Book,
            onClick: () => {
                useStore.getState().updateSettings({ showBookmarksBar: !settings.showBookmarksBar });
                onClose();
            }
        },
        {
            label: 'Bookmark Manager',
            icon: Book,
            onClick: () => {
                toggleSettings('bookmarks');
                onClose();
            }
        },
        {
            label: 'Download History',
            icon: History,
            onClick: () => {
                useStore.setState({ isDownloadsOpen: true });
                onClose();
            }
        },
        {
            label: 'Browsing History',
            icon: History,
            onClick: () => {
                useStore.getState().setInternalPage('history');
                onClose();
            }
        },
        {
            label: 'Set as Default',
            icon: Monitor,
            onClick: () => {
                (window as any).electron?.ipcRenderer.send('open-default-browser-settings');
                onClose();
            }
        },
    ].filter(item => {
        if (useStore.getState().isIncognito) {
            return !['Bookmark Manager', 'Download History'].includes(item.label);
        }
        return true;
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={containerRef}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={cn(
                        "absolute right-2 top-12 w-56 border border-border shadow-2xl rounded-2xl z-[100] overflow-hidden",
                        settings.homePageConfig.mode ? "liquid-glass" : "solid-ui"
                    )}
                >
                    <div className="p-2 space-y-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300",
                                    (item as any).isUpdate
                                        ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20 font-bold mb-1"
                                        : "hover:bg-secondary text-foreground"
                                )}
                            >
                                <item.icon size={16} className={cn((item as any).isUpdate ? "text-white" : "text-muted-foreground")} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
