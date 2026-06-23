# SmartHomeApp - Complete Documentation

## Overview
SmartHomeApp is a React Native mobile application for managing and controlling IoT devices (ESP32-based smart switches, sensors) through BLE provisioning and MQTT real-time communication. The app runs on Android/iOS and provides device discovery, provisioning, control, and monitoring.

---

## 1. Architecture Overview

### Technology Stack
- **Framework**: React Native 0.84 + TypeScript
- **State Management**: React Context API (Theme, BLE)
- **Navigation**: React Navigation (Native Stack)
- **Communication**: MQTT (WebSocket), BLE (react-native-ble-plx)
- **Storage**: AsyncStorage (local), React Native Keychain (secure)
- **UI**: NativeWind (Tailwind CSS) + React Native StyleSheet
- **Key Dependencies**: mqtt, react-native-ble-plx, @react-native-async-storage, react-native-permissions

### Core Components Hierarchy
```
App.tsx
├── SafeAreaProvider
│   └── ThemeProvider
│       └── BleProvider
│           └── RootNavigator (Stack Navigation)
│               ├── HomeScreen
│               ├── AddDeviceScreen
│               ├── WiFiProvisioningScreen
│               ├── ProvisioningProgressScreen
│               ├── ProvisioningSuccessScreen
│               ├── DeviceDetailsScreen
│               └── [Other screens]
```

---

## 2. Data Models

### ProvisionedDevice Interface
```typescript
interface ProvisionedDevice {
  id: string;                    // Primary unique identifier (local)
  bleId?: string;                // BLE native identifier (MAC address)
  mqttDeviceId: string;          // MQTT topic device ID (CRITICAL)
  name: string;                  // Internal name (e.g., "PROV_26B7B3F8")
  displayName: string;           // User-friendly display name
  roomName: string;              // Room/location assignment
  deviceType: DeviceType;        // Type: smart_switch_1_relay, etc.
  relayCount: number;            // Number of relays (1, 4, or 0)
  macAddress?: string;           // MAC address
  ssid?: string;                 // Connected WiFi network
  status: 'connecting' | 'online' | 'offline';
  firmwareVersion?: string;      // Device firmware version
  lastSeen: string;              // ISO timestamp of last activity
  provisionedAt: string;         // ISO timestamp of provisioning
  justProvisioned?: boolean;     // Flag for recent provisioning
}
```

### DeviceMetrics Interface
```typescript
interface DeviceMetrics {
  deviceId: string;
  soilMoisture?: number;         // 0-100%
  wifiRSSI?: number;             // dBm (signal strength)
  ledStatus?: boolean;           // ON/OFF
  relayStatus?: boolean;         // ON/OFF (GPIO23)
  uptime?: number;               // seconds since boot
  freeHeap?: number;             // available memory in bytes
  temperature?: number;          // °C
  humidity?: number;             // %
  lastUpdate: number;            // Unix timestamp
}
```

### Provisioning States
```typescript
enum ProvisioningState {
  IDLE,                          // Ready for provisioning
  CONNECTING_BLE,                // Establishing BLE connection
  DISCOVERING_SERVICES,          // Scanning for BLE services
  SENDING_CREDENTIALS,           // Sending WiFi credentials via BLE
  WAITING_WIFI,                  // Device connecting to WiFi
  SUCCESS,                       // WiFi credentials verified
  WAITING_ONLINE,                // Waiting for MQTT online signal
  DEVICE_ONLINE,                 // Device came online
  TIMEOUT,                       // Provisioning timeout
  ERROR                          // Error occurred
}
```

---

## 3. Services Architecture

### MqttService (Singleton)
**Responsibility**: MQTT broker connectivity and device communication

**Key Methods**:
- `connect(config)`: Connect to HiveMQ broker via WebSocket
- `subscribe(topic, callback)`: Subscribe to device topic
- `publish(topic, message)`: Send command to device
- `unsubscribe(topic)`: Remove topic subscription
- `disconnect()`: Close MQTT connection

**Topics**:
```
SUBSCRIBE:  esp32/{deviceId}/data          → Full sensor metrics (JSON)
SUBSCRIBE:  esp32/{deviceId}/status        → "online" or "offline"
SUBSCRIBE:  esp32/{deviceId}/led/state     → LED state: "ON" or "OFF"
SUBSCRIBE:  esp32/{deviceId}/relay/state   → Relay state: "ON" or "OFF"

PUBLISH:    esp32/{deviceId}/led/set       → "ON" or "OFF"
PUBLISH:    esp32/{deviceId}/relay/set     → "ON" or "OFF"
PUBLISH:    esp32/{deviceId}/config        → {"factory_reset": true} or {"wifi_update": {...}}
```

