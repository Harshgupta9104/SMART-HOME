# SmartHomeApp - Project Overview

## 🎯 Project Purpose
A React Native mobile app for controlling IoT devices (ESP32-based smart home devices) via BLE provisioning and MQTT real-time communication.

---

## 📱 Architecture Overview

### Tech Stack
- **Framework**: React Native 0.84
- **Navigation**: React Navigation (Native Stack)
- **State Management**: React Context (BLE Context)
- **Real-time Communication**: MQTT (HiveMQ Cloud)
- **Bluetooth**: react-native-ble-plx
- **Storage**: AsyncStorage + React Native Keychain
- **Icons**: react-native-vector-icons (Feather)
- **UI**: React Native StyleSheet with glassmorphism design

### Project Structure
```
SmartHomeApp/
├── src/
│   ├── screens/              # UI Screens
│   │   ├── HomeScreen.tsx           # Main dashboard (premium design)
│   │   ├── SimpleBleProvisionScreen.tsx  # BLE device discovery
│   │   ├── WiFiProvisioningScreen.tsx    # WiFi credentials input
│   │   ├── ProvisioningProgressScreen.tsx # Provisioning status
│   │   ├── ProvisioningSuccessScreen.tsx  # Success confirmation
│   │   ├── DeviceDetailsScreen.tsx        # Device control panel
│   │   ├── MetricsScreen.tsx              # Device metrics/stats
│   │   └── StartupScreen.tsx              # App startup
│   ├── services/             # Business Logic
│   │   ├── mqttService.ts           # MQTT broker communication
│   │   ├── deviceDataService.ts     # Real-time device metrics
│   │   ├── bleService.ts            # Bluetooth scanning/connection
│   │   ├── wifiService.ts           # WiFi management
│   │   ├── storageService.ts        # Local device storage
│   │   └── permissionService.ts     # Android/iOS permissions
│   ├── context/              # State Management
│   │   └── BleContext.tsx           # BLE state & scanning
│   └── navigation/           # Navigation
│       └── RootNavigator.tsx        # App navigation stack
├── android/                  # Android native code
├── App.tsx                   # App entry point
├── react-native.config.js    # Vector icons font linking
└── package.json
```

---

## 🔄 Data Flow Architecture

### 1. **Device Provisioning Flow**
```
HomeScreen (Add Device)
    ↓
SimpleBleProvisionScreen (BLE Scan)
    ↓ (Device Selected)
WiFiProvisioningScreen (Enter WiFi Credentials)
    ↓ (Credentials Sent via BLE)
ProvisioningProgressScreen (Monitor Progress)
    ↓ (Success)
ProvisioningSuccessScreen (Confirmation)
    ↓
HomeScreen (Device Added to List)
```

### 2. **Real-time Data Flow**
```
ESP32 Device
    ↓ (MQTT Publish)
HiveMQ Cloud Broker
    ↓ (MQTT Subscribe)
MqttService (Receives Messages)
    ↓ (Parse & Notify)
DeviceDataService (Cache & Distribute)
    ↓ (Listener Callbacks)
HomeScreen / DeviceDetailsScreen (Update UI)
```

### 3. **Device Control Flow**
```
User Toggles Switch (HomeScreen)
    ↓
handleToggleDevice()
    ↓
DeviceDataService.updateLEDStatus() / updateRelayStatus()
    ↓
MqttService.sendLEDCommand() / sendRelayCommand()
    ↓ (MQTT Publish to esp32/{id}/led/set)
HiveMQ Cloud Broker
    ↓
ESP32 Device (Receives Command)
    ↓ (Executes Action)
ESP32 Publishes State (esp32/{id}/led/state)
    ↓
MqttService (Receives State Update)
    ↓
DeviceDataService (Updates Cache)
    ↓
HomeScreen (UI Updates with Real State)
```

---

## 🔌 MQTT Topic Structure

