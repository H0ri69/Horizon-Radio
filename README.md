# <p align="center"><img src="public/banner.png" alt="Horizon Radio Banner" width="100%"></p>

# 🎙️ Horizon Radio: The AI Radio Revolution

**Horizon Radio** is a premium Chrome Extension that transforms your YouTube Music experience into a live, professional radio broadcast. Powered by Google's cutting-edge **Gemini 2.5** models, Horizon Radio acts as your personal AI Radio Host/DJ, providing context-aware intros, charismatic banter, and seamless transitions between your favorite tracks.

---

## ✨ Key Features

### 🎧 Persistent AI DJ
- **Contextual Scripting**: Uses `gemini-2.5-flash` to generate scripts based on your current song, next track, and even the "vibe" of your artist history.
- **High-Fidelity TTS**: Powered by `gemini-2.5-flash-preview-tts` for natural-sounding, expressive radio host voices.
- **Dynamic Dual DJ Mode**: Experience lively banter between two hosts (e.g., Nataly & Alex) with distinct personalities and authentic conversational flow.
- **Smart Transitions**: The DJ "ducks" the music volume just like a real station when speaking, using smooth UI-integrated volume transitions.

### 📞 Live Call Ecosystem
- **Remote Guest Calls**: Guests can join your "broadcast" via a dedicated Remote Client.
- **QR Code Pairing**: Instant connection between the extension and remote callers via encrypted pairing codes.
- **Song Requests**: Guests can request songs live, which the AI DJ will acknowledge and queue up automatically using smart "Play Next" logic.

### 🎨 Premium Design Aesthetics
- **Glassmorphism UI**: A sleek, modern interface that floats over YouTube Music with vibrant gradients and blur effects.
- **Dynamic Animations**: Powered by **Framer Motion** for liquid-smooth transitions and reactive UI elements.
- **Contextual Themes**: The UI colors adapt to the currently playing album art for a fully immersive experience.

### ⚙️ Professional Controls
- **Verbose Logging**: Keep track of the AI's "thought process" with a toggleable debug mode.
- **Customizable Logic**: Adjust how often the DJ speaks, the "ducking" depth, and voice profiles.

---

## 🏗️ Architecture

The project consists of three main components:

1.  **The Extension**: The core "brain" running on `music.youtube.com`. Manages the state machine, scrapers, and local audio control.
2.  **The Relay Server**: A lightweight WebSocket server that bridges the gap between the Extension and the outside world.
3.  **The Remote Client**: A mobile-friendly web app allowing anyone to call in and interact with your session.

---

## 📥 Downloads


| Browser | Download Link | Installation Guide |
| :--- | :--- | :--- |
| **Firefox** 🦊 | [**Download Latest Release**](https://github.com/H0ri69/Horizon-Radio/releases/latest) | 1. Go to `about:addons` <br> 2. Gear Icon ⚙️ → "Install Add-on From File" |
| **Chrome** 🔵 | [**Download Latest Release**](https://github.com/H0ri69/Horizon-Radio/releases/latest) | 1. Extract ZIP <br> 2. `chrome://extensions` → "Load Unpacked" |

> **Note**: Firefox users on the standard release channel may need to wait for store approval or use **Firefox Developer Edition** to install unsigned extensions.

---

## 🚀 Developer Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)
- A **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/))

### Installation

1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/H0ri69/Horizon-Radio.git
    cd Horizon-Radio
    ```

2.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

3.  **Configure API Key**:
    You have two options to set your Google Gemini API Key:
    - **In Settings**: After loading the extension, click the ⚙️ icon on the YouTube Music page and paste your key into the settings modal.
    - **Via Environment Variables**: Create a `.env` file in the root:
      ```env
      GEMINI_API_KEY=your_key_here
      ```

### 🏃 Running & Loading

The easiest way to get started is to build the extension for both browsers at once.

1.  **Build the Project**:
    ```bash
    pnpm build
    ```
    This creates:
    - `dist/chrome/` (for Chrome)
    - `dist/firefox/` (for Firefox)

2.  **Load Extension**:

    **🔵 Chrome**:
    - Go to `chrome://extensions/`
    - Enable **Developer mode** (top right).
    - Click **Load unpacked**.
    - Select the `dist/chrome` folder.

    **🦊 Firefox**:
    - Go to `about:debugging#/runtime/this-firefox`
    - Click **Load Temporary Add-on...**
    - Select `dist/firefox/manifest.json`.
    - *(Note: For permanent install in Firefox Developer Edition, set `xpinstall.signatures.required` to `false` in `about:config`, then install via `about:addons` > "Install from file" selecting the zip created in dist/firefox).*



## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Animations**: Framer Motion
- **Extension**: Vite + CRXJS (Manifest V3)
- **AI**: Google Generative AI (`gemini-2.5-flash`, `gemini-2.5-flash-preview-tts`)
- **Real-time**: WebSockets (WS)
- **Color Extraction**: Node-Vibrant & ColorJS.io

---

## 📄 License
This project is for educational and creative purposes. Ensure you comply with Google Gemini's Terms of Service when using your API key.

---
<p align="center">Made with ❤️ for the music community.</p>
