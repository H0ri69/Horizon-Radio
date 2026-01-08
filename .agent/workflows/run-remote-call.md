---
description: How to run the Remote Live Call ecosystem (Relay Server + Remote Client + Extension)
---

To get the **Remote Live Call** feature running, you need to have three separate components active. 

### 1. The Relay Server
This is the "bridge" that connects your phone to your computer.
// turbo
1. Open a new terminal and run:
   ```bash
   cd relay-server
   pnpm start
   ```
   *The server will start on `ws://localhost:8080`.*

### 2. The Remote Client (Phone UI)
This is the interface you'll open on your phone (or in another browser tab).
// turbo
1. Open another terminal and run:
   ```bash
   cd remote-client
   pnpm dev
   ```
2. **On your phone:** Open the URL shown in the terminal (usually `http://192.168.x.x:5173`).
   *Note: Your phone and computer must be on the same Wi-Fi network.*

### 3. The Browser Extension
The main Hori-s.FM extension that lives on YouTube Music.
// turbo
1. In your main project terminal, run:
   ```bash
   pnpm dev
   ```
2. Ensure the extension is loaded in Chrome from the `dist/` folder.
3. Open [YouTube Music](https://music.youtube.com).

### Pairing Flow
1. Open the **Live Studio Call** modal in the extension.
2. Switch to the **Remote Caller** tab. Note the **Pairing Code** (e.g., `8X2-A9D`).
3. On your phone client:
   - Enter your **Display Name**.
   - Enter the **Studio Code** from above.
   - Tap **Connect**.
4. Once connected, the extension will show `CALLER: [Name]`.
5. Enter the song/message details in the extension and click **Go Live Now**.
6. When the DJ intro triggers, your phone will turn into a live microphone!
