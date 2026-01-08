import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Settings, Radio, Globe, Mic,
  Palette, Zap, Cpu, Key, AlertTriangle,
  ChevronDown, CheckCircle2, Sliders, Trash2
} from "lucide-react";
import { DJStyle, VOICE_PROFILES } from "../config";
import type { AppLanguage } from "../types";
import { VoiceCard } from "./settings/VoiceCard";
import { SettingsSection } from "./settings/SettingsSection";
import { SettingsCard } from "./settings/SettingsCard";
import { SettingsToggle, SettingsSlider, SettingsInput, SettingsTextArea } from "./settings/SettingsControls";

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
        className="absolute inset-0 modal-backdrop bg-black/60"
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
            <SettingsSection icon={Globe} title="Language & Region">
              <div className="grid grid-cols-3 gap-5">
                {[
                  { code: "en", label: "English", sub: "US/UK", icon: "🇺🇸" },
                  { code: "cs", label: "Czech", sub: "Čeština", icon: "🇨🇿" },
                  { code: "ja", label: "Japanese", sub: "日本語", icon: "🇯🇵" },
                ].map((lang) => (
                  <SettingsCard
                    key={lang.code}
                    selected={(settings as any).language === lang.code}
                    onClick={() => saveSettings({ ...settings, language: lang.code as any })}
                    label={lang.label}
                    subLabel={lang.sub}
                    icon={lang.icon}
                  />
                ))}
              </div>
            </SettingsSection>

            {/* 01 VOICE MODEL */}
            <SettingsSection icon={Mic} title="Primary Host Profile">
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
            </SettingsSection>

            {/* 02 BROADCAST STYLE */}
            <SettingsSection icon={Radio} title="Broadcast Character">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6">
                {Object.values(DJStyle).map((styleLabel: any) => (
                  <SettingsCard
                    key={styleLabel}
                    selected={settings.djStyle === styleLabel}
                    onClick={() => saveSettings({ ...settings, djStyle: styleLabel })}
                    label={styleLabel}
                    labelClassName="text-md"
                    className="py-4 px-6 flex items-center justify-center text-center font-bold"
                  />
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
                    <SettingsTextArea 
                      value={settings.customStylePrompt || ""}
                      onChange={(val) => saveSettings({ ...settings, customStylePrompt: val })}
                      placeholder="Define personality (e.g., 'Sarcastic AI from the 80s')..."
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </SettingsSection>

            {/* 02b BROADCAST VARIETY */}
            <SettingsSection icon={Sliders} title="Content Density">
              <SettingsSlider
                label="Message Duration"
                description="Balanced between short intros and long trivia bits."
                value={settings.longMessageProbability ?? 0.5}
                onChange={(val) => saveSettings({ ...settings, longMessageProbability: val })}
              />
            </SettingsSection>

            {/* 03 DUAL DJ MODE */}
            <SettingsSection icon={Zap} title="Interactive Systems">
              <SettingsToggle
                label="Enable Co-Host (Dual DJ)"
                description="Banter and conversations between two voices"
                enabled={settings.dualDjMode || false}
                onChange={(enabled) => saveSettings({ ...settings, dualDjMode: enabled })}
                icon={<Radio className="w-6 h-6" />}
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
              </SettingsToggle>
            </SettingsSection>

            {/* 04 VISUALS */}
            <SettingsSection icon={Palette} title="Visual Atmosphere">
              <div className="grid grid-cols-2 gap-5">
                {["Standard", "Apple Music"].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => saveSettings({ ...settings, visualTheme: theme })}
                    className={`relative p-8 rounded-3xl border transition-all duration-300 group overflow-hidden text-left
                                            ${(settings as any).visualTheme === theme
                        ? (theme === "Apple Music"
                          ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/50 text-white shadow-xl"
                          : "bg-indigo-500/10 border-indigo-500/50 text-white ring-1 ring-indigo-500/50 shadow-xl")
                        : "modal-section border-white/5 text-white/60 hover:border-white/10 hover:bg-white/10"
                      }`}
                  >
                    <div className="relative z-10">
                      <div className="font-bold text-xl mb-1">{theme}</div>
                      <div className="text-base opacity-50">Studio Color Palette</div>
                    </div>
                  </button>
                ))}
              </div>
            </SettingsSection>

            {/* 05 MODEL SELECTION - REFACTORED */}
            <SettingsSection icon={Cpu} title="LLM Settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Script Generation */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] block ml-1">Script Generation</label>
                  <div className="grid grid-cols-2 gap-3">
                    <SettingsCard
                        selected={settings.textModel === "FLASH"}
                        onClick={() => saveSettings({ ...settings, textModel: "FLASH" })}
                        label="Gemini Flash"
                        subLabel="Standard"
                        className="py-3 px-4"
                    />
                    <SettingsCard
                        selected={settings.textModel === "PRO"}
                        onClick={() => saveSettings({ ...settings, textModel: "PRO" })}
                        label="Gemini Pro"
                        subLabel="Reasoning"
                        className="py-3 px-4"
                    />
                  </div>
                </div>

                {/* TTS Engine */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] block ml-1">Voice Generation (TTS)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <SettingsCard
                        selected={settings.ttsModel === "FLASH"}
                        onClick={() => saveSettings({ ...settings, ttsModel: "FLASH" })}
                        label="Gemini Flash"
                        subLabel="Standard"
                        className="py-3 px-4"
                    />
                    <SettingsCard
                        selected={settings.ttsModel === "PRO"}
                        onClick={() => saveSettings({ ...settings, ttsModel: "PRO" })}
                        label="Gemini Pro"
                        subLabel="HD Voice"
                        className="py-3 px-4"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                <p className="text-xs text-white/60 leading-relaxed font-medium">
                  <span className="text-white">Pro Models</span> offer richer personality and nuance, but may take longer to generate.
                </p>
              </div>
            </SettingsSection>

            {/* 06 API CONFIGURATION */}
            <SettingsSection icon={Key} title="Secure Keys">
              <SettingsInput
                label="Google Gemini API Credential"
                value={settings.apiKey || ""}
                onChange={(val) => saveSettings({ ...settings, apiKey: val })}
                placeholder="••••••••••••••••••••••••••••"
                type="password"
                icon={<Key className="w-5 h-5 text-indigo-400/50" />}
                footer={
                  <div className="flex justify-between items-center mt-6">
                    <div className="flex items-center gap-2 text-[10px] text-white/50 font-bold uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" /> Fully Encrypted Locally
                    </div>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs font-bold transition-colors">
                      Acquire New API Key →
                    </a>
                  </div>
                }
              />
            </SettingsSection>

            {/* 07 DEBUG SETTINGS */}
            <motion.section variants={containerVariants} className="pt-12 border-t border-white/5">
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
                        <div className="text-lg text-white/60 mt-1 font-medium">Bypass voice generation for text-only debugging</div>
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
                      
                       <SettingsSlider 
                        label="Trigger Schedule"
                        description=""
                        value={settings.debug?.triggerPoint || 0.25}
                        onChange={(val) => saveSettings({ ...settings, debug: { ...settings.debug!, triggerPoint: val } })}
                        min={0.1}
                        max={0.9}
                        step={0.05}
                       />
                    </div>
                  </section>

                  {/* Call History Limit */}
                  <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">Live Call Memory</h3>
                    <SettingsSlider 
                        label="Caller History Limit"
                        description="How many callers the DJ remembers"
                        value={settings.debug?.callHistoryLimit || 5}
                        onChange={(val) => saveSettings({ ...settings, debug: { ...settings.debug!, callHistoryLimit: val } })}
                        min={1}
                        max={15}
                        step={1}
                        formatValue={(val) => val.toString()}
                       />
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
