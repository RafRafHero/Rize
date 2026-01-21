import React, { useRef, useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

interface GradientEditorProps {
    value: {
        color1: string;
        color2: string;
        point1: { x: number, y: number };
        point2: { x: number, y: number };
    };
    onChange: (newValue: any) => void;
}

export const GradientEditor: React.FC<GradientEditorProps> = ({ value, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [p1, setP1] = useState(value.point1);
    const [p2, setP2] = useState(value.point2);

    // Update internal state when props change
    useEffect(() => {
        setP1(value.point1);
        setP2(value.point2);
    }, [value.point1, value.point2]);

    const handleDrag = (point: 'p1' | 'p2', info: any) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        // Calculate relative position (percentage)
        // info.point is page coordinates. We need local.
        // Actually, simpler to use the element's position if we can get it, 
        // but framer motion drag logic is sometimes tricky with percentages.
        // Let's use a standard mouse/touch move listener on the container for smoother "After Effects" style interaction?
        // No, let's stick to draggable divs first, it's easier.
    };

    const updateGradient = (newP1: typeof p1, newP2: typeof p2) => {
        // Calculate angle based on the two points
        const dx = newP2.x - newP1.x;
        const dy = newP2.y - newP1.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 to align with CSS linear-gradient standard

        onChange({
            ...value,
            point1: newP1,
            point2: newP2,
            angle: Math.round(angle)
        });
    };

    // Helper to constraining drag to container is handled by dragConstraintsRef in parent, 
    // but calculating the exact % position needs care.
    // Let's simplified approach: 
    // The visual points move. We update state onDragEnd or onDrag.

    return (
        <div className="flex flex-col gap-4">
            <div
                ref={containerRef}
                className="relative w-full aspect-video bg-secondary rounded-lg overflow-hidden border border-border shadow-inner"
                style={{
                    background: `linear-gradient(${Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 90}deg, ${value.color1}, ${value.color2})`
                }}
            >
                {/* Visual Line connecting points */}
                <svg className="absolute inset-0 pointer-events-none opacity-50">
                    <line
                        x1={`${p1.x}%`}
                        y1={`${p1.y}%`}
                        x2={`${p2.x}%`}
                        y2={`${p2.y}%`}
                        stroke="white"
                        strokeWidth="2"
                        strokeDasharray="4"
                    />
                </svg>

                <DraggablePoint
                    x={p1.x}
                    y={p1.y}
                    color={value.color1}
                    containerRef={containerRef}
                    onUpdate={(x, y) => {
                        setP1({ x, y });
                        updateGradient({ x, y }, p2);
                    }}
                />
                <DraggablePoint
                    x={p2.x}
                    y={p2.y}
                    color={value.color2}
                    containerRef={containerRef}
                    onUpdate={(x, y) => {
                        setP2({ x, y });
                        updateGradient(p1, { x, y });
                    }}
                />
            </div>

            <div className="flex justify-between gap-4">
                <ColorInput label="Color 1" value={value.color1} onChange={c => onChange({ ...value, color1: c })} />
                <ColorInput label="Color 2" value={value.color2} onChange={c => onChange({ ...value, color2: c })} />
            </div>
        </div>
    );
};

const DraggablePoint = ({ x, y, color, containerRef, onUpdate }: any) => {
    // Convert % to pixels for initial position if needed, or just let motion handle it.
    // Issue: style={{ left: x% }} fights with drag transform.
    // Fix: Use useAnimation or just let it be uncontrolled during drag and sync on end?
    // Better: Update state onDrag but don't set style based on state while dragging? 
    // Or: Use `dragElastic={0}` and `dragMomentum={false}` which is already there.

    // The issue is likely that we are passing `style={{ left, top }}` AND dragging. 
    // When react re-renders with new x/y, it resets the transform or conflicts.
    // Solution: Don't update p1/p2 state onDrag. Update it onDragEnd.
    // BUT we want live preview.
    // So we must update state.
    // If we update state, the component re-renders with new `left/top`. 
    // Framer motion adds `transform: translate(...)` on top of that. 
    // So it moves double distance or jitters.

    // Correct approach for controlled drag with Framer Motion:
    // Don't mix Layout/Style positioning with Drag unless perfectly synced.
    // Let's use a ref for the element and standard JS events for "After Effects" feel? 
    // No, let's keep it simple.
    // We can use `cx` `cy` if it was SVG, but it's div.

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={containerRef}
            // We need to ignore the parent's re-render position while dragging?
            // Actually, if we just set the background gradient via a Ref in the parent, we avoid re-rendering THIS component.
            // But we can't easily do that without Context or signals.

            // Let's try `_dragX` `_dragY`? No.

            // Simplest fix: changing the key forces a re-mount? No that breaks drag.

            // Let's remove `style={{ left, top }}` and use `initial`? 
            // No, we need it to update if inputs change.

            // Okay, let's just use `onDrag` to update a specific "preview" state, but only commit to "value" onDragEnd?
            // The user wants to see it change "drag points around to look how you want".

            // Revert to raw HTML drag for absolute control without Fighting Framer Motion?
            // Yes, standard pointer events are often smoother for this specific "control point" UI.

            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;
                const startLeft = x;
                const startTop = y;

                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();

                const onMove = (moveEvent: PointerEvent) => {
                    const deltaXPixels = moveEvent.clientX - startX;
                    const deltaYPixels = moveEvent.clientY - startY;

                    const deltaXPercent = (deltaXPixels / rect.width) * 100;
                    const deltaYPercent = (deltaYPixels / rect.height) * 100;

                    const newX = Math.min(100, Math.max(0, startLeft + deltaXPercent));
                    const newY = Math.min(100, Math.max(0, startTop + deltaYPercent));

                    onUpdate(newX, newY);
                };

                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                };

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            }}

            className="absolute w-6 h-6 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing z-10"
            style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: color,
                marginLeft: -12,
                marginTop: -12,
                touchAction: 'none'
            }}
        />
    )
}

const ColorInput = ({ label, value, onChange }: any) => (
    <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border/50">
        <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer bg-transparent"
        />
        <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-mono uppercase">{value}</span>
        </div>
    </div>
)
