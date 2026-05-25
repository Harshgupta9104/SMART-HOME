# SmartHomeApp

A React Native mobile application for discovering, provisioning, and controlling ESP32-based smart home devices via BLE and MQTT.

## 📱 Features

✅ **BLE Device Discovery** - Scan and discover ESP32 devices in provisioning mode  
✅ **WiFi Provisioning** - Configure WiFi credentials for new devices  
✅ **Real-Time Metrics** - Live sensor data via MQTT (soil moisture, temperature, humidity, WiFi signal)  
✅ **Device Control** - Toggle LED and other controls with real-time feedback  
✅ **Device Management** - Rename, remove, and reconfigure devices  
✅ **Secure Storage** - AsyncStorage for device list, Keychain for passwords  
✅ **Permission Management** - Bundled permission requests during onboarding  
✅ **Error Handling** - Structured error types with user-friendly messages  
✅ **Animations** - Smooth transitions and interactive UI elements  

## 🏗️ Architecture

The app uses a **layered architecture** with:

- **UI Layer** - React Native screens with animations
- **Context & Hooks** - Global state (BleContext) and provisioning state machine
- **Service Layer** - Singleton services for MQTT, BLE, WiFi, storage, etc.
- **External Services** - HiveMQ Cloud (MQTT), native BLE/WiFi APIs

### Key Services

| Service | Purpose |
|---------|---------|
| **MqttService** | WebSocket connection to HiveMQ, pub/sub for device topics |
| **DeviceDataService** | Real-time metrics caching, listener pattern for UI updates |
| **BleService** | Device discovery, connection, credential transmission |
| **WiFiService** | Network scanning, current network detection, error handling |
| **StorageService** | AsyncStorage for device persistence |
| **KeychainService** | Secure password storage |
| **PermissionService** | Android permission management |

## 🚀 Quick Start

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

# In another terminal, run on Android
npm run android

# Or run on iOS
npm run ios
```

### Build & Test

```bash
# Lint code
npm run lint

# Run tests
npm run test
```

## 📱 Navigation

```
StartupScreen (Onboarding)
  ├─ Splash animation
  ├─ Permission explanation
  └─ Permission request

HomeScreen (Main Hub)
  ├─ Device list
  ├─ Add Device FAB
  ├─ Device menu (long-press)
  │
  └─ DeviceDetailsScreen
      ├─ MetricsTab (soil moisture, WiFi, temperature, etc.)
      ├─ ControllerTab (LED control)
      └─ SettingsTab (device info, WiFi config, factory reset)

Provisioning Flow
  ├─ SimpleBleProvisionScreen (BLE discovery)
  ├─ WiFiProvisioningScreen (WiFi setup)
  ├─ ProvisioningProgressScreen (progress)
  └─ ProvisioningSuccessScreen (confirmation)
```

## 🔌 MQTT Communication

### Broker

- **URL:** `wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt`
- **Username:** `bluetooth`
- **Password:** `Ble_12345`

### Topics

**Subscribe (ESP → App):**
- `esp32/{id}/data` - Sensor data (JSON)
- `esp32/{id}/status` - Device status (online/offline)
- `esp32/{id}/led/state` - LED state (ON/OFF)

**Publish (App → ESP):**
- `esp32/{id}/led/set` - LED command (ON/OFF)
- `esp32/{id}/config` - WiFi update / factory reset (JSON)

### Example Payload

```json
{
  "device": "ESP32_26B7B3F8",
  "fw": "3.0.0",
  "uptime": 5615,
  "rssi": -51,
  "heap": 112680,
  "soil_pct": 45,
  "led": true
}
```

## 🔐 BLE Provisioning

### Service UUIDs

- **Provisioning Service:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Provisioning Characteristic:** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **Device ID Service:** `12345678-1234-1234-1234-1234567890ab`
- **Device ID Characteristic:** `12345678-1234-1234-1234-1234567890cd`

### Provisioning Flow

```
IDLE
  ↓
