import browser from "webextension-polyfill";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Settings, Radio, Globe, Mic,
  Palette, Zap, Cpu, Key, AlertTriangle,
  ChevronDown, CheckCircle2, Sliders, Trash2, Search, Shield, RotateCcw
} from "lucide-react";
import { DJStyle, VOICE_PROFILES, DEFAULT_SCHEDULER_SETTINGS, type SchedulerSettings } from "../config";
import { VoiceCard } from "./settings/VoiceCard";
import { SettingsSection } from "./settings/SettingsSection";
import { SettingsCard } from "./settings/SettingsCard";
import { SettingsToggle, SettingsSlider, SettingsInput, SettingsTextArea } from "./settings/SettingsControls";
import { cn } from "@sglara/cn";
import { searchAndPlayNextInPlace } from "../utils/ytmDomUtils";

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
  scheduler?: SchedulerSettings;
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
  protectTransitions?: boolean;
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
    scheduler: DEFAULT_SCHEDULER_SETTINGS,
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
    protectTransitions: true,
  });
  const [status, setStatus] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [cachedVoices, setCachedVoices] = useState<Set<string>>(new Set());
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [testSongQuery, setTestSongQuery] = useState("");
  const [testingSong, setTestingSong] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "advanced">("general");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    browser.storage.local.get(null).then((result) => {
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

      // Load Host ID
      if (result.horisHostId) {
        setSettings((prev) => ({ ...prev, horisHostId: result.horisHostId } as any));
      }
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
    browser.storage.local.set({ horisFmSettings: newSettings }).then(() => {
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
      const response = await browser.runtime.sendMessage({
        type: "TEST_VOICE",
        data: { voice: voiceId, language: settings.language }
      }) as any;
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
      const response = await browser.runtime.sendMessage({ type: "CLEAR_VOICE_CACHE" }) as any;
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
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                {activeTab === "general" ? "System Settings" : "Advanced Settings"}
              </h1>
              <p className="text-base text-white/80">
                {activeTab === "general"
                  ? "Configure your Horizon Radio workspace"
                  : "Fine-tune performance and integrations"}
              </p>
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

        {/* Tab Navigation */}
        <div className="px-10 py-4 border-b border-white/5 flex gap-2">
          <button
            onClick={() => setActiveTab("general")}
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-sm transition-all",
              activeTab === "general"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
            )}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("advanced")}
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-sm transition-all",
              activeTab === "advanced"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
            )}
          >
            Advanced
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <div className="p-10 md:p-14 space-y-16">

            {/* ==================== GENERAL TAB ==================== */}
            {activeTab === "general" && (<>

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

              {/* 03 INTERACTIVE SYSTEMS */}
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

            </>)}

            {/* ==================== ADVANCED TAB ==================== */}
            {activeTab === "advanced" && (<>

              {/* Playback Protection */}
              <SettingsSection icon={Shield} title="Playback Protection">
                <SettingsToggle
                  label="Protect DJ Transitions"
                  description="Prevent seeking into the last 15 seconds of a song"
                  enabled={settings.protectTransitions ?? true}
                  onChange={(enabled) => {
                    saveSettings({ ...settings, protectTransitions: enabled });
                    // Broadcast to inject.ts
                    window.dispatchEvent(new CustomEvent("HORIS_SEEK_PROTECTION_TOGGLE", { detail: { enabled } }));
                  }}
                  icon={<Shield className="w-6 h-6" />}
                />
              </SettingsSection>

              {/* Scheduler Settings */}
              <SettingsSection icon={Sliders} title="Scheduler Settings">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Segment Weights */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">📊 Segment Weights (Relative)</h3>
                    <SettingsSlider
                      label="Silence Weight"
                      description="How often to play no DJ intro"
                      value={settings.scheduler?.silenceWeight ?? 15}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), silenceWeight: val } })}
                      min={0}
                      max={30}
                      step={1}
                      formatValue={(val) => val.toString()}
                      className="p-5"
                    />
                    <SettingsSlider
                      label="Short Intro Weight"
                      description="Quick 1-2 sentence transitions"
                      value={settings.scheduler?.shortIntroWeight ?? 50}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), shortIntroWeight: val } })}
                      min={0}
                      max={80}
                      step={5}
                      formatValue={(val) => val.toString()}
                      className="p-5"
                    />
                    <SettingsSlider
                      label="Long Intro Weight"
                      description="Theme-based longer segments (jokes, trivia, stories)"
                      value={settings.scheduler?.longIntroWeight ?? 30}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), longIntroWeight: val } })}
                      min={0}
                      max={60}
                      step={5}
                      formatValue={(val) => val.toString()}
                      className="p-5"
                    />
                  </div>

                  {/* Time-Gated Cooldowns */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">⏱️ Special Segment Cooldowns</h3>
                    <SettingsSlider
                      label="Weather Cooldown"
                      description="Minimum time between weather reports"
                      value={settings.scheduler?.weatherCooldownMin ?? 60}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), weatherCooldownMin: val } })}
                      min={30}
                      max={180}
                      step={15}
                      formatValue={(val) => `${val} min`}
                      className="p-5"
                    />
                    <SettingsSlider
                      label="News Cooldown"
                      description="Minimum time between news segments"
                      value={settings.scheduler?.newsCooldownMin ?? 120}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), newsCooldownMin: val } })}
                      min={60}
                      max={300}
                      step={30}
                      formatValue={(val) => `${val} min`}
                      className="p-5"
                    />
                    <SettingsSlider
                      label="Max News History"
                      description="How many recent news stories to remember (to prevent repetition)"
                      value={settings.scheduler?.maxNewsHistory ?? 3}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), maxNewsHistory: val } })}
                      min={1}
                      max={5}
                      step={1}
                      formatValue={(val) => `${val} items`}
                      className="p-5"
                    />
                  </div>

                  {/* Sweeper Settings */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">🔊 Sweeper Settings</h3>
                    <SettingsSlider
                      label="Sweeper Probability"
                      description="Chance of playing a sweeper jingle before DJ segment"
                      value={settings.scheduler?.sweeperProbability ?? 0.2}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), sweeperProbability: val } })}
                      min={0}
                      max={1}
                      step={0.05}
                      formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                      className="p-5"
                    />
                    <SettingsSlider
                      label="Sweeper Cooldown"
                      description="Minimum time between sweepers"
                      value={settings.scheduler?.sweeperCooldownMin ?? 2}
                      onChange={(val) => saveSettings({ ...settings, scheduler: { ...(settings.scheduler || DEFAULT_SCHEDULER_SETTINGS), sweeperCooldownMin: val } })}
                      min={1}
                      max={10}
                      step={0.5}
                      formatValue={(val) => `${val} min`}
                      className="p-5"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-white/5 pt-6">
                  <button
                    onClick={() => saveSettings({ ...settings, scheduler: DEFAULT_SCHEDULER_SETTINGS })}
                    className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm font-bold text-white/50 hover:text-white transition-all group"
                  >
                    <RotateCcw className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    Restore Defaults
                  </button>
                </div>
              </SettingsSection>

              {/* Visual Atmosphere */}
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
                        <div className="text-base opacity-70">Studio Color Palette</div>
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
                  <p className="text-xs text-white/80 leading-relaxed font-medium">
                    <span className="text-white">Pro Models</span> offer richer personality and nuance, but may take longer to generate.
                  </p>
                </div>
              </SettingsSection>


              {/* Secure Keys */}
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
                      <div className="flex items-center gap-2 text-[10px] text-white/70 font-bold uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" /> Fully Encrypted Locally
                      </div>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs font-bold transition-colors">
                        Acquire New API Key →
                      </a>
                    </div>
                  }
                />
              </SettingsSection>

              {/* Laboratory Settings (Debug) */}
              <motion.section variants={containerVariants} className="pt-12 border-t border-white/5">
                <div
                  onClick={() => setIsDebugOpen(!isDebugOpen)}
                  className={cn(
                    "text-sm font-black text-white/50 uppercase tracking-[0.3em] cursor-pointer flex items-center justify-between transition-colors hover:text-white",
                    isDebugOpen && "text-red-400/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4" /> Laboratory Settings
                  </div>
                  <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isDebugOpen && "rotate-180")} />
                </div>

                <AnimatePresence>
                  {isDebugOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-12 space-y-12">
                        {/* Skip TTS */}
                        <div className="flex items-center justify-between p-8 bg-red-500/5 border border-red-500/20 rounded-3xl">
                          <div className="flex items-center gap-6">
                            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400">
                              <Cpu className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-white font-bold text-xl">Silent Scripting</div>
                              <div className="text-lg text-white/70 mt-1 font-medium">Bypass voice generation for text-only debugging</div>
                            </div>
                          </div>
                          <button
                            onClick={() => saveSettings({ ...settings, debug: { ...settings.debug!, skipTTS: !settings.debug?.skipTTS } })}
                            className={cn(
                              "w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center bg-white/10",
                              settings.debug?.skipTTS && "bg-red-500"
                            )}
                          >
                            <motion.div
                              animate={{ x: settings.debug?.skipTTS ? 15 : 0 }}
                              className="w-6 h-6 rounded-full bg-white shadow-lg"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {/* Verbose Logging */}
                        <div className="flex items-center justify-between p-8 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl">
                          <div className="flex items-center gap-6">
                            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                              <Zap className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-white font-bold text-xl">Verbose Logging</div>
                              <div className="text-lg text-white/70 mt-1 font-medium">Show full prompt details in console</div>
                            </div>
                          </div>
                          <SettingsToggle
                            label=""
                            description=""
                            enabled={settings.debug?.verboseLogging || false}
                            onChange={(val) => saveSettings({ ...settings, debug: { ...settings.debug!, verboseLogging: val } })}
                          />
                        </div>

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

                        {/* Song Search Test */}
                        <section className="space-y-6">
                          <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] ml-1">Song Search & Queue Test</h3>
                          <div className="flex gap-3">
                            <div className="flex-1 relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                              <input
                                type="text"
                                value={testSongQuery}
                                onChange={(e) => setTestSongQuery(e.target.value)}
                                placeholder="Enter song name (e.g., Eto - Spit in my face)"
                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && testSongQuery.trim() && !testingSong) {
                                    setTestingSong(true);
                                    searchAndPlayNextInPlace(testSongQuery.trim()).finally(() => {
                                      setTestingSong(false);
                                    });
                                  }
                                }}
                              />
                            </div>
                            <button
                              onClick={() => {
                                if (!testSongQuery.trim() || testingSong) return;
                                setTestingSong(true);
                                searchAndPlayNextInPlace(testSongQuery.trim()).finally(() => {
                                  setTestingSong(false);
                                });
                              }}
                              disabled={!testSongQuery.trim() || testingSong}
                              className={cn(
                                "px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2",
                                testSongQuery.trim() && !testingSong
                                  ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
                                  : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                              )}
                            >
                              <Search className="w-5 h-5" />
                              {testingSong ? "Searching..." : "Test Queue"}
                            </button>
                          </div>
                          <p className="text-xs text-white/50 text-center">
                            Tests the search & queue flow: navigates to search, finds first result, and clicks "Play Next"
                          </p>
                        </section>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>

            </>)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 md:p-10 border-t border-white/5 modal-footer flex justify-between items-center z-20">
          <div className="flex items-center gap-6">
            <div className="font-mono text-[10px] font-black tracking-[0.4em] text-white/50 uppercase">Core-v1.0.4-Stable</div>
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
