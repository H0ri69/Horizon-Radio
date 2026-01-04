import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
// import '../index.css'; // Removed: File does not exist

// Define Settings Interface
interface ExtensionSettings {
    enabled: boolean;
    voice: 'Kore' | 'Charon';
}

const Popup = () => {
    const [settings, setSettings] = useState<ExtensionSettings>({
        enabled: true,
        voice: 'Kore'
    });

    useEffect(() => {
        // Load from storage
        chrome.storage.local.get(['horisFmSettings'], (result) => {
            if (result.horisFmSettings) {
                setSettings(result.horisFmSettings);
            } else {
                // Default to Kore if not set
                setSettings({ enabled: true, voice: 'Kore' });
                chrome.storage.local.set({ horisFmSettings: { enabled: true, voice: 'Kore' } });
            }
        });
    }, []);

    const saveSettings = (newSettings: ExtensionSettings) => {
        setSettings(newSettings);
        chrome.storage.local.set({ horisFmSettings: newSettings }, () => {
            console.log("Settings saved");
        });
    };

    return (
        <div className="p-4 bg-gray-900 text-white min-h-[300px] flex flex-col gap-4 font-sans">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-cyan-400">
                Hori-s.FM
            </h1>

            <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                <span className="font-medium">Enable DJ</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => saveSettings({ ...settings, enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-400">DJ Voice</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => saveSettings({ ...settings, voice: 'Kore' })}
                        className={`p-2 rounded-md border text-center transition-colors ${settings.voice === 'Kore' ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                    >
                        Kore
                        <span className="block text-[10px]">Natural / Friendly</span>
                    </button>
                    <button
                        onClick={() => saveSettings({ ...settings, voice: 'Charon' })}
                        className={`p-2 rounded-md border text-center transition-colors ${settings.voice === 'Charon' ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                    >
                        Charon
                        <span className="block text-[10px]">Deep / Podcast</span>
                    </button>
                </div>
            </div>

            <div className="mt-auto text-center text-xs text-gray-600">
                v1.0.0 • MV3
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);
