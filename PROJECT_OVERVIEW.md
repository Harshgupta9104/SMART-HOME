# SmartHomeApp - Complete Project Overview

## 📱 Project Summary

**SmartHomeApp** is a React Native mobile application for discovering, provisioning, and controlling ESP32-based smart home devices. The app uses BLE (Bluetooth Low Energy) for device discovery and provisioning, and MQTT for real-time communication and control.

**Key Technologies:**
- React Native 0.84.0
- TypeScript
- BLE (react-native-ble-plx)
- MQTT (mqtt library with WebSocket)
- HiveMQ Cloud broker
- AsyncStorage + React Native Keychain
- React Navigation

---

## 🏗️ Architecture Overview

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx (Entry)                        │
│  - Initializes MQTT connection on startup                   │
│  - Sets up BleProvider for global BLE state                 │
│  - Renders RootNavigator                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    RootNavigator                            │
│  - Checks onboarding_completed flag in AsyncStorage         │
│  - Routes to StartupScreen (first time) or HomeScreen       │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
   StartupScreen                          HomeScreen
   (Onboarding)                           (Main Hub)
        ↓                                       ↓
   - Splash animation                    - Device list
   - Permission request                  - Add device FAB
   - Sets onboarding flag                - Device cards
                                         - Long-press menu
```

### Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Singleton Services                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MqttService                                                 │
│  ├─ Manages WebSocket connection to HiveMQ                  │
│  ├─ Pub/Sub for device topics                               │
│  ├─ Listener pattern for device-specific callbacks          │
│  └─ Methods: connect(), subscribe(), sendLEDCommand(), etc. │
│                                                              │
│  DeviceDataService                                           │
│  ├─ Caches real-time device metrics                         │
│  ├─ Subscribes to MQTT via MqttService                      │
│  ├─ Notifies UI listeners on metric updates                 │
│  └─ Methods: subscribe(), getMetrics(), updateLEDStatus()   │
│                                                              │
│  StorageService                                              │
│  ├─ AsyncStorage for device list persistence                │
│  ├─ Device metadata (name, ID, SSID, status)                │
│  └─ Methods: getProvisionedDevices(), addProvisionedDevice()│
│                                                              │
│  BleService                                                  │
│  ├─ Device discovery and scanning                           │
│  ├─ BLE connection and GATT operations                      │
│  ├─ WiFi credential transmission                            │
│  └─ Methods: startScan(), connect(), readDeviceId()         │
│                                                              │
│  WiFiService                                                 │
│  ├─ WiFi network scanning                                   │
│  ├─ Current network detection                               │
│  ├─ Error handling (permissions, location)                  │
│  └─ Methods: scanNetworks(), getCurrentSSID()               │
│                                                              │
│  PermissionService                                           │
│  ├─ Android permission management                           │
│  ├─ Bundled permission requests                             │
│  └─ Methods: requestProvisioningPermissions()               │
│                                                              │
│  KeychainService                                             │
│  ├─ Secure password storage                                 │
│  ├─ Saved network credentials                               │
│  └─ Methods: saveCredentials(), getPassword()               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Context & State Management

**BleContext** (Global BLE State)
- Bluetooth enabled/disabled status
- Active scan state and discovered devices
- Permission status
- Error handling

**useProvisioning Hook** (Provisioning State Machine)
- Orchestrates complex provisioning flow
- Manages state transitions (CONNECTING_BLE → SENDING_CREDENTIALS → WAITING_WIFI → SUCCESS)
- Handles timeouts and errors
- Cleans up on app background

---

## 📱 Screen Structure

### Navigation Stack

```
RootNavigator
├── StartupScreen (Onboarding)
│   ├── Splash animation (3.5s)
│   ├── Permission explanation
│   └── Permission request
│
└── HomeScreen (Main)
    ├── Device list with cards
    ├── Add Device FAB
    ├── Device menu (long-press)
    │
    └── DeviceDetailsScreen
        ├── MetricsTab
        │   ├── Soil moisture ring
        │   ├── Plant state indicator
        │   ├── WiFi RSSI
        │   ├── Temperature
        │   ├── Humidity
        │   └── Uptime
        │
        ├── ControllerTab (Default)
        │   ├── LED bulb control
        │   ├── Quick stats
        │   └── Real-time feedback
        │
        └── SettingsTab
            ├── Device information
            ├── WiFi configuration
            ├── Advanced settings
            └── Factory reset

