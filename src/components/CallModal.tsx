import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, User, Music, MessageSquare,
    Search, Trash2, ShieldCheck, X,
    Loader2
} from 'lucide-react';
import { SongSearchService } from '../services/songSearchService';

interface CallModalProps {
    onClose: () => void;
    onSubmit: (data: { name: string; song: any; message: string }) => void;
}

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1, scale: 1,
        transition: {
            duration: 0.3,
            ease: "easeOut",
            staggerChildren: 0.1
        }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

export const CallModal: React.FC<CallModalProps> = ({ onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [songQuery, setSongQuery] = useState('');
    const [message, setMessage] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSong, setSelectedSong] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (songQuery.length > 2 && !selectedSong) {
                setIsSearching(true);
                setDropdownOpen(true);
                try {
                    const results = await SongSearchService.search(songQuery);
                    setSuggestions(results);
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSuggestions([]);
                setDropdownOpen(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [songQuery, selectedSong]);

    const handleSelectSong = (song: any) => {
        setSelectedSong(song);
        setSongQuery(song.title);
        setDropdownOpen(false);
    };

    const handleClearSong = () => {
        setSelectedSong(null);
        setSongQuery('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, song: selectedSong, message });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 modal-backdrop bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="glass-effect w-full max-w-[850px] overflow-hidden rounded-3xl relative flex flex-col shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-[var(--ts-accent-color)]/20 rounded-xl border border-[var(--ts-accent-color)]/30">
                            <Phone className="w-6 h-6 text-[var(--ts-accent-color)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white leading-none mb-1">Live Studio Call</h1>
                            <p className="text-sm text-white/50 font-medium">Request a track & join the broadcast</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-6 h-6 text-white/50 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto custom-scrollbar p-8">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Caller Identity */}
                        <motion.div variants={itemVariants} className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                                <User className="w-3.5 h-3.5" /> Identity
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name..."
                                    className="w-full bg-black/20 border border-white/10 focus:border-[var(--ts-accent-color)] rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--ts-accent-color)] transition-all modal-input"
                                    required
                                />
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[var(--ts-accent-color)] transition-colors" />
                            </div>
                        </motion.div>

                        {/* Song Request */}
                        <motion.div variants={itemVariants} className="space-y-3 relative z-20">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                                <Music className="w-3.5 h-3.5" /> Request
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={songQuery}
                                    onChange={(e) => { setSongQuery(e.target.value); setSelectedSong(null); }}
                                    placeholder="Search song or artist..."
                                    className={`w-full bg-black/20 border border-white/10 focus:border-[var(--ts-accent-color)] rounded-xl py-4 pl-12 pr-10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--ts-accent-color)] transition-all modal-input ${selectedSong ? '!border-green-500/50 !ring-green-500/20' : ''}`}
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[var(--ts-accent-color)] transition-colors" />
                                
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {selectedSong ? (
                                        <button type="button" onClick={handleClearSong} className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-red-400 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    ) : isSearching ? (
                                        <Loader2 className="w-4 h-4 text-[var(--ts-accent-color)] animate-spin" />
                                    ) : null}
                                </div>

                                <AnimatePresence>
                                    {dropdownOpen && suggestions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-[#0d0d0e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto custom-scrollbar"
                                        >
                                            {suggestions.map((song, i) => (
                                                <button
                                                    key={song.id}
                                                    type="button"
                                                    onClick={() => handleSelectSong(song)}
                                                    className="w-full text-left p-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    {song.cover ? (
                                                        <img src={song.cover} alt="" className="w-10 h-10 rounded-lg object-cover shadow-md" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Music className="w-4 h-4 text-white/20" /></div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white font-medium text-sm truncate">{song.title}</div>
                                                        <div className="text-white/40 text-xs truncate">{song.artist}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {/* Message - Full Width */}
                        <motion.div variants={itemVariants} className="md:col-span-2 space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                                <MessageSquare className="w-3.5 h-3.5" /> Message to DJ
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="What's on your mind? Tell us why you picked this track..."
                                className="w-full h-32 bg-black/20 border border-white/10 focus:border-[var(--ts-accent-color)] rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--ts-accent-color)] transition-all resize-none leading-relaxed modal-input"
                            />
                        </motion.div>

                        {/* Submit Button */}
                        <motion.div variants={itemVariants} className="md:col-span-2 pt-2">
                            <button
                                type="submit"
                                className="w-full py-5 rounded-xl text-lg font-bold uppercase tracking-widest bg-[var(--ts-accent-color)] text-white shadow-lg shadow-[var(--ts-accent-color)]/20 hover:shadow-[var(--ts-accent-color)]/40 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-3 border border-white/20 shimmer relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none mix-blend-overlay" />
                                <Phone className="w-5 h-5 fill-current" />
                                <span>Call Studio Now</span>
                            </button>
                        </motion.div>

                    </form>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-white/5 bg-black/20 flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-white/20">
                    <div className="flex items-center gap-4">
                        <span>STX-SECURE</span>
                        <div className="flex items-center gap-1.5 text-[var(--ts-accent-color)]/60">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Encrypted</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-white/40">Live</span>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