**Event Emitters**:
```typescript
connectCallbacks[]       // Called on successful connection
messageCallbacks[]       // Called when message received
errorCallbacks[]         // Called on error
disconnectCallbacks[]    // Called on disconnect
```

---

## 4. Service Details

### BleService (Singleton)
**Responsibility**: BLE device discovery and provisioning

**Provisioning Flow**:
1. Start scan for "PROV_*" devices
2. Connect to selected device
3. Discover BLE services and characteristics
4. Read device ID from characteristic
5. Send WiFi credentials (base64 JSON) via BLE write
6. Wait for acknowledgment from ESP32 firmware
7. Return success/error

**BLE UUIDs** (must match ESP32 firmware):
```
SERVICE_UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
CHARACTERISTIC_UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
DEVID_SERVICE_UUID: 12345678-1234-1234-1234-1234567890ab
DEVID_CHAR_UUID: 12345678-1234-1234-1234-1234567890cd
```

---

## 5. Device Data Flow

### Real-time Metrics Reception
```
1. Device publishes metrics to MQTT: esp32/{id}/data
   Payload: { soilMoisture: 45, temperature: 23, ledStatus: true, ... }

2. MqttService.onMessage() receives message
   - Parses topic to extract {deviceId}
   - Decodes JSON payload

3. MqttService calls all registered listeners
   - messageCallbacks.forEach(cb => cb(topic, payload))

4. DeviceDataService listener processes message
   - Extracts metrics from payload
   - Caches in metricsCache: Map<deviceId, DeviceMetrics>
   - Notifies all device listeners

5. Component listener (e.g., from HomeScreen) receives update
   - setState(metrics)
   - Component re-renders with new data
```

### Device Control Flow
```
1. User taps relay toggle on UI (HomeScreen)
   handleToggleDevice(device)

2. Call DeviceDataService.updateRelayStatus(deviceId, newState)
   - Gets current metrics from cache
   - Calls MqttService.publish("esp32/{deviceId}/relay/set", "ON"/"OFF")

3. MQTT publishes command to device
   - Device receives command on firmware
   - Toggles GPIO23
   - Publishes new state back

4. Device publishes to esp32/{deviceId}/relay/state

5. App receives update (step 1-5 from metrics reception)
   - Updates UI with new state
   - NO optimistic UI (waits for device response)
```

---

## 6. Device Provisioning Workflow

### Complete End-to-End Provisioning

```
START: User on HomeScreen
  ↓
[1] Tap "Add Device" button
  ↓
AddDeviceScreen: Choose provisioning method
  ├─ Option A: Simple BLE Provisioning (direct credentials via BLE)
  └─ Option B: WiFi Provisioning (scan networks first)
  ↓
[2] REQUEST PERMISSIONS
  - Check Bluetooth enabled
  - Request BLE scan permission (Android 12+)
  - Request location permission (Android 13+)
  - If denied, show settings prompt
  ↓
[3] START BLE SCAN (5 minute timeout)
  SimpleBleProvisionScreen: Scanning for "PROV_*" devices
  - BleContext.startScan()
  - BleService.scan() filters by name prefix
  - Display list of discovered devices
  ↓
[4] SELECT DEVICE
  - User selects ESP32 from list
  - Store device basic info
  ↓
[5] INPUT WiFi CREDENTIALS
  WiFiProvisioningScreen:
  - Display available WiFi networks (scanned by app)
  - User enters SSID (or select from list)
  - User enters WiFi password
  - Optional: Save to device memory for next provisioning
  ↓
[6] SEND CREDENTIALS VIA BLE
  SimpleBleProvisionScreen → Send Phase:
  - Connect to selected BLE device
  - Discover services and characteristics
  - Create JSON payload:
    { "ssid": "MyNetwork", "password": "MyPass123" }
  - Base64 encode payload
  - Write to BLE characteristic
  - Wait for ACK response from ESP32 firmware (5 sec timeout)
  ↓
[7] WAIT FOR DEVICE TO CONNECT
  ProvisioningProgressScreen:
  - Poll device status every 1 second
  - Display real-time provisioning state
  - States: SENDING_CREDENTIALS → WAITING_WIFI → DEVICE_ONLINE
  - Timeout: 30 seconds
  ↓
[8] DEVICE CONNECTS TO MQTT
  - ESP32 firmware:
    a. Receives BLE credentials
    b. Connects to WiFi network
    c. Connects to MQTT broker
    d. Publishes presence to esp32/{deviceId}/status = "online"
  ↓
[9] APP DETECTS DEVICE ONLINE
  ProvisioningProgressScreen:
  - MqttService receives status update
  - DeviceDataService notifies listeners
  - Provisioning state → DEVICE_ONLINE
  ↓
[10] SAVE DEVICE TO STORAGE
  - StorageService.addProvisionedDevice(device)
  - Saved to AsyncStorage (for persistence)
  ↓
[11] SUCCESS SCREEN
  ProvisioningSuccessScreen:
  - Display confirmation
  - Show device details
  - Option: Name device now
  ↓
[12] DEVICE NAMING (Optional)
  DeviceNamingScreen:
  - Input custom display name
  - StorageService.updateDeviceDisplayName()
  ↓
[13] RETURN TO HOME
  - HomeScreen displays new device
  - Device shows "online" status
  - Ready for control
  ↓
END
```

