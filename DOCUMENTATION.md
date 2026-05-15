# SmartHomeApp - Complete Documentation

## Table of Contents
1. [App Workflow & Navigation](#app-workflow--navigation)
2. [Device Provisioning Flow](#device-provisioning-flow)
3. [MQTT Communication](#mqtt-communication)
4. [BLE Provisioning Details](#ble-provisioning-details)
5. [Device Control & Settings](#device-control--settings)
6. [Architecture Overview](#architecture-overview)

---

## App Workflow & Navigation

### Navigation Structure

```
First launch:
  StartupScreen (splash → permissions) → HomeScreen

Return visits:
  HomeScreen (direct, onboarding_completed flag in AsyncStorage)

HomeScreen
  ├── + Add Device → SimpleBleProvisionScreen
  │     └── WiFiProvisioningScreen
  │           └── ProvisioningProgressScreen → HomeScreen
  └── Device card → DeviceDetailsScreen
        ├── Tab: Metrics
        ├── Tab: Controller  ← default
        └── Tab: Settings
```

### Onboarding Gate

`RootNavigator` checks `AsyncStorage` for `onboarding_completed`.
- **Not set** → shows `StartupScreen` (splash + permission request)
- **Set** → goes directly to `HomeScreen`

The `StartupScreen` displays:
- 3.5s splash animation with floating logo
- Permission explanation with icons
- Bundled permission request (all at once)
- Sets `onboarding_completed` flag after permissions granted

---

## Device Provisioning Flow

### Complete Provisioning Journey

1. **User taps "Add Device"** on HomeScreen
2. **SimpleBleProvisionScreen** — scans for BLE devices (filtered by name prefix `PROV_`)
   - Shows discovered devices with RSSI signal strength
   - Auto-stops scan after 30s
3. **User selects a device** → navigates to `WiFiProvisioningScreen` with `deviceId` + `deviceName`
4. **WiFiProvisioningScreen** — scans nearby WiFi networks
   - Auto-selects current network if available
   - Retrieves saved passwords from Keychain
   - Handles permission errors with user guidance
   - Detects Location Services disabled state
   - Manual network entry fallback
5. **User enters password** and taps "Connect Device"
6. **ProvisioningProgressScreen** shows live progress with animations
7. **useProvisioning hook** drives the state machine:
   - `CONNECTING_BLE` → connect to device via BLE
   - `SENDING_CREDENTIALS` → write SSID + password to BLE characteristic
   - `WAITING_WIFI` → wait for ESP32 WiFi connection confirmation
   - `SUCCESS` → device saved to storage, navigate to HomeScreen
   - `ERROR` / `TIMEOUT` → show retry option

### State Machine Details

```
IDLE
  ↓ startProvisioning()
CONNECTING_BLE
  ↓ BLE connected, device ID read from ESP32
SENDING_CREDENTIALS
  ↓ SSID + password written to characteristic
WAITING_WIFI
  ↓ ESP32 confirms WiFi connected (BLE notification)
SUCCESS  ──→ device saved to storage with mqttDeviceId
  or
ERROR / TIMEOUT  ──→ show retry option
```

### BLE Service / Characteristic UUIDs

Defined in `bleService.ts`:
- **Provisioning Service**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Provisioning Characteristic**: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **Device ID Service**: `12345678-1234-1234-1234-1234567890ab`
- **Device ID Characteristic**: `12345678-1234-1234-1234-1234567890cd`

### Android Permissions Required

All requested once during onboarding (`StartupScreen`):
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `NEARBY_WIFI_DEVICES` (Android 13+)

### After Provisioning

1. Device saved to `AsyncStorage` via `storageService.addProvisionedDevice()`
2. Device appears on `HomeScreen` device list
3. `DeviceDataService` subscribes to MQTT topics for the device
4. Real-time metrics start flowing within seconds

---

## MQTT Communication

### Broker Configuration

**HiveMQ Cloud (TLS WebSocket)**
- URL: `wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt`
- Username: `bluetooth`
- Password: `Ble_12345`
- Initialized in `App.tsx` on startup via `getMQTTService()`

### Topic Structure

All topics use the **short device ID** (e.g. `26B7B3F8`, not the full MAC).

| Topic | Direction | Payload | Purpose |
|---|---|---|---|
| `esp32/{id}/data` | ESP → App | JSON | Sensor data every 5s |
| `esp32/{id}/status` | ESP → App | string | `online` / `offline` |
| `esp32/{id}/led/state` | ESP → App | string | `ON` / `OFF` |
| `esp32/{id}/led/set` | App → ESP | string | `ON` / `OFF` |
| `esp32/{id}/config` | App → ESP | JSON | WiFi update / factory reset |

### Sensor Data Payload

```json
{
  "device": "ESP32_26B7B3F8",
  "fw": "3.0.0",
  "uptime": 5615,
  "rssi": -51,
  "heap": 112680,
  "min_heap": 99368,
  "ntp": "ok",
  "soil_raw": 4095,
  "soil_pct": 0,
  "led": true
}
```

**Field Mapping** in `deviceDataService.ts`:
- `soil_pct` / `soilMoisture` / `soil_moisture` → `soilMoisture`
- `rssi` / `wifiRSSI` / `wifi_rssi` → `wifiRSSI`
- `led === 'ON'` or `led === true` → `ledStatus`
- `free_heap` / `freeHeap` → `freeHeap`
- `temperature` / `temp` → `temperature`

### LED Control

**Command:**
```
Topic:   esp32/{id}/led/set
Payload: ON  or  OFF
QoS:     1
```

**State Update Flow:**
1. User taps bulb in ControllerScreen
2. App publishes `ON` or `OFF` to `esp32/{id}/led/set`
3. ESP32 receives command and changes LED
4. ESP32 publishes actual state to `esp32/{id}/led/state`
5. App receives state via MQTT subscription
6. UI updates to reflect true device state (not optimistic)

### WiFi Reconfiguration

**Command:**
```
Topic:   esp32/{id}/config
Payload: { "type": "wifi_update", "ssid": "...", "password": "..." }
QoS:     1
```

**ESP32 Behavior:**
1. Receives command
2. Disconnects from current WiFi
3. Tries new credentials (3 attempts)
4. If success → saves to NVS → restarts
5. If fail → rolls back to previous WiFi → restarts

**App Flow:**
1. Settings → WiFi Information → tap ✏️
2. Modal opens, scans nearby networks via `wifiService.scanNetworks()`
3. User selects network (or enters manually)
4. User enters password
5. App publishes WiFi update command
6. ESP32 processes and restarts

### Factory Reset

**Command:**
```
Topic:   esp32/{id}/config
Payload: { "type": "factory_reset" }
QoS:     1
```

---

## BLE Provisioning Details

### Overview

New devices are provisioned over BLE. The ESP32 advertises as `PROV_{shortId}` while in provisioning mode. The app connects, sends WiFi credentials via GATT, and the ESP32 connects to WiFi and starts publishing MQTT data.

### Screens Involved

| Screen | Role |
|---|---|
| `SimpleBleProvisionScreen` | Scan for `PROV_*` devices, user selects one |
| `WiFiProvisioningScreen` | Scan nearby WiFi, user picks SSID + enters password |
| `ProvisioningProgressScreen` | Shows live state machine progress with animations |
| `ProvisioningSuccessScreen` | Confirmation before returning to HomeScreen |

### WiFi Scanning

**Priority 1: Currently Connected Network** (most reliable)
- Gets current SSID via `WifiManager.getCurrentWifiSSID()`
- Auto-selected in WiFi provisioning screen

**Priority 2: Nearby Networks** (requires location + permissions)
- Scans via `WifiManager.loadWifiList()`
- Requires `ACCESS_FINE_LOCATION` permission
- Requires `NEARBY_WIFI_DEVICES` permission (Android 13+)
- Requires Location Services enabled

**Priority 3: Manual Entry** (fallback)
- User can manually type network name if scanning fails

### Error Handling

**WiFiError Types:**
- `PERMISSION_DENIED` - Location/WiFi permissions not granted
- `LOCATION_DISABLED` - Location Services disabled
- `SCAN_FAILED` - WiFi scan returned no data
- `UNKNOWN_ERROR` - Unexpected error

**User Guidance:**
- Permission required state shows explanation + grant button
- Location disabled state shows instructions + settings button
- Error state shows message + retry button

---

## Device Control & Settings

### Metrics Tab

**Main KPI Card:**
- Soil moisture with circular progress ring
- Plant state: Desert Dry → Dry → Healthy → Wet → Saturated
- State colors: Red → Orange → Green → Blue → Indigo
- Animated glow when "Healthy"
- Last updated timestamp

**Secondary Stats:**
- WiFi RSSI (dBm) with signal strength label
- Temperature (°C)
- Humidity (%)
- Uptime (hours)

**Live Updates:**
- Fade animation on metric changes
- Real-time MQTT subscription

### Controller Tab (Default)

**Grow Light Control:**
- Single large glowing bulb (160×160px)
- Tap to toggle ON/OFF
- Animated yellow glow when ON
- Press scale animation (0.93 → 1.0) for tactile feedback
- Status indicator with green dot when ON

**Quick Stats:**
- Uptime (hours)
- Free Heap (KB)
- WiFi RSSI (dBm)

**State Management:**
- No optimistic updates
- UI only updates when ESP32 responds via MQTT
- Ensures UI always reflects true device state

### Settings Tab

**Device Information:**
- Device ID (BLE MAC)
- MQTT Device ID (short ID for topics)
- Current status (online/offline/connecting)

**WiFi Information:**
- Current SSID display
- Edit button (✏️) to reconfigure WiFi
- Opens WiFi selection modal

**Advanced Settings (Collapsed):**
- Restart device
- Reset WiFi to factory defaults
- Remove device from app

---

## Architecture Overview

### Service Architecture

```
App.tsx
  └── getMQTTService().initialize() + connect()

DeviceDetailsScreen / HomeScreen
  └── getDeviceDataService().subscribe(deviceId, listener)
        └── getMQTTService().subscribe(deviceId, callback)
              └── subscribes to: data, status, led/state topics
              └── notifies DeviceDataService on message
        └── DeviceDataService caches metrics + notifies UI listeners

ControllerScreen
  └── getDeviceDataService().updateLEDStatus(id, bool)
        └── getMQTTService().sendLEDCommand(id, state)

SettingsScreen
  └── getDeviceDataService().reconfigureWiFi(id, ssid, password)
        └── getMQTTService().sendWiFiUpdate(id, ssid, password)
```

### Key Services

**MqttService** (`mqttService.ts`)
- Singleton MQTT client
- WebSocket connection to HiveMQ
- Pub/Sub architecture with device-specific listeners
- Automatic reconnection with 1s retry interval

**DeviceDataService** (`deviceDataService.ts`)
- Real-time device metrics caching
- MQTT subscription management
- Listener notification system
- LED control and WiFi reconfiguration commands

**BleService** (`bleService.ts`)
- BLE device discovery and scanning
- Device connection and service discovery
- WiFi credential transmission via GATT
- Device ID reading from ESP32
- Notification monitoring for firmware status

**WiFiService** (`wifiService.ts`)
- WiFi network scanning with signal strength
- Current network detection
- Structured error handling
- Location Services checking

**StorageService** (`storageService.ts`)
- AsyncStorage for device list and network metadata
- React Native Keychain for secure password storage
- Device metadata management

**PermissionService** (`permissionService.ts`)
- Android permission management
- Bundled permission requests
- Permission status checking

### State Management

**BleContext** - Global BLE state
- Bluetooth enabled/disabled
- Active scan status
- Discovered devices
- Permission status

**useProvisioning Hook** - Provisioning state machine
- Complex provisioning flow orchestration
- Status logging
- Timeout handling
- App background cleanup

### Data Flow

1. **Initialization**: App starts → MQTT connects → HomeScreen loads
2. **Device Discovery**: User adds device → BLE scan → WiFi selection → Provisioning
3. **Real-time Updates**: MQTT subscription → DeviceDataService cache → UI listeners
4. **User Interaction**: User taps control → Command sent via MQTT → ESP32 responds → UI updates
5. **Settings Changes**: User changes WiFi → Command sent → ESP32 restarts → Reconnects to MQTT

---

## Key Features

✅ **BLE Provisioning** - Device discovery, credential transmission, device ID capture
✅ **MQTT Communication** - Real-time pub/sub with HiveMQ Cloud
✅ **WiFi Scanning** - Network discovery with error handling
✅ **LED Control** - Interactive bulb with real-time state feedback
✅ **Metrics Display** - Beautiful sensor visualization with animations
✅ **Device Storage** - AsyncStorage + Keychain for secure credentials
✅ **Permission Management** - Bundled request during onboarding
✅ **Error Handling** - Structured errors with user-friendly messages
✅ **State Machine** - Complex provisioning flow with progress UI
✅ **Real-time Updates** - Live metrics with fade animations

---

## Development Notes

### Important Patterns

1. **No Optimistic Updates** - UI always reflects true device state from MQTT
2. **Singleton Services** - All services use singleton pattern for global state
3. **Listener Pattern** - DeviceDataService notifies UI listeners on updates
4. **Error Handling** - Structured error types with user-friendly messages
5. **Onboarding Gate** - RootNavigator checks AsyncStorage flag

### Testing Checklist

- [ ] BLE provisioning with new device
- [ ] WiFi reconfiguration
- [ ] LED toggle with real-time feedback
- [ ] Metrics display with live updates
- [ ] Permission requests on first launch
- [ ] Device removal and re-provisioning
- [ ] MQTT connection loss and recovery
- [ ] WiFi scanning with Location Services disabled

---

## Troubleshooting

### LED Toggle Not Working
- Check MQTT connection status
- Verify ESP32 is publishing to `esp32/{id}/led/state`
- Check device ID mapping (BLE MAC vs MQTT short ID)

### WiFi Scan Returns No Networks
- Enable Location Services on device
- Grant Location permissions
- Check WiFi is enabled on device

### Device Not Appearing After Provisioning
- Verify device saved to AsyncStorage
- Check MQTT connection is active
- Verify device ID is correct

### Metrics Not Updating
- Check MQTT subscription is active
- Verify ESP32 is publishing to `esp32/{id}/data`
- Check device is online in MQTT broker

