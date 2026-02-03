import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Eye, EyeOff, Trash2, Globe, Copy, Check, Search, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface Password {
    domain: string;
    username: string;
    password: string;
    timestamp?: number;
}

export const PasswordsPage: React.FC = () => {
    const [passwords, setPasswords] = useState<Password[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPasswords();
    }, []);

    const loadPasswords = async () => {
        setIsLoading(true);
        const api = (window as any).rizoAPI;
        if (!api?.ipcRenderer) {
            setIsLoading(false);
            return;
        }
        const data = await api.ipcRenderer.invoke('get-passwords');
        setPasswords(data || []);
        setIsLoading(false);
    };

    const handleDelete = async (domain: string, username: string) => {
        const api = (window as any).rizoAPI;
        if (!api?.ipcRenderer) return;
        const success = await api.ipcRenderer.invoke('delete-password', { domain, username });
        if (success) {
            setPasswords(prev => prev.filter(p => !(p.domain === domain && p.username === username)));
        }
    };

    const toggleVisibility = (key: string) => {
        setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const copyToClipboard = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(key);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredPasswords = passwords.filter(p =>
        p.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getPasswordKey = (p: Password) => `${p.domain}-${p.username}`;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex flex-col">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Shield size={18} className="text-primary" /> Password Manager
                </h3>
                <p className="text-xs text-muted-foreground ml-7">Securely manage your saved credentials</p>
            </div>

            {/* Search Bar */}
            <div className="ml-7 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search passwords..."
                    className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border/40 rounded-xl text-sm outline-none focus:border-primary/50 transition-colors text-foreground"
                />
            </div>

            {/* Password List */}
            <div className="ml-7">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : filteredPasswords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-border/40 text-muted-foreground gap-4">
                        <div className="p-4 bg-background rounded-full">
                            <Key size={40} className="opacity-20" />
                        </div>
                        <p className="text-sm">
                            {searchQuery ? 'No passwords match your search' : 'No saved passwords yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        <AnimatePresence>
                            {filteredPasswords.map((p, index) => {
                                const key = getPasswordKey(p);
                                const isVisible = visiblePasswords[key];
                                const isCopied = copiedId === key;

                                return (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between p-4 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all group bg-card shadow-sm"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="p-2 bg-secondary rounded-lg shrink-0">
                                                <Globe className="text-muted-foreground" size={18} />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-semibold text-sm truncate">{p.domain}</span>
                                                <span className="text-[10px] text-muted-foreground truncate">{p.username}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <div className="text-right hidden sm:block">
                                                <span className={cn(
                                                    "text-xs font-mono",
                                                    isVisible ? "text-foreground" : "text-muted-foreground/30"
                                                )}>
                                                    {isVisible ? p.password : '••••••••'}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => toggleVisibility(key)}
                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                                                title={isVisible ? 'Hide password' : 'Show password'}
                                            >
                                                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>

                                            <button
                                                onClick={() => copyToClipboard(p.password, key)}
                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                                                title="Copy password"
                                            >
                                                {isCopied ? (
                                                    <Check size={14} className="text-green-500" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>

                                            <button
                                                onClick={() => handleDelete(p.domain, p.username)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete password"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            {passwords.length > 0 && (
                <div className="ml-7 pt-4 text-[10px] text-muted-foreground/50 flex items-center gap-2">
                    <Shield size={10} />
                    {passwords.length} password{passwords.length !== 1 ? 's' : ''} stored securely in your local vault
                </div>
            )}
        </div>
    );
};
