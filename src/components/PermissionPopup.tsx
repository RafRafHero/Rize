import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, MapPin, Bell } from 'lucide-react';

interface PermissionPopupProps {
    request: {
        permission: string;
        origin: string;
    } | null;
    onAllow: () => void;
    onDeny: () => void;
    onAllowAlways: () => void;
}

const getPermissionLabel = (permission: string) => {
    switch (permission) {
        case 'media':
            return 'Camera & Microphone';
        case 'geolocation':
            return 'Location';
        case 'notifications':
            return 'Notifications';
        case 'midi':
            return 'MIDI Devices';
        case 'pointerLock':
            return 'Mouse Cursor';
        case 'fullscreen':
            return 'Full Screen';
        case 'openExternal':
            return 'Open External App';
        default:
            return permission;
    }
};

const getPermissionIcon = (permission: string) => {
    switch (permission) {
        case 'media':
            return <Camera className="w-5 h-5 text-white" />;
        case 'geolocation':
            return <MapPin className="w-5 h-5 text-white" />;
        case 'notifications':
            return <Bell className="w-5 h-5 text-white" />;
        default:
            return <Camera className="w-5 h-5 text-white" />;
    }
};

export const PermissionPopup: React.FC<PermissionPopupProps> = ({ request, onAllow, onDeny, onAllowAlways }) => {
    if (!request) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0, x: '-50%' }}
                animate={{ y: 0, opacity: 1, x: '-50%' }}
                exit={{ y: -100, opacity: 0, x: '-50%' }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute top-8 left-1/2 z-50 flex flex-col items-center gap-4 p-5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl"
                style={{
                    background: 'rgba(30, 30, 30, 0.6)',
                    minWidth: '320px'
                }}
            >
                <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-full bg-white/10">
                        {getPermissionIcon(request.permission)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white/60">
                            Permission Request
                        </span>
                        <span className="text-md font-semibold text-white">
                            {request.origin}
                        </span>
                    </div>
                </div>

                <p className="text-center text-white/90 text-[15px] font-medium px-2">
                    Can <span className="font-bold text-white">{request.origin}</span> access your <span className="font-bold text-white">{getPermissionLabel(request.permission)}</span>?
                </p>

                <div className="flex gap-3 w-full mt-1">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onDeny}
                        className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg"
                        style={{
                            background: 'rgba(255, 59, 48, 0.1)',
                            color: '#FF3B30',
                            border: '1px solid rgba(255, 59, 48, 0.2)',
                            boxShadow: '0 0 15px rgba(255, 59, 48, 0.2)'
                        }}
                    >
                        Deny
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onAllow}
                        className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg"
                        style={{
                            background: 'rgba(52, 199, 89, 0.1)',
                            color: '#34C759',
                            border: '1px solid rgba(52, 199, 89, 0.2)',
                            boxShadow: '0 0 15px rgba(52, 199, 89, 0.2)'
                        }}
                    >
                        Allow
                    </motion.button>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onAllowAlways}
                    className="w-full py-2 rounded-xl font-semibold text-xs mt-0 opacity-80 hover:opacity-100 transition-all cursor-pointer"
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    Allow always to this site
                </motion.button>
            </motion.div>
        </AnimatePresence>
    );
};