### Device Topics
```
esp32/{deviceId}/data              # Sensor data (JSON)
esp32/{deviceId}/status            # Device status
esp32/{deviceId}/led/state         # LED state (ON/OFF)
esp32/{deviceId}/led/set           # LED control command
esp32/{deviceId}/relay/state       # Relay state (ON/OFF)
esp32/{deviceId}/relay/set         # Relay control command
esp32/{deviceId}/config            # Configuration commands
```

### Example Payloads
```json
// Data Topic
{
  "soil_pct": 65,
  "rssi": -45,
  "led": "ON",
  "relay": "OFF",
  "uptime": 3600,
  "free_heap": 102400,
  "temperature": 25.5,
  "humidity": 60
}

// LED State Topic
"ON" or "OFF"

// Config Topic
{
  "type": "wifi_update",
  "ssid": "MyWiFi",
  "password": "password123"
}
```

---

## 📊 Key Services

### 1. **MqttService** (`mqttService.ts`)
- **Purpose**: Manages MQTT broker connection and communication
- **Key Methods**:
  - `connect()` - Connect to HiveMQ Cloud
  - `subscribe()` - Subscribe to device topics
  - `sendLEDCommand()` - Send LED control
  - `sendRelayCommand()` - Send relay control
  - `sendWiFiUpdate()` - Send WiFi credentials
  - `sendFactoryReset()` - Factory reset device
- **Broker**: HiveMQ Cloud (wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt)
- **Credentials**: username: `bluetooth`, password: `Ble_12345`

### 2. **DeviceDataService** (`deviceDataService.ts`)
- **Purpose**: Manages real-time device metrics and caching
- **Key Methods**:
  - `subscribe()` - Subscribe to device metrics
  - `getMetrics()` - Get cached metrics
  - `updateLEDStatus()` - Toggle LED
  - `updateRelayStatus()` - Toggle relay
  - `reconfigureWiFi()` - Update WiFi
  - `factoryReset()` - Reset device
- **Caching**: Stores latest metrics in memory
- **Listeners**: Notifies UI components of updates

### 3. **StorageService** (`storageService.ts`)
- **Purpose**: Persists provisioned devices locally
- **Storage**: AsyncStorage + React Native Keychain
- **Key Methods**:
  - `getProvisionedDevices()` - Retrieve all devices
  - `addProvisionedDevice()` - Save device
  - `removeProvisionedDevice()` - Delete device
  - `getWiFiCredentials()` - Retrieve WiFi creds
  - `saveWiFiCredentials()` - Save WiFi creds

### 4. **BleService** (`bleService.ts`)
- **Purpose**: Handles Bluetooth scanning and connection
- **Key Methods**:
  - `startScan()` - Scan for ESP32 devices
  - `stopScan()` - Stop scanning
  - `connectToDevice()` - Connect to device
  - `discoverServices()` - Find BLE services
  - `writeCharacteristic()` - Send data to device

### 5. **PermissionService** (`permissionService.ts`)
- **Purpose**: Manages Android/iOS permissions
- **Permissions Needed**:
  - Bluetooth (BLUETOOTH, BLUETOOTH_ADMIN)
  - Location (FINE_LOCATION, COARSE_LOCATION)
  - Notifications (POST_NOTIFICATIONS)

---

## 🎨 UI/UX Design

