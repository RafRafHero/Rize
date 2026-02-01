import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { File, FileText, ImageIcon, X, Droplets } from 'lucide-react';
import { cn } from '../lib/utils';

export const LiquidDropZone: React.FC = () => {
    const { droppedFiles, addDroppedFile, clearDroppedFiles, removeDroppedFile, settings } = useStore();
    const [isHovering, setIsHovering] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isZoneVisible, setIsZoneVisible] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fade in only when hovered OR if there are already files
    const showBubble = (isZoneVisible || droppedFiles.length > 0 || isDraggingOver) && (settings?.liquidDropEnabled ?? true);

    if (settings && !settings.liquidDropEnabled) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = Array.from(e.dataTransfer.files);

        if (files.length > 0) {
            files.forEach(file => {
                const filePath = (file as any).path || '';
                if (filePath) {
                    addDroppedFile({
                        path: filePath,
                        name: file.name,
                        type: file.type
                    });
                }
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const filePath = (file as any).path || '';
            if (filePath) {
                addDroppedFile({
                    path: filePath,
                    name: file.name,
                    type: file.type
                });
            }
        });
        e.target.value = '';
    };

    const handleStartDrag = (file: { path: string; name: string }) => {
        (window as any).electron?.ipcRenderer.send('start-file-drag', file.path);
    };

    return (
        <div
            className="w-full flex justify-center py-4 relative group"
            onMouseEnter={() => setIsZoneVisible(true)}
            onMouseLeave={() => setIsZoneVisible(false)}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
            />
            <AnimatePresence>
                {showBubble && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{
                            opacity: 1,
                            scale: isDraggingOver ? 1.05 : 1,
                            y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !droppedFiles.length && fileInputRef.current?.click()}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            clearDroppedFiles();
                        }}
                        className={cn(
                            "relative flex items-center justify-center transition-all duration-700 cursor-pointer overflow-hidden",
                            "bg-white/5 backdrop-blur-3xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
                            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none before:z-0",
                            isDraggingOver ? "border-cyan-400/50 scale-110 shadow-[0_0_40px_rgba(34,211,238,0.3)]" : "hover:border-white/30",
                            droppedFiles.length > 0
                                ? "h-auto w-[calc(100%-16px)] mx-2 rounded-2xl py-4 flex-col gap-2 px-2"
                                : "w-16 h-16 rounded-full"
                        )}
                    >
                        {/* Refractive Shine */}
                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/20 blur-xl rounded-full pointer-events-none z-0" />

                        {droppedFiles.length === 0 ? (
                            <div className="flex flex-col items-center gap-1 z-10">
                                <Droplets size={22} className={cn("text-white/60 transition-all", isDraggingOver ? "text-cyan-400 scale-125 animate-pulse" : "")} />
                                <span className="text-[7px] text-white/30 font-black uppercase tracking-[0.2em]">Liquid</span>
                            </div>
                        ) : (
                            <div className="w-full space-y-1.5 z-10 pointer-events-none">
                                {droppedFiles.map((file) => (
                                    <motion.div
                                        key={file.path}
                                        draggable
                                        onDragStart={(e) => {
                                            e.preventDefault();
                                            handleStartDrag(file);
                                        }}
                                        className="w-full flex items-center gap-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors pointer-events-auto cursor-grab active:cursor-grabbing group/file"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                                            {file.type.startsWith('image/') ? (
                                                <ImageIcon size={14} className="text-cyan-400" />
                                            ) : (
                                                <FileText size={14} className="text-white/60" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[10px] font-bold text-white/90 truncate leading-tight">{file.name}</span>
                                            <span className="text-[7px] text-white/30 uppercase tracking-tighter truncate">{file.type.split('/')[1] || 'File'}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeDroppedFile(file.path);
                                            }}
                                            className="p-1 text-white/10 hover:text-red-400 opacity-0 group-hover/file:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </motion.div>
                                ))}
                                <div className="pt-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        className="text-[7px] font-black uppercase tracking-widest text-white/20 hover:text-cyan-400 transition-colors pointer-events-auto"
                                    >
                                        + Add More
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