Provisioning Flow (from HomeScreen)
├── SimpleBleProvisionScreen
│   └── BLE device discovery
│
├── WiFiProvisioningScreen
│   ├── WiFi network scanning
│   ├── Network selection
│   └── Password entry
│
├── ProvisioningProgressScreen
│   ├── State machine progress
│   ├── Live animations
│   └── Error handling
│
└── ProvisioningSuccessScreen
    └── Confirmation
```

### Key Screens

#### 1. **StartupScreen**
- **Purpose:** Onboarding and permission request
- **Flow:**
  1. Splash animation (3.5s) with floating logo
  2. Permission explanation with icons
  3. Bundled permission request (all at once)
  4. Sets `onboarding_completed` flag
- **Permissions Requested:**
  - BLUETOOTH_SCAN
  - BLUETOOTH_CONNECT
  - ACCESS_FINE_LOCATION
  - ACCESS_COARSE_LOCATION
  - NEARBY_WIFI_DEVICES (Android 13+)

#### 2. **HomeScreen**
- **Purpose:** Main hub showing all provisioned devices
- **Features:**
  - Device list with status indicators
  - Device cards showing name, status, SSID, last seen
  - Long-press menu for device management
  - Rename device modal
  - Add Device FAB
  - Pull-to-refresh
- **Real-time Updates:**
  - Subscribes to MQTT for each device
  - Updates device status (online/offline)
  - Caches metrics via DeviceDataService

#### 3. **DeviceDetailsScreen**
- **Purpose:** Detailed device control and monitoring
- **Tabs:**
  - **MetricsTab:** Soil moisture ring, plant state, WiFi RSSI, temperature, humidity, uptime
  - **ControllerTab:** LED bulb control with real-time feedback
  - **SettingsTab:** Device info, WiFi reconfiguration, factory reset

#### 4. **SimpleBleProvisionScreen**
- **Purpose:** Discover new devices via BLE
- **Features:**
  - Scans for devices with name prefix `PROV_`
  - Shows RSSI signal strength
  - Auto-stops scan after 30s
  - Displays discovered devices in list

#### 5. **WiFiProvisioningScreen**
- **Purpose:** Configure WiFi credentials for new device
- **Features:**
  - Scans nearby WiFi networks
  - Auto-selects current network if available
  - Retrieves saved passwords from Keychain
  - Manual network entry fallback
  - Error handling (permissions, location disabled)
  - Permission request UI

#### 6. **ProvisioningProgressScreen**
- **Purpose:** Show live provisioning progress
- **Features:**
  - State machine visualization
  - Animated progress indicators
  - Error handling with retry
  - Timeout detection

#### 7. **ProvisioningSuccessScreen**
- **Purpose:** Confirmation before returning to HomeScreen
- **Features:**
  - Success message
  - Device summary
  - Navigation back to HomeScreen

---

## 🔌 MQTT Communication

### Broker Configuration
- **URL:** `wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt`
- **Username:** `bluetooth`
- **Password:** `Ble_12345`
- **Protocol:** WebSocket (TLS)
- **QoS:** 1 (At least once)

### Topic Structure

All topics use the **short device ID** (e.g., `26B7B3F8`, not the full MAC).

| Topic | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `esp32/{id}/data` | ESP → App | JSON | Sensor data every 5s |
| `esp32/{id}/status` | ESP → App | string | `online` / `offline` |
| `esp32/{id}/led/state` | ESP → App | string | `ON` / `OFF` |
| `esp32/{id}/led/set` | App → ESP | string | `ON` / `OFF` |
| `esp32/{id}/config` | App → ESP | JSON | WiFi update / factory reset |

### Sensor Data Payload Example

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

### Field Mapping (DeviceDataService)

The service normalizes various field name formats:
- `soil_pct` / `soilMoisture` / `soil_moisture` → `soilMoisture`
- `rssi` / `wifiRSSI` / `wifi_rssi` → `wifiRSSI`
- `led === 'ON'` or `led === true` → `ledStatus`
- `free_heap` / `freeHeap` → `freeHeap`
- `temperature` / `temp` → `temperature`

### LED Control Flow

1. User taps bulb in ControllerScreen
2. App publishes `ON` or `OFF` to `esp32/{id}/led/set`
3. ESP32 receives command and changes LED
4. ESP32 publishes actual state to `esp32/{id}/led/state`
5. App receives state via MQTT subscription
6. UI updates to reflect true device state (not optimistic)

### WiFi Reconfiguration

**Command:**
```json
{
  "type": "wifi_update",
  "ssid": "NetworkName",
  "password": "password123"
}
```

**ESP32 Behavior:**
1. Receives command
2. Disconnects from current WiFi
3. Tries new credentials (3 attempts)
4. If success → saves to NVS → restarts
5. If fail → rolls back to previous WiFi → restarts

### Factory Reset

**Command:**
```json
{
  "type": "factory_reset"
}
```

---

## 🔐 BLE Provisioning Details

### Overview

New devices are provisioned over BLE. The ESP32 advertises as `PROV_{shortId}` while in provisioning mode.

### BLE Service/Characteristic UUIDs

- **Provisioning Service:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Provisioning Characteristic:** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **Device ID Service:** `12345678-1234-1234-1234-1234567890ab`
- **Device ID Characteristic:** `12345678-1234-1234-1234-1234567890cd`

### Provisioning State Machine

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

### WiFi Scanning Priority

1. **Currently Connected Network** (most reliable)
   - Gets current SSID via `WifiManager.getCurrentWifiSSID()`
   - Auto-selected in WiFi provisioning screen

2. **Nearby Networks** (requires location + permissions)
   - Scans via `WifiManager.loadWifiList()`
   - Requires `ACCESS_FINE_LOCATION` permission
   - Requires `NEARBY_WIFI_DEVICES` permission (Android 13+)
   - Requires Location Services enabled

3. **Manual Entry** (fallback)
   - User can manually type network name if scanning fails

---

## 💾 Data Storage

### AsyncStorage (Persistent)
- `onboarding_completed` - Boolean flag for onboarding gate
- Device list - Array of ProvisionedDevice objects
- Network metadata - Saved WiFi networks

### React Native Keychain (Secure)
- WiFi passwords for saved networks
- Encrypted storage on device

### DeviceDataService Cache (In-Memory)
- Real-time device metrics
- Updated via MQTT subscriptions
- Cleared on app unmount

### ProvisionedDevice Structure

```typescript
interface ProvisionedDevice {
  id: string;              // BLE MAC address
  name: string;            // User-friendly name
  mqttDeviceId: string;    // Short ID for MQTT topics (e.g., "26B7B3F8")
  ssid: string;            // Connected WiFi network
  status: 'online' | 'offline' | 'connecting';
  lastSeen: string;        // ISO timestamp
  createdAt: string;       // ISO timestamp
}
```

---

## 🎨 UI/UX Patterns

### Design System
- **Primary Color:** #3B82F6 (Blue)
- **Success Color:** #10B981 (Green)
- **Warning Color:** #F59E0B (Amber)
- **Error Color:** #EF4444 (Red)
- **Background:** #F6F7FB (Light Gray)
- **Card Background:** #FFFFFF (White)

### Animations
- **Entry animations:** Fade + slide on screen mount
- **Pulsing glow:** LED bulb when ON
- **Press feedback:** Scale animation on button press
- **Floating animation:** Logo in splash screen
- **Fade transitions:** Metric updates

### Key UI Components
- **Device Cards:** Tap to view details, long-press for menu
- **LED Bulb:** Large interactive control with glow effect
- **Moisture Ring:** Circular progress indicator with plant state
- **Status Indicators:** Color-coded dots for device status
- **FAB (Floating Action Button):** Add device button

### Real-Time Updates
- No optimistic updates - UI always reflects true device state
- Updates triggered by MQTT messages
- Fade animation on metric changes
- Status indicators update immediately

---

## 🔄 Data Flow Examples

### Device Discovery & Provisioning

```
User taps "Add Device"
  ↓