---

## 7. Home Screen Logic

### Device Display
```
HomeScreen Component Structure:
├── Header
│   ├── Greeting (time-based: Good morning/afternoon/evening)
│   ├── Title: "Smart Home"
│   ├── Quick action buttons (Notifications, Settings)
│   └── Status chips (X on, Y online, Z off)
├── Room filter tabs (horizontal scroll)
│   └── Selected room devices only (TODO: filtering logic)
├── Device Grid (2 columns)
│   └── Device Cards
│       ├── Device icon
│       ├── Device name
│       ├── Room assignment
│       ├── Current status (ON/OFF/Offline)
│       └── Toggle switch (calls handleToggleDevice)
├── Live Activity Card
│   ├── Recent device actions (last 5)
│   ├── Device name, action, time
│   └── Empty state when no recent activity
└── Bottom Navigation
    ├── Home (current)
    ├── Add Device
    └── Profile
```

### Real-time Updates
```
Component Mount:
  1. Call loadProvisionedDevices()
     - Fetch from StorageService
     - Set to state

  2. For each device:
     - Call DeviceDataService.subscribe(deviceId, listener)
     - Listener callback stores metrics in state
     - If no metrics yet, initialize empty

  3. Subscribe to device status changes
     - Detect online/offline transitions
     - Update UI accordingly

Component Unmount:
  1. Call unsubscribe() for each device
  2. Clean up MQTT listeners
  3. Clear state
```



---

## 8. Theme System

### Theme Context
```typescript
interface ThemeContextValue {
  theme: ThemeColors;           // Current theme colors
  mode: AppThemeMode;           // light, dark, ocean, emerald, purple, system
  resolvedMode: ResolvedThemeMode;  // light or dark (resolved from system)
  isDark: boolean;              // Is dark theme active
  setMode(mode): Promise<void>  // Change theme (persisted to AsyncStorage)
}
```

