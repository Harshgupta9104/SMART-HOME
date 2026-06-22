@echo off
REM Smart Home App - Build and Run Script
REM This script builds and deploys the app to your connected Android device

echo ========================================
echo Smart Home App - Build and Run
echo ========================================
echo.

echo Step 1: Starting Metro Bundler...
start "Metro Bundler" cmd /k "cd c:\Users\ar774\SmartHomeApp && npm start -- --reset-cache"

echo Waiting 10 seconds for Metro to start...
timeout /t 10 /nobreak

echo.
echo Step 2: Building and deploying to device...
cd c:\Users\ar774\SmartHomeApp
npm run android

echo.
echo ========================================
echo Build and deployment complete!
echo The app should be launching on your phone...
echo ========================================
echo.
pause
