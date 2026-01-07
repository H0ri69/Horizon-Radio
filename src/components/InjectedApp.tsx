import React, { useState, useEffect } from "react";
import { PlayerControls } from "./PlayerControls";
import { SettingsModal } from "./SettingsModal";
import { CallModal } from "./CallModal"; // Import CallModal
import { ThemeManager } from "../themes/ThemeManager";

interface InjectedAppProps {
  ducker: any; // Type as WebAudioDucker if exported
}

export const InjectedApp: React.FC<InjectedAppProps> = ({ ducker }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [visualTheme, setVisualTheme] = useState("Standard");

  // Sync visualizer setting
  useEffect(() => {
    const syncSettings = () => {
      chrome.storage.local.get(["horisFmSettings"], (result) => {
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

  const handleCallSubmit = (name: string, message: string, song: any | null) => {
    console.log("[InjectedApp] Call Submitted:", { name, message, song });
    // Dispatch event for content script to handle
    window.dispatchEvent(new CustomEvent("HORIS_CALL_SUBMITTED", {
      detail: { name, message, song }
    }));
  };

  return (
    <>
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
        />
      )}
    </>
  );
};
