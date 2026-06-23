# SmartHomeApp - Quick Start Guide

## What is SmartHomeApp?

A React Native mobile app for controlling IoT devices (ESP32 smart switches) via:
1. **BLE** - Wireless provisioning of WiFi credentials
2. **MQTT** - Real-time device control and monitoring
3. **Local Storage** - Device persistence and settings

---

## App Flow in 30 Seconds

```
Launch App
  ↓
[Permission Checks] ← App requests BLE, location permissions
  ↓
Home Screen ← Shows connected devices
  │
  ├─ Tap Device Card → View metrics, control relay/LED
  │
  ├─ Tap "Add" → Add new device
  │   ├─ Scan for "PROV_*" devices
  │   ├─ Enter WiFi credentials
  │   ├─ Device connects to WiFi → MQTT → appears online
  │   └─ Name device → Saved
  │
  ├─ Tap Settings ← Theme, notifications, app info
  │
  └─ Tap Profile ← User account (if implemented)
```

---

## Key Concepts

### Device Lifecycle

```
1. UNPROVISIOND STATE (in factory)
   - Device broadcasts as "PROV_XXXXX" via BLE
   - Waiting for WiFi credentials
   - No MQTT connection yet

2. PROVISIONING (app connects via BLE)
   - App reads device ID
   - App sends WiFi credentials
   - Device attempts WiFi connection

3. PROVISIONED STATE (device online)
   - Device connected to WiFi
   - Device connected to MQTT broker
   - App detects device status = "online"
   - Device appears on home screen

4. CONNECTED STATE (app controlling)
   - User can toggle LED/relay
   - User can view metrics (temperature, WiFi strength)
   - User can change device settings
   - User can rename device or assign to room
```

### Three Communication Channels

1. **BLE (Bluetooth)**
   - Used only during provisioning
   - Sends WiFi credentials securely
   - Short-range (10-30 meters)
   - No internet required

2. **WiFi**
   - Device connects to user's home WiFi
   - Used to reach MQTT broker
   - Connected WiFi name stored on device

3. **MQTT (Message Queue Telemetry Transport)**
   - Publish/Subscribe messaging protocol
   - Device ← → App through cloud broker (HiveMQ)
   - Real-time bidirectional communication
   - Persists connection even if WiFi drops temporarily

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         React Native App            │  Runs on phone
├─────────────────────────────────────┤
│  Services (Singleton)               │  Business logic
│  ├─ MqttService                    │
│  ├─ BleService                     │
│  ├─ DeviceDataService              │
│  └─ StorageService                 │
├─────────────────────────────────────┤
│  Contexts (State Providers)         │  Global state
│  ├─ ThemeContext                   │
│  └─ BleContext                     │
├─────────────────────────────────────┤
│  Screens (UI Components)            │  Navigation
│  ├─ HomeScreen                     │
│  ├─ AddDeviceScreen                │
│  ├─ ProvisioningScreens             │
│  └─ SettingsScreen                 │
└──────────────┬──────────────────────┘
               │
        ┌──────┴─────────┬──────────────┐
        ▼                ▼              ▼
   ┌─────────┐     ┌──────────┐   ┌──────────┐
   │   BLE   │     │  MQTT    │   │ Storage  │
   │ Adapter │     │ Broker   │   │ Service  │
   │ (phone) │     │(HiveMQ)  │   │(device   │
   │         │     │          │   │data,etc.)
   └─────┬───┘     └────┬─────┘   └──────────┘
         │              │
         ├──────┬───────┤
         ▼      ▼       ▼
      ┌──────────────────────────┐
      │   ESP32 Device           │
      │   - WiFi Module          │
      │   - GPIO Relays/LEDs     │
      │   - Sensors              │
      │   - MQTT Client          │
      └──────────────────────────┘
```

---

## Device Provisioning Step-by-Step

### What Happens in SimpleBleProvisionScreen

```
STEP 1: Bluetooth Scan (3-5 seconds)
┌─────────────────────────────────┐
│ BleService.scan()               │
│ - Searches for nearby devices   │
│ - Filters for name = "PROV_*"   │
│ - Displays list to user         │
│ - User selects one              │
└─────────────────────────────────┘

