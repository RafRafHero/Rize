import React from 'react';
import { cn } from '../lib/utils';

export const GeminiIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => {
    return (
        <img
            src="Gemini Logo.png"
            alt="Gemini"
            className={cn(
                "transition-all duration-300",
                className
            )}
            style={{
                width: size,
                height: size,
                filter: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'none' : 'invert(0.8) brightness(0.2)'
            }}
        />
    );
};
