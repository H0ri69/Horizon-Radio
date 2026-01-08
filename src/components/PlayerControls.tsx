import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Inject ping animation for status indicators
if (typeof document !== 'undefined') {
  const styleId = 'horis-ping-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes ping {
        75%, 100% {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

interface PlayerControlsProps {
  onOpenSettings: () => void;
  onOpenCall: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({ onOpenSettings, onOpenCall }) => {
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
            <span style={{ position: "relative", display: "flex", height: "8px", width: "8px" }}>
              <span style={{
                position: "absolute",
                display: "inline-flex",
                height: "100%",
                width: "100%",
                borderRadius: "9999px",
                backgroundColor: "#fbbf24",
                opacity: 0.75,
                animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"
              }}></span>
              <span style={{
                position: "relative",
                display: "inline-flex",
                borderRadius: "9999px",
                height: "8px",
                width: "8px",
                backgroundColor: "#eab308"
              }}></span>
            </span>
            <span style={{ color: "#fbbf24" }}>WRITING</span>
          </>
        )}

        {djStatus === "READY" && (
          <>
            <span style={{
              position: "relative",
              display: "inline-flex",
              borderRadius: "9999px",
              height: "8px",
              width: "8px",
              backgroundColor: "#22c55e"
            }}></span>
            <span style={{ color: "#4ade80" }}>READY</span>
          </>
        )}

        {djStatus === "PLAYING" && (
          <>
            <span style={{ position: "relative", display: "flex", height: "8px", width: "8px" }}>
              <span style={{
                position: "absolute",
                display: "inline-flex",
                height: "100%",
                width: "100%",
                borderRadius: "9999px",
                backgroundColor: "#ef4444",
                opacity: 0.75,
                animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"
              }}></span>
              <span style={{
                position: "relative",
                display: "inline-flex",
                borderRadius: "9999px",
                height: "8px",
                width: "8px",
                backgroundColor: "#ef4444"
              }}></span>
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

      {/* Call Button */}
      <button
        onClick={() => {
          console.log("[Hori-s] Call Button Clicked");
          onOpenCall();
        }}
        className="style-scope yt-icon-button"
        title="Call the DJ"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          color: "#ffffff", // Pure white for the phone icon
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.9,
          transition: "opacity 0.2s",
          marginLeft: "4px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
        </svg>
      </button>

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
