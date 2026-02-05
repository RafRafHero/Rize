import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { UserPlus, User, Check, X, LogIn, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Profile {
    id: string;
    name: string;
    avatar: string;
}

export const ProfileSelector: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [alwaysOpen, setAlwaysOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const loadProfiles = async () => {
        const list = await (window as any).rizoAPI?.ipcRenderer.invoke('get-profiles-list');
        setProfiles(list || []);
        if (!list || list.length === 0) {
            setIsAdding(true);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProfiles();
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        const newProfile = await (window as any).rizoAPI?.ipcRenderer.invoke('create-profile', { name: newName });
        if (newProfile) {
            setProfiles([...profiles, newProfile]);
            setNewName('');
            setIsAdding(false);
            // Optionally select it immediately
            handleSelect(newProfile.id);
        }
    };

    const handleSelect = (id: string) => {
        (window as any).rizoAPI?.ipcRenderer.send('select-profile', { id, alwaysOpen });
        // Also persist as last active
        (window as any).rizoAPI?.ipcRenderer.invoke('set-active-profile', id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this profile? Data will be lost.')) {
            const success = await (window as any).rizoAPI?.ipcRenderer.invoke('delete-profile', id);
            if (success) {
                setProfiles(profiles.filter(p => p.id !== id));
            }
        }
    };

    const handleStartEdit = (e: React.MouseEvent, profile: Profile) => {
        e.stopPropagation();
        setEditingId(profile.id);
        setEditName(profile.name);
    };

    const handleSaveEdit = async () => {
        if (!editName.trim() || !editingId) return;
        const success = await (window as any).rizoAPI?.ipcRenderer.invoke('rename-profile', { id: editingId, name: editName });
        if (success) {
            setProfiles(profiles.map(p => p.id === editingId ? { ...p, name: editName } : p));
            setEditingId(null);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f5f5f7] text-zinc-900 overflow-hidden font-sans">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,102,255,0.05),transparent_70%)]" />
            <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-white to-transparent opacity-60" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-5xl p-16 rounded-[3rem] bg-white/40 border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] backdrop-blur-3xl"
            >
                <div className="text-center mb-20">
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl font-extrabold tracking-tight mb-6 text-zinc-900"
                    >
                        Who's <span className="text-blue-600">Browsing?</span>
                    </motion.h1>
                    <p className="text-zinc-500 text-xl font-medium">Select a profile to start your journey</p>
                </div>

                <div className="flex flex-wrap justify-center gap-12 mb-20 px-4">
                    {profiles.map((profile) => (
                        <motion.div
                            key={profile.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group flex flex-col items-center relative w-40"
                        >
                            {/* Profile Card */}
                            <button
                                onClick={() => handleSelect(profile.id)}
                                className="relative w-36 h-36 rounded-[2.5rem] bg-white/60 border border-white shadow-sm flex items-center justify-center mb-6 overflow-hidden hover:scale-105 hover:bg-white hover:shadow-xl transition-all duration-500 ease-out group/card"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                <User className="w-16 h-16 text-zinc-200 group-hover:text-blue-500/40 transition-all duration-500 group-hover:scale-110" />

                                {/* Action Buttons (Hover) */}
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                    <button
                                        onClick={(e) => handleStartEdit(e, profile)}
                                        className="p-2.5 rounded-full bg-white text-zinc-600 hover:text-blue-600 shadow-lg hover:scale-110 transition-all"
                                        title="Rename"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, profile.id)}
                                        className="p-2.5 rounded-full bg-white text-zinc-600 hover:text-red-500 shadow-lg hover:scale-110 transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </button>

                            {/* Name Display/Edit */}
                            {editingId === profile.id ? (
                                <div className="flex flex-col items-center gap-2 w-full animate-in fade-in zoom-in duration-200">
                                    <input
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                        onBlur={handleSaveEdit}
                                        className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-center text-sm font-semibold outline-none focus:ring-2 ring-blue-500/20"
                                    />
                                </div>
                            ) : (
                                <span className="font-bold text-lg text-zinc-400 group-hover:text-zinc-900 transition-colors duration-300 tracking-tight">
                                    {profile.name}
                                </span>
                            )}
                        </motion.div>
                    ))}

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center w-40"
                    >
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-36 h-36 rounded-[2.5rem] border-2 border-dashed border-zinc-200 flex items-center justify-center mb-6 text-zinc-300 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all duration-500 ease-out hover:scale-105"
                        >
                            <UserPlus className="w-16 h-16" />
                        </button>
                        <span className="font-bold text-lg text-zinc-300 tracking-tight">New Profile</span>
                    </motion.div>
                </div>

                <div className="flex flex-col items-center">
                    <button
                        onClick={() => setAlwaysOpen(!alwaysOpen)}
                        className="group flex items-center gap-4 px-8 py-4 rounded-2xl bg-white/40 border border-white hover:bg-white/80 transition-all shadow-sm"
                    >
                        <div className={cn(
                            "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                            alwaysOpen ? "bg-blue-600 border-blue-600" : "border-zinc-300 group-hover:border-blue-400"
                        )}>
                            {alwaysOpen && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className={cn(
                            "text-base font-bold transition-colors",
                            alwaysOpen ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-900"
                        )}>Start with this profile every time</span>
                    </button>
                </div>

                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xl z-[110] p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="w-full max-w-md p-10 rounded-[2.5rem] bg-white border border-white shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Create Profile</h3>
                                    {profiles.length > 0 && (
                                        <button onClick={() => setIsAdding(false)} className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all"><X /></button>
                                    )}
                                </div>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest pl-1">Display Name</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="e.g. Work or Personal"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                            className="w-full p-5 rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-900 text-lg font-medium outline-none focus:ring-4 ring-blue-600/10 focus:border-blue-600/30 transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim()}
                                        className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-lg font-bold transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                                    >
                                        <UserPlus className="w-6 h-6" />
                                        Launch Browser
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
