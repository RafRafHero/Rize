import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';

declare global {
    interface Window {
        ipcRenderer: any;
    }
}

export const UpdateBanner = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (window.ipcRenderer) {
            window.ipcRenderer.on('show-update-banner', () => {
                setShow(true);
            });
        }
        return () => {
            // Cleanup if needed
            if (window.ipcRenderer) {
                window.ipcRenderer.removeAllListeners('show-update-banner');
            }
        };
    }, []);

    const handleRestart = () => {
        window.ipcRenderer?.send('restart-app');
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-black/40 text-white"
                    style={{
                        maxWidth: '90%',
                        width: 'auto'
                    }}
                >
                    <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex flex-col">
                        <h3 className="text-sm font-semibold text-white/90">Update Available</h3>
                        <p className="text-xs text-white/60">A new version of Rizo is ready.</p>
                    </div>

                    <button
                        onClick={handleRestart}
                        className="ml-4 px-4 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Restart
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
