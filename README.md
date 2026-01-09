# Hori-s.FM AI DJ

AI Radio Host extension for YouTube Music. This project uses React, Vite, and the Google Gemini API to provide an interactive DJ experience within the browser.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) (v8 or higher)

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd Hori-s.FM
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory and add your Google Gemini API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

## Running the Project

### Full Ecosystem (Extension + Remote Call)
To start everything required for remote live calls:
```bash
pnpm start
```
This command uses `concurrently` to launch:
- **Relay Server**: (Port 8765) Handles communication between remote guests and the extension.
- **Remote Client**: (Vite dev server) The web platform for phone callers.
- **Extension**: (Vite + CRXJS) Watches extension files and builds into `dist/`.

### Individual Components
- **Extension Only**: `pnpm dev`
- **Relay Server Only**: `pnpm start:relay`
- **Remote Client Only**: `pnpm start:app`

## Loading the Extension
1.  **Open Chrome** and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `dist` folder in the project directory.

## Usage
- Navigate to [YouTube Music](https://music.youtube.com/).
- The extension will inject its components into the page.
- **Remote Calls**: Copy your **Host Pairing Code** from the extension settings and give it to guests to use in the Remote Client.
- **Local Studio**: Use the "Call Studio" button to talk directly through your PC microphone.

## Build

To build the extension for production:
```bash
pnpm build
```
The production-ready files will be in the `dist` directory.
