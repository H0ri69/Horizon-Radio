import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from "react-dom";
import { SongSearchService } from '../services/songSearchService';

interface CallModalProps {
    onClose: () => void;
    onSubmit: (name: string, message: string, song: any | null) => void;
}

export const CallModal: React.FC<CallModalProps> = ({ onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [songQuery, setSongQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSong, setSelectedSong] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (songQuery.length > 2 && !selectedSong) {
                setIsSearching(true);
                const results = await SongSearchService.search(songQuery);
                setSuggestions(results);
                setIsSearching(false);
                setDropdownOpen(true);
            } else {
                setSuggestions([]);
                setDropdownOpen(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [songQuery, selectedSong]);

    const handleSelectSong = (song: any) => {
        setSelectedSong(song);
        setSongQuery(`${song.title} - ${song.artist}`);
        setDropdownOpen(false);
    };

    const handleClearSong = () => {
        setSelectedSong(null);
        setSongQuery('');
        setSuggestions([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit(name, message, selectedSong);
        onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 font-sans"
            onClick={onClose}
        >
            <div
                className="bg-background w-full max-w-[900px] max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: "#09090b", color: "#FAFAFA" }}
            >
                {/* Close Button UI - Same as Settings */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-3 rounded-full hover:bg-white/10 transition-colors z-10"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-70"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className="p-10 md:p-14 space-y-12">
                    {/* Header - Same as Settings */}
                    <header className="flex justify-between items-center pb-8 border-b border-white/5">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Live Call</h1>
                            <p className="text-lg text-white/50">
                                Connect with the DJ and request a song
                            </p>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-12">
                        {/* 00 CALLER IDENTITY */}
                        <section>
                            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                                <span className="text-indigo-400 font-mono text-base opacity-80">00</span> Your Identity
                            </h2>
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                <label className="block text-sm font-medium text-white/70 mb-3">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Alex"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-base focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-white/20"
                                    required
                                />
                            </div>
                        </section>

                        {/* 01 SONG REQUEST */}
                        <section>
                            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                                <span className="text-indigo-400 font-mono text-base opacity-80">01</span> Song Request
                            </h2>
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 relative">
                                <label className="block text-sm font-medium text-white/70 mb-3">
                                    Search YouTube Music
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={songQuery}
                                        onChange={(e) => { setSongQuery(e.target.value); setSelectedSong(null); }}
                                        placeholder="Search for a track..."
                                        className={`w-full bg-black/40 border ${selectedSong ? 'border-green-500/50' : 'border-white/10'} rounded-xl p-4 text-white text-base focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-white/20 pr-12`}
                                    />
                                    {selectedSong && (
                                        <button
                                            type="button"
                                            onClick={handleClearSong}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 hover:text-white transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                    )}
                                    {isSearching && !selectedSong && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Dropdown - Styled like Settings menu items */}
                                {dropdownOpen && suggestions.length > 0 && (
                                    <div className="mt-4 bg-black/60 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                        {suggestions.map((song) => (
                                            <button
                                                key={song.id}
                                                type="button"
                                                onClick={() => handleSelectSong(song)}
                                                className="w-full text-left px-4 py-4 hover:bg-white/10 flex items-center gap-4 transition-colors border-b border-white/5 last:border-0"
                                            >
                                                {song.cover ? (
                                                    <img src={song.cover} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-lg">🎵</div>
                                                )}
                                                <div>
                                                    <div className="text-white font-medium text-base line-clamp-1">{song.title}</div>
                                                    <div className="text-white/40 text-sm line-clamp-1">{song.artist}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 02 CONVERSATION */}
                        <section>
                            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                                <span className="text-indigo-400 font-mono text-base opacity-80">02</span> Conversation
                            </h2>
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                <label className="block text-sm font-medium text-white/70 mb-3">
                                    Message for the DJ
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Tell the DJ why you're calling..."
                                    className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white text-base focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-white/20 resize-none"
                                />
                            </div>
                        </section>

                        <div className="pt-6">
                            <button
                                type="submit"
                                className="w-full py-5 rounded-2xl text-xl font-bold bg-white text-black hover:bg-white/90 border-white shadow-lg shadow-white/10 transition-all active:scale-[0.98]"
                            >
                                CALL STUDIO NOW
                            </button>
                        </div>
                    </form>

                    <footer className="pt-8 border-t border-white/5 flex justify-between items-center text-sm text-white/30">
                        <div className="font-mono uppercase">Live Call System v1.0</div>
                        <div className="font-medium text-indigo-400/50 uppercase tracking-widest">Encrypted Connection</div>
                    </footer>
                </div>
            </div>
        </div>,
        document.body
    );
};
