import browser from "webextension-polyfill";
import React, { useState, useEffect } from "react";
import { PlayerControls } from "./PlayerControls";
import { SettingsModal } from "./SettingsModal";
import { CallModal } from "./CallModal"; // Import CallModal
import { ThemeManager } from "../themes/ThemeManager";
import { PaletteExtractor } from "../themes/PaletteExtractor";
import { eventBus } from "../services/eventBus";
import { logger } from "../utils/Logger";

const log = logger.withContext("InjectedApp"); 

interface InjectedAppProps {
  ducker: any; // Type as WebAudioDucker if exported
  getRemoteSource: () => any;
}

export const InjectedApp: React.FC<InjectedAppProps> = ({ ducker, getRemoteSource }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [visualTheme, setVisualTheme] = useState("Standard");

  // Sync visualizer setting
  useEffect(() => {
    const syncSettings = () => {
      browser.storage.local.get(["horisFmSettings"]).then((result) => {
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
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  const handleCallSubmit = (data: { name: string; song: any; message: string; useRemote?: boolean; remoteSource?: any }) => {
    log.log("Call Submitted:", data);
    // Dispatch event via EventBus (Reference Safe)
    eventBus.emit('HORIS_CALL_SUBMITTED', data);
  };

  return (
    <>
      {visualTheme === "Apple Music" && <PaletteExtractor />}
      <ThemeManager theme={visualTheme} />
      <PlayerControls
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCall={() => setIsCallModalOpen(true)}
      />

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isCallModalOpen && (
        <CallModal
          onClose={() => setIsCallModalOpen(false)}
          onSubmit={handleCallSubmit}
          getRemoteSource={getRemoteSource}
        />
      )}
    </>
  );
};
