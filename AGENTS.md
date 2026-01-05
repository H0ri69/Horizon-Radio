# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hori-s.FM is an AI-powered DJ Chrome extension for YouTube Music that generates contextual voiceovers during song transitions using Google's Gemini API. The extension injects React components into YouTube Music's interface and uses a background service worker for AI generation.

## Common Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server (outputs to dist/)
pnpm build            # Production build
```

### Loading Extension in Chrome
1. Navigate to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the `dist` folder

### Environment Setup
Create `.env` file in root:
```
GEMINI_API_KEY=your_api_key_here
```

## Architecture

### Extension Structure (Chrome Manifest V3)

**Content Script** (`src/extension/content.tsx`)
- Entry point that runs on `music.youtube.com/*`
- Implements main event loop (1-second interval)
- Manages DJ state machine: `IDLE → GENERATING → READY → PLAYING → COOLDOWN`
- Parses YouTube Music DOM for song info (title, artist, queue context)
- Handles audio ducking via Web Audio API
- Mounts React app into YouTube Music UI using React portals

**Background Service Worker** (`src/extension/background.ts`)
- Handles `GENERATE_INTRO` messages from content script
- Calls `geminiService.generateDJIntro()`
- Manages narrative history storage (last 5 transitions)
- Converts audio ArrayBuffer to Base64 for messaging

**React Components** (`src/extension/components/`)
- `InjectedApp.tsx` - Main React root, uses portals to inject into YouTube Music
- `PlayerControls.tsx` - Extension UI controls
- `SettingsModal.tsx` - User settings interface
- Theme system in `src/extension/themes/`

### AI Service Layer (`services/geminiService.ts`)

This is the core AI orchestration module:

**Two-Stage Generation Pipeline:**
1. **Script Generation** (`generateScript`) - Uses `gemini-2.5-flash` with Google Search grounding to create DJ dialogue based on style/voice/context
2. **Text-to-Speech** (`speakText`) - Uses `gemini-2.5-flash-preview-tts` to synthesize audio from script

**Key Features:**
- Retry logic with exponential backoff for API failures (429, 500, 503)
- Text cleaning before TTS (removes stage directions, emojis, brackets)
- WAV header generation and PCM audio concatenation
- Dual DJ mode with dialogue synthesis between two voices
- Time-of-day context and narrative history for continuity

**Voice & Style System:**
- Voice profiles defined in `src/config/constants.ts` (Charon, Kore, Puck, Fenrir, Zephyr)
- DJ styles in `src/config/prompts.ts`: Standard, Chill, Technical, Minimal, Custom, Drunk
- Each voice has acting directions for script generation AND TTS instructions
- Prompts include playlist context, history, and time-of-day

### Data Flow

```
YouTube Music DOM
    ↓ (parsing)
Content Script (state machine)
    ↓ (chrome.runtime.sendMessage)
Background Worker
    ↓ (generateDJIntro call)
Gemini Service
    ↓ (script + TTS)
Background Worker (stores history)
    ↓ (Base64 audio response)
Content Script (plays audio + ducks music)
```

### State Management

**Content Script State:**
- `currentSongSig` - Unique identifier for current song (title|artist)
- `bufferedAudio` - Base64-encoded WAV ready to play
- `generatedForSig` - Context validation (discards stale generations)
- Tracks song changes, seeks, and transition timing

**Chrome Storage:**
- `horisFmSettings` - User preferences (voice, style, language, dualDjMode)
- `narrativeHistory` - Last 5 transitions for continuity

### Timing Logic

- Generation triggers when `timeLeft < 45s && timeLeft > 10s`
- Guards: `currentTime >= 20s` and `5s` since last song change
- Playback triggers when `timeLeft < 12s`
- Cooldown period: 5 seconds after playback ends

## Important Technical Details

### Environment Variable Access
Vite exposes `GEMINI_API_KEY` as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` via `vite.config.ts` define block.

### Audio Processing
- TTS returns PCM audio as Base64
- Service layer adds WAV headers (24kHz, 16-bit, mono)
- Dual DJ mode strips headers, concatenates PCM, re-applies single header
- Web Audio ducking: reduces YouTube Music gain to 0.2 during voiceover

### DOM Parsing Strategy
Content script uses robust queue detection with validation:
1. Trust `selected` attribute on queue item
2. Validate against currently playing title
3. Fall back to title-matching scan if mismatch

### Extension Communication
Uses `chrome.runtime.sendMessage` with callbacks (not async/await) due to service worker lifecycle constraints.

### TypeScript Configuration
- Uses path alias `@/*` pointing to root
- `allowImportingTsExtensions: true` for Vite compatibility
- Chrome types available via `@types/chrome`

## Modifying DJ Behavior

**Add New Voice:**
1. Add to `VOICE_PROFILES` in `src/config/constants.ts`
2. Add acting directions to `VOICE_DIRECTIONS` in `src/config/prompts.ts`
3. Add TTS instructions to `TTS_INSTRUCTIONS`

**Add New Style:**
1. Add to `DJStyle` enum in `types.ts`
2. Add prompt template to `DJ_STYLE_PROMPTS` in `src/config/prompts.ts`

**Modify Generation Behavior:**
- Edit `generateDJIntro` function in `services/geminiService.ts`
- Adjust prompt templates in `src/config/prompts.ts`
- Change timing thresholds in `content.tsx` main loop

## Common Gotchas

- Extension reloads invalidate `chrome.runtime.id` - content script detects this and stops gracefully
- Song changes during generation: responses are validated against `generatedForSig` before playback
- Dual DJ mode expects format `[VoiceName]: Text` in generated script
- Text cleaning is critical - TTS fails on stage directions like `*laughs*` or `[nervously]`
- Service worker storage access wrapped in try-catch due to context invalidation risk