STEP 2: BLE Connect & Read Device ID
┌─────────────────────────────────┐
│ BleService.connect(device)      │
│ - Establish BLE connection      │
│ - Discover services             │
│ - Read device ID characteristic │
│ - Device ID used for MQTT later │
└─────────────────────────────────┘

STEP 3: Send WiFi Credentials
┌─────────────────────────────────┐
│ BleService.write()              │
│ Payload:                        │
│ {                               │
│   "ssid": "MyHomeWiFi",         │
│   "password": "MyPassword123"   │
│ }                               │
│ - Base64 encoded                │
│ - Sent via BLE write            │
│ - Wait for ACK (5s timeout)     │
└─────────────────────────────────┘

STEP 4: Device Processing
┌─────────────────────────────────┐
│ ESP32 Firmware:                 │
│ 1. Receives BLE packet          │
│ 2. Decode Base64                │
│ 3. Parse JSON credentials       │
│ 4. Connect to WiFi network      │
│ 5. Connect to MQTT broker       │
│ 6. Publish status: "online"     │
└─────────────────────────────────┘

STEP 5: App Detects Device
┌─────────────────────────────────┐
│ MqttService.onMessage()         │
│ - Receives device status        │
│ - Updates device to "online"    │
│ - Provisioning success!         │
│ - Device added to home screen   │
└─────────────────────────────────┘
```

---

## Real-time Device Control

### When User Toggles Relay

```
1. User taps toggle switch on device card
   ↓
2. handleToggleDevice() function called
   ↓
3. DeviceDataService.updateRelayStatus(deviceId, true)
   ↓
4. MqttService.publish("esp32/26B7B3F8/relay/set", "ON")
   ↓
5. Message arrives at HiveMQ broker
   ↓
6. ESP32 device receives: esp32/26B7B3F8/relay/set = "ON"
   ↓
7. Device firmware toggles GPIO23 to HIGH
   ↓
8. Device publishes back: esp32/26B7B3F8/relay/state = "ON"
   ↓
9. App receives state update
   ↓
10. DeviceDataService updates cache
    ↓
11. Component listener notified
    ↓
12. HomeScreen rerenders with new state
    ↓
13. Device card shows "ON" with toggle switched
    ✓ Complete!

Total Time: 100-500ms (depending on WiFi latency)
```

---

## MQTT Topic Reference

### Subscribe Topics (Device Publishes, App Listens)

```
esp32/{deviceId}/data
  ├─ Sent every 10 seconds (or on change)
  └─ Payload: Full sensor metrics JSON
     {
       "soilMoisture": 45,        // Soil moisture 0-100%
       "wifiRSSI": -45,           // WiFi signal strength
       "ledStatus": true,         // LED on/off
       "relayStatus": false,      // Relay on/off
       "temperature": 23,         // Temperature °C
       "humidity": 55,            // Humidity %
       "uptime": 5432,            // Device uptime (seconds)
       "freeHeap": 100000         // Free memory (bytes)
     }

esp32/{deviceId}/status
  ├─ Sent on connect/disconnect
  └─ Payload: "online" or "offline"

esp32/{deviceId}/led/state
  ├─ Sent on LED change
  └─ Payload: "ON" or "OFF"

esp32/{deviceId}/relay/state
  ├─ Sent on relay change
  └─ Payload: "ON" or "OFF"
```

### Publish Topics (App Sends, Device Listens)

```
esp32/{deviceId}/led/set
  ├─ Purpose: Control LED
  └─ Payload: "ON" or "OFF"

esp32/{deviceId}/relay/set
  ├─ Purpose: Control relay (GPIO23)
  └─ Payload: "ON" or "OFF"

esp32/{deviceId}/config
  ├─ Purpose: Device configuration
  └─ Payload: JSON
     {
       "factory_reset": true    // Resets all settings
     }
     OR
     {
       "wifi_update": {
         "ssid": "NewWiFi",
         "password": "NewPass"
       }
     }
