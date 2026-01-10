import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Settings2, PhoneForwarded, Radio, Sparkles, Mic2, Zap, Hourglass, Newspaper, CloudSun, Music2 } from "lucide-react";
import { DJSegmentType, TransitionPlan } from "../config";

interface PlayerControlsProps {
  onOpenSettings: () => void;
  onOpenCall: () => void;
}

// Separate component for the cyclical status badge to keep main component clean
const CyclingStatusBadge = ({ status, plan }: { status: string; plan: TransitionPlan | null }) => {
  const [showPlan, setShowPlan] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [prevStatus, setPrevStatus] = useState(status);

  // Reset timer when status changes (but specific generating phases might share a timer if desired, 
  // here we reset on every phase change for granularity)
  if (status !== prevStatus) {
    setPrevStatus(status);
    setStartTime(Date.now());
  }

  // Cycle between Status and Plan every 4 seconds if we have a plan and are in a relevant state
  useEffect(() => {
    if (!plan || (status !== "GENERATING" && status !== "WRITING_SCRIPT" && status !== "GENERATING_AUDIO" && status !== "READY")) {
      setShowPlan(false);
      return;
    }

    const interval = setInterval(() => {
      setShowPlan((prev) => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, [status, plan]);

  // Determine Plan/Topic Text
  const getPlanText = (p: TransitionPlan) => {
    switch (p.segment) {
      case "LONG_INTRO":
        return `Up Next: ${p.longTheme ? p.longTheme.replace(/_/g, " ") : "Deep Dive"}`;
      case "WEATHER":
        return "Up Next: Weather Report";
      case "NEWS":
        return "Up Next: News Update";
      case "SHORT_INTRO":
        return "Up Next: Quick Intro";
      default:
        return "Up Next: DJ Break";
    }
  };

  const getPlanIcon = (p: TransitionPlan) => {
    switch (p.segment) {
      case "WEATHER": return <CloudSun className="w-3.5 h-3.5" />;
      case "NEWS": return <Newspaper className="w-3.5 h-3.5" />;
      case "LONG_INTRO": return <Mic2 className="w-3.5 h-3.5" />; // Or specific icons for themes if available
      default: return <Music2 className="w-3.5 h-3.5" />;
    }
  };

  // Timer Component
  const StatusTimer = ({ startTime }: { startTime: number }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      // Update immediately
      setElapsed((Date.now() - startTime) / 1000);

      const interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);
      return () => clearInterval(interval);
    }, [startTime]);

    return <span className="opacity-70 font-mono text-xs ml-1">({elapsed.toFixed(1)}s)</span>;
  };

  return (
    <div className="relative h-[42px] min-w-[180px]">
      <AnimatePresence mode="wait">
        {showPlan && plan ? (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill bg-white/5 border border-white/10"
          >
            {getPlanIcon(plan)}
            <span className="font-medium bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent truncate max-w-[140px]">
              {getPlanText(plan)}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {(() => {
              switch (status) {
                case "GENERATING":
                case "WRITING_SCRIPT":
                  return (
                    <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-generating animate-pulse w-full">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Writing Script...</span>
                      <StatusTimer startTime={startTime} />
                    </div>
                  );
                case "GENERATING_AUDIO":
                  return (
                    <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-generating animate-pulse w-full">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Synthesizing...</span>
                      <StatusTimer startTime={startTime} />
                    </div>
                  );
                case "READY":
                  return (
                    <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-ready w-full">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Ready</span>
                    </div>
                  );
                case "PLAYING":
                  return (
                    <div className="shimmer flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-playing w-full">
                      <Mic2 className="w-3.5 h-3.5" />
                      <span>On Air</span>
                    </div>
                  );
                case "COOLDOWN":
                  return (
                    <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-idle opacity-60 w-full">
                      <Hourglass className="w-3.5 h-3.5" />
                      <span>Resting</span>
                    </div>
                  );
                default:
                  return (
                    <div className="flex items-center gap-2 px-4 py-[13px] rounded-2xl horis-glass-pill status-badge-idle opacity-40 w-full">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Idle</span>
                    </div>
                  );
              }
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({ onOpenSettings, onOpenCall }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [djStatus, setDjStatus] = useState<string>("IDLE");
  const [nextPlan, setNextPlan] = useState<TransitionPlan | null>(null);

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
      if (customEvent.detail) {
        if (typeof customEvent.detail === 'object') {
          setDjStatus(customEvent.detail.status);
          setNextPlan(customEvent.detail.plan);
        } else {
          // Fallback for string-only updates
          setDjStatus(customEvent.detail);
        }
      }
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

  return createPortal(
    <div className="flex items-center gap-3">
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

      {/* Dynamic Status Badge */}
      <div className="hidden lg:block">
        <CyclingStatusBadge status={djStatus} plan={nextPlan} />
      </div>
    </div>,
    container
  );
};
