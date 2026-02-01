import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { X, Search } from 'lucide-react';

export const GlassCardsOverlay = () => {
    const {
        tabs,
        activeTabId,
        setActiveTab,
        removeTab,
        isGlassCardsOverviewOpen,
        toggleGlassCards,
        addTab
    } = useStore();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        },
        exit: {
            opacity: 0,
            transition: {
                staggerChildren: 0.02,
                staggerDirection: -1
            }
        }
    };

    const handleClose = () => toggleGlassCards(false);

    const handleSelect = (id: string) => {
        setActiveTab(id);
        handleClose();
    };

    const handleNewTab = (e: React.MouseEvent) => {
        e.stopPropagation();
        addTab();
        handleClose();
    };

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isGlassCardsOverviewOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGlassCardsOverviewOpen]);

    return (
        <AnimatePresence>
            {isGlassCardsOverviewOpen && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={containerVariants}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
                    style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(20px)' }}
                    onClick={handleClose}
                >
                    {/* Header */}
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="absolute top-8 w-full max-w-7xl px-8 flex justify-between items-center z-20"
                    >
                        <h2 className="text-3xl font-light text-white/90 tracking-wider font-sans">
                            Open Tabs <span className="text-white/40 text-lg ml-2">{tabs.length}</span>
                        </h2>
                        <div className="flex gap-4">
                            <button
                                onClick={handleNewTab}
                                className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all backdrop-blur-md flex items-center gap-2"
                            >
                                + New Tab
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                                className="p-2 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </motion.div>

                    {/* Search / Filter (Visual only for now, can be functional) */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-full max-w-md mb-8 relative z-20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/80 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search tabs..."
                                className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-2xl py-3 pl-12 pr-4 text-white outline-none backdrop-blur-md transition-all placeholder:text-white/30"
                            />
                        </div>
                    </motion.div>

                    {/* Cards Grid */}
                    <div
                        className="w-full max-w-[90vw] h-[70vh] grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4 overflow-y-auto no-scrollbar pb-20"
                        onClick={(e) => e.stopPropagation()}
                        style={{ perspective: '2000px' }}
                    >
                        {tabs.map((tab) => (
                            <Card
                                key={tab.id}
                                tab={tab}
                                isActive={tab.id === activeTabId}
                                onSelect={handleSelect}
                                onClose={removeTab}
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Card = ({ tab, isActive, onSelect, onClose }: { tab: any, isActive: boolean, onSelect: (id: string) => void, onClose: (id: string) => void }) => {
    const cardVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.9, rotateX: 10 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            transition: { type: "spring" as const, stiffness: 300, damping: 20 }
        },
        exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
    };

    return (
        <motion.div
            layoutId={tab.id}
            variants={cardVariants}
            whileHover={{
                scale: 1.05,
                rotateX: 2,
                rotateY: 0,
                z: 50,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
                "relative group cursor-pointer rounded-2xl overflow-hidden transition-all duration-150",
                "border backdrop-blur-xl h-48 flex flex-col",
                isActive
                    ? "border-blue-400/50 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                    : "border-white/10 bg-white/5 hover:bg-white/10 shadow-lg hover:border-white/30"
            )}
            style={{ transformStyle: 'preserve-3d' }}
            onClick={() => onSelect(tab.id)}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-black/20 z-10 w-full relative">
                <div className="flex items-center gap-2 overflow-hidden max-w-[80%]">
                    {tab.favicon ? (
                        <img src={tab.favicon} className="w-4 h-4 rounded-sm shrink-0" alt="" />
                    ) : (
                        <div className="w-4 h-4 rounded-sm bg-white/20 shrink-0" />
                    )}
                    <span className="text-xs text-white/90 truncate font-medium">
                        {tab.title || 'New Tab'}
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose(tab.id);
                    }}
                    className="p-1 rounded-full text-white/40 hover:text-white hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Content / Snapshot */}
            <div className="flex-1 relative w-full h-full bg-black/40 overflow-hidden">
                {tab.thumbnailUrl ? (
                    <motion.img
                        src={tab.thumbnailUrl}
                        className={cn(
                            "w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity",
                            isActive ? "opacity-100" : "grayscale-[0.3] group-hover:grayscale-0"
                        )}
                        alt={tab.title}
                        initial={{ scale: 1.05 }} // Start slightly zoomed
                        whileHover={{ scale: 1 }} // Zoom out on hover ?? or Zoom in? Let's zoom in slightly
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/10 select-none uppercase">
                            {tab.title ? tab.title.substring(0, 2) : 'Ri'}
                        </span>
                        {/* Shimmer Effect for loading-like state */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 opacity-50" />
                    </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                    <div className="absolute inset-0 pointer-events-none border-[3px] border-blue-400/30 rounded-2xl" />
                )}
            </div>

            {/* Glossy Reflection Overlay */}
            <div
                className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ mixBlendMode: 'overlay' }}
            />
        </motion.div>
    );
};
