# SmartHomeApp

A modern React Native application for controlling smart home devices (ESP32-based) via BLE provisioning and MQTT real-time communication.

## Features

- **BLE Provisioning** - Discover and provision new ESP32 devices over Bluetooth
- **MQTT Real-time Control** - Control devices and receive live sensor data via HiveMQ Cloud
- **WiFi Management** - Scan and reconfigure device WiFi networks with error handling
- **Beautiful UI** - Modern, animated interface with real-time metrics and interactive controls
- **Secure Storage** - Device credentials stored securely with Keychain
- **Real-time LED Control** - Interactive bulb with instant feedback from device
- **Live Metrics** - Soil moisture, temperature, humidity, WiFi signal with animations
- **Error Handling** - Structured error types with user-friendly guidance
- **State Machine** - Complex provisioning flow with progress tracking

## Tech Stack

- **React Native 0.84** (TypeScript)
- **react-native-ble-plx** — BLE scanning & provisioning
- **mqtt** (WebSocket) — real-time device data via HiveMQ Cloud
- **react-native-wifi-reborn** — WiFi network scanning
- **@react-navigation** — navigation (native-stack, material-top-tabs)
- **@react-native-async-storage** — onboarding state & device persistence
- **react-native-keychain** — secure WiFi password storage
- **react-native-permissions** — Android permission management

## Quick Start

### Prerequisites

- Node.js 18+
- React Native CLI
- Android SDK (for Android development)
- Xcode (for iOS development)

### Installation

```bash
npm install
npx react-native run-android
# or
npx react-native run-ios
```

## Project Structure

```
src/
├── screens/
│   ├── StartupScreen.tsx              # Splash + permission onboarding
│   ├── HomeScreen.tsx                 # Device list dashboard
│   ├── SimpleBleProvisionScreen.tsx   # BLE scan & connect
│   ├── WiFiProvisioningScreen.tsx     # WiFi network selection
│   ├── ProvisioningProgressScreen.tsx # BLE provisioning progress
│   ├── ProvisioningSuccessScreen.tsx  # Success confirmation
│   ├── DeviceDetailsScreen.tsx        # Tab container
│   ├── MetricsScreen.tsx              # Plant health + sensor data
│   ├── ControllerScreen.tsx           # LED grow light control
│   └── SettingsScreen.tsx             # Device config + WiFi reconfig
├── services/
│   ├── mqttService.ts                 # HiveMQ WebSocket connection
│   ├── deviceDataService.ts           # MQTT metrics cache + listeners
│   ├── bleService.ts                  # BLE scan & GATT operations
│   ├── wifiService.ts                 # WiFi network scanning
│   ├── storageService.ts              # AsyncStorage device persistence
│   ├── keychainService.ts             # Secure WiFi password storage
│   ├── permissionService.ts           # Android permission management
│   ├── locationService.ts             # Location services check
│   └── wifiErrors.ts                  # Structured WiFi error types
├── context/
│   └── BleContext.tsx                 # BLE state provider
├── hooks/
│   └── useProvisioning.ts             # BLE provisioning state machine
├── constants/
│   └── provisioningStates.ts          # Provisioning state enum
└── navigation/
    └── RootNavigator.tsx              # Stack navigator + onboarding gate
```

## Running

```bash
# Start Metro bundler
npx react-native start

# Build and install on Android
npx react-native run-android

# Build and install on iOS
npx react-native run-ios
```

## Device Provisioning Flow

1. **First Launch** → StartupScreen requests BT + location permissions
2. **Home Screen** → Tap "Add Device" → BLE scan for `PROV_*` devices
3. **Select Device** → Connect to ESP32 via BLE
4. **WiFi Setup** → Scan networks → Select SSID → Enter password
5. **Provisioning** → Send credentials via BLE → Wait for WiFi connection
6. **Success** → Device saved → Appears on Home dashboard
7. **Control** → Tap device → Metrics / Controller / Settings tabs

## MQTT Communication

### Broker Configuration

**HiveMQ Cloud (TLS WebSocket)**
- URL: `wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt`
- Username: `bluetooth`
- Password: `Ble_12345`

### Topic Structure

All topics use the **short device ID** (e.g. `26B7B3F8`):

| Topic | Direction | Payload | Purpose |
|---|---|---|---|
| `esp32/{id}/data` | ESP → App | JSON | Sensor data (soil, temp, humidity, RSSI, uptime, heap) |
| `esp32/{id}/status` | ESP → App | string | `online` / `offline` |
| `esp32/{id}/led/state` | ESP → App | string | `ON` / `OFF` |
| `esp32/{id}/led/set` | App → ESP | string | `ON` / `OFF` |
| `esp32/{id}/config` | App → ESP | JSON | WiFi update / factory reset |

### LED Control

