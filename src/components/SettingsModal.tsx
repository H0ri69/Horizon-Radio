import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Settings, Radio, Globe, Mic,
  Palette, Zap, Cpu, Key, AlertTriangle,
  ChevronDown, CheckCircle2, Sliders, Volume2, Loader2, Check, Trash2, Play, Square
} from "lucide-react";
import { DJStyle, VOICE_PROFILES } from "../config";
import type { AppLanguage } from "../types";

interface Settings {
  enabled: boolean;
  djVoice: string;
  djStyle: any;
  customStylePrompt?: string;
  visualizerEnabled?: boolean;
  language: string;
  dualDjMode?: boolean;
  secondaryDjVoice?: string;
  visualTheme?: string;
  apiKey?: string;
  longMessageProbability?: number;
  debug?: {
    enabledThemes: boolean[];
    skipTTS: boolean;
    forceTheme: number | null;
    verboseLogging: boolean;
    triggerPoint: number;
    callHistoryLimit: number;
  };
  textModel: "FLASH" | "PRO";
  ttsModel: "FLASH" | "PRO";
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.05 }
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
} as any;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

interface VoiceCardProps {
  profile: typeof VOICE_PROFILES[0];
  isSelected: boolean;
  onSelect: () => void;
  playingVoiceId: string | null;
  loadingVoiceId: string | null;
  cachedVoices: Set<string>;
  language: string;
  onTest: (voiceId: string) => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({
  profile, isSelected, onSelect, playingVoiceId, loadingVoiceId, cachedVoices, language, onTest
}) => {
  const isPlaying = playingVoiceId === profile.id;
  const isLoading = loadingVoiceId === profile.id;
  const isCached = cachedVoices.has(`${profile.id}_${language}`);

  return (
    <div
      className={`relative p-6 rounded-2xl transition-all duration-300 border overflow-hidden
        ${isSelected
          ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
        }`}
    >
      {/* Selectable area */}
      <button
        onClick={onSelect}
        className="w-full text-left"
      >
        <div className="flex justify-between items-center mb-4">
          <span className={`text-xl font-bold ${isSelected ? "text-white" : "text-white/60"}`}>
            {profile.personaNames[language as AppLanguage]}
          </span>
          <div className="flex items-center gap-2">
            {isCached && (
              <span className="text-[9px] px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 font-bold uppercase tracking-wider">
                Cached
              </span>
            )}
            {isSelected && (
              <CheckCircle2 className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.tags.map((tag) => (
            <span key={tag} className="bg-black/40 px-3 py-1 rounded-lg border border-white/5 text-[10px] uppercase font-bold tracking-widest text-white/60">
              {tag}
            </span>
          ))}
        </div>
      </button>

      {/* Play/Stop button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTest(profile.id);
        }}
        disabled={isLoading || (loadingVoiceId !== null && loadingVoiceId !== profile.id)}
        className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all
          ${isPlaying
            ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
            : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          }
          disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        ) : isPlaying ? (
          <><Square className="w-4 h-4" /> Stop</>
        ) : (
          <><Play className="w-4 h-4" /> Preview</>
        )}
      </button>
    </div>
  );
};

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    djVoice: "kore",
    djStyle: DJStyle.STANDARD,
    customStylePrompt: "",
    visualizerEnabled: true,
    language: "en",
    visualTheme: "Standard",
    dualDjMode: false,
    secondaryDjVoice: "sulafat",
    apiKey: "",
    longMessageProbability: 0.3,
    debug: {
      enabledThemes: [true, true, true, true, true, true],
      skipTTS: false,
      forceTheme: null,
      verboseLogging: false,
      triggerPoint: 0.25,
      callHistoryLimit: 5,
    },
    textModel: "FLASH",
    ttsModel: "FLASH",
  });
  const [status, setStatus] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [cachedVoices, setCachedVoices] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chrome.storage.local.get(null, (result) => {
      // Load settings
      if (result.horisFmSettings) {
        setSettings((prev) => ({ ...prev, ...(result.horisFmSettings as Settings) }));
      }
      
      // Load cached voice status
      const cached = new Set<string>();
      Object.keys(result).forEach(key => {
        if (key.startsWith("voiceTestCache_")) {
          // Format: voiceTestCache_VOICEID_LANG
          const parts = key.replace("voiceTestCache_", "");
          cached.add(parts);
        }
      });
      setCachedVoices(cached);
    });

    // Handle ESC key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onClose]);

  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    chrome.storage.local.set({ horisFmSettings: newSettings }, () => {
      setStatus("Saved");
      setTimeout(() => setStatus(""), 2000);
    });
  };

  const stopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  const testVoice = async (voiceId: string) => {
    // If this voice is already playing, stop it
    if (playingVoiceId === voiceId) {
      stopVoice();
      return;
    }
    
    // Stop any currently playing voice
    stopVoice();
    
    // Don't allow multiple loading at once
    if (loadingVoiceId) return;
    
    setLoadingVoiceId(voiceId);
    try {
      const response = await chrome.runtime.sendMessage({
        type: "TEST_VOICE",
        data: { voice: voiceId, language: settings.language }
      });
      if (response?.audio) {
        // Track if this voice was cached
        if (response.fromCache) {
          setCachedVoices(prev => new Set(prev).add(`${voiceId}_${settings.language}`));
        }
        
        const binaryString = atob(response.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/wav" });
        const audioEl = new Audio(URL.createObjectURL(blob));
        audioRef.current = audioEl;
        setPlayingVoiceId(voiceId);
        setLoadingVoiceId(null);
        
        audioEl.onended = () => {
          setPlayingVoiceId(null);
          audioRef.current = null;
        };
        audioEl.onerror = () => {
          setPlayingVoiceId(null);
          audioRef.current = null;
        };
        audioEl.play();
      } else {
        setLoadingVoiceId(null);
      }
    } catch (e) {
      console.error("Test voice failed", e);
      setLoadingVoiceId(null);
    }
  };

  const clearVoiceCache = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "CLEAR_VOICE_CACHE" });
      if (response?.cleared !== undefined) {
        setStatus(`Cleared ${response.cleared} cached samples`);
        setTimeout(() => setStatus(""), 3000);
        setCachedVoices(new Set());
      }
    } catch (e) {
      console.error("Clear cache failed", e);
    }
  };

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
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Settings className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">System Settings</h1>
              <p className="text-base text-white/60">Configure your Hori-s.FM workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => saveSettings({ ...settings, enabled: !settings.enabled })}
              className={`shimmer flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 ${settings.enabled
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${settings.enabled ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />
              <span className="text-sm font-bold tracking-wider mr-2">
                {settings.enabled ? "ACTIVE" : "STANDBY"}
              </span>
            </button>

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
          <div className="p-10 md:p-14 space-y-16">

            {/* 00 LANGUAGE */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Globe className="w-4 h-4 text-indigo-400" /> Language & Region
              </h2>
              <div className="grid grid-cols-3 gap-5">
                {[
                  { code: "en", label: "English", sub: "US/UK", icon: "🇺🇸" },
                  { code: "cs", label: "Czech", sub: "Čeština", icon: "🇨🇿" },
                  { code: "ja", label: "Japanese", sub: "日本語", icon: "🇯🇵" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => saveSettings({ ...settings, language: lang.code as any })}
                    className={`relative p-6 rounded-2xl border transition-all duration-300 group modal-section
                                            ${(settings as any).language === lang.code
                        ? "bg-indigo-500/10 border-indigo-500/50 text-white ring-1 ring-indigo-500/50"
                        : "border-white/5 text-white/60 hover:border-white/10 hover:bg-white/10"
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-left leading-tight">
                        <div className="font-bold text-lg mb-1">{lang.label}</div>
                        <div className="text-xs opacity-50 font-mono uppercase tracking-widest">{lang.sub}</div>
                      </div>
                      <span className="text-2xl group-hover:scale-110 transition-transform">{lang.icon}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* 01 VOICE MODEL */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Mic className="w-4 h-4 text-indigo-400" /> Primary Host Profile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {VOICE_PROFILES.map((profile) => (
                  <VoiceCard
                    key={profile.id}
                    profile={profile}
                    isSelected={settings.djVoice === profile.id}
                    onSelect={() => saveSettings({ ...settings, djVoice: profile.id })}
                    playingVoiceId={playingVoiceId}
                    loadingVoiceId={loadingVoiceId}
                    cachedVoices={cachedVoices}
                    language={settings.language}
                    onTest={testVoice}
                  />
                ))}
              </div>
            </motion.section>

            {/* 02 BROADCAST STYLE */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Radio className="w-4 h-4 text-indigo-400" /> Broadcast Character
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6">
                {Object.values(DJStyle).map((styleLabel: any) => (
                  <button
                    key={styleLabel}
                    onClick={() => saveSettings({ ...settings, djStyle: styleLabel })}
                    className={`py-4 px-6 rounded-2xl text-sm font-bold transition-all border
                                            ${settings.djStyle === styleLabel
                        ? "bg-indigo-500/20 border-indigo-500/50 text-white ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10"
                        : "modal-section border-white/5 text-white/60 hover:text-white hover:border-white/10 hover:bg-white/10"
                      }`}
                  >
                    {styleLabel}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {settings.djStyle === DJStyle.CUSTOM && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="modal-section rounded-3xl p-6 border border-white/5">
                      <textarea
                        value={settings.customStylePrompt || ""}
                        onChange={(e) => saveSettings({ ...settings, customStylePrompt: e.target.value })}
                        placeholder="Define personality (e.g., 'Sarcastic AI from the 80s')..."
                        className="w-full h-32 modal-input border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* 02b BROADCAST VARIETY */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Sliders className="w-4 h-4 text-indigo-400" /> Content Density
              </h2>
              <div className="modal-section rounded-3xl p-8 border border-white/5">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <div className="text-white font-bold text-lg mb-1">Message Duration</div>
                    <div className="text-white/60 text-sm">Balanced between short intros and long trivia bits.</div>
                  </div>
                  <div className="font-mono text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 text-lg font-bold">
                    {Math.round((settings.longMessageProbability ?? 0.5) * 100)}%
                  </div>
                </div>

                <div className="relative group p-2">
                  <div className="absolute inset-x-0 h-1.5 modal-input-dark rounded-full overflow-hidden">
                    <motion.div
                      layout
                      className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      initial={false}
                      animate={{ width: `${(settings.longMessageProbability ?? 0.5) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={settings.longMessageProbability ?? 0.5}
                    onChange={(e) => saveSettings({ ...settings, longMessageProbability: parseFloat(e.target.value) })}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                  />
                  <motion.div
                    layout
                    className="absolute top-1/2 h-6 w-6 bg-white rounded-full shadow-2xl pointer-events-none -translate-y-1/2"
                    initial={false}
                    animate={{ left: `${(settings.longMessageProbability ?? 0.5) * 100}%` }}
                    style={{ marginLeft: "-12px" }}
                  />
                </div>
              </div>
            </motion.section>

            {/* 03 DUAL DJ MODE */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Zap className="w-4 h-4 text-indigo-400" /> Interactive Systems
              </h2>
              <div className={`rounded-3xl border transition-all duration-300 overflow-hidden ${settings.dualDjMode ? "bg-indigo-500/5 border-indigo-500/20" : "modal-section border-white/5"}`}>
                <div
                  className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => saveSettings({ ...settings, dualDjMode: !settings.dualDjMode })}
                >
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl border transition-colors ${settings.dualDjMode ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "modal-input-dark border-white/5 text-white/20"}`}>
                      <Radio className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-xl text-white">Enable Co-Host (Dual DJ)</div>
                      <div className="text-base text-white/60 mt-1 font-medium">Banter and conversations between two voices</div>
                    </div>
                  </div>
                  <div className={`w-14 h-8 rounded-full p-1 transition-colors ${settings.dualDjMode ? "bg-indigo-500" : "bg-white/10"}`}>
                    <motion.div layout className="w-6 h-6 rounded-full bg-white shadow-lg" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  </div>
                </div>

                <AnimatePresence>
                  {settings.dualDjMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-8 pb-8 pt-4 border-t border-white/5"
                    >
                      <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-6">Select Co-Host Persona</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {VOICE_PROFILES.filter((p) => p.id !== settings.djVoice).map((profile) => (
                          <VoiceCard
                            key={profile.id}
                            profile={profile}
                            isSelected={settings.secondaryDjVoice === profile.id}
                            onSelect={() => saveSettings({ ...settings, secondaryDjVoice: profile.id })}
                            playingVoiceId={playingVoiceId}
                            loadingVoiceId={loadingVoiceId}
                            cachedVoices={cachedVoices}
                            language={settings.language}
                            onTest={testVoice}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>

            {/* 04 VISUALS */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Palette className="w-4 h-4 text-indigo-400" /> Visual Atmosphere
              </h2>
              <div className="grid grid-cols-2 gap-5">
                {["Standard", "Apple Music"].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => saveSettings({ ...settings, visualTheme: theme })}
                    className={`relative p-8 rounded-3xl border transition-all duration-300 group overflow-hidden
                                            ${(settings as any).visualTheme === theme
                        ? (theme === "Apple Music"
                          ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/50 text-white shadow-xl"
                          : "bg-indigo-500/10 border-indigo-500/50 text-white ring-1 ring-indigo-500/50 shadow-xl")
                        : "modal-section border-white/5 text-white/60 hover:border-white/10 hover:bg-white/10"
                      }`}
                  >
                    <div className="relative z-10">
                      <div className="font-bold text-xl mb-1">{theme}</div>
                      <div className="text-sm opacity-50">Studio Color Palette</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* 05 MODEL SELECTION */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Cpu className="w-4 h-4 text-indigo-400" /> AI Computation Engines
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Text Engine */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] block ml-1">Script Generation</label>
                  <div className="flex modal-input-dark p-1.5 rounded-2xl border border-white/10">
                    {["FLASH", "PRO"].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => saveSettings({ ...settings, textModel: tier as any })}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${settings.textModel === tier
                          ? "bg-indigo-500 border border-indigo-400/50 text-white shadow-lg"
                          : "text-white/30 hover:text-white/50"
                          }`}
                      >
                        {tier === "FLASH" ? "Gemini Flash" : "Gemini Pro"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TTS Engine */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] block ml-1">Voice Generation (TTS)</label>
                  <div className="flex modal-input-dark p-1.5 rounded-2xl border border-white/10">
                    {["FLASH", "PRO"].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => saveSettings({ ...settings, ttsModel: tier as any })}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${settings.ttsModel === tier
                          ? "bg-indigo-500 border border-indigo-400/50 text-white shadow-lg"
                          : "text-white/30 hover:text-white/50"
                          }`}
                      >
                        {tier === "FLASH" ? "Gemini Flash" : "Gemini Pro"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                <p className="text-xs text-white/60 leading-relaxed font-medium">
                  <span className="text-white">Pro Models</span> offer richer personality and nuance, but may take longer to generate.
                </p>
              </div>
            </motion.section>

            {/* 06 API CONFIGURATION */}
            <motion.section variants={itemVariants}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60 mb-8 flex items-center gap-3">
                <Key className="w-4 h-4 text-indigo-400" /> Secure Keys
              </h2>
              <div className="modal-section rounded-3xl p-8 border border-white/5">
                <div className="mb-2">
                  <label className="block text-sm font-bold text-white/70 mb-4 ml-1">
                    Google Gemini API Credential
                  </label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="password"
                      value={settings.apiKey || ""}
                      onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
                      placeholder="••••••••••••••••••••••••••••"
                      className="w-full modal-input border border-white/10 rounded-2xl p-4 pl-12 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-6">
                    <div className="flex items-center gap-2 text-[10px] text-white/50 font-bold uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" /> Fully Encrypted Locally
                    </div>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs font-bold transition-colors">
                      Acquire New API Key →
                    </a>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* 07 DEBUG SETTINGS */}
            <motion.section variants={itemVariants} className="pt-12 border-t border-white/5">
              <details className="group">
                <summary className="text-sm font-black text-white/60 uppercase tracking-[0.3em] cursor-pointer list-none flex items-center justify-between group-open:text-red-400/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4" /> Laboratory Settings
                  </div>
                  <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" />
                </summary>

                <div className="mt-12 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* Skip TTS */}
                  <div className="flex items-center justify-between p-8 bg-red-500/5 border border-red-500/20 rounded-3xl">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-xl">Silent Scripting</div>
                        <div className="text-base text-white/60 mt-1 font-medium">Bypass voice generation for text-only debugging</div>
                      </div>
                    </div>
                    <button
                      onClick={() => saveSettings({ ...settings, debug: { ...settings.debug!, skipTTS: !settings.debug?.skipTTS } })}
                      className={`w-14 h-8 rounded-full p-1 transition-colors ${settings.debug?.skipTTS ? "bg-red-500" : "bg-white/10"}`}
                    >
                      <motion.div layout className="w-6 h-6 rounded-full bg-white transition-transform" />
                    </button>
                  </div>

                  {/* Manual Trigger */}
                  <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">Force Execution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent("HORIS_MANUAL_TRIGGER"))}
                        className="flex items-center justify-between p-6 bg-indigo-500 text-white rounded-3xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-500/20 group"
                      >
                        RUN MANIFEST NOW
                        <Zap className="w-6 h-6 group-hover:scale-125 transition-transform" />
                      </button>
                      <div className="p-6 modal-section border border-white/5 rounded-3xl flex flex-col justify-center">
                        <div className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-3">Trigger Schedule</div>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-black text-white">
                            {Math.round((settings.debug?.triggerPoint || 0.25) * 100)}%
                          </div>
                          <input
                            type="range" min="0.1" max="0.9" step="0.05"
                            value={settings.debug?.triggerPoint || 0.25}
                            onChange={(e) => saveSettings({ ...settings, debug: { ...settings.debug!, triggerPoint: parseFloat(e.target.value) } })}
                            className="w-32 accent-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Call History Limit */}
                  <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">Live Call Memory</h3>
                    <div className="p-6 modal-section border border-white/5 rounded-3xl">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <div className="text-white font-bold">Caller History Limit</div>
                          <div className="text-white/60 text-sm">How many callers the DJ remembers</div>
                        </div>
                        <div className="font-mono text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 text-lg font-bold">
                          {settings.debug?.callHistoryLimit || 5}
                        </div>
                      </div>
                      <input
                        type="range" min="1" max="15" step="1"
                        value={settings.debug?.callHistoryLimit || 5}
                        onChange={(e) => saveSettings({ ...settings, debug: { ...settings.debug!, callHistoryLimit: parseInt(e.target.value) } })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </section>

                  {/* Clear Voice Cache */}
                  <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">Voice Test Cache</h3>
                    <button
                      onClick={clearVoiceCache}
                      className="w-full flex items-center justify-center gap-3 p-6 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-3xl font-bold transition-all hover:bg-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Trash2 className="w-5 h-5" />
                      Clear Cached Voice Samples
                    </button>
                    <p className="text-xs text-white/50 text-center">Clears all stored test voices (regenerates on next use, max 30-day cache)</p>
                  </section>
                </div>
              </details>
            </motion.section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 md:p-10 border-t border-white/5 modal-footer flex justify-between items-center z-20">
          <div className="flex items-center gap-6">
            <div className="font-mono text-[10px] font-black tracking-[0.4em] text-white/60 uppercase">Core-v1.0.4-Stable</div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Network Protocol Active</span>
            </div>
          </div>

          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl"
              >
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs font-black text-green-400 uppercase tracking-widest">Saved</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
