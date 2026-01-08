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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Writing</span>
          </div>
        );
      case "READY":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ready</span>
          </div>
        );
      case "PLAYING":
        return (
          <div className="shimmer flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Mic2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">On Air</span>
          </div>
        );
      case "COOLDOWN":
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-white/30">
            <Hourglass className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Resting</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-white/20">
            <Radio className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Idle</span>
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

      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
        {/* Call Button */}
        <button
          onClick={onOpenCall}
          className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-indigo-400 transition-all active:scale-90"
          title="Voice Message to Studio"
        >
          <PhoneForwarded className="w-5 h-5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="relative p-2.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 group"
          title={hasApiKey ? "Studio Configuration" : "API KEY REQUIRED"}
        >
          <Settings2 className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
          {!hasApiKey && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
          )}
        </button>
      </div>
    </div>,
    container
  );
};
