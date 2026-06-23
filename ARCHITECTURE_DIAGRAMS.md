# SmartHomeApp - Architecture Diagrams

## 1. Component Hierarchy

```
SafeAreaProvider
  │
  └── ThemeProvider
      │ (manages: theme mode, color scheme)
      │
      └── BleProvider
          │ (manages: BLE state, scan, permissions)
          │
          └── RootNavigator (Native Stack)
              │
              ├── HomeScreen
              │   ├── Header (greeting, title, quick buttons)
              │   ├── Status Chips (X on, Y online, Z off)
              │   ├── Room Tabs (filter)
              │   ├── Device Grid (2 columns)
              │   ├── Live Activity Log
              │   └── Bottom Navigation
              │
              ├── AddDeviceScreen
              │   ├── Provisioning Method Selection
              │   └── Routes to SimpleBleProvisionScreen
              │
              ├── SimpleBleProvisionScreen
              │   ├── BLE Scan UI
              │   ├── Device List
              │   ├── WiFi Credentials Input
              │   └── Send via BLE
              │
              ├── WiFiProvisioningScreen
              │   ├── Network List
              │   ├── Password Input
              │   └── Save to Keychain
              │
              ├── ProvisioningProgressScreen (Modal)
              │   ├── Status Display
              │   ├── Progress Animation
              │   └── Real-time Updates
              │
              ├── ProvisioningSuccessScreen (Modal)
              │   ├── Success Message
              │   └── Next Steps
              │
              ├── DeviceDetailsScreen
              │   ├── Device Info
              │   ├── Metrics Display
              │   ├── Settings Button
              │   └── Delete Button
              │
              ├── DeviceNamingScreen (Modal)
              │   ├── Text Input
              │   └── Save Button
              │
              ├── DeviceConfigScreen
              │   ├── WiFi Reconfiguration
              │   ├── Factory Reset
              │   └── Firmware Info
              │
              ├── ControllerScreen
              │   ├── LED Toggle
              │   ├── Relay Toggle
              │   ├── Metrics Display
              │   └── Status Indicators
              │
              ├── ProfileScreen
              │   ├── User Info
              │   ├── Account Settings
              │   └── Logout Button
              │
              ├── NotificationScreen
              │   ├── Notification List
              │   ├── Filter by Type
              │   └── Clear All Button
              │
              └── SettingsScreen
                  ├── Theme Selection
                  ├── Notifications Toggle
                  ├── About
                  └── Version Info
```

---

## 2. Service Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SCREENS LAYER                         │
│  (Components that display UI and handle user input)     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─ Data Requests
                   ├─ Command Issuance
                   └─ Subscription Management
                   │
┌──────────────────┴──────────────────────────────────────┐
│              SERVICES LAYER (Singletons)                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  MqttService                                    │   │
│  │  ├─ connect(config)                            │   │
│  │  ├─ subscribe(topic, callback)                 │   │
│  │  ├─ publish(topic, message)                    │   │
│  │  └─ Manages: Client, Listeners, Callbacks      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  BleService                                     │   │
│  │  ├─ startScan()                                │   │
│  │  ├─ connect(deviceId)                          │   │
│  │  ├─ provisionDevice(device, ssid, pwd)         │   │
│  │  └─ Manages: BleManager, Devices, UUIDs        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  DeviceDataService                              │   │
│  │  ├─ subscribe(deviceId, listener)              │   │
│  │  ├─ getMetrics(deviceId)                        │   │
│  │  ├─ updateRelayStatus(deviceId, state)          │   │
│  │  ├─ updateLEDStatus(deviceId, state)            │   │
│  │  └─ Manages: Metrics Cache, Listeners          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  StorageService                                 │   │
│  │  ├─ getProvisionedDevices()                     │   │
│  │  ├─ addProvisionedDevice(device)                │   │
│  │  ├─ updateDevice(device)                        │   │
│  │  ├─ deleteDevice(deviceId)                      │   │
│  │  └─ Manages: AsyncStorage, Normalization       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Support Services                               │   │
│  │  ├─ NotificationService (history, queue)        │   │
│  │  ├─ PermissionService (BLE, location)           │   │
│  │  ├─ KeychainService (secure storage)            │   │
│  │  ├─ WiFiService (network scanning)              │   │
│  │  └─ LocationService (geolocation utils)         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─ MQTT Messages
                   ├─ Storage Operations
                   └─ System Events
                   │
