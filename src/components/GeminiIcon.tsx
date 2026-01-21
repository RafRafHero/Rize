import React from 'react';

export const GeminiIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => {
    return (
        <img
            src="Gemini Logo.png"
            alt="Gemini"
            style={{ width: size, height: size }}
            className={className}
        />
    );
};
