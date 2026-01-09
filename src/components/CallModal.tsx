import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, User, Music, MessageSquare,
    Search, Trash2, ShieldCheck, X,
    Play, Loader2, Smartphone, Mic,
    Radio, Wifi, CheckCircle2, QrCode
} from 'lucide-react';
import QRCode from "react-qr-code";
import { cn } from "@sglara/cn";
import { SongSearchService } from '../services/songSearchService';
import { RemoteSocketSource } from '../services/RemoteSocketSource';
import { URLS } from '../config';
import browser from "webextension-polyfill";

interface CallModalProps {
    onClose: () => void;
    onSubmit: (data: { name: string; song: any; message: string; useRemote?: boolean; remoteSource?: RemoteSocketSource }) => void;
}

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, scale: 1, 
        transition: { duration: 0.3, ease: "easeOut" } 
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export const CallModal: React.FC<CallModalProps> = ({ onClose, onSubmit }) => {
    // Layout State
    const [mode, setMode] = useState<'LOCAL' | 'REMOTE'>('LOCAL');
    
    // Shared Data State
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [selectedSong, setSelectedSong] = useState<any>(null);
    
    // Search State
    const [songQuery, setSongQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Remote State
    const [hostId, setHostId] = useState('');
    const [remoteStatus, setRemoteStatus] = useState('OFFLINE');
    const [remoteSource, setRemoteSource] = useState<RemoteSocketSource | null>(null);
    const [guestName, setGuestName] = useState<string | null>(null);
    const [guestMessage, setGuestMessage] = useState<string | null>(null); // Message from remote guest

    const isSubmitting = useRef(false);

    // 1. Initialize Host ID
    useEffect(() => {
        browser.storage.local.get(['horisHostId']).then((result) => {
            let id = result.horisHostId as string;
            if (!id) {
                const segment = () => Math.random().toString(36).substring(2, 5).toUpperCase();
                id = `${segment()}-${segment()}`;
                browser.storage.local.set({ horisHostId: id });
            }
            setHostId(id);
        });
    }, []);

    // 2. Manage Remote Source Connection
    useEffect(() => {
        let source: RemoteSocketSource | null = null;

        if (mode === 'REMOTE' && hostId) {
            // Check if we can reuse an existing one? 
            // For now, create new to ensure fresh state, 
            // but in a real app might want to persist in Context.
            source = new RemoteSocketSource(hostId, (status) => {
                setRemoteStatus(status);
                // Parse caller name if available in status string convention (e.g. CALLER_CONNECTED:Matt)
                if (status.startsWith('CALLER_CONNECTED:')) {
                    const caller = status.split(':')[1];
                    setGuestName(caller);
                } else if (status === 'WAITING_FOR_CALL') {
                    setGuestName(null);
                    setGuestMessage(null);
                }
            });

            // Listen for specific call request details (message)
            source.setCallRequestCallback((data) => {
                setGuestName(data.name);
                setGuestMessage(data.message);
                // Also update local form state to match
                setName(data.name);
                setMessage(data.message);
            });

            source.connect(null as any, () => {});
            setRemoteSource(source);
        }

        return () => {
             // If we aren't submitting, cleanup.
             if (!isSubmitting.current && source) {
                 source.disconnect();
             }
        };
    }, [mode, hostId]);

    // 3. Song Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (songQuery.length > 2 && !selectedSong) {
                setIsSearching(true);
                setIsDropdownOpen(true);
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
                setIsDropdownOpen(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [songQuery, selectedSong]);

    const handleSelectSong = (song: any) => {
        setSelectedSong(song);
        setSongQuery(song.title);
        setIsDropdownOpen(false);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        isSubmitting.current = true;
        
        // If Remote, user must be connected
        if (mode === 'REMOTE' && !guestName) return;

        onSubmit({
            name: mode === 'REMOTE' ? (guestName || name) : name,
            song: selectedSong,
            message: mode === 'REMOTE' ? (guestMessage || message) : message,
            useRemote: mode === 'REMOTE',
            remoteSource: mode === 'REMOTE' && remoteSource ? remoteSource : undefined
        });
        onClose();
    };

    // UI Helpers
    const isReadyToLive = 
        (mode === 'LOCAL' && name.trim() && message.trim()) ||
        (mode === 'REMOTE' && guestName);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center font-sans p-4 md:p-6 text-white">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                onClick={onClose}
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative bg-[#0A0A0A] w-full max-w-5xl h-[85vh] rounded-[2rem] border border-white/10 shadow-2xl flex overflow-hidden lg:flex-row flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* --- LEFT SIDEBAR (Navigation) --- */}
                <div className="w-full lg:w-72 bg-white/5 border-r border-white/5 p-6 flex flex-col gap-2">
                    <div className="mb-8 px-2 flex items-center gap-3 text-red-500">
                        <Radio className="w-6 h-6" />
                        <span className="font-black tracking-tighter text-lg text-white">LIVE STUDIO</span>
                    </div>

                    <button 
                         onClick={() => setMode('LOCAL')}
                         className={cn(
                             "w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 group relative overflow-hidden",
                             mode === 'LOCAL' ? "bg-white text-black font-bold" : "hover:bg-white/5 text-white/60"
                         )}
                    >
                        <Mic className={cn("w-5 h-5", mode === 'LOCAL' ? "text-red-500" : "text-white/40")} />
                        <span className="uppercase tracking-wider text-xs font-bold">Local Mic</span>
                        {mode === 'LOCAL' && <motion.div layoutId="active-tab" className="absolute right-4 w-2 h-2 rounded-full bg-red-500" />}
                    </button>

                    <button 
                         onClick={() => setMode('REMOTE')}
                         className={cn(
                             "w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 group relative overflow-hidden",
                             mode === 'REMOTE' ? "bg-white text-black font-bold" : "hover:bg-white/5 text-white/60"
                         )}
                    >
                        <Smartphone className={cn("w-5 h-5", mode === 'LOCAL' ? "text-white/40" : "text-blue-500")} />
                        <div className="flex flex-col">
                            <span className="uppercase tracking-wider text-xs font-bold">Remote Guest</span>
                            {/* Short Status */}
                            {mode === 'REMOTE' && remoteStatus.includes('CONNECTED') && (
                                <span className="text-[9px] text-green-600 font-bold leading-none mt-1">ACTIVE</span>
                            )}
                        </div>
                        {mode === 'REMOTE' && <motion.div layoutId="active-tab" className="absolute right-4 w-2 h-2 rounded-full bg-blue-500" />}
                    </button>

                    <div className="mt-auto px-4 py-6 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Instructions</div>
                        <p className="text-xs text-white/50 leading-relaxed">
                            {mode === 'LOCAL' ? "Use your computer's microphone to host the show. Best with headphones." : "Invite a guest to join via their smartphone using the dedicated web app."}
                        </p>
                    </div>
                </div>

                {/* --- RIGHT CONTENT AREA --- */}
                <div className="flex-1 flex flex-col h-full bg-[#050505]">
                    
                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
                        
                        <div className="max-w-2xl mx-auto space-y-12">
                        
                             {/* 1. REMOTE CONNECTION PANEL */}
                             {mode === 'REMOTE' && (
                                 <motion.div 
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center"
                                 >
                                     {!guestName ? (
                                        <>
                                            <div className="p-4 bg-white rounded-2xl shrink-0">
                                                {hostId ? (
                                                    <QRCode 
                                                        value={`${URLS.REMOTE_WEB_APP}?code=${hostId}`}
                                                        size={140}
                                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                        viewBox={`0 0 256 256`}
                                                    />
                                                ) : <Loader2 className="w-8 h-8 animate-spin text-black" />}
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3">
                                                    <Wifi className="w-3 h-3 animate-pulse" />
                                                    Listening on Relay
                                                </div>
                                                <h3 className="text-2xl font-bold mb-2">Invite Guest</h3>
                                                <p className="text-white/50 text-sm mb-6">Scan to join or enter code:</p>
                                                <div className="font-mono text-3xl font-bold tracking-widest text-blue-400 select-all cursor-pointer bg-black/30 p-4 rounded-xl border border-blue-500/30 inline-block">
                                                    {hostId || '....'}
                                                </div>
                                            </div>
                                        </>
                                     ) : (
                                         // CONNECTED STATE
                                         <div className="w-full flex flex-col items-center text-center py-4">
                                             <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-2xl shadow-green-500/20">
                                                 <Smartphone className="w-10 h-10 text-black" />
                                             </div>
                                             <h3 className="text-3xl font-bold mb-2">{guestName}</h3>
                                             <div className="inline-flex items-center gap-2 text-green-400 font-bold uppercase track-widest text-xs rounded-full bg-green-500/10 px-4 py-1.5 border border-green-500/20">
                                                 <CheckCircle2 className="w-3 h-3" /> Connected
                                             </div>
                                             {guestMessage && (
                                                 <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10 w-full max-w-md">
                                                     <div className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Topic</div>
                                                     <p className="text-lg italic font-medium text-white/80">"{guestMessage}"</p>
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </motion.div>
                             )}

                             {/* 2. SHARED FORM ELEMENTS */}
                             
                             {/* Song Request (Always Visible) */}
                             <div className="space-y-4">
                                 <label className="text-xs font-black uppercase tracking-widest text-white/30 ml-1 block">Context / Song Request</label>
                                 <div className="relative group z-30">
                                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-white transition-colors" />
                                     <input 
                                         type="text"
                                         value={songQuery}
                                         onChange={(e) => { setSongQuery(e.target.value); setSelectedSong(null); }}
                                         placeholder="Search for a track (Optional contextual backgroun)..."
                                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pl-14 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium"
                                     />
                                     {isSearching && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />}
                                     
                                     {/* Suggestions Dropdown */}
                                     {isDropdownOpen && suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                            {suggestions.map((song) => (
                                                <button
                                                    key={song.id}
                                                    onClick={() => handleSelectSong(song)}
                                                    className="w-full text-left p-4 hover:bg-white/5 flex items-center gap-4 border-b border-white/5 last:border-0 transition-colors"
                                                >
                                                    <img src={song.cover} className="w-10 h-10 rounded-lg object-cover bg-white/5" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm truncate">{song.title}</div>
                                                        <div className="text-xs text-white/40 truncate">{song.artist}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                     )}
                                 </div>
                             </div>

                             {/* Local Mode Fields (Hidden in Remote Checked State) */}
                             {mode === 'LOCAL' && (
                                <div className="space-y-4 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                             <label className="text-xs font-black uppercase tracking-widest text-white/30 ml-1 block">Host Name</label>
                                             <input 
                                                value={name} onChange={(e) => setName(e.target.value)}
                                                placeholder="Your Name"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all"
                                             />
                                        </div>
                                        <div className="space-y-4">
                                             <label className="text-xs font-black uppercase tracking-widest text-white/30 ml-1 block">Topic / Prompt</label>
                                             <input 
                                                value={message} onChange={(e) => setMessage(e.target.value)}
                                                placeholder="What's this break about?"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all"
                                             />
                                        </div>
                                    </div>
                                </div>
                             )}

                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-8 border-t border-white/5 bg-[#080808] flex justify-between items-center">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-white/5 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                            Cancel
                        </button>

                        <button
                            onClick={() => handleSubmit()}
                            disabled={!isReadyToLive}
                            className={cn(
                                "px-10 py-5 rounded-2xl flex items-center gap-3 font-black uppercase tracking-[0.2em] transition-all shadow-xl",
                                isReadyToLive 
                                  ? "bg-white text-black hover:scale-105 shadow-white/10" 
                                  : "bg-white/5 text-white/20 cursor-not-allowed"
                            )}
                        >
                            <Phone className={cn("w-5 h-5", isReadyToLive ? "fill-current" : "")} />
                            {mode === 'REMOTE' ? 'Accept & Go Live' : 'Go Live Now'}
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>,
        document.body
    );
};
