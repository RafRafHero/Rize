import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
}

export const MouseEffects: React.FC = () => {
    const { settings } = useStore();
    const { particleEffects, particleSettings } = settings;
    const [particles, setParticles] = useState<Particle[]>([]);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const requestRef = useRef<number>(0);

    const createParticles = useCallback((x: number, y: number) => {
        const newParticles: Particle[] = [];
        const { amount, speed, colorVariation } = particleSettings;

        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * 5 + 2) * speed;
            const hue = (Math.random() * colorVariation) + 200; // Base blue-ish hue

            newParticles.push({
                id: Math.random(),
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: Math.random() * 4 + 2,
                color: `hsla(${hue}, 80%, 60%, 0.8)`,
                life: 1,
                maxLife: 0.5 + Math.random() * 1
            });
        }
        setParticles(prev => [...prev, ...newParticles].slice(-100)); // Cap particles
    }, [particleSettings]);

    const animate = useCallback(() => {
        setParticles(prev =>
            prev.map(p => ({
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                vy: p.vy + 0.1, // Gravity
                vx: p.vx * 0.98, // Friction
                life: p.life - 0.02
            })).filter(p => p.life > 0)
        );
        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        if (!particleEffects) {
            setParticles([]);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) { // Only create if moved enough
                createParticles(e.clientX, e.clientY);
                lastMousePos.current = { x: e.clientX, y: e.clientY };
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [particleEffects, createParticles, animate]);

    if (!particleEffects) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: p.x,
                        top: p.y,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        boxShadow: `0 0 10px ${p.color}`,
                        opacity: p.life,
                        transform: `scale(${p.life})`,
                    }}
                />
            ))}
        </div>
    );
};
