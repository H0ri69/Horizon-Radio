import React, { useState, useEffect, useRef } from 'react';
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

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in shadow-2xl">
            <div className="relative w-full max-w-md p-6 bg-[#1a1a1a]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                {/* Glow Effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] pointer-events-none"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <span>📞</span> Call The Studio
                </h2>
                <p className="text-white/50 text-sm mb-6">Request a song and chat live with the DJ.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">Your Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Alex"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium"
                            required
                        />
                    </div>

                    {/* Song Request */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">Request A Song (Optional)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={songQuery}
                                onChange={(e) => { setSongQuery(e.target.value); setSelectedSong(null); }}
                                placeholder="Search YouTube Music..."
                                className={`w-full bg-white/5 border ${selectedSong ? 'border-green-500/50' : 'border-white/10'} rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all pr-10`}
                            />
                            {selectedSong && (
                                <button
                                    type="button"
                                    onClick={handleClearSong}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                            )}
                            {isSearching && !selectedSong && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Dropdown */}
                        {dropdownOpen && suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                {suggestions.map((song) => (
                                    <button
                                        key={song.id}
                                        type="button"
                                        onClick={() => handleSelectSong(song)}
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        {song.cover ? (
                                            <img src={song.cover} alt="" className="w-10 h-10 rounded object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-lg">🎵</div>
                                        )}
                                        <div>
                                            <div className="text-white font-medium text-sm line-clamp-1">{song.title}</div>
                                            <div className="text-white/50 text-xs line-clamp-1">{song.artist}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Message Input */}
                    <div>
                        <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1">Message for DJ</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tell us why you picked this song..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none h-24"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                    >
                        <span>📞</span> Connect Call
                    </button>
                </form>
            </div>
        </div>
    );
};
