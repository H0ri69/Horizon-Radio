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

1.  **Start the development server**:
    ```bash
    pnpm dev
    ```
    This will start the Vite development server. The project is configured to use `@crxjs/vite-plugin` for Chrome extension development.

2.  **Load the extension in Chrome**:
    - Open Chrome and navigate to `chrome://extensions/`.
    - Enable **Developer mode** (toggle in the top right).
    - Click **Load unpacked**.
    - Select the `dist` folder generated in the project directory after running the dev server.

3.  **Usage**:
    - Navigate to [YouTube Music](https://music.youtube.com/).
    - The extension will inject its components into the page.
    - Interact with the AI DJ via the popup or content script interface.

## Build

To build the extension for production:
```bash
pnpm build
```
The production-ready files will be in the `dist` directory.
