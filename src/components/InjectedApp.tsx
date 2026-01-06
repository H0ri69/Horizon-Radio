import React, { useState, useEffect } from 'react';
import { PlayerControls } from './PlayerControls';
import { SettingsModal } from './SettingsModal';
import { ThemeManager } from '../themes/ThemeManager';

interface InjectedAppProps {
    ducker: any; // Type as WebAudioDucker if exported, using any for loose coupling for now or define interface
}

export const InjectedApp: React.FC<InjectedAppProps> = ({ ducker }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [visualTheme, setVisualTheme] = useState('Standard');

    // Sync visualizer setting
    useEffect(() => {
        const syncSettings = () => {
            chrome.storage.local.get(['horisFmSettings'], (result) => {
                const settings = result.horisFmSettings as any;
                if (settings) {
                    if (settings.visualTheme) {
                        setVisualTheme(settings.visualTheme);
                    }
                }
            });
        };
        syncSettings();

        // Listen for changes
        const listener = (changes: any) => {
            if (changes.horisFmSettings) {
                syncSettings();
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // We can't easily subscribe to "ducker.analyser" changes unless we add event emitter to ducker.
    // But VisualizerOverlay polls or runs loop anyway. passing ducker is enough.

    return (
        <>
            <ThemeManager theme={visualTheme} />
            <PlayerControls onOpenSettings={() => setIsSettingsOpen(true)} />

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
};
