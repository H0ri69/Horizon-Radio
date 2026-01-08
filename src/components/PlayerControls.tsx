import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Settings2, PhoneForwarded,
  Radio, Sparkles, Mic2, Zap, Hourglass
} from "lucide-react";

interface PlayerControlsProps {
  onOpenSettings: () => void;
  onOpenCall: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({ onOpenSettings, onOpenCall }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [djStatus, setDjStatus] = useState<string>("IDLE");

  useEffect(() => {
    chrome.storage.local.get(["horisFmSettings"], (result) => {
      const settings = result.horisFmSettings as { apiKey?: string } | undefined;
      setHasApiKey(!!settings?.apiKey);
    });

    const listener = (changes: any) => {
      if (changes.horisFmSettings?.newValue) {
        setHasApiKey(!!changes.horisFmSettings.newValue.apiKey);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    const statusListener = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) setDjStatus(customEvent.detail);
    };
    window.addEventListener("HORIS_STATUS_UPDATE", statusListener);
    return () => window.removeEventListener("HORIS_STATUS_UPDATE", statusListener);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const middleControls = document.querySelector(".middle-controls-buttons");
      if (middleControls) {
        let myContainer = document.getElementById("horis-controls-container");
        if (!myContainer) {
          myContainer = document.createElement("div");
          myContainer.id = "horis-controls-container";
          myContainer.className = "flex items-center gap-1.5 px-4 mr-4 border-l border-white/5";
          middleControls.appendChild(myContainer);
        }
        setContainer(myContainer);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!container) return null;

  const getStatusBadge = () => {
    switch (djStatus) {
      case "GENERATING":
        return (
          <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-generating animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Writing</span>
          </div>
        );
      case "READY":
        return (
          <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-ready">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Ready</span>
          </div>
        );
      case "PLAYING":
        return (
          <div className="shimmer flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-playing">
            <Mic2 className="w-3.5 h-3.5" />
            <span>On Air</span>
          </div>
        );
      case "COOLDOWN":
        return (
          <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-idle opacity-60">
            <Hourglass className="w-3.5 h-3.5" />
            <span>Resting</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-idle opacity-40">
            <Radio className="w-3.5 h-3.5" />
            <span>Idle</span>
          </div>
        );
    }
  };

  return createPortal(
    <div className="flex items-center gap-3">
      {/* Dynamic Status Badge */}
      <div className="hidden lg:block">
        {getStatusBadge()}
      </div>

      <div className="flex items-center gap-0.5 p-0.5 rounded-2xl horis-glass-pill">
        {/* Call Button */}
        <button
          onClick={onOpenCall}
          className="p-2.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95"
          title="Voice Message to Studio"
        >
          <PhoneForwarded className="w-4.5 h-4.5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="relative p-2.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95 group"
          title={hasApiKey ? "Studio Configuration" : "API KEY REQUIRED"}
        >
          <Settings2 className="w-4.5 h-4.5 group-hover:rotate-45 transition-transform duration-500" />
          {!hasApiKey && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
          )}
        </button>
      </div>
    </div>,
    container
  );
};