### HomeScreen (Premium Design)
- **Background**: Soft gradient (#F4F7FB to #EEF3FF)
- **Header**: 
  - Greeting ("Good afternoon")
  - Title ("SmartHome Hub") - Bold, large
  - Icons: Bell (notifications), Settings
  - Status badge (devices online/idle)
- **Room Tabs**: Horizontal scroll filter
- **Device Cards**: 
  - Glassmorphism effect
  - Device icon, name, status
  - Toggle switch for control
- **Bottom Navigation**: Floating navbar with 4 tabs
  - Home, Add, Stats, Profile
- **Icons**: Feather icon set (react-native-vector-icons)

### Device Details Screen
- Full device control panel
- Real-time metrics display
- WiFi reconfiguration
- Device restart/reset options

---

## 🔐 Security Features

1. **MQTT Authentication**: Username/password to HiveMQ
2. **WebSocket Encryption**: WSS (TLS/SSL)
3. **Local Storage**: Keychain for WiFi credentials
4. **Permission Checks**: Runtime permissions for BLE/Location
5. **Device ID Validation**: Short device ID (e.g., "26B7B3F8")

---

## 📡 Device Provisioning Process

### Step 1: BLE Discovery
- App scans for ESP32 devices
- Displays list of discovered devices
- User selects device

### Step 2: WiFi Credentials
- User enters WiFi SSID and password
- Credentials sent via BLE to ESP32

### Step 3: Device Configuration
- ESP32 connects to WiFi
- ESP32 connects to MQTT broker
- Device publishes initial data

### Step 4: Confirmation
- App receives MQTT data from device
- Device added to provisioned list
- Stored in AsyncStorage

---

## 🚀 Real-time Features

### Live Metrics
- Soil moisture percentage
- WiFi signal strength (RSSI)
- LED status
- Relay status
- Device uptime
- Free heap memory
- Temperature & humidity

### Live Control
- Toggle LED on/off
- Toggle relay on/off
- Instant feedback from device
- No optimistic updates (waits for device response)

### Activity Logging
- Recent device actions
- Timestamps
- Device names
- Action descriptions

---

## 🔧 Configuration

### MQTT Broker
- **URL**: wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt
- **Username**: bluetooth
- **Password**: Ble_12345
- **QoS**: 1 (At least once delivery)

### App Startup
1. Request permissions
2. Initialize MQTT connection
3. Load provisioned devices
4. Subscribe to device metrics
5. Display HomeScreen

---

## 📝 Device Data Model

```typescript
interface ProvisionedDevice {
  id: string;                    // BLE device ID
  name: string;                  // User-friendly name
  mqttDeviceId: string;          // Short device ID for MQTT
  status: 'online' | 'offline' | 'connecting';
  lastSeen: number;              // Timestamp
  room?: string;                 // Room assignment
}

interface DeviceMetrics {
  deviceId: string;
  soilMoisture?: number;         // 0-100%
  wifiRSSI?: number;             // dBm
  ledStatus?: boolean;           // ON/OFF
  relayStatus?: boolean;         // ON/OFF
  uptime?: number;               // seconds
  freeHeap?: number;             // bytes
  temperature?: number;          // °C
  humidity?: number;             // %
  lastUpdate: number;            // timestamp
}
```

---

## 🎯 Key Features

✅ **BLE Provisioning** - Scan and connect to ESP32 devices
✅ **WiFi Configuration** - Send WiFi credentials via BLE
✅ **MQTT Real-time** - Live device metrics and control
✅ **Device Management** - Add, rename, remove devices
✅ **Live Control** - Toggle LED/relay with instant feedback
✅ **Activity Logging** - Track recent device actions
✅ **Premium UI** - Glassmorphism design with Feather icons
✅ **Persistent Storage** - Devices saved locally
✅ **Permission Handling** - Proper Android/iOS permissions
✅ **Error Handling** - Graceful error messages

---

## 🐛 Known Limitations

1. **No offline mode** - Requires MQTT connection for control
2. **No device groups** - Can't control multiple devices at once
3. **No scheduling** - No automation/scheduling features
4. **No notifications** - No push notifications for device events
5. **Single user** - No multi-user support

---

## 🔮 Future Enhancements

- [ ] Device automation/scheduling
- [ ] Push notifications
- [ ] Device grouping/scenes
- [ ] Energy usage analytics
- [ ] Multi-user support
- [ ] Cloud backup
- [ ] Voice control integration
- [ ] HomeKit/Google Home integration

---

## 📞 Support

For issues or questions about the project structure, refer to the inline comments in each service file.