SimpleBleProvisionScreen
  ├─ Starts BLE scan
  ├─ Filters for PROV_* devices
  └─ User selects device
      ↓
WiFiProvisioningScreen
  ├─ Scans WiFi networks
  ├─ Auto-selects current network
  ├─ User enters password
  └─ User taps "Connect Device"
      ↓
ProvisioningProgressScreen
  ├─ useProvisioning hook starts state machine
  ├─ CONNECTING_BLE: Connect to device via BLE
  ├─ SENDING_CREDENTIALS: Write SSID + password to characteristic
  ├─ WAITING_WIFI: Wait for ESP32 WiFi confirmation
  └─ SUCCESS: Device saved to AsyncStorage
      ↓
ProvisioningSuccessScreen
  └─ User taps "Done"
      ↓
HomeScreen
  ├─ Device appears in list
  ├─ DeviceDataService subscribes to MQTT
  └─ Real-time metrics start flowing
```

### Real-Time Metrics Update

```
ESP32 publishes to esp32/{id}/data
  ↓
MqttService receives message
  ├─ Parses JSON payload
  ├─ Extracts device ID from topic
  └─ Calls registered listeners
      ↓
DeviceDataService listener
  ├─ Normalizes field names
  ├─ Updates metrics cache
  └─ Notifies UI listeners
      ↓
