import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface ZoomBarProps {
    isOpen: boolean;
    zoomLevel: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}

export const ZoomBar: React.FC<ZoomBarProps> = ({ isOpen, zoomLevel, onZoomIn, onZoomOut, onReset }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className={cn(
                        "absolute top-2 right-16 z-50 flex items-center gap-2 px-3 py-2 rounded-lg",
                        "bg-background/95 backdrop-blur-md border border-white/10 shadow-xl"
                    )}
                >
                    <span className="text-foreground/70 font-mono min-w-[3rem] text-center text-xs border-r border-white/10 pr-2 mr-1">
                        {Math.round(zoomLevel * 100)}%
                    </span>

                    <button
                        onClick={onZoomOut}
                        className="p-1 rounded hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors"
                        title="Zoom Out"
                    >
                        <Minus size={16} />
                    </button>

                    <button
                        onClick={onZoomIn}
                        className="p-1 rounded hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors"
                        title="Zoom In"
                    >
                        <Plus size={16} />
                    </button>

                    <button
                        onClick={onReset}
                        className="ml-1 px-2 py-0.5 text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-white/10 rounded transition-colors"
                        title="Reset Zoom"
                    >
                        Reset
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
