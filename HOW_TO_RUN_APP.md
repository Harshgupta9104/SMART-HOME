# How to Run SmartHomeApp

**Updated:** June 3, 2026  
**Build Status:** Currently Building 🔄

---

## Current Status

✅ **Metro Dev Server:** Running on http://localhost:8081  
🔄 **Android Build:** In Progress (Gradle initializing...)  

---

## Prerequisites

Before running the app, ensure you have:

- [ ] Android SDK installed
- [ ] Android device connected OR emulator running
- [ ] USB Debugging enabled (if using physical device)
- [ ] Node.js and npm installed
- [ ] React Native CLI installed

---

## Quick Start - Running on Android

### Option 1: With Connected Device (Recommended)

**Step 1: Connect Android Phone**
```bash
# Connect phone via USB cable
# Enable Developer Options (Settings → About → Build Number × 7)
# Enable USB Debugging (Settings → Developer Options)
```

**Step 2: Verify Connection**
```bash
adb devices
# Should show your device with ID
```

**Step 3: Start the App**
The app should be building and installing automatically. If not:
```bash
npm run android
```

**Step 4: See App on Device**
- App automatically installs to your phone
- Metro debugger connects
- App launches with success animation
- See your device provisioning flow!

---

### Option 2: With Android Emulator

**Step 1: Start Emulator**
```bash
# First, list available emulators:
emulator -list-avds

# Then start one (e.g., Pixel_5):
emulator -avd Pixel_5
```

**Step 2: Verify Emulator Started**
```bash
adb devices
# Should show emulator in list
```

**Step 3: Run App**
```bash
npm run android
```

**Step 4: Watch Build Process**
- Gradle compiles code
- APK builds and installs
- Emulator installs app automatically
- App launches on emulator screen

---

## Build Progress Overview

The build is currently going through these phases:

```
Phase 1: Gradle Initialization ................ 🔄 Current
Phase 2: JavaScript Bundling ................. ⏳ Next (5-10 min)
Phase 3: Kotlin/Java Compilation ............ ⏳ Next (2-5 min)
Phase 4: APK Building ....................... ⏳ Next (1-2 min)
Phase 5: Installation ...................... ⏳ Next (20-30 sec)
Phase 6: App Launch ........................ ⏳ Next (5-10 sec)
```

**Estimated Total Build Time:** 10-20 minutes (first build is slower)

---

## What You'll See

### On First Launch
1. **Startup Screen** (3.5 seconds)
   - Splash animation plays
   - Permission explanation shows
   - Onboarding begins

2. **Permission Requests**
   - Bluetooth permission
   - Location permission
   - Storage permission
   - Notification permission

3. **Home Screen**
   - Device list (empty initially)
   - "Add Device" button (pink FAB)
   - Ready to provision devices!

---

## Testing the App

### Test BLE Provisioning

**Requirements:**
- ESP32 device with provisioning firmware running
- Advertising as "PROV_*" 
- In Bluetooth range (~10 meters)

**Steps:**
1. Tap "Add Device" button
2. See "SimpleBleProvisionScreen" with BLE scan
3. Select your ESP32 device
4. Enter device name, type, and room
5. Select WiFi network and password
6. Watch success animation (2.2 seconds)
7. Device appears on HomeScreen!

### Test Device Control

**After device is provisioned:**
1. Tap device on HomeScreen
2. Open "Controller" tab
3. Tap LED bulb to toggle ON/OFF
4. Watch LED respond in real-time
5. Tap relay button to control relay
6. Verify relay toggles on ESP32

### Test Metrics Display

1. Tap "Metrics" tab
2. See sensor data:
   - Soil moisture ring (circular progress)
   - Temperature (°C)
   - Humidity (%)
   - WiFi signal strength (RSSI)
   - Uptime (hours)
   - Free heap (KB)

### Test Notifications

1. Device goes online → notification appears
2. Tap notification to see details
3. Switch to NotificationScreen
4. See Activity and Settings tabs
5. Mark as read, delete, or disable types

---

## Terminal Commands

### Build & Run
```bash
# Clean and rebuild everything
npm run clean
npm run android

# Just run on connected device/emulator
npm run android

# Start only Metro dev server
npm start

# Run Metro with specific port
npm start -- --port 8082
```

### Development
```bash
# Check for errors
npm run lint

# Type checking
npm run type-check

# Format code
npm run format

# Run tests (if configured)
npm test
```

### Utilities
```bash
# Clear Metro cache
npm start -- --reset-cache

# Kill Metro on port 8081
npx kill-port 8081

# Check connected devices
adb devices

# Install specific device
adb install -r path/to/app.apk
```

---

## Troubleshooting

### Build Fails with "gradle not found"
```bash
# Install Gradle
npm install

# Or use:
cd android
./gradlew.bat clean build
```

### No Devices Found
```bash
# Check ADB daemon
adb kill-server
adb start-server
adb devices

# Enable USB debugging on phone
# Settings → Developer Options → USB Debugging
```

