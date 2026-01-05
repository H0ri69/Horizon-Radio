import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DJStyle, VOICE_PROFILES } from '../../../types';

interface Settings {
    enabled: boolean;
    voice: string;
    style: any;
    customPrompt?: string;
    visualizerEnabled?: boolean; // New setting
}

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [settings, setSettings] = useState<Settings>({
        enabled: true,
        voice: 'Kore',
        style: DJStyle.STANDARD,
        customPrompt: '',
        visualizerEnabled: true
    });

    useEffect(() => {
        chrome.storage.local.get(['horisFmSettings'], (result) => {
            if (result.horisFmSettings) {
                setSettings(prev => ({ ...prev, ...result.horisFmSettings }));
            }
        });
    }, []);

    const saveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        chrome.storage.local.set({ horisFmSettings: newSettings });
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#121212] w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl p-8 border border-white/10 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <h1 className="text-2xl font-bold text-white mb-6">Hori-s.FM Settings</h1>

                {/* THEME SELECTION */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Visual Theme</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {['Standard', 'Apple Music'].map(theme => (
                            <button
                                key={theme}
                                onClick={() => saveSettings({ ...settings, visualTheme: theme })}
                                className={`p-4 rounded-lg text-left border transition-all ${(settings as any).visualTheme === theme
                                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                        : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                <div className="font-medium text-lg">{theme}</div>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Voice Model</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {VOICE_PROFILES.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => saveSettings({ ...settings, voice: profile.id })}
                                className={`p-4 rounded-lg text-left border transition-all ${settings.voice === profile.id
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                    : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                <div className="font-medium">{profile.name}</div>
                                <div className="text-xs opacity-60">{profile.tone}</div>
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white mb-4">Broadcast Style</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                        {Object.values(DJStyle).map((styleLabel: any) => (
                            <button
                                key={styleLabel}
                                onClick={() => saveSettings({ ...settings, style: styleLabel })}
                                className={`py-2 px-3 rounded-md text-sm transition-all ${settings.style === styleLabel
                                    ? 'bg-white text-black font-medium'
                                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                {styleLabel}
                            </button>
                        ))}
                    </div>
                    {settings.style === DJStyle.CUSTOM && (
                        <textarea
                            value={settings.customPrompt || ''}
                            onChange={(e) => saveSettings({ ...settings, customPrompt: e.target.value })}
                            placeholder="Enter custom persona instructions..."
                            className="w-full h-24 bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm"
                        />
                    )}
                </section>

            </div>
        </div>,
        document.body
    );
};
