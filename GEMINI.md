# GEMINI.md

This file serves as a comprehensive guide for the Gemini agent working on the Horizon Radio project.

## Project Overview

**Horizon Radio** is a Chrome Extension that acts as an AI Radio Host/DJ for YouTube Music (`music.youtube.com`). It uses Google's Gemini API to generate context-aware voice introductions for songs, mimicking a real radio experience.

**Key Technologies:**
-   **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion.
-   **Build Tool:** Vite (with `@crxjs/vite-plugin` for Chrome Extension HMR).
-   **AI:** Google Gemini API (`@google/genai`) for both text generation (script) and TTS (audio).
-   **Target:** Chrome Extension (Manifest V3).

## Architecture

The extension operates via a distinct separation of concerns, orchestrated by the content script.

### 1. Content Script (`src/content.tsx`)
The "brain" of the extension. It runs directly on the YouTube Music page.
-   **State Machine:** Manages the DJ lifecycle: `IDLE` → `GENERATING` → `READY` → `PLAYING` → `COOLDOWN`.
-   **DOM Scraping:** continuously scrapes song info (title, artist, album, queue) from the YouTube Music DOM (`getSongInfo`).
-   **Audio Control:** Manages `AudioContext` to "duck" (lower volume of) the music when the DJ speaks.
-   **UI Injection:** Mounts the React application (`InjectedApp`) into the page via a React Portal.

### 2. Background Service (`src/background.ts`)
The bridge to the outside world.
-   **API Handling:** Receives `GENERATE_INTRO` messages from the content script.
-   **Gemini Integration:** Calls `geminiService.ts` to generate scripts and convert them to audio.
-   **History:** Maintains a narrative history of the last few songs to allow for continuity in DJ banter.

### 3. AI Service Layer (`src/services/geminiService.ts`)
The core logic for content generation.
-   **Two-Step Pipeline:**
    1.  **Script Generation:** Uses `gemini-2.5-flash` to write a DJ script based on current/next song, artist styles, and user preferences.
    2.  **TTS:** Uses `gemini-2.5-flash-preview-tts` to convert the text to PCM audio.
-   **Audio Processing:** Adds WAV headers to raw PCM data so it can be played by the browser.

## Key Directories & Files

| Path | Purpose |
| :--- | :--- |
| `src/content.tsx` | Main event loop, state machine, and DOM scraping logic. |
| `src/background.ts` | Service worker entry point. |
| `src/services/geminiService.ts` | Gemini API interaction (Script + TTS). |
| `src/services/liveCallService.ts` | Logic for "Live Call" simulations. |
| `src/config/prompts.ts` | System prompts and style definitions for the DJ. |
| `src/config/constants.ts` | Voice definitions (`VOICE_PROFILES`) and API constants. |
| `src/components/` | React UI components (Settings, Player Controls). |
| `manifest.json` | Chrome Extension configuration. |

## Development Workflow

### Build & Run
-   **Install Dependencies:** `pnpm install`
-   **Dev Server:** `pnpm dev`
    -   This compiles the extension into `dist/`.
    -   Load `dist/` as an "Unpacked Extension" in `chrome://extensions`.
-   **Build for Production:** `pnpm build`

### Environment Variables
-   Create a `.env` file in the root directory.
-   Required: `GEMINI_API_KEY=AIzaSy...`

## Critical Implementation Details

### Audio Ducking
The extension uses the Web Audio API to create a `GainNode` connected to the YouTube Music `<video>` element.
-   **Duck:** Reduces volume to ~20% (`AUDIO.DUCK_GAIN`).
-   **Unduck:** Ramps volume back to 100%.

### Messaging Limits
-   **No Async/Await in Listeners:** `chrome.runtime.onMessage` listeners in `background.ts` must return `true` to indicate an asynchronous response. Do not mark the listener function itself as `async`.

### Data Flow
1.  **Trigger:** `content.tsx` detects a song is ending (`timeLeft < 20s`).
2.  **Request:** Sends `GENERATE_INTRO` to `background.ts`.
3.  **Generate:** `geminiService` prompts Gemini for a script, then for TTS.
4.  **Response:** `background.ts` sends Base64 WAV audio back to `content.tsx`.
5.  **Playback:** `content.tsx` waits for the perfect moment (`timeLeft < 12s`), ducks the music, plays the audio, and then unducks.

### Troubleshooting
-   **"Extension Context Invalidated":** Occurs if the extension creates a new context (update/reload) while the old content script is running. The content script has logic to detect this and stop safely.
-   **TTS Failures:** Usually caused by "stage directions" (e.g., `*laughs*`) in the text. The pipeline includes regex cleaners to remove these before sending to the TTS model.
