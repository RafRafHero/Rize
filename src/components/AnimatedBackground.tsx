import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
    mode: 'day' | 'night' | 'sunset' | 'midnight';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ mode }) => {
    const getGradient = () => {
        switch (mode) {
            case 'day':
                return 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)';
            case 'night':
                return 'linear-gradient(135deg, #020205 0%, #0d0a1a 50%, #1a1533 100%)';
            case 'sunset':
                return 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)';
            case 'midnight':
                return 'linear-gradient(135deg, #050508 0%, #0a0a15 50%, #151525 100%)';
            default:
                return 'linear-gradient(135deg, #74b9ff, #a29bfe)';
        }
    };

    const stars = useMemo(() => {
        if (mode !== 'night' && mode !== 'midnight') return [];
        return Array.from({ length: 120 }).map((_, i) => ({
            id: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 5
        }));
    }, [mode]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-0 overflow-hidden"
            style={{ background: getGradient() }}
        >
            {/* Ambient Blobs */}
            <div className="absolute inset-0 opacity-40">
                <motion.div
                    animate={{ x: [0, 100, 0], y: [0, 50, 0], rotate: [0, 180, 360] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-white/20 blur-[150px] rounded-full"
                />
                <motion.div
                    animate={{ x: [0, -120, 0], y: [0, -80, 0], rotate: [360, 180, 0] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-400/20 blur-[180px] rounded-full"
                />
            </div>

            {/* Mode Specific Elements */}
            {/* Mode Specific Elements */}
            {mode === 'day' && (
                <>
                    {/* Animated Sun */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-[10%] left-[10%] w-32 h-32"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-yellow-400 rounded-full blur-[40px] opacity-60"
                        />
                        <div className="absolute inset-4 bg-yellow-200 rounded-full shadow-[0_0_60px_#fef08a]" />
                    </motion.div>

                    {/* Dynamic Clouds */}
                    <Cloud delay={0} top="15%" duration={45} scale={1.2} />
                    <Cloud delay={15} top="25%" duration={60} scale={0.8} />
                    <Cloud delay={30} top="35%" duration={50} scale={1.0} />
                    <Cloud delay={5} top="45%" duration={70} scale={0.6} />
                </>
            )}

            {mode === 'night' && (
                <>
                    {/* Animated Moon Cycle */}
                    <motion.div
                        initial={{ opacity: 0, x: '20%', y: '40%' }}
                        animate={{
                            opacity: 1,
                            x: ['-10%', '10%', '-10%'],
                            y: ['0%', '-15%', '0%']
                        }}
                        transition={{
                            x: { duration: 120, repeat: Infinity, ease: "linear" },
                            y: { duration: 60, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute top-[12%] right-[15%] w-24 h-24"
                    >
                        <div className="absolute inset-0 bg-blue-50 rounded-full shadow-[0_0_80px_rgba(219,234,254,0.4)]" />
                        <div className="absolute inset-0 bg-[#0d0a1a] rounded-full translate-x-6 -translate-y-3 scale-110" />
                    </motion.div>
                    {/* Stars */}
                    {stars.map(star => (
                        <motion.div
                            key={star.id}
                            style={{ top: star.top, left: star.left, width: star.size, height: star.size }}
                            animate={{
                                opacity: [0.3, 1, 0.3],
                                scale: [1, 1.4, 1]
                            }}
                            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: star.delay }}
                            className="absolute bg-white rounded-full shadow-[0_0_8px_white]"
                        />
                    ))}
                </>
            )}

            {mode === 'sunset' && (
                <>
                    {/* Sea Horizon */}
                    <motion.div
                        animate={{
                            y: [0, 5, 0],
                            scaleX: [1, 1.02, 1]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-0 left-0 right-0 h-[25%] bg-gradient-to-t from-[#023e8a] via-[#0077b6] to-[#48cae4] opacity-80"
                        style={{ clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0% 100%)' }}
                    />
                    {/* Sunset Sun */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: [1, 1.05, 1],
                            filter: ['blur(60px)', 'blur(75px)', 'blur(60px)']
                        }}
                        transition={{
                            scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                            filter: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                            y: { duration: 1.5, ease: "easeOut" }
                        }}
                        className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-t from-orange-600 to-yellow-400 rounded-full opacity-80"
                    />
                    {/* Flock of Birds (Smooth & Bouncy) */}
                    <Bird delay={12} duration={35} top="40%" scale={0.3} />
                </>
            )}

            {mode === 'midnight' && (
                <>
                    {/* Darker Moon */}
                    <motion.div
                        initial={{ opacity: 0, x: '20%', y: '40%' }}
                        animate={{
                            opacity: 0.8,
                            x: ['-10%', '10%', '-10%'],
                            y: ['0%', '-15%', '0%']
                        }}
                        transition={{
                            x: { duration: 120, repeat: Infinity, ease: "linear" },
                            y: { duration: 60, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute top-[12%] right-[15%] w-24 h-24"
                    >
                        <div className="absolute inset-0 bg-blue-100 rounded-full shadow-[0_0_100px_rgba(30,58,138,0.3)] opacity-40" />
                        <div className="absolute inset-0 bg-[#050508] rounded-full translate-x-8 -translate-y-4 scale-110" />
                    </motion.div>
                    {/* Stars */}
                    {stars.map(star => (
                        <motion.div
                            key={star.id}
                            style={{ top: star.top, left: star.left, width: star.size, height: star.size }}
                            animate={{
                                opacity: [0.1, 0.6, 0.1],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: star.delay }}
                            className="absolute bg-white/60 rounded-full"
                        />
                    ))}
                    {/* Ghostly Clouds */}
                    <Cloud delay={0} top="20%" duration={120} scale={1.5} />
                    <Cloud delay={60} top="15%" duration={150} scale={2.0} />
                </>
            )}


            {/* Grain/Noise overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        </motion.div>
    );
};

const Cloud = ({ delay, top, duration = 60, scale = 1 }: { delay: number, top: string, duration?: number, scale?: number }) => (
    <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration, repeat: Infinity, delay, ease: "linear" }}
        style={{ top, scale }}
        className="absolute w-64 h-24 bg-white/20 blur-3xl rounded-full"
    />
);

const Bird = ({ delay, duration, top, scale }: { delay: number, duration: number, top: string, scale: number }) => (
    <motion.div
        initial={{ x: '-10%', y: 0 }}
        animate={{
            x: '110%',
            y: [0, -20, 0, 20, 0] // Gentle wave motion
        }}
        transition={{
            x: { duration, repeat: Infinity, delay, ease: "linear" },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{ top }}
        className="absolute z-10 text-black/50"
    >
        <svg width={40 * scale} height={40 * scale} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.5 12c-2.5 0-4.5-1.5-6-3.5-1.5 2-3.5 3.5-6 3.5s-4.5-1.5-6-3.5c-1 1.5-2 3.5-4.5 3.5v-1c2 0 3.5-1.5 4.5-3 1.5 2 3.5 3.5 6 3.5s4.5-1.5 6-3.5c1 1.5 2.5 3 4.5 3v1z" />
        </svg>
    </motion.div>
);