MetricsScreen / ControllerScreen
  ├─ Receives updated metrics
  ├─ Triggers fade animation
  └─ Re-renders with new values
```

### LED Control

```
User taps bulb in ControllerScreen
  ↓
handleBulbPress()
  ├─ Plays press scale animation
  ├─ Calls deviceDataService.updateLEDStatus()
  └─ Sends MQTT command to esp32/{id}/led/set
      ↓
ESP32 receives command
  ├─ Changes LED state
  └─ Publishes to esp32/{id}/led/state
      ↓
MqttService receives state update
  ├─ Calls DeviceDataService listener
  └─ Updates metrics cache
      ↓
ControllerScreen
  ├─ Receives updated metrics
  ├─ Updates ledStatus state
  ├─ Triggers glow animation
  └─ UI reflects true device state
```

---

## 🛠️ Key Implementation Details

### No Optimistic Updates
The app **never** optimistically updates the UI. All state changes are driven by actual device responses via MQTT. This ensures the UI always reflects the true device state.

### Singleton Services
All services use the singleton pattern for global state:
```typescript
let serviceInstance: Service | null = null;

export const getService = (): Service => {
  if (!serviceInstance) {
    serviceInstance = new Service();
  }
  return serviceInstance;
};
```

### Listener Pattern
DeviceDataService uses a listener pattern to notify UI components of metric updates:
```typescript
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  setMetrics(metrics);
});

// Cleanup
return () => unsubscribe();
```

### Error Handling
Structured error types with user-friendly messages:
```typescript
enum WiFiErrorType {
  PERMISSION_DENIED,
  LOCATION_DISABLED,
  SCAN_FAILED,
  UNKNOWN_ERROR,
}

class WiFiError extends Error {
  constructor(type: WiFiErrorType, message: string) {
    this.type = type;
    this.message = message;
  }
  
  getUserMessage(): string { /* ... */ }
  getActionLabel(): string { /* ... */ }
}
```

### Onboarding Gate
RootNavigator checks AsyncStorage for `onboarding_completed`:
- **Not set** → shows StartupScreen (splash + permission request)
- **Set** → goes directly to HomeScreen

---

## 📋 Testing Checklist

- [ ] BLE provisioning with new device
- [ ] WiFi reconfiguration
- [ ] LED toggle with real-time feedback
- [ ] Metrics display with live updates
- [ ] Permission requests on first launch
- [ ] Device removal and re-provisioning
- [ ] MQTT connection loss and recovery
- [ ] WiFi scanning with Location Services disabled
- [ ] Device rename functionality
- [ ] Long-press menu interactions
- [ ] Pull-to-refresh on HomeScreen
- [ ] Animations and transitions

---

## 🐛 Troubleshooting

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

---

## 📦 Dependencies

### Core
- `react-native` - Mobile framework
- `react` - UI library
- `typescript` - Type safety

### Navigation
- `@react-navigation/native` - Navigation framework
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator
- `@react-navigation/material-top-tabs` - Material tabs

### BLE & WiFi
- `react-native-ble-plx` - BLE communication
- `react-native-wifi-reborn` - WiFi scanning
- `react-native-geolocation-service` - Location services

### Storage & Security
- `@react-native-async-storage/async-storage` - Persistent storage
- `react-native-keychain` - Secure credential storage

### Communication
- `mqtt` - MQTT client

### Permissions
- `react-native-permissions` - Permission management

### UI
- `react-native-safe-area-context` - Safe area handling
- `react-native-screens` - Native screen handling
- `react-native-tab-view` - Tab view component
- `react-native-pager-view` - Pager component

### Utilities
- `@craftzdog/react-native-buffer` - Buffer utilities
- `react-native-quick-base64` - Base64 encoding

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 22.11.0
- React Native CLI
- Android SDK (for Android development)
- Xcode (for iOS development)

### Installation

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Build & Test

```bash
# Lint code
npm run lint

# Run tests
npm run test
```

---

## 📝 Notes

- All services are singletons for global state management
- MQTT connection is initialized on app startup
- Permissions are requested during onboarding (StartupScreen)
- Device metrics are cached in DeviceDataService
- UI updates are driven by MQTT messages (no optimistic updates)
- BLE is used only for provisioning, MQTT for real-time communication
- All timestamps are ISO format
- Device IDs are BLE MAC addresses, MQTT device IDs are short hex strings

