import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, X, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export const PasswordPrompt: React.FC = () => {
    const { capturedPassword, clearCapturedPassword } = useStore();
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleNever = () => {
        if (!capturedPassword) return;
        const domain = new URL(capturedPassword.url).hostname;
        const currentNever = useStore.getState().settings.neverSavePasswords || [];
        useStore.getState().updateSettings({
            neverSavePasswords: [...currentNever, domain]
        });
        clearCapturedPassword();
    };

    const handleSave = async () => {
        if (!capturedPassword) return;
        setIsSaving(true);
        const success = await (window as any).rizoAPI?.ipcRenderer.invoke('save-password', capturedPassword);
        if (success) {
            setIsSaved(true);
            setTimeout(() => {
                clearCapturedPassword();
                setIsSaved(false);
            }, 1500);
        }
        setIsSaving(false);
    };

    if (!capturedPassword) return null;

    const hostname = new URL(capturedPassword.url).hostname;

    return (
        <AnimatePresence>
            {capturedPassword && (
                <motion.div
                    initial={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="fixed top-24 right-6 z-[200] w-80 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-4 liquid-glass overflow-hidden"
                >
                    {/* Progress indicator */}
                    {isSaving && (
                        <motion.div
                            className="absolute bottom-0 left-0 h-1 bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                        />
                    )}

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Key size={18} />
                                </div>
                                <span className="text-sm font-bold text-white tracking-tight">Save Password?</span>
                            </div>
                            <button
                                onClick={clearCapturedPassword}
                                className="p-1 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-1">Domain</p>
                            <p className="text-sm text-white font-medium truncate">{hostname}</p>

                            <div className="mt-3">
                                <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-1">Username</p>
                                <p className="text-sm text-white font-medium truncate">{capturedPassword.username || 'No username captured'}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleNever}
                                className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all border border-white/5"
                            >
                                Never
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isSaved}
                                className={cn(
                                    "flex-[2] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    isSaved
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                )}
                            >
                                {isSaved ? (
                                    <>
                                        <CheckCircle2 size={14} />
                                        Saved
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} />
                                        Save Credentials
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
