# Build Instructions for Mozilla Reviewers

This document explains how to build the **AI Radio for YouTube Music** Firefox extension from source code.

## Prerequisites

### Required Software
- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **pnpm**: v8 or higher (install via `npm install -g pnpm`)

### Verification
```bash
node --version   # Should be v18+
pnpm --version   # Should be 8+
```

---

## Build Steps

### 1. Extract Source Code
Unzip the source code archive to a directory of your choice.

### 2. Install Dependencies
```bash
cd <extraction-directory>
pnpm install
```

This will install all dependencies listed in `package.json` using the exact versions specified in `pnpm-lock.yaml`.

### 3. **IMPORTANT**: Extract Sweeper Audio Files

The sweeper audio files are provided in a **separate archive** (`horizon-radio-sweepers-YYYYMMDD.zip`) uploaded alongside this source code package.

```bash
# 1. Extract the sweepers archive
unzip horizon-radio-sweepers-YYYYMMDD.zip

# 2. This will create src/assets/ directory with all sweeper files
#    The directory structure is already correct - no need to move files
```

**Why separate?** Mozilla's file validator rejects the `src/assets/` directory name, so the audio files must be provided separately.

### 4. Build the Firefox Extension
```bash
pnpm build:firefox
```

This command:
- Compiles TypeScript to JavaScript
- Transpiles React/JSX components
- Processes Tailwind CSS
- Bundles all files using Vite
- Outputs the built extension to `dist/firefox/`

**Build time**: Approximately 5-15 seconds on modern hardware.

### 5. Verify the Build
The output directory `dist/firefox/` should contain:
- `manifest.json` - Extension manifest (Firefox-specific)
- `icon.png` - Extension icon (128x128px)
- `assets/` - Bundled JavaScript, CSS, and audio files
- `service-worker-loader.js` - Background script loader

---

## Build Configuration

### Key Files
- **`vite.config.ts`**: Main build configuration
- **`tailwind.config.js`**: CSS processing configuration
- **`postcss.config.js`**: PostCSS configuration
- **`tsconfig.json`**: TypeScript compiler options
- **`manifest.firefox.json`**: Source manifest (copied to dist as manifest.json)

### Environment Variables
The extension requires a **Google Gemini API Key** to function, but this is **NOT needed for building**. Users provide their own API key through the extension settings UI after installation.

**No `.env` file is required for the build process.**

---

## Reproducibility

### Deterministic Builds
The build uses:
- **pnpm** for lockfile-based dependency resolution (exact versions)
- **Vite** in production mode for consistent output
- **No random or time-based code generation**

### Expected Output
The built extension in `dist/firefox/` should be functionally identical to the submitted `.zip` file. File hashes may differ slightly due to Vite's build timestamps, but the code logic will be identical.

---

## Development vs Production

### Differences
- **Development** (`pnpm dev`): Uses hot module reloading, outputs to `dist/chrome/`
- **Production** (`pnpm build:firefox`): Minified, optimized, outputs to `dist/firefox/`

### Firefox-Specific Build
The Firefox build differs from Chrome in:
- Uses `manifest.firefox.json` instead of `manifest.json`
- Includes Firefox-specific polyfills
- Sets `TARGET_BROWSER=firefox` environment variable

This is controlled by the build script in `package.json`:
```json
"build:firefox": "cross-env TARGET_BROWSER=firefox vite build"
```

---

## Troubleshooting

### Issue: `pnpm: command not found`
**Solution**: Install pnpm globally:
```bash
npm install -g pnpm
```

### Issue: Build fails with "out of memory"
**Solution**: Increase Node.js memory limit:
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm build:firefox
```

### Issue: Wrong Node.js version
**Solution**: Use Node.js v18 or higher. Consider using [nvm](https://github.com/nvm-sh/nvm) to manage versions.

---

## Source Code Structure

```
Horizon-Radio/
├── src/                    # Source code
│   ├── content.tsx        # Main content script
│   ├── background.ts      # Service worker
│   ├── components/        # React UI components
│   ├── services/          # AI & API services
│   ├── config/            # Configuration & constants
│   └── utils/             # Utility functions
├── manifest.firefox.json  # Firefox manifest source
├── vite.config.ts         # Build configuration
├── package.json           # Dependencies & scripts
├── pnpm-lock.yaml         # Dependency lock file
└── dist/firefox/          # Build output (generated)
```

---

## Contact

For build-related questions, please contact the extension maintainer through the Firefox Add-on Developer Hub.

---

**Build Date**: 2026-01-13  
**Extension Version**: 1.0.0  
**Builder**: Vite 6.2.0  
**Target**: Firefox 140+
