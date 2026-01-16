# PowerShell Script to create source package for Mozilla
# Creates a clean ZIP with only essential source files
# Uses tar.exe for reliability.

$dateStr = "20260116-v1.0.2"
$archiveName = "horizon-radio-source-$dateStr.zip"
$stagingDir = "source_pkg_staging"
$finalArchivePath = Join-Path (Get-Location) $archiveName

Write-Host "`n📦 Creating Mozilla Source Code Package ($dateStr)" -ForegroundColor Cyan
Write-Host "====================================================`n" -ForegroundColor Cyan

# Cleanup
if (Test-Path $archiveName) { 
    Remove-Item $archiveName -Force 
    Write-Host "  🗑️  Removed old archive" -ForegroundColor Gray
}
if (Test-Path $stagingDir) { 
    Remove-Item $stagingDir -Recurse -Force 
    Write-Host "  🗑️  Cleaned up old staging directory" -ForegroundColor Gray
}

# Create staging directory
New-Item -ItemType Directory -Path $stagingDir | Out-Null
Write-Host "  📂 Created staging directory" -ForegroundColor Gray

# Files to include
$filesToCopy = @(
    "manifest.firefox.json",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    "icon.png",
    "README.md",
    "build-firefox.js",
    "BUILD_INSTRUCTIONS_FIREFOX.md",
    "SOURCE_CODE_README.md",
    "create-source-package.ps1"
)

foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $stagingDir
    } else {
        Write-Warning "  ⚠️  File not found: $file"
    }
}

# Copy src directory (INCLUDING sweepers)
Write-Host "  Use Copy-Item to copy src..." -ForegroundColor Gray
Copy-Item "src" -Destination $stagingDir -Recurse

# Archive using tar
Write-Host "  📦 Compressing archive (using tar)..." -ForegroundColor Cyan
Push-Location $stagingDir
try {
    # -a for auto-detect compression (zip), -c for create, -f for filename
    # We exclude nothing, picking up everything in staging
    tar -a -c -f "..\$archiveName" *
}
catch {
    Write-Error "Failed to run tar: $_"
}
finally {
    Pop-Location
}

# Cleanup Staging
Remove-Item $stagingDir -Recurse -Force
Write-Host "  🧹 Cleanup staging" -ForegroundColor Gray

# Verify
if (Test-Path $archiveName) {
    $size = [math]::Round((Get-Item $archiveName).Length / 1MB, 2)
    Write-Host "`n✅ Package created successfully!" -ForegroundColor Green
    Write-Host "   File: $archiveName" -ForegroundColor Cyan
    Write-Host "   Size: $size MB" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Failed to create archive!" -ForegroundColor Red
    exit 1
}
