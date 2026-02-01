import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Globe, ChevronLeft, ChevronRight, Users, Minus, ChevronDown, Folder, GripVertical, Edit2 } from 'lucide-react';
import { useStore, Tab, TabGroup } from '../store/useStore';
import { cn } from '../lib/utils';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const Sidebar: React.FC = () => {
    const {
        tabs, tabGroups, activeTabId, setActiveTab, addTab, removeTab, settings, updateSettings,
        isIncognito, createGroup, deleteGroup, addTabToGroup, removeTabFromGroup,
        toggleGroupCollapse, updateGroup, reorderTabs, reorderGroups
    } = useStore();

    const isCompact = settings.isSidebarCollapsed;
    const [activeId, setActiveId] = useState<string | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Helpers to identify items
    const isGroup = (id: string) => tabGroups.some(g => g.id === id);
    const isTab = (id: string) => tabs.some(t => t.id === id);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        // Handling tab drag over group logic could go here if we wanted auto-expand
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        // 1. Reordering Groups
        if (isGroup(active.id as string) && isGroup(over.id as string)) {
            if (active.id !== over.id) {
                const oldIndex = tabGroups.findIndex(g => g.id === active.id);
                const newIndex = tabGroups.findIndex(g => g.id === over.id);
                reorderGroups(arrayMove(tabGroups, oldIndex, newIndex));
            }
            return;
        }

        // 2. Dragging a Tab
        if (isTab(active.id as string)) {
            const activeTab = tabs.find(t => t.id === active.id);
            if (!activeTab) return;

            // Dropped over a Group Header -> Add to Group
            if (isGroup(over.id as string)) {
                addTabToGroup(active.id as string, over.id as string);
                // Ensure group is open
                const group = tabGroups.find(g => g.id === over.id);
                if (group && group.isCollapsed) {
                    toggleGroupCollapse(group.id, false);
                }
                return;
            }

            // Dropped over another Tab
            if (isTab(over.id as string)) {
                const overTab = tabs.find(t => t.id === over.id);
                if (!overTab) return;

                let newTabs = [...tabs];

                // If moving between different contexts (grouped vs ungrouped, or different groups)
                if (activeTab.groupId !== overTab.groupId) {
                    newTabs = newTabs.map(t =>
                        t.id === active.id
                            ? { ...t, groupId: overTab.groupId }
                            : t
                    );
                }

                // Reorder within the same context (global array reorder)
                const oldIndex = newTabs.findIndex(t => t.id === active.id);
                const newIndex = newTabs.findIndex(t => t.id === over.id);

                // Use arrayMove on properly updated array
                reorderTabs(arrayMove(newTabs, oldIndex, newIndex));
            }
        }
    };

    // IPC Listeners for Context Menu actions
    useEffect(() => {
        const ipc = (window as any).electron?.ipcRenderer;
        if (!ipc) return;

        const handleGroupTab = (_: any, { tabId }: { tabId: string }) => {
            const groupTitle = `Group ${tabGroups.length + 1}`;
            const colors = ['rgba(0, 122, 255, 0.5)', 'rgba(255, 45, 85, 0.5)', 'rgba(52, 199, 89, 0.5)', 'rgba(255, 159, 10, 0.5)'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const groupId = createGroup(groupTitle, color);
            addTabToGroup(tabId, groupId);
        };

        const handleUngroupTab = (_: any, { tabId }: { tabId: string }) => {
            removeTabFromGroup(tabId);
        };

        const handleMoveTab = (_: any, { tabId, groupId }: { tabId: string, groupId: string }) => {
            addTabToGroup(tabId, groupId);
        };

        const handleCloseTab = (_: any, { tabId }: { tabId: string }) => {
            removeTab(tabId);
        };

        ipc.on('group-tab', handleGroupTab);
        ipc.on('ungroup-tab', handleUngroupTab);
        ipc.on('move-tab', handleMoveTab);
        ipc.on('close-tab', handleCloseTab);

        return () => {
            ipc.off('group-tab', handleGroupTab);
            ipc.off('ungroup-tab', handleUngroupTab);
            ipc.off('move-tab', handleMoveTab);
            ipc.off('close-tab', handleCloseTab);
        };
    }, [createGroup, addTabToGroup, removeTabFromGroup, tabGroups, removeTab]);

    // Use local ref for immediate feedback during drag
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [localWidth, setLocalWidth] = useState(settings.sidebarWidth);
    const isResizing = useRef(false);

    useEffect(() => {
        setLocalWidth(settings.sidebarWidth);
    }, [settings.sidebarWidth]);

    const handleResize = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = Math.max(200, Math.min(e.clientX, 400));
        setLocalWidth(newWidth);
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        updateSettings({ sidebarWidth: localWidth });
    }, [handleResize, localWidth, updateSettings]);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
    };

    const width = isCompact ? 52 : localWidth;

    const handleTabClick = (id: string) => {
        if (settings.isSplitScreen) {
            if (activeTabId === settings.secondaryTabId) {
                updateSettings({ secondaryTabId: id });
            } else {
                updateSettings({ primaryTabId: id });
            }
        }
        setActiveTab(id);
    };

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    // Group IDs for SortableContext
    const groupIds = tabGroups.map(g => g.id);
    const ungroupedTabs = tabs.filter(t => !t.groupId);
    const ungroupedTabIds = ungroupedTabs.map(t => t.id);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <motion.div
                id="sidebar"
                style={{ width }}
                className={cn(
                    "relative flex flex-col h-full z-20 overflow-hidden border-r border-white/5",
                    isCompact
                        ? "items-center py-4 gap-4 shadow-none"
                        : "p-2 gap-2 shadow-none",
                    "bg-transparent"
                )}
                layout
                transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
            >
                {/* Traffic Lights & Header (Same as before) */}
                <motion.div layout={false} className={cn("flex items-center no-drag shrink-0 w-full transition-all duration-300 py-3", isCompact ? "px-1 justify-center gap-1.5" : "px-4 justify-start gap-2")}>
                    <div onClick={() => (window as any).electron?.window.close()} className="traffic-light close" title="Close"><X size={8} strokeWidth={4} /></div>
                    <div onClick={() => (window as any).electron?.window.minimize()} className="traffic-light minimize" title="Minimize"><Minus size={8} strokeWidth={4} /></div>
                    <div onClick={() => (window as any).electron?.window.maximize()} className="traffic-light maximize" title="Fullscreen"><Plus size={8} strokeWidth={4} /></div>
                </motion.div>

                <div className={cn("flex items-center gap-2 px-2 mb-2 titlebar-drag-region", isCompact ? "justify-center" : "")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-sm overflow-hidden shrink-0">
                        <img src="Rizo logo.png" alt="Rizo" className="w-full h-full object-cover" />
                    </div>
                    {!isCompact && <span className="font-semibold text-lg tracking-tight flex-1 truncate">Rizo</span>}
                    {!isCompact && (
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 180 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", damping: 15, stiffness: 300 }}
                            onClick={() => updateSettings({ isSidebarCollapsed: true })}
                            className={cn("p-1 hover:bg-secondary rounded-md no-drag", isIncognito ? "text-white" : "")}
                        >
                            <ChevronLeft size={16} />
                        </motion.button>
                    )}
                </div>

                {isCompact && (
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: -180 }}
                        whileTap={{ scale: 0.9 }}
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ type: "spring", damping: 15, stiffness: 300 }}
                        onClick={() => updateSettings({ isSidebarCollapsed: false })}
                        className={cn("p-1 hover:bg-secondary rounded-md mb-2", isIncognito ? "text-white" : "")}
                    >
                        <ChevronRight size={16} />
                    </motion.button>
                )}

                {/* Sortable List Area */}
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar w-full pb-2">

                    {/* Groups Sorting Context */}
                    <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
                        {tabGroups.map(group => (
                            <TabGroupItem
                                key={group.id}
                                group={group}
                                tabs={tabs.filter(t => t.groupId === group.id)}
                                activeTabId={activeTabId}
                                isCompact={isCompact}
                                isIncognito={isIncognito}
                                onTabClick={handleTabClick}
                                onTabClose={(id) => removeTab(id)}
                                onToggleCollapse={() => toggleGroupCollapse(group.id)}
                                onContextMenu={(e, tabId) => {
                                    e.preventDefault();
                                    (window as any).electron?.ipcRenderer.send('show-tab-context-menu', { tabId, groupId: group.id, groups: tabGroups });
                                }}
                                updateGroup={updateGroup}
                                editingGroupId={editingGroupId}
                                setEditingGroupId={setEditingGroupId}
                                onDeleteGroup={deleteGroup}
                            />
                        ))}
                    </SortableContext>

                    {/* Ungrouped Tabs Sorting Context (Using ids is enough if we handle drag properly) */}
                    <SortableContext items={ungroupedTabIds} strategy={verticalListSortingStrategy}>
                        {ungroupedTabs.map((tab) => (
                            <SortableTabItem
                                key={tab.id}
                                tab={tab}
                            >
                                <TabItem
                                    tab={tab}
                                    isActive={tab.id === activeTabId}
                                    isCompact={isCompact}
                                    isIncognito={isIncognito}
                                    onClick={() => handleTabClick(tab.id)}
                                    onClose={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        (window as any).electron?.ipcRenderer.send('show-tab-context-menu', { tabId: tab.id, groupId: null, groups: tabGroups });
                                    }}
                                />
                            </SortableTabItem>
                        ))}
                    </SortableContext>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addTab()}
                        className={cn(
                            "flex items-center justify-center gap-2 p-2 rounded-xl transition-colors shrink-0",
                            isCompact ? "w-10 h-10 mx-auto" : "w-full",
                            isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground"
                        )}
                    >
                        <Plus size={20} />
                        {!isCompact && <span className="text-sm font-medium">New Tab</span>}
                    </motion.button>
                </div>

                {/* Custom Drag Overlay */}
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeId ? (isGroup(activeId) ? (
                        <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-white font-bold opacity-90 shadow-2xl scale-105">
                            {tabGroups.find(g => g.id === activeId)?.title}
                        </div>
                    ) : (
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl w-64 flex items-center gap-2 text-white">
                            <Globe size={16} />
                            <span className="truncate">{tabs.find(t => t.id === activeId)?.title || "Tab"}</span>
                        </div>
                    )) : null}
                </DragOverlay>

                {/* Footer (Profile) */}
                {!isCompact ? (
                    <div className="mt-auto pt-2 border-t border-white/5 w-full flex flex-col gap-1">
                        <motion.button onClick={() => (window as any).electron?.ipcRenderer.send('switch-to-profile-selector')} className={cn("flex items-center gap-2 p-3 rounded-xl transition-colors hover:bg-white/5 no-drag", isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground")}>
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><Users size={18} /></div>
                            <span className="text-sm font-semibold tracking-tight">Switch Profile</span>
                        </motion.button>
                    </div>
                ) : (
                    <div className="mt-auto py-2 border-t border-white/5 flex flex-col items-center">
                        <motion.button onClick={() => (window as any).electron?.ipcRenderer.send('switch-to-profile-selector')} className={cn("p-2 rounded-xl hover:bg-white/5 transition-colors no-drag", isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground")}>
                            <Users size={20} />
                        </motion.button>
                    </div>
                )}

                {!isCompact && <div onMouseDown={startResizing} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50" />}
            </motion.div>
        </DndContext>
    );
};

// --- Sub-components ---

interface TabGroupItemProps {
    group: TabGroup;
    tabs: Tab[];
    activeTabId: string;
    isCompact: boolean;
    isIncognito: boolean;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
    onToggleCollapse: () => void;
    onContextMenu: (e: React.MouseEvent, tabId: string) => void;
    updateGroup: (id: string, data: Partial<TabGroup>) => void;
    editingGroupId: string | null;
    setEditingGroupId: (id: string | null) => void;
    onDeleteGroup: (id: string) => void;
}

const TabGroupItem = ({ group, tabs, activeTabId, isCompact, isIncognito, onTabClick, onTabClose, onToggleCollapse, onContextMenu, updateGroup, editingGroupId, setEditingGroupId, onDeleteGroup }: TabGroupItemProps) => {

    // Make group sortable
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    const handleRename = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setEditingGroupId(null);
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("flex flex-col gap-1 mb-1", isCompact ? "items-center" : "px-2")}>
            {/* Group Header */}
            {!isCompact && (
                <div
                    className="group/header flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                    style={{
                        borderLeft: `2px solid ${group.color}`,
                        background: `linear-gradient(90deg, ${group.color}20 0%, transparent 100%)`
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setIsColorPickerOpen(true); // Or custom context menu
                    }}
                >
                    {/* Drag Handle */}
                    <div {...attributes} {...listeners} className="cursor-grab hover:text-white/80 text-white/40"><GripVertical size={12} /></div>

                    {editingGroupId === group.id ? (
                        <input
                            autoFocus
                            className="flex-1 bg-transparent border-none outline-none text-xs font-bold uppercase tracking-wider text-white"
                            value={group.title}
                            onChange={(e) => updateGroup(group.id, { title: e.target.value })}
                            onKeyDown={handleRename}
                            onBlur={() => setEditingGroupId(null)}
                        />
                    ) : (
                        <span
                            onClick={onToggleCollapse}
                            onDoubleClick={() => setEditingGroupId(group.id)}
                            className={cn("text-xs font-bold uppercase tracking-wider flex-1 truncate cursor-pointer select-none", isIncognito ? "text-white/80" : "text-foreground/80")}
                        >
                            {group.title}
                        </span>
                    )}

                    <div onClick={() => setEditingGroupId(group.id)} className="opacity-0 group-hover/header:opacity-100 cursor-pointer text-white/50 hover:text-white"><Edit2 size={10} /></div>

                    <motion.div
                        animate={{ rotate: group.isCollapsed ? -90 : 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onToggleCollapse}
                        className="cursor-pointer"
                    >
                        <ChevronDown size={12} className={isIncognito ? "text-white/50" : "text-foreground/50"} />
                    </motion.div>
                </div>
            )}

            {/* Color Picker Popover (Primitive implementation for now, should be a real overlay) */}
            {isColorPickerOpen && (
                <div className="flex gap-1 p-2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg absolute z-50 left-10">
                    {['rgba(0, 122, 255, 0.5)', 'rgba(255, 45, 85, 0.5)', 'rgba(52, 199, 89, 0.5)', 'rgba(255, 159, 10, 0.5)', 'rgba(175, 82, 222, 0.5)', 'rgba(255, 214, 10, 0.5)'].map(c => (
                        <div
                            key={c}
                            onClick={() => { updateGroup(group.id, { color: c }); setIsColorPickerOpen(false); }}
                            className="w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform"
                            style={{ backgroundColor: c, border: group.color === c ? '2px solid white' : 'none' }}
                        />
                    ))}
                    <div onClick={() => { onDeleteGroup(group.id); setIsColorPickerOpen(false); }} className="w-4 h-4 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white"><X size={10} /></div>
                </div>
            )}

            {/* Compact Group Indicator */}
            {isCompact && (
                <div
                    onClick={onToggleCollapse}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10"
                    style={{ border: `2px solid ${group.color}` }}
                >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                </div>
            )}

            {/* Group Tabs */}
            <AnimatePresence initial={false}>
                {!group.isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn("flex flex-col gap-1", isCompact ? "" : "pl-2 border-l border-white/5 ml-1")}
                    >
                        <SortableContext items={tabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            {tabs.map((tab: Tab) => (
                                <SortableTabItem key={tab.id} tab={tab}>
                                    <TabItem
                                        tab={tab}
                                        isActive={tab.id === activeTabId}
                                        isCompact={isCompact}
                                        isIncognito={isIncognito}
                                        onClick={() => onTabClick(tab.id)}
                                        onClose={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                                        onContextMenu={(e) => onContextMenu(e, tab.id)}
                                    />
                                </SortableTabItem>
                            ))}
                        </SortableContext>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Sortable Wrapper for TabItem
const SortableTabItem = ({ tab, children }: { tab: Tab, children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.0 : 1 }; // Hide original when dragging, overlay shows

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
}

// Sub-component for individual tab (Visuals only)
const TabItem = ({ tab, isActive, isCompact, isIncognito, onClick, onClose, onContextMenu }: { tab: Tab, isActive: boolean, isCompact: boolean, isIncognito: boolean, onClick: () => void, onClose: (e: React.MouseEvent) => void, onContextMenu?: (e: React.MouseEvent) => void }) => {
    const { settings } = useStore();

    return (
        <div className={cn("relative group w-full flex", isCompact ? "justify-center" : "")}>
            <div
                onClick={onClick}
                onAuxClick={(e) => {
                    if (e.button === 1) {
                        e.stopPropagation(); // prevent default scroll
                        onClose(e);
                    }
                }}
                onContextMenu={onContextMenu}
                className={cn(
                    "relative flex items-center justify-center rounded-xl cursor-pointer transition-all duration-300 w-full",
                    isActive
                        ? (isCompact ? "bg-white/20 shadow-inner" : "bg-background border-border shadow-sm")
                        : "hover:bg-white/5",
                    isCompact ? "w-10 h-10 p-0 rounded-2xl" : "h-12 w-full px-2 gap-3 border border-transparent",
                    isIncognito ? (isActive ? "text-white" : "text-white/60 hover:text-white") : ""
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

                <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded overflow-hidden text-muted-foreground">
                    {tab.favicon ? (
                        <img src={tab.favicon} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Globe size={16} />
                    )}
                </div>

                {!isCompact && (
                    <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate text-left select-none">
                            {tab.title || "Home Page"}
                        </span>
                    </div>
                )}

                {!isCompact && (
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-1 rounded-md transition-opacity",
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

