# 📻 Horizon Radio: The Ultimate Feature Encyclopedia

Horizon Radio is an elite Chrome Extension that utilizes the full **Google Gemini 2.5** AI stack to provide a professional, interactive, and visually stunning radio broadcast experience directly on top of YouTube Music.

---

## 🧠 1. Core AI Engine & Intelligence
The "brain" of Horizon Radio is a sophisticated orchestration layer that handles high-level reasoning and speech synchronization.

### **Lifecycle State Machine**
- **Autonomous Transitions**: A 5-stage state engine (`IDLE` → `GENERATING` → `READY` → `PLAYING` → `COOLDOWN`) ensures the DJ never talks over music and only triggers segments when contextually appropriate.
- **Micro-Timing Logic**: Uses `ytmusic-player-bar` progress data to calculate the optimal trigger point (defaulting to 25% through the song or ~20s before the end) to prepare scripts and audio.
- **Intelligent Segues**: Unlike standard TTS wrappers, the script is generated *during* the song so it's ready the instant the music ducks.

### **Broadcast Content Strategy**
The AI uses a probabilistic engine (configurable in Laboratory Settings) to choose between two segment formats:
- **Short Format (The "Quick Transition")**: Tight 1-2 sentence intros focused on flow. It acknowledges the previous track and intros the next one without fluff.
- **Long Format (The "Deep Dive")**: Richer segments where the DJ dives into a specific theme. These themes include:
    - **Trivium**: Sharing fun facts or history about the artist/song.
    - **Spotlight**: A deeper story about the artist's career or personal journey.
    - **Queue Preview**: Looking ahead at the setlist (e.g., *"Got some Dua Lipa and Weeknd coming up later this hour..."*).
    - **Studio Vibe**: Sharing a joke or engaging in station banter.
    - **Environmental Pulse**: Real-time **Weather** and **News** updates using Google Search to bridge the digital broadcast with the listener's physical location.

### **Narrative & Context Management**
- **Multi-Level History**: Stores a `narrativeHistory` (last 7 songs) to allow for continuity (e.g., *"We just heard tracks from ODESZA and Flume, let's keep it moving with..."*).
- **Playlist Scanning**: Deep-scrapes the `ytmusic-player-queue` to provide the AI with context of what was played before and what is coming next (up to 5 items in both directions).
- **Time/Environment Awareness**: Feeds the current system time, timezone, and "Time Context" (Morning, Late Night, etc.) into the AI to allow for time-sensitive greetings.

### **Model Tiers**
- **Scripting (LLM)**: Support for both **Gemini 2.5 Flash** (standard) and **Gemini 2.5 Pro** (high-intelligence reasoning).
- **Voice (TTS)**: Leverages native **Gemini TTS** models in Flash and Pro variants for human prosody and realistic vocalizations.

---

## 📞 2. Live Interaction Ecosystem
A revolutionary "Live Call" system that bridges AI with real-world listeners.

### **The Calling Infrastructure**
- **Local Integration**: Direct microphone access with **Echo Gating** (input is automatically blocked when the AI speaks to prevent feedback).
- **Remote Host Protocol**: Generates a unique `Host ID` and **QR Code**. Any smartphone can scan the code to call into the "station" from anywhere in the world.
- **P2P Relay Server**: Uses a custom WebSocket relay to bridge communication between external mobile clients and the browser extension.

### **AI Call Handling**
- **Contextual Memory**: The DJ remembers repeat callers and references their previous topics or vibes.
- **Dynamic Interaction**: The AI can hold a natural, multi-turn conversation, reacts to interruptions, and handles "Stage Directions" like `[laughing]` or `[sigh]`.
- **In-Call Tools**: The DJ has access to real-time tools:
    - `googleSearch`: For checking facts, weather, or news requested by callers.
    - `addPlayNext`: For searching and queueing songs requested during the call.

---

## 🎨 3. Visual & Aesthetic Subsystem
Designed to be "Visual Candy" that matches the premium quality of the AI.

### **Apple Music Experience**
- **Glassmorphism**: A high-fidelity CSS theme that mimics the modern Apple Music player, featuring blurred overlays and rounded containers.
- **Adaptive UI**: The interface intelligently detects when YTM is in "Fullscreen" or "Player Page" mode and reshapes itself to fit.

### **Real-Time Palette Extraction**
- **Vibrant Engine**: Analyzes the current album art thumbnail to extract a palette of 6 core colors (Vibrant, Muted, Dark, etc.).
- **OKLCH Color Theory**: Converts hex colors to the **OKLCH** color space for perceptually uniform lightness and chroma, resulting in perfectly harmonious background gradients.
- **Ambience Animation**: Background colors use a 0.7s cubic-bezier transition to ensure "snap-free" visual flow between songs.

### **Reactive Visuals**
- **Voice visualization**: A reactive animation layer that comes "alive" specifically during DJ segments.
- **Theme Manager**: Centralized control for multiple themes (Standard, Neon, Pastel, Midnight, Gold).

---

## 🎵 4. YouTube Music Deep Integration
Extensive DOM and Protocol manipulation to control YTM's internals.

### **Audio Control (Ducking)**
- **Web Audio API**: Routes the YTM `<video>` element through a `GainNode` for smooth, logarithmic volume ducking (default 20% gain) when the DJ speaks.
- **UI Interaction**: Programmatically slides the YTM volume bar for visual feedback that "The DJ is talking."

### ** DOM Utilities & Automation**
- **No-Reload Search**: A custom `searchAndPlayNextInPlace` utility that uses keyboard event simulation to search for songs and add them to the queue *without* refreshing the page—critical for not breaking live calls.
- **Cross-Page Persistence**: For searches that *do* require a reload, a `PendingDomAction` system uses extension storage to "remember" and execute the queue action once the search page finishes loading.
- **Auto-Maximizer**: Can automatically "pull up" the player UI when a song is requested to show the listener that their request was successful.
- **Background Media Proxy**: Implements a `PROXY_FETCH_IMAGE` protocol in `background.ts` to fetch album art on behalf of the content script, bypassing CORS restrictions that otherwise prevent palette extraction in Firefox.

---

## ⚙️ 5. Laboratory & Engineering Suite
A comprehensive set of tools for developers and power users.

- **Silent Scripting**: Bypass TTS to debug AI logic at 10x speed.
- **Verbose Logging**: Toggleable deep-trace logging for Prompts, WebSocket messages, and DOM events.
- **Trigger Tuning**: Manually set the "Trigger Point" for DJ segments.
- **Voice Preview**: A cached test system to sample all 10+ DJ personas (Kore, Sulafat, Sadachbia, etc.) across 3 languages.
- **Manual Overrides**: Force-trigger a DJ segment or clear the narrative history instantly.

---

## 🌐 6. Globalization & Localization
Built for a global audience with full localization for:
- **English**: Standard and variety drive-time styles.
- **Czech (Čeština)**: Fully localized DJ names and grammar logic.
- **Japanese (日本語)**: Localized personas (e.g., "Sam", "Sora") with appropriate honorifics and tones.
- **Dynamic CSS**: Injected scripts handle the specific "Play Next" and "Action Menu" text in these languages.