### Available Themes
- **Light**: Bright background (#F4F7FB), dark text
- **Dark**: Dark background (#1F2937), light text
- **Ocean**: Blue accents (primary: #3B82F6)
- **Emerald**: Green accents (success: #10B981)
- **Purple**: Violet accents (primary: #7C3AED)
- **System**: Follows device settings (auto light/dark)

### Theme Colors Applied
- **Background**: Page/screen background
- **Surface**: Card and container backgrounds
- **Card**: Device card backgrounds
- **Text**: Primary, secondary, muted text colors
- **Border**: Divider and outline colors
- **Semantic**: Success (green), warning (orange), danger (red)
- **Components**: Icon color, shadow, bottom nav, input fields

---

## 9. Storage & Persistence

### AsyncStorage Keys
```
'@SmartHome_ProvisionedDevices'   → JSON array of ProvisionedDevice[]
'@SmartHome_SavedNetworks'         → JSON array of SavedNetwork[]
'@SmartHome_ThemeMode'             → Selected theme mode string
'@SmartHome_ActivityLog'           → JSON array of ActivityLog[]
```

### React Native Keychain
```
Service: 'SmartHomeApp_WiFiCredentials'
- Stores WiFi password securely (encrypted)
- Retrieved only when provisioning new device
- Cleared on logout (if implemented)
```

### Device Normalization
When loading devices, app auto-normalizes old/partial device formats:
```
normalizeProvisionedDevice(device):
  1. Extract or generate device ID
  2. Extract or generate MQTT device ID (CRITICAL)
  3. Ensure display name exists
  4. Fill missing room assignments
  5. Validate status field
  → Returns clean ProvisionedDevice object
```

---

## 10. Permission System

### Android Permissions Required
- **BLUETOOTH** (API 30+): Scan for nearby BLE devices
- **BLUETOOTH_ADMIN** (API 30+): Connect to BLE devices
- **ACCESS_FINE_LOCATION** (API 31+): Required for BLE scanning
- **POST_NOTIFICATIONS** (API 33+): In-app notifications
- **INTERNET**: Network communication (MQTT)

### iOS Permissions Required
- **NSBluetoothPeripheralUsageDescription**: BLE access prompt
- **NSLocationWhenInUseUsageDescription**: Location for BLE scanning

### Permission Flow in App
```
App.tsx (on launch):
  1. Call permissionService.requestProvisioningPermissions()
  2. Silently request all required permissions
  3. If denied, user can manually enable in Settings

AddDeviceScreen (before scanning):
  1. Check permissions with BleContext.checkPermissions()
  2. If missing, request with BleContext.requestPermissions()
  3. If blocked, show "Open Settings" button
  4. Block scan until permissions granted
```

---

## 11. MQTT Configuration

### Environment Variables (.env)
```
MQTT_URL=wss://broker.hivemq.cloud:8884/mqtt
MQTT_USERNAME=mobile_app
MQTT_PASSWORD=your_secure_password
MQTT_CLIENT_ID_PREFIX=smartapp
```

### Connection Details
- **Broker**: HiveMQ Cloud (free tier: 10 concurrent connections)
- **Protocol**: MQTT over WebSocket (WebSocket TLS)
- **Port**: 8884 (secure), 8883 (MQTT TLS)
- **Client ID**: `{prefix}-{timestamp}-{random}`
- **Reconnection**: Auto-reconnect 1000ms intervals, 30s timeout
- **Keep Alive**: 60 seconds

### MQTT Topics Pattern
```
ESP32 Device Topics:
esp32/{deviceId}/data           → Device publishes sensor metrics
esp32/{deviceId}/status         → Device publishes online/offline
esp32/{deviceId}/led/state      → LED current state
esp32/{deviceId}/relay/state    → Relay current state
esp32/{deviceId}/led/set        → App sends LED command
esp32/{deviceId}/relay/set      → App sends relay command
esp32/{deviceId}/config         → App sends config commands

Example Device ID: "26B7B3F8" (unique identifier from ESP32)
Full topic: esp32/26B7B3F8/data
```

---

## 12. Notification System

### In-App Notifications
```typescript
interface Notification {
  id: string;
  deviceId: string;
  type: 'device_online' | 'device_offline' | 'relay_changed' 
        | 'physical_switch' | 'wifi_changed' | 'error';
  severity: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}
```

### Notification Triggers
- **Device Online**: Device reconnects after offline
- **Device Offline**: Device disconnects/timeout
- **Relay Changed**: GPIO state changed (local button or app)
- **Physical Switch**: User pressed physical relay button
- **WiFi Changed**: Device switched networks
- **Error**: Provisioning failed, connection lost, etc.

### Notification Display
- In-app toast/banner (temporary)
- Notification history in NotificationScreen
- Persisted to AsyncStorage
- Sorted by timestamp (newest first)

---

## 13. Error Handling & Recovery

### BLE Errors
```
Timeout connecting          → Show "Device not responding"
Service discovery failed    → Retry or select different device
Characteristic not found    → Device firmware incompatible
BLE write failed            → Check device battery, try again
Connection lost             → Auto-reconnect (up to 3 times)
```

### MQTT Errors
```
Connection refused          → Check broker URL and credentials
Authentication failed       → Invalid username/password
Topic permission denied     → Check broker ACL settings
Publish timeout             → Device offline, retry when online
Subscribe failed            → Try restarting app
```

### Provisioning Errors
```
WiFi credentials invalid    → Show error, retry
Device timeout              → Device may not have enough power
Firmware incompatible       → Prompt to update device firmware
Network not found           → Check SSID spelling
Can't reach WiFi            → Check network availability
Can't reach MQTT            → Check internet connection
```

---

## 14. State Flow Diagram

### App State Transitions
```
App Launch
  ↓
Initialize MQTT Connection (non-blocking)
  ├── Load MQTT config from .env
  ├── Create unique client ID
  └── Connect to broker
  ↓
Initialize Theme (from AsyncStorage)
  ├── Load saved theme mode
  └── Set to context
  ↓
Initialize BLE (permissions check)
  ├── Check Bluetooth enabled
  ├── Request permissions if needed
  └── Set ready for scanning
  ↓
Load Provisioned Devices (from AsyncStorage)
  ├── Fetch all devices
  ├── Normalize each device
  ├── Subscribe to MQTT topics for each
  └── Display on HomeScreen
  ↓
Ready for User Interaction
  ├── Scan for new devices
  ├── Control existing devices
  ├── Change settings
  └── Manage profiles
```

---

## 15. User Workflows

### Workflow 1: Add a New Smart Switch
```
1. HomeScreen → Tap "Add" button
2. AddDeviceScreen → Select "Simple BLE Provisioning"
3. SimpleBleProvisionScreen → BLE scan starts
4. [User waits 3-5 seconds for device list]
5. [Device appears: "PROV_26B7B3F8"]
6. → Tap device to select
7. WiFiProvisioningScreen → Select WiFi network or enter SSID
8. [User enters WiFi password]
9. [App sends credentials via BLE]
10. ProvisioningProgressScreen → Shows real-time progress
11. [Device connects to WiFi then MQTT]
12. ProvisioningSuccessScreen → Displays success
13. DeviceNamingScreen → User enters display name: "Living Room Light"
14. StorageService saves device
15. HomeScreen → Device now appears in grid
16. Ready to control!
```

### Workflow 2: Control a Device
```
1. HomeScreen shows device with status "ON"
2. User taps toggle switch → OFF position
3. handleToggleDevice() called
4. Check device status and metrics available
5. Determine if LED or Relay device
6. MqttService publishes: "esp32/26B7B3F8/relay/set" → "OFF"
7. [Device receives command via MQTT]
8. [Device toggles GPIO23 LOW]
9. [Device publishes state: "esp32/26B7B3F8/relay/state" → "OFF"]
10. [App receives update via MQTT]
11. DeviceMetrics cache updated
12. HomeScreen listener notified
13. UI updates to show OFF state
14. Activity log updated: "Living Room Light turned OFF"
15. Complete!
```

### Workflow 3: View Device Metrics
```
1. HomeScreen shows device card with current state
2. User taps on device card
3. Navigate to DeviceDetailsScreen
4. [Screen loads device info: name, room, status]
5. Subscribe to real-time metrics
6. [Device publishes metrics every 10 seconds]
7. Metrics displayed:
   - Temperature: 23°C
   - Humidity: 45%
   - WiFi RSSI: -45 dBm
   - Uptime: 5 hours 32 minutes
   - LED Status: ON
   - Relay Status: OFF
8. Chart/graph of metrics over time (if stored)
9. User can change device name, room, settings
10. Tap back → Return to HomeScreen
```

---

## 16. Development & Testing

### Build & Run
```bash
# Install dependencies
npm install
yarn install

# Start development server
npm start
react-native start

# Run on Android
npm run android
react-native run-android

# Run on iOS
npm run ios
react-native run-ios
```

### Testing MQTT Locally
```bash
# Using MQTT CLI (install mqtt-cli or mosquitto-cli)
mosquitto_sub -h broker.hivemq.cloud -p 8883 -u mobile_app -P password -t "esp32/+/data"
mosquitto_pub -h broker.hivemq.cloud -p 8883 -u mobile_app -P password -t "esp32/26B7B3F8/relay/set" -m "ON"
```

### Common Issues & Fixes

**MQTT Connection Fails**
- Check .env file exists and has correct credentials
- Verify broker URL is reachable (HiveMQ status page)
- Check firewall/VPN not blocking WebSocket 8884
- Ensure device has internet connection

**BLE Scan Finds No Devices**
- Check Bluetooth is enabled on phone
- Check location permission granted (required for Android 13+)
- Ensure ESP32 is powered and in provisioning mode
- Restart BLE scan (user should see "PROV_*" devices)

**Device Stays Offline**
- Check device WiFi credentials are correct
- Check WiFi network is online and accessible
- Check device firmware supports MQTT connectivity
- Check MQTT broker firewall allows device connection
- Device may need restart or firmware update

---

## 17. Future Enhancements

- [ ] Room-based filtering and grouping
- [ ] Automation/scheduling (turn device on at time X)
- [ ] Device grouping (control multiple at once)
- [ ] Activity analytics and history graphs
- [ ] Voice control integration (Alexa, Google Home)
- [ ] Push notifications (not in-app only)
- [ ] Multi-user accounts and sharing
- [ ] Two-factor authentication
- [ ] Geofencing (turn off when user leaves home)
- [ ] Energy consumption tracking
- [ ] Offline device backup control (local network)

---

## 18. File Structure
```
SmartHomeApp/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── AddDeviceScreen.tsx
│   │   ├── SimpleBleProvisionScreen.tsx
│   │   ├── WiFiProvisioningScreen.tsx
│   │   ├── ProvisioningProgressScreen.tsx
│   │   ├── ProvisioningSuccessScreen.tsx
│   │   ├── DeviceDetailsScreen.tsx
│   │   ├── DeviceNamingScreen.tsx
│   │   ├── DeviceConfigScreen.tsx
│   │   ├── ControllerScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── NotificationScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── StartupScreen.tsx
│   ├── services/
│   │   ├── mqttService.ts
│   │   ├── bleService.ts
│   │   ├── storageService.ts
│   │   ├── deviceDataService.ts
│   │   ├── notificationService.ts
│   │   ├── permissionService.ts
│   │   ├── keychainService.ts
│   │   ├── wifiService.ts
│   │   └── locationService.ts
│   ├── context/
│   │   ├── ThemeContext.tsx
│   │   └── BleContext.tsx
│   ├── navigation/
│   │   └── RootNavigator.tsx
│   ├── config/
│   │   └── mqttConfig.ts
│   ├── constants/
│   │   └── provisioningStates.ts
│   ├── theme/
│   │   └── theme.ts
│   ├── utils/
│   │   ├── notificationHelpers.ts
│   │   └── formatters.ts
│   └── types/
│       └── index.ts
├── .env
├── .env.example
├── App.tsx
├── package.json
└── tsconfig.json
```

---

## 19. API Reference

### Storage Service
```typescript
// Get all provisioned devices
getProvisionedDevices(): Promise<ProvisionedDevice[]>

// Add new device
addProvisionedDevice(device): Promise<void>

// Update device details
updateDeviceDisplayName(deviceId, name): Promise<void>
updateDeviceRoom(deviceId, roomId): Promise<void>

// Get saved networks
getSavedNetworks(): Promise<SavedNetwork[]>

// Save network credentials
saveNetworkCredentials(ssid, password): Promise<void>
```

### Device Data Service
```typescript
// Subscribe to real-time metrics
subscribe(deviceId, listener: (metrics) => void): () => void

// Unsubscribe (returns cleanup function)
unsubscribe()

// Get cached metrics
getMetrics(deviceId): DeviceMetrics | null

// Control commands
updateLEDStatus(deviceId, state): Promise<boolean>
updateRelayStatus(deviceId, state): Promise<boolean>
```

### MQTT Service
```typescript
// Connection
connect(config): Promise<boolean>
disconnect(): void

// Messaging
publish(topic, message): void
subscribe(topic, callback): void
unsubscribe(topic): void

// Listeners
onConnect(callback): void
onMessage(callback): void
onError(callback): void
onDisconnect(callback): void
```

### BLE Service
```typescript
// Scanning
startScan(): void
stopScan(): void

// Device provisioning
provisionDevice(device, ssid, password): Promise<ProvisioningResult>

// Connection
connect(deviceId): Promise<boolean>
disconnect(): void

// State
checkBluetoothState(): Promise<boolean>
```

---

## 20. Summary

SmartHomeApp is a complete IoT device management system with:

✅ **BLE Provisioning**: Secure WiFi credential delivery via Bluetooth
✅ **MQTT Communication**: Real-time device control and metrics
✅ **Persistent Storage**: Device list and user preferences
✅ **Secure Credentials**: Keychain for sensitive data
✅ **Theme System**: Multiple themes with dark mode support
✅ **Permission Handling**: Proper Android/iOS compliance
✅ **Error Recovery**: Graceful handling of network failures
✅ **Activity Logging**: Track device state changes
✅ **Multi-Device Support**: Manage unlimited devices

The app follows React Native best practices with TypeScript for type safety, Context API for state management, and modular service architecture for scalability.

