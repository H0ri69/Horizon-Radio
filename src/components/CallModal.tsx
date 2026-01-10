import { cn } from "@sglara/cn";
import { AnimatePresence, motion } from "framer-motion";
import {
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Music,
  Phone,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { RemoteSocketSource } from "../services/remoteSocketSource";
import { SongSearchService } from "../services/songSearchService";
import { logger } from "@/utils/Logger";

interface CallModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    song: any;
    message: string;
    useRemote?: boolean;
    remoteSource?: RemoteSocketSource;
  }) => void;
  getRemoteSource?: () => RemoteSocketSource | null;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.05,
    },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
} as any;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const CallModal: React.FC<CallModalProps> = ({ onClose, onSubmit, getRemoteSource }) => {
  // Mode State
  const [mode, setMode] = useState<"LOCAL" | "REMOTE">("LOCAL");

  // Shared State
  const [name, setName] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Remote State
  const [hostId, setHostId] = useState("");
  const [remoteStatus, setRemoteStatus] = useState("OFFLINE");
  const [remoteSource, setRemoteSource] = useState<RemoteSocketSource | null>(null);
  const isSubmitting = useRef(false);

  // Initialize Host ID and Listeners
  useEffect(() => {
    // 1. Get Host ID
    chrome.storage.local.get(["horisHostId"], (result) => {
      let id = result.horisHostId as string;
      setHostId(id);
    });

    // 2. Attach to existing Remote Source if available
    const source = getRemoteSource ? getRemoteSource() : null;
    if (source) {
      setRemoteSource(source);

      // Define Listeners
      const statusListener = (status: string) => {
        setRemoteStatus(status);
        if (status.startsWith("CALLER:")) {
          setMode("REMOTE");
        }
      };

      const callListener = (data: { name: string; message: string }) => {
        setName(data.name);
        setMessage(data.message);
        setMode("REMOTE");
      };

      // Subscribe
      source.addStatusListener(statusListener);
      source.addCallRequestListener(callListener);

      // Cleanup: Unsubscribe
      return () => {
        source.removeStatusListener(statusListener);
        source.removeCallRequestListener(callListener);
        setRemoteSource(null);
      };
    }
  }, [getRemoteSource]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (songQuery.length > 2 && !selectedSong) {
        setIsSearching(true);
        setDropdownOpen(true);
        try {
          const results = await SongSearchService.search(songQuery);
          setSuggestions(results);
        } catch (error) {
          logger.error("CallModal: Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        // Only auto-close if query is too short
        if (songQuery.length <= 2) {
          setDropdownOpen(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [songQuery, selectedSong]);

  // Handle Suggestion Behavior
  const handleBlur = () => {
    // Small delay so that a click on a suggestion can still register
    setTimeout(() => setDropdownOpen(false), 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) setDropdownOpen(true);
  };

  const handleSelectSong = (song: any) => {
    setSelectedSong(song);
    setSongQuery(song.title);
    setDropdownOpen(false);
  };

  const handleClearSong = () => {
    setSelectedSong(null);
    setSongQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isSubmitting.current = true;
    onSubmit({
      name,
      song: selectedSong,
      message,
      useRemote: mode === "REMOTE",
      remoteSource: mode === "REMOTE" && remoteSource ? remoteSource : undefined,
    });
    onClose();
  };

  // Calculate if we can answer call (Remote needs a caller connected)
  const canAnswer = mode === "LOCAL" || (mode === "REMOTE" && remoteStatus.startsWith("CALLER:"));

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
        className="glass-effect modal-container w-full max-w-[1100px] max-h-[90vh] overflow-hidden rounded-3xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="p-8 md:p-10 border-b border-white/5 flex justify-between items-center modal-header z-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--ts-accent-color-alpha-10)] rounded-2xl border border-[var(--ts-accent-color-alpha-20)]">
              <Phone className="w-8 h-8 text-[var(--ts-accent-color)]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                Live Studio Call
              </h1>
              <p className="text-base text-white/50">
                Enter the broadcast queue and request a track
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mode Indicator */}
            <div
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                mode === "REMOTE"
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                  : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              {mode === "REMOTE" ? "Remote Source Active" : "Local Microphone"}
            </div>

            <button
              onClick={onClose}
              className="p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
            >
              <X className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="p-10 md:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* LEFT COLUMN - MANUAL INPUT */}
              <div className="space-y-10">
                {/* 00 CALLER IDENTITY */}
                <motion.section variants={itemVariants}>
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-3">
                    <User className="w-4 h-4 text-[var(--ts-accent-color)]" /> Caller Identity
                  </h2>
                  <div className="modal-section rounded-3xl p-6 border border-white/5 group focus-within:border-[var(--ts-accent-color-alpha-30)] transition-colors">
                    <label className="block text-xs font-black uppercase tracking-widest text-white/70 mb-3 ml-1">
                      Broadcast Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[var(--ts-accent-color)] transition-colors" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name..."
                        className="w-full modal-input rounded-2xl p-3 pl-12 text-white placeholder-white/40 focus:outline-none transition-all"
                        required={mode === "LOCAL"} // Only required if manual
                      />
                    </div>
                  </div>
                </motion.section>

                {/* 01 SONG REQUEST */}
                <motion.section variants={itemVariants} className="relative">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-3">
                    <Music className="w-4 h-4 text-[var(--ts-accent-color)]" /> Song Request
                  </h2>
                  <div
                    ref={searchContainerRef}
                    className="modal-section rounded-3xl p-6 border border-white/5 group focus-within:border-[var(--ts-accent-color-alpha-30)] transition-colors relative"
                  >
                    <label className="block text-xs font-black uppercase tracking-widest text-white/70 mb-3 ml-1">
                      Search YouTube Music
                    </label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[var(--ts-accent-color)] transition-colors" />
                      <input
                        type="text"
                        value={songQuery}
                        onChange={(e) => {
                          setSongQuery(e.target.value);
                          setSelectedSong(null);
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Track or Artist name..."
                        className={cn(
                          "w-full modal-input transition-all rounded-2xl p-3 pl-12 text-white placeholder-white/40 focus:outline-none",
                          selectedSong && "border-green-500/50 ring-1 ring-green-500/30"
                        )}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {selectedSong && (
                          <button
                            type="button"
                            onClick={handleClearSong}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isSearching && (
                          <Loader2 className="w-4 h-4 text-[var(--ts-accent-color)] animate-spin" />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {dropdownOpen && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          className="absolute top-full left-0 right-0 mt-4 modal-dropdown bg-[#121214] border border-white/20 rounded-3xl shadow-2xl overflow-hidden z-50 p-2 backdrop-blur-3xl"
                        >
                          <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {suggestions.map((song, i) => (
                              <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                key={song.id}
                                type="button"
                                onClick={() => handleSelectSong(song)}
                                className="w-full text-left p-3 hover:bg-white/10 flex items-center gap-4 transition-colors rounded-2xl group"
                              >
                                {song.cover ? (
                                  <img
                                    src={song.cover}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-cover shadow-lg"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Music className="w-4 h-4 text-white/20" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-bold text-sm truncate group-hover:text-[var(--ts-accent-color)] transition-colors uppercase tracking-tight">
                                    {song.title}
                                  </div>
                                  <div className="text-white/60 text-[10px] font-black uppercase tracking-wider truncate">
                                    {song.artist} {song.album ? `• ${song.album}` : ""}
                                  </div>
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
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-[var(--ts-accent-color)]" /> Conversation
                    Starter
                  </h2>
                  <div className="modal-section rounded-3xl p-6 border border-white/5 group focus-within:border-[var(--ts-accent-color-alpha-30)] transition-colors">
                    <label className="block text-xs font-black uppercase tracking-widest text-white/70 mb-3 ml-1">
                      Message for the DJ
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell the host why you're calling..."
                      className="w-full h-32 modal-input rounded-2xl p-4 text-white placeholder-white/40 focus:outline-none transition-all resize-none"
                    />
                  </div>
                </motion.section>
              </div>

              {/* RIGHT COLUMN - REMOTE CONNECT */}
              <div className="space-y-10">
                <motion.section variants={itemVariants} className="h-full flex flex-col">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-6 flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-[var(--ts-accent-color)]" /> Remote Access
                  </h2>
                  <div className="modal-section rounded-3xl p-8 border border-white/5 flex-1 flex flex-col items-center justify-center bg-white/5 text-center relative overflow-hidden">
                    {/* Connection Status Indicator */}
                    <div
                      className={`absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
                                            ${
                                              remoteStatus.startsWith("CALLER:")
                                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                                : "bg-white/5 border-white/10 text-white/40"
                                            }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          remoteStatus.startsWith("CALLER:")
                            ? "bg-green-500 animate-pulse"
                            : "bg-white/40"
                        }`}
                      />
                      {remoteStatus.startsWith("CALLER:")
                        ? "Guest Connected"
                        : "Waiting for Device"}
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-xl shadow-2xl mb-8 mt-12">
                      <div className="w-48 h-48">
                        {hostId && (
                          <QRCode
                            value={`https://horizon.matejpesl.cz/?code=${hostId}`}
                            size={256}
                            style={{ height: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                            level="L"
                          />
                        )}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">Scan to Connect</h3>
                    <p className="text-white/50 text-sm mb-6 max-w-[80%]">
                      Use your phone to fill out your details and join the call remotely with
                      end-to-end audio.
                    </p>

                    {/* Link */}
                    <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-xl border border-white/5 w-full max-w-[280px]">
                      <LinkIcon className="w-4 h-4 text-[var(--ts-accent-color)] shrink-0" />
                      <a
                        href={`https://horizon.matejpesl.cz/?code=${hostId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-[var(--ts-accent-color)] hover:underline truncate"
                      >
                        horizon.matejpesl.cz
                      </a>
                    </div>

                    {/* Encryption Code Display */}
                    <div className="mt-8 text-center pb-8">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">
                        Secure Link ID
                      </div>
                      <div className="font-mono text-xl text-white/80 tracking-widest">
                        {hostId}
                      </div>
                    </div>
                  </div>
                </motion.section>
              </div>
            </div>

            <motion.div variants={itemVariants} className="pt-8 border-t border-white/5 mt-8">
              <button
                type="submit"
                disabled={!canAnswer && mode === "REMOTE"} // Disable if remote mode but no caller
                className={`shimmer w-full py-6 rounded-2xl text-xl font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-4  shadow-[var(--ts-accent-color-alpha-20)]
                                    ${
                                      !canAnswer && mode === "REMOTE"
                                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                                        : "bg-[var(--ts-accent-color)] text-white"
                                    }
                                `}
              >
                <Phone className="w-6 h-6 fill-current" />
                {mode === "REMOTE" ? "Accept Remote Call" : "Go Live (Local Mic)"}
              </button>
            </motion.div>
          </form>
        </div>
        {/* Footer - Fixed */}
        <div className="p-8 md:p-10 border-t border-white/5 modal-footer flex justify-between items-center z-20">
          <div className="flex items-center gap-6">
            <div className="font-mono text-[10px] font-black tracking-[0.4em] text-white/30 uppercase">
              STX-PROTOCOL-1.0
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--ts-accent-color-alpha-50)]" />
              <span className="text-[10px] font-black text-[var(--ts-accent-color-alpha-70)] uppercase tracking-[0.2em]">
                End-to-End Encryption
              </span>
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
