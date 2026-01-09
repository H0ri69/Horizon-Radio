import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, User, Music, MessageSquare,
    Search, Trash2, ShieldCheck, X,
    Play, Loader2, Smartphone, Mic
} from 'lucide-react';
import { SongSearchService } from '../services/songSearchService';
import { liveCallService } from '../services/liveCallService';
import { RemoteSocketSource } from '../services/RemoteSocketSource';
import { LocalMicSource } from '../services/liveCallService';

// Change for prod
const RELAY_URL = 'ws://127.0.0.1:8765';

interface CallModalProps {
    onClose: () => void;
    onSubmit: (data: { name: string; song: any; message: string; useRemote?: boolean; remoteSource?: RemoteSocketSource }) => void;
}

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
            staggerChildren: 0.05
        }
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
} as any;

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

export const CallModal: React.FC<CallModalProps> = ({ onClose, onSubmit }) => {
    // Mode State
    const [mode, setMode] = useState<'LOCAL' | 'REMOTE'>('LOCAL');

    // Shared State
    const [name, setName] = useState('');
    const [songQuery, setSongQuery] = useState('');
    const [message, setMessage] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSong, setSelectedSong] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Remote State
    const [hostId, setHostId] = useState('');
    const [remoteStatus, setRemoteStatus] = useState('OFFLINE');
    const [remoteSource, setRemoteSource] = useState<RemoteSocketSource | null>(null);
    const isSubmitting = useRef(false);

    // Initialize Host ID
    useEffect(() => {
        chrome.storage.local.get(['horisHostId'], (result) => {
            let id = result.horisHostId as string;
            if (!id) {
                // Determine a short user-friendly code (e.g. 3 chars - 3 chars)
                const segment = () => Math.random().toString(36).substring(2, 5).toUpperCase();
                id = `${segment()}-${segment()}`;
                chrome.storage.local.set({ horisHostId: id });
            }
            setHostId(id);
        });
    }, []);

    // Handle Remote Connection Logic when switching tabs
    useEffect(() => {
        if (mode === 'REMOTE' && hostId) {
            // Instantiate Source
            if (remoteSource) return;

            const source = new RemoteSocketSource(hostId, RELAY_URL, (status) => {
                setRemoteStatus(status);
            });
            
            // Auto Connect to WS
            source.connect(null as any, () => {}); 
            setRemoteSource(source);

            return () => {
                // Only disconnect if we are NOT submitting (transferring ownership)
                if (!isSubmitting.current) {
                    source.disconnect();
                }
                setRemoteSource(null);
            };
        }
    }, [mode, hostId]);


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
        isSubmitting.current = true;
        onSubmit({ 
            name, 
            song: selectedSong, 
            message,
            useRemote: mode === 'REMOTE',
            remoteSource: mode === 'REMOTE' && remoteSource ? remoteSource : undefined
        });
        onClose();
    };

    // Calculate if we can answer call (Remote needs a caller connected)
    const canAnswer = mode === 'LOCAL' || (mode === 'REMOTE' && remoteStatus.startsWith('CALLER:'));

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 font-sans">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 modal-backdrop"
                onClick={onClose}
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="glass-effect modal-container w-full max-w-[900px] max-h-[90vh] overflow-hidden rounded-3xl relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Fixed */}
                <div className="p-8 md:p-10 border-b border-white/5 flex justify-between items-center modal-header z-20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--ts-accent-color-alpha-10)] rounded-2xl border border-[var(--ts-accent-color-alpha-20)]">
                            <Phone className="w-8 h-8 text-[var(--ts-accent-color)]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Live Studio Call</h1>
                            <p className="text-base text-white/50">Enter the broadcast queue and request a track</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                    >
                        <X className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                    </button>
                </div>



                {/* Scrollable Content */}
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <form onSubmit={handleSubmit} className="p-10 md:p-14 space-y-16">

                        {/* 00 CALLER IDENTITY */}
                        <motion.section variants={itemVariants}>
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-8 flex items-center gap-3">
                                <User className="w-4 h-4 text-[var(--ts-accent-color)]" /> Caller Identity
                            </h2>
                            <div className="modal-section rounded-3xl p-8 border border-white/5 group focus-within:border-[var(--ts-accent-color-alpha-30)] transition-colors">
                                <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-4 ml-1">
                                    Broadcast Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[var(--ts-accent-color)] transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name..."
                                        className="w-full modal-input rounded-2xl p-4 pl-12 text-white placeholder-white/10 focus:outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </motion.section>

                        {/* 01 SONG REQUEST */}
                        <motion.section variants={itemVariants} className="relative">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-8 flex items-center gap-3">
                                <Music className="w-4 h-4 text-[var(--ts-accent-color)]" /> Song Request
                            </h2>
                            <div className="modal-section rounded-3xl p-8 border border-white/5 group focus-within:border-[var(--ts-accent-color-alpha-30)] transition-colors relative">
                                <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-4 ml-1">
                                    Search YouTube Music
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[var(--ts-accent-color)] transition-colors" />
                                    <input
                                        type="text"
                                        value={songQuery}
                                        onChange={(e) => { setSongQuery(e.target.value); setSelectedSong(null); }}
                                        placeholder="Track or Artist name..."
                                        className={`w-full modal-input transition-all rounded-2xl p-4 pl-12 text-white placeholder-white/10 focus:outline-none ${selectedSong ? 'border-green-500/50 ring-1 ring-green-500/30' : ''}`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        {selectedSong && (
                                            <button type="button" onClick={handleClearSong} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-red-400 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {isSearching && <Loader2 className="w-4 h-4 text-[var(--ts-accent-color)] animate-spin" />}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {dropdownOpen && suggestions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                            className="absolute top-full left-0 right-0 mt-4 modal-dropdown border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50 p-2"
                                        >
                                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                                {suggestions.map((song, i) => (
                                                    <motion.button
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        key={song.id}
                                                        type="button"
                                                        onClick={() => handleSelectSong(song)}
                                                        className="w-full text-left p-4 hover:bg-white/5 flex items-center gap-4 transition-colors rounded-2xl group"
                                                    >
                                                        {song.cover ? (
                                                            <img src={song.cover} alt="" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center"><Music className="w-5 h-5 text-white/20" /></div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-white font-bold text-sm truncate group-hover:text-[var(--ts-accent-color)] transition-colors uppercase tracking-tight">{song.title}</div>
                                                            <div className="text-white/40 text-[10px] font-black uppercase tracking-wider truncate">{song.artist}</div>
                                                        </div>
                                                        <div className="p-2 rounded-full border border-white/5 group-hover:border-[var(--ts-accent-color-alpha-30)] group-hover:bg-[var(--ts-accent-color-alpha-10)] transition-all">
                                                            <Play className="w-3 h-3 text-white/20 group-hover:text-[var(--ts-accent-color)]" fill="currentColor" />
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.section>

                        {/* 02 CONVERSATION */}
                        <motion.section variants={itemVariants}>
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-8 flex items-center gap-3">
                                <MessageSquare className="w-4 h-4 text-[var(--ts-accent-color)]" /> Conversation Starter
                            </h2>
                            <div className="modal-section rounded-3xl p-8 border border-white/5 group focus-within:border-[var(--ts-accent-color-alpha-30)] transition-colors">
                                <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-4 ml-1">
                                    Message for the DJ
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Tell the host why you're calling..."
                                    className="w-full h-32 modal-input rounded-2xl p-4 text-white placeholder-white/10 focus:outline-none transition-all resize-none"
                                />
                            </div>
                        </motion.section>

                        <motion.div variants={itemVariants} className="pt-6">
                            <button
                                type="submit"
                                className="shimmer w-full py-6 rounded-2xl text-xl font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-4 bg-[var(--ts-accent-color)] text-white shadow-[var(--ts-accent-color-alpha-20)]"
                            >
                                <Phone className="w-6 h-6 fill-current" />
                                Go Live Now
                            </button>
                        </motion.div>
                    </form>
                </div>
                {/* Footer - Fixed */}
                <div className="p-8 md:p-10 border-t border-white/5 modal-footer flex justify-between items-center z-20">
                    <div className="flex items-center gap-6">
                        <div className="font-mono text-[10px] font-black tracking-[0.4em] text-white/30 uppercase">STX-PROTOCOL-1.0</div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[var(--ts-accent-color-alpha-50)]" />
                            <span className="text-[10px] font-black text-[var(--ts-accent-color-alpha-70)] uppercase tracking-[0.2em]">End-to-End Encryption</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                        Studio Ready
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
