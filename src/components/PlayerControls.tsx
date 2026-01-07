import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PlayerControlsProps {
  onOpenSettings: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({ onOpenSettings }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [djStatus, setDjStatus] = useState<string>("IDLE");

  useEffect(() => {
    // Check initial settings
    chrome.storage.local.get(["horisFmSettings"], (result) => {
      const settings = result.horisFmSettings as { apiKey?: string } | undefined;
      if (settings?.apiKey) {
        setHasApiKey(true);
      } else {
        setHasApiKey(false);
      }
    });

    // Listen for changes
    const listener = (changes: any) => {
      if (changes.horisFmSettings && changes.horisFmSettings.newValue) {
        setHasApiKey(!!changes.horisFmSettings.newValue.apiKey);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Listen for DJ Status Updates from content script
  useEffect(() => {
    const statusListener = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        console.log("[PlayerControls] Status Update:", customEvent.detail);
        setDjStatus(customEvent.detail);
      }
    };
    window.addEventListener("HORIS_STATUS_UPDATE", statusListener);
    return () => window.removeEventListener("HORIS_STATUS_UPDATE", statusListener);
  }, []);

  useEffect(() => {
    // Find the injection point
    // Using interval to wait for YTM to load the DOM
    const interval = setInterval(() => {
      const middleControls = document.querySelector(".middle-controls-buttons");
      if (middleControls) {
        // Ensure we haven't already injected (though React should handle this via root)
        // But for Portal we need a container *inside* the target.
        // Or we can just portal to the target itself?
        // Portaling to the target appends to end. That's fine.
        // The inspiration project used 'append'.

        // Let's create a dedicated container to be safe
        let myContainer = document.getElementById("horis-controls-container");
        if (!myContainer) {
          myContainer = document.createElement("div");
          myContainer.id = "horis-controls-container";
          myContainer.style.display = "flex";
          myContainer.style.alignItems = "center";
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
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* Status Indicator Badge - Always Visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: "12px",
          fontWeight: 500,
          fontFamily: "Roboto, sans-serif",
          gap: "6px",
          opacity: 0.9,
        }}
        title={`DJ Status: ${djStatus}`}
      >
        {djStatus === "IDLE" && (
          <>
            <span style={{ color: "var(--yt-spec-text-secondary)", fontSize: "11px" }}>●</span>
            <span style={{ color: "var(--yt-spec-text-secondary)" }}>IDLE</span>
          </>
        )}

        {djStatus === "GENERATING" && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            <span style={{ color: "#fbbf24" }}>WRITING</span>
          </>
        )}

        {djStatus === "READY" && (
          <>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            <span style={{ color: "#4ade80" }}>READY</span>
          </>
        )}

        {djStatus === "PLAYING" && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span style={{ color: "#ef4444" }}>ON AIR</span>
          </>
        )}

        {djStatus === "COOLDOWN" && (
          <>
            <span style={{ color: "var(--yt-spec-text-secondary)", fontSize: "11px" }}>●</span>
            <span style={{ color: "var(--yt-spec-text-secondary)" }}>COOLDOWN</span>
          </>
        )}
      </div>

      <button
        onClick={() => {
          console.log("[Hori-s] Settings Button Clicked");
          onOpenSettings();
        }}
        className="style-scope yt-icon-button"
        title={hasApiKey ? "Hori-s.FM Settings" : "Hori-s.FM (Setup Required)"}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          color: "var(--yt-spec-text-secondary)", // Use YTM variable for consistency
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.9,
          transition: "opacity 0.2s",
          marginLeft: "4px",
          position: "relative", // Added for positioning the red dot
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          {/* Hori-s Logo / Graphic EQ Icon */}
          <path d="M10 20H6V4h4v16zm6-16h-4v16h4V4z" />
          <path d="M18 8h2v8h-2zM4 8H2v8h2z" opacity=".5" />
        </svg>

        {/* Warning Dot */}
        {!hasApiKey && (
          <div
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "8px",
              height: "8px",
              backgroundColor: "#ef4444",
              borderRadius: "50%",
              boxShadow: "0 0 4px rgba(239, 68, 68, 0.6)",
              zIndex: 10
            }}
          />
        )}
      </button>
    </div>,
    container
  );
};
