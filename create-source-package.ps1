# Simple WinRAR Source Package Creator
# Creates a clean ZIP with only essential source files

Write-Host "`n📦 Creating Mozilla Source Code Package" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# Find WinRAR
$winrar = "C:\Program Files\WinRAR\WinRAR.exe"
if (-not (Test-Path $winrar)) {
    $winrar = "C:\Program Files (x86)\WinRAR\WinRAR.exe"
}

if (-not (Test-Path $winrar)) {
    Write-Host "❌ WinRAR not found at standard locations!" -ForegroundColor Red
    exit 1
}

# Archive name
$archive = "horizon-radio-source-20260113.zip"

# Remove old archive
if (Test-Path $archive) {
    Remove-Item $archive -Force
}

# Temporarily rename assets
if (Test-Path "src\assets") {
    Move-Item "src\assets" "assets-backup-temp" -Force
    Write-Host "  ⊗ Moved src\assets temporarily" -ForegroundColor Yellow
}

Write-Host "  Creating archive...`n" -ForegroundColor Yellow

# Create archive with specific includes (not excludes)
# This ensures we only get what we want
& $winrar a -afzip $archive `
    "src\" `
    "manifest.firefox.json" `
    "package.json" `
    "pnpm-lock.yaml" `
    "tsconfig.json" `
    "vite.config.ts" `
    "tailwind.config.js" `
    "postcss.config.js" `
    "icon.png" `
    "README.md" `
    "build-firefox.js" `
    "BUILD_INSTRUCTIONS_FIREFOX.md" `
    "SOURCE_CODE_README.md" `
    "create-source-package.ps1" `
    "create-sweepers-package.ps1" | Out-Null

# Restore assets
if (Test-Path "assets-backup-temp") {
    Move-Item "assets-backup-temp" "src\assets" -Force
    Write-Host "  ✓ Restored src\assets`n" -ForegroundColor Green
}

# Report
if (Test-Path $archive) {
    $size = [math]::Round((Get-Item $archive).Length / 1MB, 2)
    Write-Host "✅ Package created: $archive" -ForegroundColor Green
    Write-Host "   Size: $size MB`n" -ForegroundColor Cyan
}
else {
    Write-Host "❌ Failed to create archive!" -ForegroundColor Red
}