CONNECTING_BLE (connect to device, read device ID)
  ↓
SENDING_CREDENTIALS (write SSID + password)
  ↓
WAITING_WIFI (wait for WiFi confirmation)
  ↓
SUCCESS (device saved to storage)
  or
ERROR / TIMEOUT (show retry option)
```

## 💾 Storage

### AsyncStorage

- `onboarding_completed` - Onboarding gate flag
- `provisioned_devices` - Array of ProvisionedDevice objects

### React Native Keychain

- WiFi passwords for saved networks (encrypted)

### In-Memory Cache

- DeviceDataService caches real-time metrics

## 🔐 Permissions

Requested during onboarding (StartupScreen):

- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `NEARBY_WIFI_DEVICES` (Android 13+)

## 🎨 Design System

- **Primary Color:** #3B82F6 (Blue)
- **Success Color:** #10B981 (Green)
- **Warning Color:** #F59E0B (Amber)
- **Error Color:** #EF4444 (Red)
- **Background:** #F6F7FB (Light Gray)

## 📚 Documentation

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Complete project overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture and design patterns
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference guide
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Full technical documentation

## 🔄 Key Patterns

### Singleton Services

All services are singletons for global state:

```typescript
const mqttService = getMQTTService();
const deviceDataService = getDeviceDataService();
```

### Listener Pattern

Services notify UI components of changes:

```typescript
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  setMetrics(metrics);
});

return () => unsubscribe();
```

### No Optimistic Updates

UI always reflects true device state from MQTT:

```typescript
// Send command
await deviceDataService.updateLEDStatus(deviceId, true);

// UI updates when ESP32 responds via MQTT
// NOT immediately after sending
```

### State Machine

Provisioning uses a state machine for complex flow orchestration.

## 🧪 Testing

### Manual Testing Checklist

- [ ] BLE provisioning with new device
- [ ] WiFi reconfiguration
- [ ] LED toggle with real-time feedback
- [ ] Metrics display with live updates
- [ ] Permission requests on first launch
- [ ] Device removal and re-provisioning
- [ ] MQTT connection loss and recovery
- [ ] WiFi scanning with Location Services disabled

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

## 📦 Dependencies

### Core

- `react-native` - Mobile framework
- `react` - UI library
- `typescript` - Type safety

### Navigation

- `@react-navigation/native` - Navigation framework
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

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

## 🚀 Performance

### Optimization Strategies

1. **Singleton Services** - Single instance across app
2. **Listener Pattern** - Only notify interested components
3. **Caching** - DeviceDataService caches metrics
4. **Lazy Loading** - Devices loaded on screen focus
5. **Native Animations** - Use `useNativeDriver: true`

## 🔒 Security

### Data Security

- WiFi passwords stored in Keychain (encrypted)
- MQTT credentials in code (hardcoded for demo)
- Device IDs stored in AsyncStorage (not sensitive)

### Communication

- MQTT over WebSocket with TLS
- BLE communication is local (no network)
- No sensitive data in logs

## 📝 Code Structure

```
src/
├── screens/              # UI Screens
├── services/             # Business Logic (Singletons)
├── context/              # Global State
├── hooks/                # Custom Hooks
├── components/           # Reusable Components
├── constants/            # Constants
└── navigation/           # Navigation Stack
```

## 🔗 Useful Links

- [React Native Docs](https://reactnative.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [MQTT.js Docs](https://github.com/mqttjs/MQTT.js)
- [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud/)
- [BLE PLX Docs](https://github.com/dotintent/react-native-ble-plx)

## 📞 Support

For issues or questions:

1. Check the documentation files
2. Review the relevant service file
3. Check console logs with [prefix] tags
4. Verify MQTT connection and device status

## 📄 License

This project is provided as-is for educational and development purposes.

---

**Last Updated:** May 2026  
**Version:** 0.0.1  
**Status:** Active Development