```
Topic:   esp32/{id}/led/set
Payload: ON  or  OFF
QoS:     1
```

**State Flow:**
1. User taps bulb → App publishes command
2. ESP32 receives → Changes LED → Publishes state
3. App receives state → Updates UI (true device state, not optimistic)

### WiFi Reconfiguration

```
Topic:   esp32/{id}/config
Payload: { "type": "wifi_update", "ssid": "...", "password": "..." }
QoS:     1
```

**ESP32 Behavior:**
1. Receives command
2. Tries new credentials (3 attempts)
3. If success → Saves to NVS → Restarts
4. If fail → Rolls back to previous WiFi → Restarts

## Device Details Tabs

### Metrics Tab
- **Main KPI Card** - Soil moisture with circular progress ring
- **Plant State** - Desert Dry → Dry → Healthy → Wet → Saturated
- **State Colors** - Red → Orange → Green → Blue → Indigo
- **Animated Glow** - Pulses when plant is "Healthy"
- **Secondary Stats** - WiFi RSSI, Temperature, Humidity, Uptime
- **Live Updates** - Fade animation on metric changes

### Controller Tab (Default)
- **Grow Light Control** - Large glowing bulb (tap to toggle)
- **Animated Glow** - Yellow glow when ON
- **Press Animation** - Scale effect for tactile feedback
- **Status Indicator** - Green dot when ON
- **Quick Stats** - Uptime, Free Heap, WiFi RSSI
- **Real-time Feedback** - UI reflects true device state from MQTT

### Settings Tab
- **Device Information** - ID, MAC, status
- **WiFi Information** - Current SSID with edit button
- **WiFi Reconfiguration** - Scan networks → Select → Enter password
- **Advanced Settings** - Restart, Reset WiFi, Remove device

## Architecture

### Service Architecture

```
App.tsx
  └── getMQTTService().initialize() + connect()

DeviceDetailsScreen / HomeScreen
  └── getDeviceDataService().subscribe(deviceId, listener)
        └── getMQTTService().subscribe(deviceId, callback)
              └── subscribes to: data, status, led/state topics
        └── DeviceDataService caches metrics + notifies UI listeners

ControllerScreen
  └── getDeviceDataService().updateLEDStatus(id, bool)
        └── getMQTTService().sendLEDCommand(id, state)

SettingsScreen
  └── getDeviceDataService().reconfigureWiFi(id, ssid, password)
        └── getMQTTService().sendWiFiUpdate(id, ssid, password)
```

### State Management

- **BleContext** - Global BLE state (Bluetooth, scanning, permissions)
- **useProvisioning Hook** - Provisioning state machine with progress tracking
- **DeviceDataService** - Real-time metrics caching and listener pattern

### Key Design Patterns

1. **No Optimistic Updates** - UI always reflects true device state from MQTT
2. **Singleton Services** - All services use singleton pattern for global state
3. **Listener Pattern** - DeviceDataService notifies UI listeners on updates
4. **Structured Errors** - WiFiError types with user-friendly messages
5. **Onboarding Gate** - RootNavigator checks AsyncStorage flag

## Documentation

**Complete documentation available in `DOCUMENTATION.md`** which includes:

- **App Workflow & Navigation** - Screen flow and navigation structure
- **Device Provisioning Flow** - Complete BLE provisioning journey with state machine
- **MQTT Communication** - Topic structure, commands, and data flow
- **BLE Provisioning Details** - Service UUIDs, WiFi scanning, error handling
- **Device Control & Settings** - Metrics, controller, and settings tabs
- **Architecture Overview** - Service architecture and data flow
- **Key Features** - Complete feature list
- **Development Notes** - Important patterns and testing checklist
- **Troubleshooting** - Common issues and solutions

## Recent Updates

✅ **LED Toggle Fix** - Removed optimistic updates, UI now reflects true device state
✅ **MQTT State Parsing** - Fixed LED state field mapping
✅ **UI Improvements** - Replaced MQTT badge with notification bell icon
✅ **Documentation** - Consolidated into single comprehensive DOCUMENTATION.md file

## Development

### Testing Checklist

- [ ] BLE provisioning with new device
- [ ] WiFi reconfiguration
- [ ] LED toggle with real-time feedback
- [ ] Metrics display with live updates
- [ ] Permission requests on first launch
- [ ] Device removal and re-provisioning
- [ ] MQTT connection loss and recovery
- [ ] WiFi scanning with Location Services disabled

### Building for Production

```bash
# Android
cd android && ./gradlew assembleRelease

# iOS
cd ios && xcodebuild -scheme SmartHomeApp -configuration Release
```

## Troubleshooting

See `DOCUMENTATION.md` for detailed troubleshooting guide covering:
- LED toggle issues
- WiFi scanning problems
- Device provisioning failures
- Metrics not updating
- MQTT connection issues

## License

MIT