```

---

## Storage Architecture

### What Gets Saved Where

| Data | Location | Encrypted | Persists |
|------|----------|-----------|----------|
| Device list | AsyncStorage | No | ✓ |
| WiFi passwords | Keychain | Yes | ✓ |
| Theme selection | AsyncStorage | No | ✓ |
| Activity log | AsyncStorage | No | ✓ |
| Real-time metrics | Memory | No | ✗ |
| MQTT token | Memory | No | ✗ |

### Normalization Example

When loading a device from storage, the app automatically normalizes it:

```
Saved Format (old):
{
  "id": "PROV_26B7B3F8",
  "name": "Living Room Light",
  "status": "online"
}

↓ normalizeProvisionedDevice()

Loaded Format (current):
{
  "id": "PROV_26B7B3F8",
  "mqttDeviceId": "26B7B3F8",        ← Generated if missing
  "displayName": "Living Room Light",
  "roomName": "Unassigned",           ← Default if missing
  "status": "online",
  "lastSeen": "2024-01-15T10:30:00Z"
}
```

---

## Common Troubleshooting

### Device Won't Come Online

```
Symptom: Device stays "offline" after provisioning

Causes:
1. ❌ WiFi credentials wrong
   → Try provisioning again with correct password

2. ❌ Device can't reach WiFi network
   → Check WiFi network is working
   → Check device is in WiFi range

3. ❌ Device can't reach MQTT broker
   → Check internet connection on WiFi
   → Check MQTT broker is online (HiveMQ status)

4. ❌ Device firmware incompatible
   → Update device firmware via serial connection
```

### BLE Scan Finds No Devices

```
Symptom: SimpleBleProvisionScreen shows empty list

Causes:
1. ❌ Bluetooth not enabled
   → Turn on Bluetooth in phone settings

2. ❌ Location permission not granted
   → Grant location permission (required for BLE on Android 13+)

3. ❌ ESP32 not in provisioning mode
   → Reset ESP32 with power button or reload firmware

4. ❌ Device out of BLE range
   → Move phone closer to device (BLE range: 10-30 meters)
```

### App Crashes on Startup

```
Symptom: App crashes immediately

Causes:
1. ❌ Missing .env file
   → Copy .env.example to .env and fill in MQTT credentials

2. ❌ MQTT configuration invalid
   → Check MQTT_URL format: wss://... (WebSocket)
   → Check MQTT_USERNAME and MQTT_PASSWORD not empty

3. ❌ Corrupted device data
   → Clear app data in Settings > Apps > SmartHomeApp > Storage > Clear Data
```

---

## Development Checklist

- [ ] Node.js 22.11.0+ installed
- [ ] React Native CLI installed (`npm install -g react-native-cli`)
- [ ] Android SDK or Xcode configured
- [ ] `.env` file created with MQTT credentials
- [ ] ESP32 device firmware installed and working
- [ ] MQTT broker accessible (HiveMQ account created)
- [ ] USB debugging enabled (Android) or Apple Developer account (iOS)

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point, initializes services |
| `src/screens/HomeScreen.tsx` | Main dashboard |
| `src/services/mqttService.ts` | MQTT communication |
| `src/services/bleService.ts` | BLE provisioning |
| `src/services/storageService.ts` | Device persistence |
| `src/config/mqttConfig.ts` | MQTT configuration |
| `.env` | Environment variables (MQTT credentials) |

---

## Next Steps

1. **Setup Development Environment**
   - Install Node.js, React Native, Android Studio/Xcode

2. **Configure MQTT**
   - Create HiveMQ account
   - Update `.env` with broker credentials

3. **Install ESP32 Firmware**
   - Flash device with provisioning firmware
   - Test device comes online

4. **Run App**
   ```bash
   npm install
   npm run android  # or: npm run ios
   ```

5. **Test Provisioning**
   - Launch app
   - Tap "Add Device"
   - Complete provisioning flow
   - Verify device appears on home screen

6. **Test Control**
   - Toggle relay/LED
   - Verify device responds
   - Check MQTT messages in broker logs

---

## Support & Resources

- **HiveMQ Broker**: https://www.hivemq.com/mqtt-cloud-broker/
- **MQTT Protocol**: https://mqtt.org/
- **React Native Docs**: https://reactnative.dev/
- **ESP32 BLE**: https://docs.espressif.com/projects/esp-idf/

