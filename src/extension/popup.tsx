import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { DJStyle, DJVoice, VOICE_PROFILES } from '../../types';

interface Settings {
    enabled: boolean;
    voice: DJVoice;
    style: DJStyle;
    customPrompt?: string;
}

const Popup = () => {
    const [settings, setSettings] = useState<Settings>({
        enabled: true,
        voice: 'Kore',
        style: DJStyle.STANDARD,
        customPrompt: ''
    });
    const [status, setStatus] = useState("SYSTEM_READY");

    useEffect(() => {
        // Load settings
        chrome.storage.local.get(['horisFmSettings'], (result) => {
            if (result.horisFmSettings) {
                setSettings(result.horisFmSettings);
            }
        });

        const listener = (message: any) => {
            if (message.type === 'STATUS_UPDATE') {
                setStatus(message.status);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    const saveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        chrome.storage.local.set({ horisFmSettings: newSettings }, () => {
            console.log("Settings Saved:", newSettings);
        });
    };

    const currentVoice = VOICE_PROFILES.find(v => v.id === settings.voice) || VOICE_PROFILES[0];

    return (
        <div className="flex flex-col h-full bg-transparent p-6 font-tech text-cyber-blue select-none">

            {/* HEADER */}
            <header className="flex justify-between items-center mb-8 border-b border-cyber-blue/30 pb-4">
                <div>
                    <h1 className="text-3xl font-display text-cyber-pink text-shadow-pink tracking-wider">HORI-S.FM</h1>
                    <div className="text-sm font-mono text-cyber-blue/60 tracking-[0.2em] mt-1">NEURAL_DJ_INTERFACE</div>
                </div>
                <div className={`w-4 h-4 rounded-full ${settings.enabled ? 'bg-cyber-green shadow-[0_0_10px_#00ff9f]' : 'bg-red-500 shadow-[0_0_10px_red]'} animate-pulse`}></div>
            </header>

            {/* MAIN TOGGLE */}
            <div className="mb-8">
                <button
                    onClick={() => saveSettings({ ...settings, enabled: !settings.enabled })}
                    className={`w-full py-4 cyber-border transition-all duration-300 group relative overflow-hidden flex items-center justify-center
            ${settings.enabled
                            ? 'bg-cyber-blue/10 border-cyber-blue shadow-[0_0_15px_rgba(5,217,232,0.2)]'
                            : 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.2)]'
                        }`}
                >
                    <div className={`absolute inset-0 opacity-20 ${settings.enabled ? 'bg-cyber-blue' : 'bg-red-500'} translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500`}></div>
                    <span className={`relative text-xl font-bold tracking-[0.2em] font-display
                ${settings.enabled ? 'text-cyber-blue text-shadow-blue' : 'text-red-500 text-shadow-pink'}`}>
                        {settings.enabled ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                    </span>
                </button>
            </div>

            {/* SETTINGS GRID */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">

                {/* VOICE SELECTOR */}
                <div className="space-y-3">
                    <label className="text-sm font-mono text-cyber-pink tracking-widest block border-l-2 border-cyber-pink pl-2">VOICE_MODULE</label>
                    <div className="grid grid-cols-2 gap-3">
                        {VOICE_PROFILES.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => saveSettings({ ...settings, voice: profile.id })}
                                className={`p-3 text-sm border-2 transition-all relative overflow-hidden group
                            ${settings.voice === profile.id
                                        ? 'border-cyber-blue bg-cyber-blue/20 text-white shadow-[0_0_12px_rgba(5,217,232,0.4)]'
                                        : 'border-cyber-blue/30 text-cyber-blue/60 hover:border-cyber-blue/80 hover:text-cyber-blue hover:bg-cyber-blue/5'
                                    }`}
                            >
                                <div className="relative z-10 font-bold tracking-wider">{profile.name.toUpperCase()}</div>
                            </button>
                        ))}
                    </div>

                    {/* Active Voice Specs */}
                    <div className="border border-cyber-blue/20 bg-cyber-blue/5 p-3 flex justify-between text-xs font-mono text-cyber-blue/80">
                        <span>TONE: <span className="text-white">{currentVoice.tone.toUpperCase()}</span></span>
                        <span>EMOTION: <span className="text-white">{currentVoice.emotion.toUpperCase()}</span></span>
                    </div>
                </div>

                {/* STYLE SELECTOR */}
                <div className="space-y-3">
                    <label className="text-sm font-mono text-cyber-pink tracking-widest block border-l-2 border-cyber-pink pl-2">BROADCAST_STYLE</label>
                    <div className="relative">
                        <select
                            value={settings.style}
                            onChange={(e) => saveSettings({ ...settings, style: e.target.value as DJStyle })}
                            className="w-full p-3 bg-cyber-dark border-2 border-cyber-blue/50 text-cyber-blue text-sm font-mono focus:border-cyber-blue focus:shadow-[0_0_15px_rgba(5,217,232,0.3)] transition-all cursor-pointer appearance-none hover:border-cyber-blue/80"
                        >
                            {Object.values(DJStyle).map((styleLabel) => (
                                <option key={styleLabel} value={styleLabel} className="bg-cyber-black">{styleLabel}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-cyber-blue/50">▼</div>
                    </div>
                </div>

                {/* CUSTOM PROMPT */}
                {settings.style === DJStyle.CUSTOM && (
                    <div className="space-y-3 animate-slide-up">
                        <label className="text-sm font-mono text-cyber-yellow tracking-widest block border-l-2 border-cyber-yellow pl-2">CUSTOM_INSTRUCTION</label>
                        <textarea
                            value={settings.customPrompt || ''}
                            onChange={(e) => saveSettings({ ...settings, customPrompt: e.target.value })}
                            placeholder="e.g. Talk like a 1920s gangster..."
                            className="w-full h-24 p-3 bg-cyber-dark border-2 border-cyber-yellow/50 text-cyber-yellow text-sm font-mono resize-none focus:border-cyber-yellow focus:shadow-[0_0_10px_rgba(255,255,0,0.2)] placeholder-cyber-yellow/30"
                        />
                    </div>
                )}

            </div>

            {/* FOOTER */}
            <footer className="mt-6 pt-4 border-t border-cyber-blue/20 flex justify-between items-end text-[10px] font-mono text-cyber-blue/40 uppercase">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-pulse"></span>
                        STATUS: {status}
                    </div>
                    <div>BUFFER: 45s LOOKAHEAD</div>
                </div>
                <div className="text-right space-y-1">
                    <div>HORI-S.FM EXTENSION</div>
                    <div>BUILD: 2026.1.4.3</div>
                </div>
            </footer>

        </div>
    );
};

const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<Popup />);
