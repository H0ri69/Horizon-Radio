import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifestChrome from './manifest.json';
import manifestFirefox from './manifest.firefox.json';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', '');
  const browser = process.env.TARGET_BROWSER || 'chrome';
  const manifest = browser === 'firefox' ? manifestFirefox : manifestChrome;

  return {
    build: {
      outDir: browser === 'firefox' ? 'dist/firefox' : 'dist/chrome',
      emptyOutDir: true,
    },
    server: (browser === 'firefox' && command === 'build') ? undefined : {
      port: browser === 'firefox' ? 3001 : 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      crx({ manifest, browser: browser === 'firefox' ? 'firefox' : 'chrome' })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.TARGET_BROWSER': JSON.stringify(browser),
      'import.meta.env.VITE_RELAY_URL': JSON.stringify(
        env.VITE_RELAY_URL || (mode === 'production' ? 'wss://horizon-api.matejpesl.cz' : 'ws://127.0.0.1:8765')
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
