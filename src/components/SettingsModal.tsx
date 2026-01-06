import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DJStyle } from "../config";
import { VOICE_PROFILES } from "../config";

interface Settings {
  enabled: boolean;
  voice: string;
  style: any;
  customPrompt?: string;
  visualizerEnabled?: boolean;
  language: string;
  dualDjMode?: boolean;
  secondaryDjVoice?: string;
  visualTheme?: string;
  apiKey?: string;
}

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    voice: "kore",
    style: DJStyle.STANDARD,
    customPrompt: "",
    visualizerEnabled: true,
    language: "en",
    visualTheme: "Standard",
    dualDjMode: false,
    secondaryDjVoice: "sulafat",
    apiKey: "",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    chrome.storage.local.get(["horisFmSettings"], (result) => {
      if (result.horisFmSettings) {
        setSettings((prev) => ({ ...prev, ...(result.horisFmSettings as Settings) }));
      }
    });
  }, []);

  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    chrome.storage.local.set({ horisFmSettings: newSettings }, () => {
      setStatus("Saved");
      setTimeout(() => setStatus(""), 2000);
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-[900px] max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "#09090b", color: "#FAFAFA" }} // Fallback/Force dark theme
      >
        {/* Close Button UI */}
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
          {/* Header with Enable/Disable Toggle */}
          <header className="flex justify-between items-center pb-8 border-b border-white/5">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Settings</h1>
              <p className="text-lg text-secondary text-white/50">
                Configure your Hori-s.FM AI Host experience
              </p>
            </div>

            <button
              onClick={() => saveSettings({ ...settings, enabled: !settings.enabled })}
              className={`flex items-center gap-4 px-8 py-4 mr-20 rounded-full border transition-all duration-300 ${settings.enabled
                ? "bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20"
                : "bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
                }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${settings.enabled
                  ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                  : "bg-red-500"
                  }`}
              ></div>
              <span className="text-base font-bold tracking-wide">
                {settings.enabled ? "SYSTEM ACTIVE" : "SYSTEM DISABLED"}
              </span>
            </button>
          </header>

          <main className="space-y-12 text-white">
            {/* 00 LANGUAGE */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <span className="text-indigo-400 font-mono text-base opacity-80">00</span> Language
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { code: "en", label: "English 🇺🇸" },
                  { code: "cs", label: "Czech 🇨🇿" },
                  { code: "ja", label: "Japanese 🇯🇵" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => saveSettings({ ...settings, language: lang.code as any })}
                    className={`p-6 rounded-2xl text-center border transition-all duration-200 group
                                            ${(settings as any).language === lang.code
                        ? "bg-white/10 border-indigo-500/50 text-white ring-1 ring-indigo-500/50"
                        : "bg-white/5 border-white/5 text-white/60 hover:border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <div className="font-medium text-xl group-active:scale-95 transition-transform">
                      {lang.label}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 01 VOICE MODEL */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <span className="text-indigo-400 font-mono text-base opacity-80">01</span> Voice
                Model
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {VOICE_PROFILES.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => saveSettings({ ...settings, voice: profile.id })}
                    className={`relative p-6 rounded-2xl text-left transition-all duration-200 border group
                                            ${settings.voice === profile.id
                        ? "bg-white/10 border-indigo-500/50 ring-1 ring-indigo-500/50"
                        : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span
                        className={`text-xl font-medium ${settings.voice === profile.id
                          ? "text-white"
                          : "text-white/70 group-hover:text-white"
                          }`}
                      >
                        {profile.name}
                      </span>
                      {settings.voice === profile.id && (
                        <div className="w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/40">
                      <span className="bg-white/5 px-3 py-1 rounded-md border border-white/5">
                        {profile.tone}
                      </span>
                      <span className="bg-white/5 px-3 py-1 rounded-md border border-white/5">
                        {profile.emotion}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 02 BROADCAST STYLE */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <span className="text-indigo-400 font-mono text-base opacity-80">02</span> Broadcast
                Style
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {Object.values(DJStyle).map((styleLabel: any) => (
                  <button
                    key={styleLabel}
                    onClick={() => saveSettings({ ...settings, style: styleLabel })}
                    className={`py-4 px-6 rounded-2xl text-base font-medium transition-all text-center border
                                            ${settings.style === styleLabel
                        ? "bg-white text-black border-white shadow-lg shadow-white/10"
                        : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/10 hover:bg-white/10"
                      }
                                        `}
                  >
                    {styleLabel}
                  </button>
                ))}
              </div>

              {/* Custom Prompt Input */}
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${settings.style === DJStyle.CUSTOM ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                  }`}
              >
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mt-2">
                  <textarea
                    value={settings.customPrompt || ""}
                    onChange={(e) => saveSettings({ ...settings, customPrompt: e.target.value })}
                    placeholder="Enter custom persona instructions (e.g., 'Be a sarcastic robot from the year 3000')..."
                    className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white text-base focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-white/20 resize-none"
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {/* 03 DUAL DJ MODE (Unique to Embedded) */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <span className="text-teal-400 font-mono text-base opacity-80">03</span> Dual DJ
                Mode
              </h2>

              <div
                className={`rounded-3xl border transition-all duration-200 overflow-hidden ${settings.dualDjMode
                  ? "bg-white/10 border-teal-500/30 ring-1 ring-teal-500/20"
                  : "bg-white/5 border-white/5"
                  }`}
              >
                <div
                  className="p-6 flex items-center justify-between cursor-pointer"
                  onClick={() => saveSettings({ ...settings, dualDjMode: !settings.dualDjMode })}
                >
                  <div>
                    <div className="font-medium text-xl text-white">Enable Co-Host</div>
                    <div className="text-base text-white/50 mt-1">
                      Two DJs will banter during transitions
                    </div>
                  </div>
                  <div
                    className={`w-16 h-8 rounded-full p-1 transition-colors ${settings.dualDjMode ? "bg-teal-500" : "bg-white/10"
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${settings.dualDjMode ? "translate-x-8" : "translate-x-0"
                        }`}
                    />
                  </div>
                </div>

                {settings.dualDjMode && (
                  <div className="px-6 pb-6 pt-0 border-t border-white/5 mt-2">
                    <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4 mt-6">
                      Select Co-Host Voice
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {VOICE_PROFILES.filter((p) => p.id !== settings.voice).map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() =>
                            saveSettings({ ...settings, secondaryDjVoice: profile.id })
                          }
                          className={`p-4 rounded-xl text-left border transition-all flex items-center justify-between group
                                                        ${settings.secondaryDjVoice === profile.id
                              ? "bg-teal-500/20 border-teal-500/50 text-white"
                              : "bg-black/20 border-white/5 text-white/50 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                          <span className="font-medium text-base">{profile.name}</span>
                          {settings.secondaryDjVoice === profile.id && (
                            <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 04 VISUALS (Unique to Embedded) */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <span className="text-pink-400 font-mono text-base opacity-80">04</span> Visuals
              </h2>
              <div className="grid grid-cols-2 gap-5">
                {["Standard", "Apple Music"].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => saveSettings({ ...settings, visualTheme: theme })}
                    className={`p-6 rounded-2xl text-left border transition-all ${(settings as any).visualTheme === theme
                      ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/30 text-white shadow-inner"
                      : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <div className="font-medium text-lg">{theme}</div>
                    <div className="text-sm text-white/30 mt-1">Theme Variant</div>
                  </button>
                ))}
              </div>
            </section>

            {/* 05 API CONFIGURATION */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                <span className="text-amber-400 font-mono text-base opacity-80">05</span> API Configuration
              </h2>
              <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={settings.apiKey || ""}
                    onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="Enter your API Key..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-base focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder-white/20"
                  />
                  <p className="text-xs text-white/30 mt-3">
                    Your API key is stored locally in your browser and used only to communicate with the AI service.
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline ml-1">
                      Get an API Key here
                    </a>.
                  </p>
                </div>
              </div>
            </section>
          </main>

          <footer className="pt-8 border-t border-white/5 flex justify-between items-center text-sm text-white/30">
            <div className="font-mono">HORI-S.FM SYSTEM v1.0</div>
            <div
              className={`transition-all duration-300 font-medium ${status ? "opacity-100 text-green-400" : "opacity-0"
                }`}
            >
              SETTINGS SAVED
            </div>
          </footer>
        </div >
      </div >
    </div >,
    document.body
  );
};
