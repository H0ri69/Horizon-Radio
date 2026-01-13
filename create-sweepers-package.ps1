# Create Sweepers Archive for Mozilla
# This creates a separate archive with just the sweeper audio files

$timestamp = Get-Date -Format "yyyyMMdd"
$archiveName = "horizon-radio-sweepers-$timestamp.zip"

Write-Host "`n📦 Creating Sweepers Archive for Mozilla" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Remove existing archive if present
if (Test-Path $archiveName) {
    Remove-Item $archiveName -Force
}

Write-Host "Compressing sweeper audio files...`n" -ForegroundColor Yellow

try {
    # Compress only the sweepers directory
    Compress-Archive -Path "src/assets" -DestinationPath $archiveName -CompressionLevel Optimal
    
    # Get file size
    $fileSize = (Get-Item $archiveName).Length / 1MB
    $fileSizeMB = [math]::Round($fileSize, 2)
    
    Write-Host "✅ Sweepers archive created successfully!" -ForegroundColor Green
    Write-Host "   File: $archiveName" -ForegroundColor Cyan
    Write-Host "   Size: $fileSizeMB MB" -ForegroundColor Cyan
    
    $fullPath = (Get-Item $archiveName).FullName
    Write-Host "`n📤 Upload this file alongside the main source code" -ForegroundColor Cyan
    Write-Host "   Location: $fullPath`n" -ForegroundColor Gray
    
}
catch {
    Write-Host "`n❌ Error creating archive: $_" -ForegroundColor Red
    exit 1
}
