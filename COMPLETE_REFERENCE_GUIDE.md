# SmartHomeApp - Complete Reference Guide

**Version:** 2.0  
**Last Updated:** June 3, 2026  
**Status:** Production Ready

---

## Quick Navigation

### Main Documentation Files
- **[APP_WORKFLOW.md](./APP_WORKFLOW.md)** - Complete application workflow and architecture
- **[BLE_PROVISIONING_WORKFLOW.md](./BLE_PROVISIONING_WORKFLOW.md)** - Device discovery and provisioning
- **[MQTT_WORKFLOW.md](./MQTT_WORKFLOW.md)** - Real-time communication and control

### Integration & Reference
- **[DOCUMENTATION_INTEGRATION_COMPLETE.md](./DOCUMENTATION_INTEGRATION_COMPLETE.md)** - What was integrated and how
- **[DOCUMENTATION_UPDATES_SUMMARY.md](./DOCUMENTATION_UPDATES_SUMMARY.md)** - Previous documentation updates
- **[COMPLETE_REFERENCE_GUIDE.md](./COMPLETE_REFERENCE_GUIDE.md)** - This file

---

## System Architecture Overview

### Communication Channels

```
┌─────────────────────────────────────────────────────────────┐
│              SmartHomeApp Communication Architecture         │
└─────────────────────────────────────────────────────────────┘

PHASE 1: PROVISIONING (BLE)
├─ Discover ESP32 (advertises as "PROV_*")
├─ Connect via BLE
├─ Send WiFi credentials
├─ Receive device ID (MQTT short ID)
└─ Device reboots to apply WiFi settings

PHASE 2: CONNECTED (MQTT)
├─ Device connects to WiFi
├─ Device connects to MQTT broker
├─ App subscribes to device topics
├─ Device publishes sensor data (every 5 seconds)
├─ App can send commands (LED, relay, config)
└─ Device publishes state updates

PHASE 3: CONTROL (Real-time)
├─ User taps LED/relay in app
├─ App sends MQTT command
├─ ESP32 executes command
├─ ESP32 publishes state update
├─ App receives update and displays result
└─ Process repeats (no optimistic updates)
```

---

## Device Provisioning Flow (5 Steps)

### Step 1: Device Discovery
```
User taps "Add Device" on HomeScreen
    ↓
SimpleBleProvisionScreen
    ├─ Starts BLE scan (30 seconds)
    ├─ Filters devices with name "PROV_*"
    ├─ Shows list by signal strength
    └─ User selects device
```

**Key Info:**
- BLE scan is automatic
- Device name format: `PROV_{shortId}`
- Signal strength shown as RSSI (dBm)
- Example: "PROV_26B7B3F8 (-45 dBm)"

---

### Step 2: Device Configuration
```
DeviceConfigScreen
    ├─ Display name
    ├─ Device type (Light, Sensor, etc.)
    ├─ Room assignment (Living Room, Bedroom, etc.)
    └─ User confirms and taps "Next"
```

**Key Info:**
- User configures device properties BEFORE WiFi
- Data is validated
- Device name is used in UI and MQTT topics
- Room assignment for organization

---

### Step 3: WiFi Selection
```
WiFiProvisioningScreen
    ├─ Scan available WiFi networks
    ├─ Show current WiFi first (if available)
    ├─ Show other available networks
    ├─ User selects network
    ├─ User enters password
    ├─ Optionally save password to Keychain
    └─ User taps "Connect Device"
```

**Key Info:**
- Current WiFi is auto-selected if available
- Requires Location Services enabled (Android requirement)
- Password can be saved for auto-fill in future
- Connection attempt starts immediately after confirmation

---

### Step 4: Provisioning & Success Animation
```
WiFiProvisioningScreen (continues)
    ├─ BLE: Send WiFi credentials (JSON)
    ├─ Device reboots (BLE disconnects - NORMAL)
    ├─ App waits for device to reconnect
    ├─ Device boots with WiFi settings
    ├─ Device connects to WiFi
    ├─ Device sends success status
    │
    ├─ SUCCESS ANIMATION (2.2 seconds):
    │  ├─ 0ms - Green circle appears
    │  ├─ 400ms - Checkmark animates in
    │  ├─ 700ms - "Device Added!" message fades in
    │  ├─ 1500ms - Hold on screen
    │  └─ 2200ms - Navigate to HomeScreen
    │
    └─ Device appears in HomeScreen (ready to use)
```