┌──────────────────┴──────────────────────────────────────┐
│            STORAGE & EXTERNAL LAYER                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐    ┌────────────────────┐   │
│  │  AsyncStorage        │    │  React Native      │   │
│  │  (JSON serialized)   │    │  Keychain          │   │
│  │                      │    │  (encrypted)       │   │
│  │  Keys:               │    │                    │   │
│  │  - Devices           │    │  Stores:           │   │
│  │  - Networks          │    │  - WiFi passwords  │   │
│  │  - Theme             │    │  - Auth tokens     │   │
│  │  - Activity Log      │    │  - Sensitive creds │   │
│  └──────────────────────┘    └────────────────────┘   │
│                                                          │
│  ┌──────────────────────┐    ┌────────────────────┐   │
│  │  MQTT Broker         │    │  BLE Peripheral    │   │
│  │  (HiveMQ Cloud)      │    │  (ESP32 Device)    │   │
│  │                      │    │                    │   │
│  │  WebSocket URL:      │    │  Service UUIDs:    │   │
│  │  wss://broker...     │    │  - Provisioning    │   │
│  │                      │    │  - Device Info     │   │
│  │  Topics:             │    │                    │   │
│  │  esp32/{id}/*        │    │  Characteristics:  │   │
│  │                      │    │  - Device ID       │   │
│  │                      │    │  - WiFi Creds (RX) │   │
│  │                      │    │  - ACK (TX)        │   │
│  └──────────────────────┘    └────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagrams

### Real-time Device Control Flow

```
┌──────────────┐
│   USER       │
│   (taps      │
│   toggle)    │
└────────┬─────┘
         │
         ▼
┌──────────────────────────────────────┐
│  HomeScreen.handleToggleDevice()     │
│  (checks device status, metrics)     │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  DeviceDataService                   │
│  .updateRelayStatus(id, newState)    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  MqttService.publish()               │
│  Topic: esp32/{id}/relay/set         │
│  Payload: "ON" or "OFF"              │
└────────┬─────────────────────────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
    ┌────────────┐                      ┌──────────────┐
    │ MQTT Broker│                      │ Device Queue │
    │ (HiveMQ)   │                      │ (local cache)│
    └────────┬───┘                      └──────────────┘
             │
             ▼
         ┌────────────────────────┐
         │  ESP32 Device Firmware │
         │  (receives MQTT msg)   │
         │  Toggle GPIO23         │
         │  Publish back state    │
         └────────┬───────────────┘
                  │
                  ▼
           ┌─────────────────────┐
           │ MQTT Broker         │
           │ Topic: relay/state  │
           │ Payload: new state  │
           └────────┬────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │  MqttService.onMessage │
         │  (listener callback)   │
         └────────┬───────────────┘
                  │
                  ▼
         ┌──────────────────────────┐
         │  DeviceDataService      │
         │  Update metrics cache   │
         │  Notify all listeners   │
         └────────┬────────────────┘
                  │
                  ▼
         ┌──────────────────────────┐
         │  HomeScreen listener     │
         │  setState(newMetrics)    │
         │  re-render UI            │
         └────────┬────────────────┘
                  │
                  ▼
         ┌──────────────────────────┐
         │  Device card shows       │
         │  "OFF" state with toggle │
         │  in OFF position         │
         └────────────────────────┘
```

### Device Provisioning Flow

```
┌─────────────────────┐
│ User: AddDevice tap │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  AddDeviceScreen                    │
│  - Choose provisioning method       │
│  - Select "Simple BLE"              │
└──────────┬────────────────────────┐─┘
           │                        │
           ▼                        ▼
    ┌────────────────┐      ┌────────────────┐
    │ SimpleBLE...   │      │ WiFiProvisioning
    │ Screen         │      │ Screen (if alt)
    └────────┬───────┘      └────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ BleContext.startScan()             │
│ BleService.scan()                  │
│ Filter: "PROV_*" devices           │
└────────┬─────────────────────────┐─┘
         │                         │
    [Loading...]            [1...5 seconds]
         │                         │
         ├─────────────────────────┤
         │                         │
         ▼                         │
    ┌─────────────┐                │
    │ Device list │                │
    │ (refresh)   │                │
    └────────┬────┘                │
             │                     │
             ▼                     │
    ┌──────────────────────────────────┐
    │ User taps device                 │
    │ "PROV_26B7B3F8"                  │
    └────────┬───────────────────────┬─┘
             │                       │
             ▼                       │
    ┌──────────────────────────────────┐
    │ Connect BLE                      │
    │ BleService.connect(device)       │
    │ - Discover services              │
    │ - Read device ID characteristic  │
    └────────┬──────────────────────┐──┘
             │                      │
             ├─ Failure ────────┐   │
             │                  ▼   │
             │            ┌──────────────┐
             │            │ Show error   │
             │            │ Retry button │
             │            └──────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ WiFiProvisioningScreen       │
    │ - Input WiFi SSID/password   │
    │ - Display saved networks     │
    │ - Tap "Send"                 │
    └────────┬────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Send via BLE                 │
    │ - Create JSON payload        │
    │ - Base64 encode              │
    │ - BleService write           │
    │ - Wait for ACK (5s timeout)  │
    └────────┬─────┬──────────────┘
             │     │
      Success│     │Timeout/Error
             ▼     └──────┬───────┐
                          ▼       │
                   ┌───────────┐  │
                   │ Show error│  │
                   │ Retry     │  │
                   └───────────┘  │
             │                    │
             └────────┬───────────┘
                      │
                      ▼
    ┌─────────────────────────────────┐
    │ ProvisioningProgressScreen       │
    │ Poll device status (1s interval)│
    │ Show state: SENDING → WAITING → │
    │ ONLINE (max 30s)                │
    └────────┬──────────────────────┐─┘
             │                      │
             ├─ Timeout ────────┐   │
             │                  ▼   │
             │           ┌──────────────┐
             │           │ Show timeout │
             │           │ error        │
             │           └──────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Device comes ONLINE (MQTT)   │
    │ MqttService detects status   │
    │ change to "online"           │
    └────────┬────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ ProvisioningSuccessScreen    │
    │ - Show device name           │
    │ - Show "Naming" button       │
    │ - Tap to continue            │
    └────────┬────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ DeviceNamingScreen (Modal)   │
    │ - Input display name         │
    │ - Tap "Save"                 │
    └────────┬────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ StorageService.saveDevice()  │
    │ - Add to AsyncStorage        │
    │ - Subscribe to MQTT topics   │
    └────────┬────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Navigate to HomeScreen       │
    │ Device visible in grid!      │
    │ Provisioning complete ✓      │
    └──────────────────────────────┘
```

---

## 4. MQTT Communication Protocol

```
┌──────────────────────────────────────────────────────────┐
│           MQTT BROKER (HiveMQ Cloud)                     │
│  wss://broker.hivemq.cloud:8884/mqtt                    │
└──────────────────────────────────────────────────────────┘

App Publisher ──────────────────────────────── Broker ──────────── Device Subscriber
                PUBLISH COMMANDS              (Route)                   (ESP32)

esp32/{deviceId}/led/set ────────────────────────────────────────► Firmware toggles GPIO
  Payload: "ON" or "OFF"

esp32/{deviceId}/relay/set ─────────────────────────────────────► Firmware toggles GPIO23
  Payload: "ON" or "OFF"

esp32/{deviceId}/config ──────────────────────────────────────────► Firmware processes config
  Payload: {"factory_reset": true} or {"wifi_update": {...}}


Device Publisher ─────────────────────────────── Broker ──────────── App Subscriber
                PUBLISH DATA              (Route)                   (MqttService)

◄─────────────── esp32/{deviceId}/data ──────────────────────
  Payload: {
    "soilMoisture": 45,
    "wifiRSSI": -45,
    "ledStatus": true,
    "relayStatus": false,
    "temperature": 23,
    "humidity": 55,
    "uptime": 5432,
    "freeHeap": 100000,
    "lastUpdate": 1699123456789
  }

◄────────────────── esp32/{deviceId}/status ─────────────────
  Payload: "online" or "offline"

◄─────────────── esp32/{deviceId}/led/state ──────────────────
  Payload: "ON" or "OFF"

◄────────────── esp32/{deviceId}/relay/state ────────────────
  Payload: "ON" or "OFF"


SUBSCRIPTIONS (App):
- esp32/+/data           (all devices' metrics)
- esp32/+/status         (all devices' online/offline)
- esp32/+/led/state      (all devices' LED state)
- esp32/+/relay/state    (all devices' relay state)

PUBLISH (App):
- esp32/{specific-id}/led/set
- esp32/{specific-id}/relay/set
- esp32/{specific-id}/config
```

---

## 5. Storage Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    APP STATE                             │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│              AsyncStorage (React Native)                       │
│  (Persistent, survives app restart)                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  '@SmartHome_ProvisionedDevices'                              │
│  └─ Type: JSON Array of ProvisionedDevice[]                   │
│     └─ [                                                       │
│        {                                                       │
│          id: "26B7B3F8",                                      │
│          bleId: "A1:B2:C3:D4:E5:F6",                          │
│          mqttDeviceId: "26B7B3F8",                            │
│          displayName: "Living Room Light",                    │
│          roomName: "Living Room",                             │
│          status: "online",                                    │
│          ...more fields                                       │
│        },                                                      │
│        {...}                                                   │
│      ]                                                         │
│                                                                │
│  '@SmartHome_SavedNetworks'                                   │
│  └─ Type: JSON Array of SavedNetwork[]                        │
│     └─ [                                                       │
│        { ssid: "MyWiFi", savedAt: "2024-01-15T10:30:00Z" },   │
│        { ssid: "GuestNetwork", savedAt: "2024-01-14T15:45:00Z"}
│      ]                                                         │
│                                                                │
│  '@SmartHome_ThemeMode'                                       │
│  └─ Type: String (AppThemeMode)                              │
│     └─ "ocean" (one of: light, dark, ocean, emerald, purple)  │
│                                                                │
│  '@SmartHome_ActivityLog'                                     │
│  └─ Type: JSON Array of ActivityLog[]                         │
│     └─ [                                                       │
│        {                                                       │
│          id: "1699123456789",                                 │
│          deviceName: "Living Room Light",                     │
│          action: "LED turned ON",                             │
│          timestamp: 1699123456789                             │
│        }                                                       │
│      ]                                                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│         React Native Keychain (Encrypted Storage)              │
│  (Secure, survives app restart, OS-level encryption)          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Service: 'SmartHomeApp_WiFiCredentials'                      │
│  ├─ Key: "wifi_password_MyWiFi"                              │
│  │  └─ Value: "MySecurePassword123"                           │
│  │                                                             │
│  └─ Key: "wifi_password_GuestNetwork"                         │
│     └─ Value: "GuestPass456"                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│            Runtime Memory (Session Storage)                    │
│  (Lost on app close, reset)                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  DeviceDataService.metricsCache                              │
│  └─ Type: Map<deviceId, DeviceMetrics>                        │
│     └─ "26B7B3F8": {                                          │
│          soilMoisture: 45,                                    │
│          wifiRSSI: -45,                                       │
│          ledStatus: true,                                     │
│          lastUpdate: 1699123456789                            │
│        }                                                       │
│                                                                │
│  BleContext.discoveredDevices                                 │
│  └─ Type: Device[] (from react-native-ble-plx)               │
│     └─ [{name, id, rssi, ...}, ...]                           │
│                                                                │
│  ThemeProvider.mode                                            │
│  └─ Type: AppThemeMode                                        │
│     └─ "ocean"                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Permission Flow

```
APP LAUNCH
  │
  └─ App.tsx useEffect()
     │
     └─ permissionService.requestProvisioningPermissions()
        │
        ├─ Android 12+:
        │  ├─ BLUETOOTH (scan for devices)
        │  ├─ BLUETOOTH_ADMIN (connect to devices)
        │  └─ ACCESS_FINE_LOCATION (required for BLE)
        │
        ├─ Android 13+:
        │  └─ POST_NOTIFICATIONS (in-app toast)
        │
        └─ iOS:
           ├─ NSBluetoothPeripheralUsageDescription
           └─ NSLocationWhenInUseUsageDescription


ADD DEVICE SCREEN
  │
  └─ User taps "Scan"
     │
     └─ BleContext.checkPermissions()
        │
        ├─ All granted?
        │  └─ YES → Start scan
        │     │
        │     └─ BleContext.startScan()
        │        └─ BleService.scan()
        │
        └─ Missing permissions?
           └─ BleContext.requestPermissions()
              │
              ├─ Grant?
              │  └─ YES → Start scan
              │
              └─ Deny?
                 └─ Show "Open Settings" button
                    └─ permissionService.openAppSettings()
```