### Port 8081 Already in Use
```bash
# Kill process on that port
npx kill-port 8081

# Or use different port:
npm start -- --port 8082
```

### App Crashes on Startup
1. Check Metro dev server is running
2. Check all permissions are granted
3. Look at console output for errors
4. Clear app cache: Settings → Apps → SmartHomeApp → Clear Cache

### BLE Device Not Found
1. Check ESP32 has provisioning firmware
2. Check device is advertising as "PROV_*"
3. Check Bluetooth is turned on
4. Check you have Bluetooth permissions
5. Move closer to device (BLE range ~10 meters)

### WiFi Not Showing in Scan
1. Enable Location Services (Android requirement)
2. Grant Location permissions to app
3. Check WiFi is enabled on phone
4. Check device is 2.4GHz (not 5GHz)

---

## Real-Time Development

### Hot Reload
While Metro is running, changes auto-reload:
1. Save file in editor
2. Metro recompiles code (2-5 seconds)
3. App automatically reloads
4. See changes instantly!

### Dev Menu
Shake device or press:
- Android Emulator: `Ctrl+M` or Menu button
- Physical Device: Shake or long-press home button

Dev menu options:
- Reload JavaScript
- Enable remote debugging
- Toggle performance monitoring
- Show network logs

---

## Build Artifacts

### Debug Build (Currently Building)
- **Location:** `android/app/build/outputs/apk/debug/`
- **Size:** ~100-120 MB
- **Purpose:** Development and testing
- **Installable:** Yes

### Release Build (Already Built)
- **Location:** `android/app/build/outputs/apk/release/app-release.apk`
- **Size:** 62.99 MB
- **Purpose:** Production deployment
- **Installable:** Yes
- **Signed:** Yes (release key)

---

## Next Steps After Running

### Immediate
1. ✅ See app launch on device/emulator
2. ✅ Grant permissions
3. ✅ See Home screen with "Add Device" button

### Testing
4. ✅ Connect ESP32 device
5. ✅ Tap "Add Device"
6. ✅ Complete provisioning flow
7. ✅ Test device control
8. ✅ Test metrics display
9. ✅ Test notifications

### Development
10. Make code changes
11. See hot reload on device
12. Repeat testing

---

## Important Notes

### First Build Takes Longer
- Downloads all dependencies
- Compiles Kotlin/Java for first time
- Bundles JavaScript
- **Patience required:** 10-20 minutes typical

### Subsequent Builds Are Faster
- Incremental compilation
- Cached dependencies
- **Expected time:** 1-3 minutes

### Metro Must Stay Running
- Keep Metro dev server running in background
- App reloads from Metro on changes
- Close Metro with `Ctrl+C` when done

### Device Must Be Debuggable
- USB Debugging enabled (physical device)
- Developer mode enabled (emulator)
- ADB recognizes device

---

## Performance Tips

### Speed Up Build
```bash
# Skip unnecessary builds
npm run android -- --no-warn-deprecated

# Use daemon (faster subsequent builds)
cd android
./gradlew.bat :app:installDebug
```

### Reduce Bundle Size
- Tree-shaking unused code
- Lazy load components
- Optimize images

### Debug Mode Options
- Toggle Performance Monitor (dev menu)
- Use React DevTools
- Monitor Metro bundler logs
- Check ADB logcat

---

## File Locations

| File | Location |
|------|----------|
| App Entry | `App.tsx` |
| Main Screen | `src/screens/HomeScreen.tsx` |
| Provisioning | `src/screens/SimpleBleProvisionScreen.tsx` |
| WiFi Setup | `src/screens/WiFiProvisioningScreen.tsx` |
| Metrics | `src/screens/MetricsScreen.tsx` |
| Services | `src/services/` |
| Navigation | `src/navigation/RootNavigator.tsx` |

---

## Support & Documentation

### For Questions
- Read: **APP_WORKFLOW.md** (complete workflow)
- Read: **DOCUMENTATION_INDEX.md** (navigation guide)
- Check: **COMPLETE_REFERENCE_GUIDE.md** (quick reference)

### For Troubleshooting
- Section 12 of APP_WORKFLOW.md
- Troubleshooting in MQTT_WORKFLOW.md
- BLE issues in BLE_PROVISIONING_WORKFLOW.md

---

## Monitoring Build Progress

### Check Build Status
```bash
# In another terminal, watch the build:
adb logcat | grep SmartHomeApp
```

### See Detailed Logs
```bash
# Full Gradle output
cd android
./gradlew.bat :app:installDebug --info
```

### Monitor Metro
- Terminal should show:
  - Module resolution progress
  - Bundling progress
  - "Bundle complete!" message

---

**Status:** Build in progress 🔄  
**Expected Completion:** 10-20 minutes  
**Action:** Wait for build to complete, then device will show the app!