**Key Info:**
- BLE disconnection is EXPECTED (device reboots)
- App gracefully handles disconnection
- 30-second timeout for entire process
- Success animation is inline (not a separate screen)
- Device immediately available after animation

---

### Step 5: Device Ready
```
HomeScreen
    ├─ Device appears in list
    ├─ Device status: "online"
    ├─ MQTT subscriptions active
    ├─ Sensor data flowing
    └─ User can control device
```

**Key Info:**
- Device is now fully provisioned
- WiFi credentials saved to device storage
- MQTT connection established
- All controls and metrics available
- Device persists in AsyncStorage

---

## BLE Technical Details

### UUIDs
```
Provisioning Service:       4fafc201-1fb5-459e-8fcc-c5c9c331914b
  └─ Provisioning Char:     beb5483e-36e1-4688-b7f5-ea07361b26a8
     Properties: Write, Notify
     Purpose: Send WiFi credentials, receive confirmations

Device ID Service:          12345678-1234-1234-1234-1234567890ab
  └─ Device ID Char:        12345678-1234-1234-1234-1234567890cd
     Properties: Read
     Purpose: Read MQTT device ID (short ID)
```

### BLE Communication
```
App writes to Provisioning Char:
{
  "ssid": "MyNetwork",
  "password": "MyPassword"
}

Device reads and parses JSON
Device attempts WiFi connection
Device reboots if connection successful

After reboot:
Device publishes "wifi_saved" via BLE notification
App receives notification and completes provisioning
```

---

## MQTT Topics & Communication

### Topic Structure
```
All topics use device short ID (e.g., "26B7B3F8")
Format: esp32/{id}/[purpose]/[action]
```

### Subscribe Topics (ESP32 → App)
```
esp32/{id}/data
  └─ Sensor data (every 5 seconds)
     {
       "device": "ESP32_26B7B3F8",
       "fw": "3.0.0",
       "uptime": 5615,
       "rssi": -51,
       "heap": 112680,
       "soil_pct": 45,
       "temperature": 28.5,
       "humidity": 65,
       "led": true,
       "relay": false
     }

esp32/{id}/status
  └─ Online/offline status

esp32/{id}/led/state
  └─ LED state (ON/OFF)

esp32/{id}/relay/state
  └─ Relay state (ON/OFF)
```

### Publish Topics (App → ESP32)
```
esp32/{id}/led/set
  └─ LED command: "ON" or "OFF"

esp32/{id}/relay/set
  └─ Relay command: "ON" or "OFF"

esp32/{id}/config
  └─ Configuration commands (WiFi update, factory reset, etc.)
```

---

## Control Flow Examples

### LED Toggle
```
User taps bulb in ControllerScreen
    ↓
App sends MQTT: esp32/{id}/led/set = "ON" (or "OFF")
    ↓
Button locked for 2 seconds
    ↓
ESP32 receives command
    ├─ Toggles LED on GPIO pin
    └─ Publishes: esp32/{id}/led/state = new state
    ↓
App receives state update
    ├─ Shows glow animation if ON
    ├─ Hides glow animation if OFF
    └─ Unlocks button
```

**Key Points:**
- No optimistic updates (waits for actual response)
- Button locked during operation
- Real device state always reflected
- Animation provides feedback

### Relay Toggle
```
User taps relay button in ControllerScreen
    ↓
Same flow as LED toggle, but:
    ├─ Command sent to: esp32/{id}/relay/set
    ├─ GPIO23 controlled
    └─ State published to: esp32/{id}/relay/state
```

---

## Notification System

### Notification Types
```
- device     → Device online/offline, connection status
- firmware   → Firmware updates, alerts
- activity   → User actions, device events
- security   → Access attempts, permission changes
- offline    → Offline device alerts
- automation → Automation triggers, schedules
```

### Features
- Persistent storage (AsyncStorage, max 100 notifications)
- Unread badge counter
- Mark as read / Mark all as read
- Delete individual / Clear all
- Per-type preferences (enable/disable)
- Triggered by MQTT device status changes

---

## Firmware Architecture

### Modules
```
BLE Module
  ├─ Advertise as "PROV_*" during provisioning
  ├─ Accept credentials via BLE
  └─ Send confirmation after WiFi success

WiFi Module
  ├─ Connect to WiFi using received credentials
  ├─ Retry 3 times if connection fails
  ├─ Save credentials to NVS
  └─ Auto-reconnect on disconnect

MQTT Module
  ├─ Subscribe to control topics
  ├─ Publish state and sensor topics
  └─ Maintain persistent connection

GPIO Control Module
  ├─ LED (GPIO2 or configurable)
  └─ Relay (GPIO23)

Sensor Module
  ├─ Soil moisture (ADC)
  ├─ Temperature (DHT22)
  ├─ Humidity (DHT22)
  └─ Publish every 5 seconds
```

