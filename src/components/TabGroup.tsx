import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, MoreVertical, Edit2, Trash2, Palette } from 'lucide-react';
import { TabGroup as ITabGroup, useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { SortableTab } from './SortableTab';

interface TabGroupProps {
    group: ITabGroup;
    activeTabId: string;
    isCompact: boolean;
    isIncognito: boolean;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
}

// Using HEX codes directly to guarantee color rendering
const COLORS = [
    { name: 'blue', hex: '#3b82f6' },
    { name: 'red', hex: '#ef4444' },
    { name: 'amber', hex: '#f59e0b' },
    { name: 'emerald', hex: '#10b981' },
    { name: 'sky', hex: '#0ea5e9' },
    { name: 'violet', hex: '#8b5cf6' },
    { name: 'fuchsia', hex: '#d946ef' },
    { name: 'rose', hex: '#f43f5e' },
];

export const TabGroup: React.FC<TabGroupProps> = ({ group, activeTabId, isCompact, isIncognito, onTabClick, onTabClose }) => {
    const { tabs, updateTabGroup, deleteTabGroup } = useStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNaming, setIsNaming] = useState(false);
    const [tempTitle, setTempTitle] = useState(group.title);

    // Droppable for the group to accept tabs
    const { setNodeRef } = useDroppable({
        id: group.id,
        data: { type: 'group', group }
    });

    const groupTabs = tabs.filter(t => t.groupId === group.id);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsMenuOpen(true);
    };

    const getColorHex = (colorName: string): string => {
        return COLORS.find(c => c.name === colorName)?.hex || '#3b82f6';
    };

    return (
        <div ref={setNodeRef} className={cn("flex flex-col gap-1 w-full", isCompact ? "items-center" : "")}>
            {/* Header */}
            {!isCompact && (
                <div
                    className="flex items-center justify-between px-2 py-1 text-muted-foreground hover:bg-secondary/50 rounded-lg group/header cursor-pointer"
                    onContextMenu={handleContextMenu}
                    onClick={() => updateTabGroup(group.id, { isCollapsed: !group.isCollapsed })}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getColorHex(group.color) }}
                        />
                        {isNaming ? (
                            <input
                                autoFocus
                                className="bg-transparent border-none outline-none text-xs font-medium w-full"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => {
                                    updateTabGroup(group.id, { title: tempTitle });
                                    setIsNaming(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        updateTabGroup(group.id, { title: tempTitle });
                                        setIsNaming(false);
                                    }
                                }}
                            />
                        ) : (
                            <span className="text-xs font-medium truncate select-none">{group.title}</span>
                        )}
                    </div>

                    <button className="opacity-0 group-hover/header:opacity-100 transition-opacity">
                        {group.isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Context Menu */}
                    {isMenuOpen && (
                        <div className="absolute left-8 mt-6 w-48 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* 1. Rename Input */}
                            <input
                                autoFocus
                                className="w-full bg-secondary/50 border border-transparent focus:border-primary rounded-md px-2 py-1 text-xs outline-none transition-colors mb-1"
                                placeholder="Group Name"
                                value={group.title}
                                onChange={(e) => updateTabGroup(group.id, { title: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsMenuOpen(false);
                                }}
                            />

                            {/* 2. Color Circles - Using INLINE STYLES for guaranteed rendering */}
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        className={cn(
                                            "w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform",
                                            group.color === c.name ? "ring-2 ring-slate-900 ring-offset-1 scale-110" : ""
                                        )}
                                        style={{ backgroundColor: c.hex }}
                                        onClick={() => {
                                            updateTabGroup(group.id, { color: c.name });
                                            setIsMenuOpen(false);
                                        }}
                                        title={c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                                    />
                                ))}
                            </div>

                            {/* 3. Ungroup */}
                            <button
                                className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors justify-center w-full"
                                onClick={() => deleteTabGroup(group.id)}
                            >
                                <Trash2 size={14} /> Ungroup Tabs
                            </button>

                            <div className="fixed inset-0 z-[-1]" onClick={() => setIsMenuOpen(false)} />
                        </div>
                    )}
                </div>
            )}

            {/* Tabs List */}
            <AnimatePresence initial={false}>
                {!group.isCollapsed && groupTabs.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-col gap-1 w-full pl-2 border-l-2 ml-1 transition-colors"
                        style={{ borderColor: getColorHex(group.color) }}
                    >
                        <SortableContext
                            items={groupTabs.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {groupTabs.map(tab => (
                                <SortableTab
                                    key={tab.id}
                                    tab={tab}
                                    isActive={tab.id === activeTabId}
                                    isCompact={isCompact}
                                    isIncognito={isIncognito}
                                    onClick={() => onTabClick(tab.id)}
                                    onClose={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                                />
                            ))}
                        </SortableContext>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};