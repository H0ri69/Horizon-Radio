import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { DJStyle, DJVoice } from '../../types';
import { VOICE_PROFILES, DEFAULT_SETTINGS } from '../config';
import '../index.css';

interface Settings {
    enabled: boolean;
    voice: DJVoice;
    style: DJStyle;
    customPrompt?: string;
}

const Options = () => {
    const [settings, setSettings] = useState<Settings>({
        enabled: true,
        voice: DEFAULT_SETTINGS.djVoice,
        style: DEFAULT_SETTINGS.djStyle,
        customPrompt: DEFAULT_SETTINGS.customStylePrompt
    });
    const [status, setStatus] = useState("Settings loaded");

    useEffect(() => {
        // Load settings
        chrome.storage.local.get(['horisFmSettings'], (result) => {
            if (result.horisFmSettings) {
                setSettings(result.horisFmSettings);
            }
        });
    }, []);

    const saveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        chrome.storage.local.set({ horisFmSettings: newSettings }, () => {
            setStatus("Settings saved");
            setTimeout(() => setStatus("Ready"), 2000);
        });
    };

    const currentVoice = VOICE_PROFILES.find(v => v.id === settings.voice) || VOICE_PROFILES[0];

    return (
        <div className="min-h-screen bg-background text-text p-8 md:p-12 font-sans selection:bg-primary/30">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <header className="flex justify-between items-center mb-16">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
                        <p className="text-secondary mt-2">Configure your Hori-s.FM AI Host experience</p>
                    </div>
                    <div className="flex items-center gap-3 bg-surface px-4 py-2 rounded-full border border-white/5">
                        <div className={`w-2 h-2 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-secondary">
                            {settings.enabled ? 'System Active' : 'System Disabled'}
                        </span>
                    </div>
                </header>

                <main className="space-y-12">

                    {/* Voice Selection */}
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <span className="text-primary">01</span> Voice Model
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {VOICE_PROFILES.map(profile => (
                                <button
                                    key={profile.id}
                                    onClick={() => saveSettings({ ...settings, voice: profile.id })}
                                    className={`relative p-6 rounded-2xl text-left transition-all duration-200 border
                                        ${settings.voice === profile.id
                                            ? 'bg-surface border-primary ring-1 ring-primary/50'
                                            : 'bg-surface/50 border-white/5 hover:border-white/10 hover:bg-surface'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-lg font-medium ${settings.voice === profile.id ? 'text-white' : 'text-secondary'}`}>
                                            {profile.name}
                                        </span>
                                        {settings.voice === profile.id && (
                                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-secondary">
                                            <span>Tone</span>
                                            <span className="text-white/80">{profile.tone}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-secondary">
                                            <span>Emotion</span>
                                            <span className="text-white/80">{profile.emotion}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    {/* Style Selection */}
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <span className="text-primary">02</span> Broadcast Style
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            {Object.values(DJStyle).map((styleLabel) => (
                                <button
                                    key={styleLabel}
                                    onClick={() => saveSettings({ ...settings, style: styleLabel as DJStyle })}
                                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-all text-center border
                                        ${settings.style === styleLabel
                                            ? 'bg-white text-black border-white'
                                            : 'bg-surface border-white/5 text-secondary hover:text-white hover:border-white/10'
                                        }
                                    `}
                                >
                                    {styleLabel}
                                </button>
                            ))}
                        </div>

                        {/* Custom Prompt */}
                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${settings.style === DJStyle.CUSTOM ? 'max-h-96 opacity-100' : 'max-h-0 opacity-50'}`}>
                            <div className="bg-surface rounded-2xl p-6 border border-white/5">
                                <label className="block text-sm font-medium text-secondary mb-3">Custom System Instruction</label>
                                <textarea
                                    value={settings.customPrompt || ''}
                                    onChange={(e) => saveSettings({ ...settings, customPrompt: e.target.value })}
                                    placeholder="Describe how you want the DJ to speak..."
                                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-secondary/30 resize-none"
                                />
                                <p className="text-xs text-secondary/50 mt-3 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                    </svg>
                                    This will define the personality and speaking style of the generated audio.
                                </p>
                            </div>
                        </div>
                    </section>

                </main>

                <footer className="mt-20 pt-8 border-t border-white/5 flex justify-between items-center text-xs text-secondary/40">
                    <div>hori-s.fm system</div>
                    <div className={status === "Settings saved" ? "text-green-500 transition-colors" : "transition-colors"}>
                        {status}
                    </div>
                </footer>
            </div>
        </div>
    );
};

const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<Options />);
