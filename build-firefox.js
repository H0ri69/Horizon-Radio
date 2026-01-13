#!/usr/bin/env node

/**
 * BUILD SCRIPT FOR FIREFOX EXTENSION
 * 
 * This script automates the entire build process for Mozilla reviewers.
 * Simply run: node build-firefox.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🦊 Firefox Extension Build Script');
console.log('=====================================\n');

// Step 1: Verify Node.js version
console.log('Step 1: Verifying Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
    console.error(`❌ Node.js v18+ required. Current: ${nodeVersion}`);
    process.exit(1);
}
console.log(`✅ Node.js ${nodeVersion} detected\n`);

// Step 2: Check if pnpm is installed
console.log('Step 2: Checking for pnpm...');
try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ pnpm ${pnpmVersion} detected\n`);
} catch (error) {
    console.error('❌ pnpm not found. Installing...');
    console.log('Please install pnpm: npm install -g pnpm');
    process.exit(1);
}

// Step 3: Install dependencies
console.log('Step 3: Installing dependencies...');
try {
    execSync('pnpm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
}

// Step 4: Build Firefox extension
console.log('Step 4: Building Firefox extension...');
try {
    execSync('pnpm build:firefox', { stdio: 'inherit' });
    console.log('✅ Build completed\n');
} catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
}

// Step 5: Verify output
console.log('Step 5: Verifying build output...');
const outputDir = path.join(__dirname, 'dist', 'firefox');
const requiredFiles = ['manifest.json', 'icon.png'];

let allFilesPresent = true;
for (const file of requiredFiles) {
    const filePath = path.join(outputDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ Found: ${file}`);
    } else {
        console.log(`❌ Missing: ${file}`);
        allFilesPresent = false;
    }
}

if (!allFilesPresent) {
    console.error('\n❌ Build verification failed');
    process.exit(1);
}

console.log('\n🎉 Build completed successfully!');
console.log(`📦 Output location: ${outputDir}`);
console.log('\nNext steps:');
console.log('1. Navigate to chrome://extensions/ (or about:debugging in Firefox)');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the dist/firefox directory');