### Configuration Requirements
```cpp
// MQTT Broker
#define MQTT_BROKER_URL "wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt"
#define MQTT_USERNAME "bluetooth"
#define MQTT_PASSWORD "Ble_12345"

// GPIO Pins
#define LED_PIN 2
#define RELAY_PIN 23
#define SOIL_PIN 34
#define TEMP_PIN 32

// BLE UUIDs
#define PROV_SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define PROV_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVICE_ID_SERVICE_UUID "12345678-1234-1234-1234-1234567890ab"
#define DEVICE_ID_CHAR_UUID "12345678-1234-1234-1234-1234567890cd"
```

---

## App Architecture

### Services (Singletons)
```
MqttService
  ├─ WebSocket connection to HiveMQ
  ├─ Publish/subscribe management
  └─ Message routing

DeviceDataService
  ├─ Cache real-time metrics
  ├─ Subscribe to MQTT via MqttService
  └─ Notify UI listeners on updates

BleService
  ├─ Device discovery
  ├─ BLE connection management
  └─ Credential transmission

WiFiService
  ├─ Network scanning
  ├─ Network list management
  └─ Error handling

NotificationService
  ├─ Notification persistence
  ├─ Preference management
  └─ Listener pattern for updates

StorageService
  ├─ AsyncStorage for device list
  └─ Device metadata persistence

PermissionService
  ├─ Android permission requests
  └─ Permission status tracking
```

### Screens
```
StartupScreen
  └─ Onboarding and permissions

HomeScreen
  ├─ Device list display
  ├─ Add Device button (FAB)
  └─ Device status indicators

SimpleBleProvisionScreen
  └─ BLE device discovery and selection

DeviceConfigScreen
  ├─ Device name input
  ├─ Device type selection
  └─ Room assignment

WiFiProvisioningScreen
  ├─ WiFi network selection
  ├─ Password input
  └─ Provisioning execution with animation

DeviceDetailsScreen
  ├─ ControllerTab (LED/relay control)
  ├─ MetricsTab (sensor display)
  └─ SettingsTab (device management)

NotificationScreen
  ├─ Activity tab (view notifications)
  └─ Settings tab (configure preferences)
```

---

## Storage

### AsyncStorage Keys
```
onboarding_completed: boolean
  └─ Flag to skip onboarding on future launches

provisioned_devices: Device[]
  ├─ id: string (BLE MAC)
  ├─ displayName: string (user-friendly name)
  ├─ deviceType: string (Light, Sensor, etc.)
  ├─ roomName: string (room assignment)
  ├─ mqttDeviceId: string (short ID for MQTT)
  ├─ ssid: string (WiFi network)
  ├─ status: "online" | "offline"
  └─ createdAt: ISO timestamp

notifications: Notification[]
  ├─ id: unique ID
  ├─ type: notification type
  ├─ title: notification title
  ├─ message: notification body
  ├─ deviceId: associated device
  ├─ timestamp: ISO timestamp
  └─ read: boolean

notificationPreferences: Preferences
  ├─ device: boolean (enabled/disabled)
  ├─ firmware: boolean
  ├─ activity: boolean
  ├─ security: boolean
  ├─ offline: boolean
  └─ automation: boolean
```

### Keychain (Secure Storage)
```
WiFi Credentials
  ├─ SSID: network name
  └─ Password: encrypted password
     (Only if "Remember this network" checked)
```

---

## Error Scenarios & Handling

### Device Discovery
| Error | Cause | Solution |
|-------|-------|----------|
| Device not found | Not in BLE range | Move closer, restart device |
| Connection failed | Device busy | Restart and try again |
| Service not found | Firmware issue | Check device firmware |
| Characteristic not found | UUID mismatch | Verify UUIDs in firmware |

### WiFi Provisioning
| Error | Cause | Solution |
|-------|-------|----------|
| No networks found | Location disabled | Enable Location Services |
| Wrong password | Incorrect entry | Re-enter password |
| Connection timeout | Device offline | Check WiFi available, retry |
| BLE disconnected (normal) | Device rebooting | App waits for reconnect |
| Timeout waiting for ACK | No response from device | Restart and retry |

