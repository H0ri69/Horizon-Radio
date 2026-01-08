/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: '#0a0a0a',
        surface: '#121212',
        surfaceHighlight: '#1E1E1E',
        primary: '#b0fb5d', // The Hori-s Green
        primaryDim: 'rgba(176, 251, 93, 0.1)',
        secondary: '#ffffff',
        accent: '#b0fb5d',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
