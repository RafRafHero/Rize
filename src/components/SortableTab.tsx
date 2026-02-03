import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { X, Globe, FolderPlus, FolderMinus, ArrowRight, Trash2, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tab, useStore } from '../store/useStore';

interface SortableTabProps {
    tab: Tab;
    isActive: boolean;
    isCompact: boolean;
    isIncognito: boolean;
    onClick: () => void;
    onClose: (e: React.MouseEvent) => void;
}

export const SortableTab: React.FC<SortableTabProps> = ({ tab, isActive, isCompact, isIncognito, onClick, onClose }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: tab.id, data: { type: 'tab', tab } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    const { settings, tabGroups, createTabGroup, moveTabToGroup, removeTab } = useStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(true);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn("relative group w-full flex", isCompact ? "justify-center" : "")}
            onContextMenu={handleContextMenu}
        >
            <motion.div
                layout
                onClick={onClick}
                initial={false}
                animate={{
                    backgroundColor: isActive ? "var(--background)" : "transparent",
                    scale: isActive ? 1 : 0.98,
                }}
                onAuxClick={(e) => {
                    if (e.button === 1) {
                        e.stopPropagation();
                        onClose(e);
                    }
                }}
                className={cn(
                    "relative flex items-center justify-center rounded-xl cursor-pointer transition-all duration-300",
                    isActive
                        ? (isCompact ? "bg-white/20 shadow-inner" : "bg-background border-border shadow-sm")
                        : "",
                    isCompact ? "w-10 h-10 p-0 rounded-2xl" : "h-12 w-full px-2 gap-3 border border-transparent",
                    isIncognito ? (isActive ? "text-white" : "text-white/60 hover:text-white") : "",
                    tab.isSleeping && "opacity-70 grayscale"
                )}
            >
                {isActive && !isCompact && (
                    <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full"
                    />
                )}

                {isActive && isCompact && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
                )}

                <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded overflow-hidden text-muted-foreground relative">
                    {tab.favicon ? (
                        <img src={tab.favicon} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Globe size={16} />
                    )}
                    {/* Sleep Indicator */}
                    {tab.isSleeping && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5"
                        >
                            <Moon size={8} />
                        </motion.div>
                    )}
                </div>

                {!isCompact && (
                    <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate text-left select-none">
                            {tab.title || "Home Page"}
                        </span>
                        {settings.isSplitScreen && (tab.id === settings.primaryTabId || tab.id === settings.secondaryTabId) && (
                            <span className={cn(
                                "text-[10px] font-medium",
                                isIncognito ? "text-white/40" : "text-zinc-600"
                            )}>
                                {tab.id === settings.primaryTabId ? "Left Side" : "Right Side"}
                            </span>
                        )}
                    </div>
                )}

                {!isCompact && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose(e);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={cn(
                            "p-1 rounded-md transition-opacity hover:bg-red-500/10 hover:text-red-500",
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                    >
                        <X size={14} />
                    </button>
                )}
            </motion.div>

            {/* Context Menu */}
            {isMenuOpen && (
                <div
                    className="absolute left-10 top-8 w-48 bg-popover border border-border rounded-xl shadow-lg z-[100] p-1 flex flex-col cursor-default"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent DnD start
                >
                    {tab.groupId ? (
                        // CASE: Tab IS in a Group
                        <>
                            <button
                                className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-secondary rounded-md text-left transition-colors"
                                onClick={() => {
                                    moveTabToGroup(tab.id, undefined); // Remove from group
                                    setIsMenuOpen(false);
                                }}
                            >
                                <FolderMinus size={12} /> Remove from Group
                            </button>

                            {tabGroups.length > 1 && (
                                <>
                                    <div className="h-px bg-border my-1" />
                                    <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase">Move To</div>
                                    {tabGroups.filter(g => g.id !== tab.groupId).map(g => (
                                        <button
                                            key={g.id}
                                            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-secondary rounded-md text-left transition-colors w-full"
                                            onClick={() => {
                                                moveTabToGroup(tab.id, g.id);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <ArrowRight size={12} /> {g.title}
                                        </button>
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        // CASE: Tab is Standalone
                        <>
                            <button
                                className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-secondary rounded-md text-left transition-colors"
                                onClick={() => {
                                    createTabGroup('New Group');
                                    // The create action adds a group. We assume user might drag it in later or we can auto-add the current tab.
                                    // For now, let's auto-add if we can get the ID, but the store action is void. 
                                    // So simpler: Just create group and let user drag, OR update store to return ID.
                                    // Let's assume user drags for now to keep it simple, OR implement a helper.
                                    // Actually, user expects "Add to New Group".
                                    // We can chain this: create group -> get last group -> add tab.
                                    // But store is sync. So:
                                    const title = 'New Group';
                                    createTabGroup(title);
                                    // We need to find the group just created. It will be the last one.
                                    const groups = useStore.getState().tabGroups;
                                    const newGroup = groups[groups.length - 1];
                                    if (newGroup) moveTabToGroup(tab.id, newGroup.id);

                                    setIsMenuOpen(false);
                                }}
                            >
                                <FolderPlus size={12} /> Add to New Group
                            </button>

                            {tabGroups.length > 0 && (
                                <>
                                    <div className="h-px bg-border my-1" />
                                    <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase">Add To Group</div>
                                    {tabGroups.map(g => (
                                        <button
                                            key={g.id}
                                            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-secondary rounded-md text-left transition-colors w-full"
                                            onClick={() => {
                                                moveTabToGroup(tab.id, g.id);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <ArrowRight size={12} /> {g.title}
                                        </button>
                                    ))}
                                </>
                            )}
                        </>
                    )}

                    <div className="h-px bg-border my-1" />
                    <button
                        className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-red-500/10 text-red-500 rounded-md text-left transition-colors"
                        onClick={() => {
                            removeTab(tab.id);
                            setIsMenuOpen(false);
                        }}
                    >
                        <Trash2 size={12} /> Close Tab
                    </button>

                    <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
                </div>
            )}
        </div>
    );
};
