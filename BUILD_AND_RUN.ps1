# Smart Home App - Build and Run Script (PowerShell)
# This script builds and deploys the app to your connected Android device

Write-Host "========================================"
Write-Host "Smart Home App - Build and Run"
Write-Host "========================================"
Write-Host ""

# Check if device is connected
Write-Host "Checking for connected devices..."
$devices = & adb devices
if ($devices -match "device$") {
    Write-Host "✓ Device found and connected"
} else {
    Write-Host "✗ No device found! Please connect your Android phone."
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 1: Starting Metro Bundler in background..."
cd c:\Users\ar774\SmartHomeApp

# Start Metro bundler in a new window
$metroProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm start -- --reset-cache" -PassThru -WindowStyle Normal
Write-Host "Metro Bundler PID: $($metroProcess.Id)"

Write-Host "Waiting 12 seconds for Metro to initialize..."
Start-Sleep -Seconds 12

Write-Host ""
Write-Host "Step 2: Building and deploying to device..."
Write-Host ""

npm run android

Write-Host ""
Write-Host "========================================"
Write-Host "✓ Build and deployment complete!"
Write-Host "The app should be launching on your phone..."
Write-Host "========================================"
Write-Host ""
Write-Host "Press Enter to continue..."
Read-Host