### Post-Provisioning
| Error | Cause | Solution |
|-------|-------|----------|
| Device offline | No WiFi | Reconfigure WiFi |
| No metrics | MQTT not connected | Check MQTT broker |
| Control not working | GPIO issue | Check wiring and config |

---

## Testing Procedures

### Test BLE Provisioning
1. ✅ Flash firmware to ESP32
2. ✅ Open app and tap "Add Device"
3. ✅ Verify device appears in BLE scan
4. ✅ Select device and complete provisioning
5. ✅ Verify device appears in HomeScreen

### Test MQTT Communication
1. ✅ Verify device is online in HomeScreen
2. ✅ Tap device to open ControllerScreen
3. ✅ Tap LED bulb - verify LED toggles
4. ✅ Tap relay button - verify relay toggles
5. ✅ Verify state updates in app

### Test Metrics
1. ✅ Open MetricsScreen
2. ✅ Verify data updates every 5 seconds
3. ✅ Verify temperature, humidity display
4. ✅ Verify RSSI (WiFi signal) displays
5. ✅ Verify uptime and heap display

### Test Notifications
1. ✅ Verify notification appears when device goes online/offline
2. ✅ Verify notification appears in NotificationScreen
3. ✅ Test mark as read
4. ✅ Test delete notification
5. ✅ Test notification preferences (enable/disable types)

---

## Performance Characteristics

### Timing
```
BLE Scan:               30 seconds
WiFi Scan:              5-10 seconds
Provisioning Timeout:   30 seconds
Sensor Data Update:     Every 5 seconds
Button Lock Duration:   2 seconds
Success Animation:      2.2 seconds
```

### Storage Limits
```
Notifications:          Max 100
Devices:                No limit
AsyncStorage:           Depends on device (typically 5-10MB)
```

### Network Requirements
```
BLE:                    ~10 meters range
WiFi:                   2.4GHz (not 5GHz)
MQTT:                   WebSocket over TLS
```

---

## Development Notes

### Important Patterns
- **No Optimistic Updates:** UI only updates when device responds
- **Singleton Services:** Global access to services
- **Listener Pattern:** Components subscribe to service updates
- **State Machine:** Provisioning uses complex state transitions
- **Graceful Degradation:** Handles disconnections gracefully

### Key Files
```
src/services/
  ├─ mqttService.ts         (MQTT client)
  ├─ deviceDataService.ts   (Device metrics caching)
  ├─ notificationService.ts (Notification system)
  ├─ bleService.ts          (BLE communication)
  ├─ wifiService.ts         (WiFi scanning)
  └─ permissionService.ts   (Permission management)

src/screens/
  ├─ WiFiProvisioningScreen.tsx (Provisioning with animation)
  ├─ DeviceConfigScreen.tsx      (Device configuration)
  ├─ ControllerScreen.tsx        (LED/relay control)
  ├─ MetricsScreen.tsx           (Sensor display)
  └─ NotificationScreen.tsx      (Notifications)

src/hooks/
  └─ useProvisioning.ts     (Provisioning state machine)
```

---

## Building & Deployment

### Build Release APK
```bash
cd android
./gradlew.bat assembleRelease
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`
**Size:** ~63MB

### App Version
- **Current Version:** 2.0
- **Build Date:** June 2026
- **Release Type:** Production Ready

---

## Documentation Structure

### Read Order
1. This file (overview)
2. APP_WORKFLOW.md (system architecture)
3. BLE_PROVISIONING_WORKFLOW.md (device onboarding)
4. MQTT_WORKFLOW.md (communication details)

### For Different Roles
```
Developers → Read all files
Firmware Engineers → Focus on BLE and ESP32 sections
QA/Testers → Focus on testing and troubleshooting sections
DevOps → Focus on configuration sections
```

---

## Status & Version

| Item | Status |
|------|--------|
| App Implementation | ✅ Complete |
| Device Provisioning | ✅ Complete |
| WiFi Integration | ✅ Complete |
| MQTT Communication | ✅ Complete |
| LED/Relay Control | ✅ Complete |
| Sensor Metrics | ✅ Complete |
| Notification System | ✅ Complete |
| Code Quality | ✅ No Errors |
| Documentation | ✅ Complete & Integrated |
| Release APK | ✅ Built (62.99 MB) |

---

**Documentation Version:** 2.0  
**Last Updated:** June 3, 2026  
**Status:** Production Ready

