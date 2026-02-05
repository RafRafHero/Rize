import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Minus, Users, ChevronLeft, ChevronRight, FolderPlus, Sparkles } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useStore, Tab } from '../store/useStore';
import { cn } from '../lib/utils';
import { SortableTab } from './SortableTab';
import { TabGroup } from './TabGroup';

export const Sidebar: React.FC = () => {
    const { tabs, tabGroups, activeTabId, setActiveTab, addTab, removeTab, settings, updateSettings, isIncognito, createTabGroup, updateTabGroup, moveTabToGroup, reorderTabs, showToast } = useStore();
    const isCompact = settings.isSidebarCollapsed;
    const [isOrganizing, setIsOrganizing] = useState(false);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragTab, setActiveDragTab] = useState<Tab | null>(null);

    // Filter tabs
    const orphanedTabs = tabs.filter(t => !t.groupId);

    // Resize Logic
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

    // --- DnD Handlers ---

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragId(active.id as string);
        const tab = tabs.find(t => t.id === active.id);
        if (tab) setActiveDragTab(tab);
    };

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
            return;
        }

        const overId = over.id as string;

        // Expand Group on Hover Logic
        const group = tabGroups.find(g => g.id === overId);
        if (group && group.isCollapsed) {
            if (!hoverTimeoutRef.current) {
                hoverTimeoutRef.current = setTimeout(() => {
                    updateTabGroup(group.id, { isCollapsed: false });
                    hoverTimeoutRef.current = null;
                }, 600); // 600ms delay before expansion
            }
        } else {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
        }

        // Note: Simple reordering is handled in dragEnd. 
        // Complex interactions like hovering over a group to drop inside could be done here,
        // but often it's cleaner to handle logical moves in dragEnd.
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        // Clear any pending expansions
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        setActiveDragId(null);
        setActiveDragTab(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // 1. Dropped onto a Group
        const targetGroup = tabGroups.find(g => g.id === overId);
        if (targetGroup) {
            moveTabToGroup(activeId, targetGroup.id);
            return;
        }

        // 2. Dropped onto Orphaned List (Ungroup / Move to Main)
        if (overId === 'orphaned-list') {
            moveTabToGroup(activeId, undefined);
            return;
        }

        // 3. Sorting within logic
        if (activeId !== overId) {
            // Check if both are orphaned
            const activeTab = tabs.find(t => t.id === activeId);
            const overTab = tabs.find(t => t.id === overId);

            if (activeTab && overTab) {
                // Same group (or both undefined)
                if (activeTab.groupId === overTab.groupId) {
                    reorderTabs(activeId, overId);
                } else {
                    // Moving between different lists (Group <-> Orphaned)
                    moveTabToGroup(activeId, overTab.groupId);
                }
            }
        }
    };

    const handleOrganizeTabs = async () => {
        if (tabs.length < 2) return;
        setIsOrganizing(true);
        try {
            const tabInfo = tabs.map(t => ({ id: t.id, title: t.title, url: t.url }));
            const response = await (window as any).rizoAPI?.ipcRenderer.invoke('ask-ai', {
                text: JSON.stringify(tabInfo),
                prompt: `Group these tabs into 3-5 logical categories (e.g., Work, Social, Research, Shopping). 
                Return ONLY a JSON object with this structure:
                { "groups": [ { "name": "Category Name", "tabIds": ["id1", "id2"], "color": "blue|red|green|purple|orange" } ] }`
            });

            // Clean response (sometimes AI wraps in ```json ... ```)
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const { groups } = JSON.parse(cleanJson);

            // Apply groups
            for (const g of groups) {
                // Create group
                const { tabGroups: currentGroups } = useStore.getState();
                let groupId: string;

                // Check if group with same name exists
                const existingGroup = currentGroups.find(cg => cg.title === g.name);
                if (existingGroup) {
                    groupId = existingGroup.id;
                } else {
                    // Manual creation to get ID immediately
                    groupId = crypto.randomUUID();
                    useStore.setState(state => ({
                        tabGroups: [...state.tabGroups, {
                            id: groupId,
                            title: g.name,
                            color: g.color || 'blue',
                            isCollapsed: false,
                            tabIds: []
                        }]
                    }));
                }

                // Move tabs
                for (const tid of g.tabIds) {
                    moveTabToGroup(tid, groupId);
                }
            }
            console.log(`Organized ${tabs.length} tabs into ${groups.length} groups.`);
        } catch (error) {
            console.error('Failed to organize tabs:', error);
        } finally {
            setIsOrganizing(false);
        }
    };


    // Droppable for main area (to allow dragging out of groups)
    const { setNodeRef: setOrphanedRef } = useDroppable({
        id: 'orphaned-list'
    });

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: { opacity: '0.5' },
            },
        }),
    };

    return (
        <motion.div
            id="sidebar"
            style={{ width }}
            className={cn(
                "relative flex flex-col h-full z-20 overflow-hidden border-r border-white/5",
                isCompact ? "items-center py-4 gap-4 shadow-none" : "p-2 gap-2 shadow-none",
                "bg-transparent"
            )}
            layout
            transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
        >
            {/* Traffic Lights */}
            <motion.div layout={false} className={cn("flex items-center no-drag shrink-0 w-full transition-all duration-300 py-3", isCompact ? "px-1 justify-center gap-1.5" : "px-4 justify-start gap-2")}>
                <div onClick={() => (window as any).rizoAPI?.window.close()} className="traffic-light close" title="Close"><X size={8} strokeWidth={4} /></div>
                <div onClick={() => (window as any).rizoAPI?.window.minimize()} className="traffic-light minimize" title="Minimize"><Minus size={8} strokeWidth={4} /></div>
                <div onClick={() => (window as any).rizoAPI?.window.maximize()} className="traffic-light maximize" title="Fullscreen"><Plus size={8} strokeWidth={4} /></div>
            </motion.div>

            {/* App Logo / Header */}
            <div className={cn("flex items-center gap-2 px-2 mb-2 titlebar-drag-region", isCompact ? "justify-center" : "")}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-sm overflow-hidden shrink-0">
                    <img src="Rizo logo.png" alt="Rizo" className="w-full h-full object-cover" />
                </div>
                {!isCompact && <span className="font-semibold text-lg tracking-tight flex-1 truncate">Rizo</span>}
                {!isCompact && (
                    <div className="flex gap-1">
                        <motion.button onClick={() => createTabGroup()} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1 hover:bg-secondary rounded-md no-drag" title="Create Group">
                            <FolderPlus size={16} />
                        </motion.button>
                        <motion.button onClick={() => updateSettings({ isSidebarCollapsed: true })} whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} className={cn("p-1 hover:bg-secondary rounded-md no-drag", isIncognito ? "text-white" : "")}>
                            <ChevronLeft size={16} />
                        </motion.button>
                    </div>
                )}
            </div>

            {isCompact && (
                <motion.button onClick={() => updateSettings({ isSidebarCollapsed: false })} whileHover={{ scale: 1.1, rotate: -180 }} whileTap={{ scale: 0.9 }} initial={{ rotate: 0 }} animate={{ rotate: 360 }} className={cn("p-1 hover:bg-secondary rounded-md mb-2", isIncognito ? "text-white" : "")}>
                    <ChevronRight size={16} />
                </motion.button>
            )}

            {/* DnD Context */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar w-full px-1">

                    {/* 1. Tab Groups */}
                    {tabGroups.map(group => (
                        <TabGroup
                            key={group.id}
                            group={group}
                            activeTabId={activeTabId}
                            isCompact={isCompact}
                            isIncognito={isIncognito}
                            onTabClick={handleTabClick}
                            onTabClose={removeTab}
                        />
                    ))}

                    {/* 2. Orphaned Tabs */}
                    <div ref={setOrphanedRef} className="flex flex-col gap-1 w-full min-h-[50px]">
                        <SortableContext
                            items={orphanedTabs.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {orphanedTabs.map(tab => (
                                <SortableTab
                                    key={tab.id}
                                    tab={tab}
                                    isActive={tab.id === activeTabId}
                                    isCompact={isCompact}
                                    isIncognito={isIncognito}
                                    onClick={() => handleTabClick(tab.id)}
                                    onClose={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                                />
                            ))}
                        </SortableContext>
                    </div>

                    {/* Add Tab Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addTab()}
                        className={cn(
                            "flex items-center justify-center gap-2 p-2 rounded-xl transition-colors shrink-0 mt-2",
                            isCompact ? "w-10 h-10 mx-auto" : "w-full",
                            isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground"
                        )}
                    >
                        <Plus size={20} />
                        {!isCompact && <span className="text-sm font-medium">New Tab</span>}
                    </motion.button>

                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeDragTab ? (
                        <div className={cn(
                            "opacity-80 scale-105 pointer-events-none",
                            isCompact ? "w-10 h-10 bg-white/20 rounded-2xl" : "h-12 w-60 bg-background border border-primary/50 shadow-xl rounded-xl flex items-center px-4"
                        )}>
                            {!isCompact && <span className="font-medium text-sm">{activeDragTab.title}</span>}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Profile Switcher & Magic Organize */}
            <div className={cn("mt-auto pt-2 border-t border-white/5 w-full flex gap-1", isCompact ? "flex-col items-center py-2" : "flex-row px-2 pb-2")}>
                <motion.button
                    onClick={() => (window as any).rizoAPI?.ipcRenderer.send('switch-to-profile-selector')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5 no-drag",
                        isCompact ? "w-10 h-10 justify-center" : "flex-1",
                        isIncognito ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Switch Profile"
                >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <Users size={18} />
                    </div>
                    {!isCompact && <span className="text-sm font-semibold tracking-tight">Switch Profile</span>}
                </motion.button>

                <motion.button
                    onClick={() => handleOrganizeTabs()}
                    disabled={isOrganizing}
                    whileHover={{
                        scale: 1.2,
                        rotate: 12,
                        transition: { type: "spring", stiffness: 400, damping: 25, mass: 1 }
                    }}
                    whileTap={{
                        scale: 0.85,
                        transition: { type: "spring", stiffness: 400, damping: 25, mass: 1 }
                    }}
                    className={cn(
                        "relative flex items-center justify-center transition-all shrink-0 w-11 h-11 no-drag focus:outline-none",
                        "text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-yellow-300",
                        isOrganizing && "opacity-50 cursor-wait"
                    )}
                    title="Magic Organize"
                >
                    {isOrganizing ? (
                        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <div className="relative">
                            {/* SVG Gradient Icon hack */}
                            <svg width="0" height="0" className="absolute">
                                <linearGradient id="magic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#c084fc' }} />
                                    <stop offset="100%" style={{ stopColor: '#facc15' }} />
                                </linearGradient>
                            </svg>
                            <Sparkles
                                size={22}
                                style={{ stroke: "url(#magic-gradient)", fill: "url(#magic-gradient)" }}
                                className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                            />
                        </div>
                    )}

                    {/* Golden Glow Pulse Effect - subtle and circular */}
                    <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                </motion.button>
            </div>

            {/* Resize Handle */}
            {!isCompact && (
                <div onMouseDown={startResizing} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50" />
            )}
        </motion.div>
    );
};
