import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
    src: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Initial decode
    const decodedSrc = decodeURIComponent(src);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(s => Math.min(Math.max(0.1, s + delta), 5));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Zoom controls
    const zoomIn = () => setScale(s => Math.min(s + 0.25, 5));
    const zoomOut = () => setScale(s => Math.max(0.1, s - 0.25));
    const reset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // Ensure reset on src change
    useEffect(() => {
        reset();
    }, [src]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-[#0d0d0d] flex items-center justify-center overflow-hidden relative select-none"
            onWheel={handleWheel}
        >
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 px-4 py-2 flex items-center gap-4 z-50">
                <button onClick={zoomOut} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors" title="Zoom Out">
                    <ZoomOut size={20} />
                </button>
                <span className="text-xs font-mono text-white/50 w-12 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={zoomIn} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors" title="Zoom In">
                    <ZoomIn size={20} />
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button onClick={reset} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors" title="Reset View">
                    <RotateCcw size={18} />
                </button>
            </div>

            {/* Image Container */}
            <div
                className="cursor-move transition-transform duration-75 ease-out"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img
                    ref={imageRef}
                    src={decodedSrc}
                    alt="View"
                    className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl pointer-events-none"
                    draggable={false}
                />
            </div>

            <div className="absolute bottom-4 left-4 text-xs text-white/30 font-mono">
                {decodedSrc}
            </div>
        </div>
    );
};
