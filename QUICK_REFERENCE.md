# SmartHomeApp - Quick Reference Guide

## 📁 Project Structure

```
SmartHomeApp/
├── src/
│   ├── screens/                    # UI Screens
│   │   ├── StartupScreen.tsx       # Onboarding
│   │   ├── HomeScreen.tsx          # Main hub
│   │   ├── DeviceDetailsScreen.tsx # Device control
│   │   ├── MetricsScreen.tsx       # Metrics display
│   │   ├── ControllerScreen.tsx    # LED control
│   │   ├── SettingsScreen.tsx      # Device settings
│   │   ├── SimpleBleProvisionScreen.tsx    # BLE discovery
│   │   ├── WiFiProvisioningScreen.tsx     # WiFi setup
│   │   ├── ProvisioningProgressScreen.tsx # Progress
│   │   └── ProvisioningSuccessScreen.tsx  # Success
│   │
│   ├── services/                   # Business Logic (Singletons)
│   │   ├── mqttService.ts          # MQTT communication
│   │   ├── deviceDataService.ts    # Device metrics
│   │   ├── bleService.ts           # BLE operations
│   │   ├── wifiService.ts          # WiFi scanning
│   │   ├── storageService.ts       # AsyncStorage
│   │   ├── keychainService.ts      # Secure storage
│   │   ├── permissionService.ts    # Permissions
│   │   ├── locationService.ts      # Location
│   │   └── wifiErrors.ts           # Error types
│   │
│   ├── context/                    # Global State
│   │   └── BleContext.tsx          # BLE state
│   │
│   ├── hooks/                      # Custom Hooks
│   │   └── useProvisioning.ts      # Provisioning state machine
│   │
│   ├── components/                 # Reusable Components
│   │   └── provisioning/
│   │       ├── WiFiSelector.tsx
│   │       └── PasswordInput.tsx
│   │
│   ├── constants/                  # Constants
│   │   └── provisioningStates.ts
│   │
│   └── navigation/                 # Navigation
│       └── RootNavigator.tsx       # Navigation stack
│
├── App.tsx                         # Entry point
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── DOCUMENTATION.md                # Full documentation
├── PROJECT_OVERVIEW.md             # This file
├── ARCHITECTURE.md                 # Architecture details
└── QUICK_REFERENCE.md              # Quick reference
```

---

## 🚀 Quick Start

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

### Key Files to Know

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point, MQTT initialization |
| `src/navigation/RootNavigator.tsx` | Navigation stack, onboarding gate |
| `src/screens/HomeScreen.tsx` | Main hub, device list |
| `src/services/mqttService.ts` | MQTT communication |
| `src/services/deviceDataService.ts` | Device metrics caching |
| `src/context/BleContext.tsx` | Global BLE state |

---

## 🔑 Key Concepts

### 1. Singleton Services

All services are singletons - single instance across the app:

```typescript
// Get service instance
const mqttService = getMQTTService();
const deviceDataService = getDeviceDataService();
const storageService = getStorageService();
```

### 2. Listener Pattern

Services notify UI components of changes:

```typescript
// Subscribe to device metrics
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  setMetrics(metrics);
});

// Cleanup
return () => unsubscribe();
```

### 3. No Optimistic Updates

UI always reflects true device state from MQTT:

```typescript
// Send command
await deviceDataService.updateLEDStatus(deviceId, true);

// UI updates when ESP32 responds via MQTT
// NOT immediately after sending command
```

### 4. State Machine

Provisioning uses a state machine:

```
IDLE → CONNECTING_BLE → SENDING_CREDENTIALS → WAITING_WIFI → SUCCESS
```

---

## 📱 Screen Navigation

### Navigation Stack

```
RootNavigator
├── StartupScreen (if onboarding_completed not set)
│   └── HomeScreen (after permissions granted)
│
└── HomeScreen (if onboarding_completed set)
    ├── DeviceDetailsScreen
    │   ├── MetricsTab
    │   ├── ControllerTab
    │   └── SettingsTab
    │
    ├── SimpleBleProvisionScreen
    │   └── WiFiProvisioningScreen
    │       └── ProvisioningProgressScreen
    │           └── ProvisioningSuccessScreen
    │
    └── SettingsScreen
```

### Navigation Methods

```typescript
// Navigate to screen
navigation.navigate('DeviceDetails', { device });

// Go back
navigation.goBack();

// Reset stack
navigation.reset({
  index: 0,
  routes: [{ name: 'HomeMain' }],
});
```

---

## 🔌 MQTT Topics

### Subscribe (ESP → App)

```
esp32/{id}/data        # Sensor data (JSON)
esp32/{id}/status      # Device status (online/offline)
esp32/{id}/led/state   # LED state (ON/OFF)
```

### Publish (App → ESP)

```
esp32/{id}/led/set     # LED command (ON/OFF)
esp32/{id}/config      # WiFi update / factory reset (JSON)
```

### Example Payloads

**Sensor Data:**
```json
{
  "device": "ESP32_26B7B3F8",
  "soil_pct": 45,
  "rssi": -51,
  "led": true,
  "uptime": 5615
}
```

**LED Command:**
```
ON  or  OFF
```

**WiFi Update:**
```json
{
  "type": "wifi_update",
  "ssid": "MyNetwork",
  "password": "password123"
}
```

---

## 💾 Storage

### AsyncStorage Keys

```typescript
// Onboarding flag
await AsyncStorage.setItem('onboarding_completed', 'true');
const completed = await AsyncStorage.getItem('onboarding_completed');

// Device list
const devices = await storageService.getProvisionedDevices();
await storageService.addProvisionedDevice(device);
await storageService.removeProvisionedDevice(deviceId);
```

### Keychain (Secure)

```typescript
// Save WiFi password
await keychainService.saveCredentials(ssid, password);

// Get saved password
const password = await keychainService.getPassword(ssid);

// Get all saved networks
const networks = await keychainService.getSavedNetworks();
```

---

## 🔐 Permissions

### Required Permissions

```typescript
// Requested during onboarding (StartupScreen)
BLUETOOTH_SCAN
BLUETOOTH_CONNECT
ACCESS_FINE_LOCATION
ACCESS_COARSE_LOCATION
NEARBY_WIFI_DEVICES  // Android 13+
```

### Permission Checking

```typescript
// Check permissions
const status = await permissionService.checkProvisioningPermissions();

// Request permissions
const status = await permissionService.requestProvisioningPermissions();

// Check if blocked
const blocked = await permissionService.isPermissionBlocked();

// Open app settings
await permissionService.openAppSettings();
```

---

## 🎯 Common Tasks

### Add a New Device

```typescript
// 1. Navigate to BLE scan
navigation.navigate('SimpleBleProvision');

// 2. User selects device
// 3. Navigate to WiFi provisioning
navigation.navigate('WiFiProvisioning', { deviceId, deviceName });

// 4. User enters WiFi credentials
// 5. Provisioning starts
// 6. Device saved to AsyncStorage
// 7. Navigate back to HomeScreen
```

### Update LED Status

```typescript
// Send command
const success = await deviceDataService.updateLEDStatus(deviceId, true);

// UI updates when ESP32 responds via MQTT
// Listen for updates
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  console.log('LED Status:', metrics.ledStatus);
});
```

### Get Device Metrics

```typescript
// Get cached metrics
const metrics = deviceDataService.getMetrics(deviceId);

// Subscribe to real-time updates
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  console.log('Soil Moisture:', metrics.soilMoisture);
  console.log('WiFi RSSI:', metrics.wifiRSSI);
  console.log('LED Status:', metrics.ledStatus);
});
```

### Reconfigure WiFi

```typescript
// Send WiFi update command
const success = await deviceDataService.reconfigureWiFi(
  deviceId,
  'NewNetwork',
  'password123'
);

// ESP32 will restart and reconnect
```

### Factory Reset Device

```typescript
// Send factory reset command
const success = await deviceDataService.factoryReset(deviceId);

// Device will restart and return to provisioning mode
```

---

## 🐛 Debugging

### Enable Logging

All services log to console with prefixes:

```
[App]              - App.tsx
[MQTT]             - MqttService
[DeviceData]       - DeviceDataService
[BLE Context]      - BleContext
[WiFiProvisioning] - WiFiProvisioningScreen
[HomeScreen]       - HomeScreen
[Controller]       - ControllerScreen
```

### Common Issues

| Issue | Solution |
|-------|----------|
| MQTT not connecting | Check network, verify credentials, check HiveMQ status |
| WiFi scan returns empty | Enable Location Services, grant permissions |
| LED toggle not working | Check MQTT connection, verify device ID mapping |
| Device not appearing | Check AsyncStorage, verify MQTT subscription |
| Metrics not updating | Check MQTT topics, verify ESP32 is publishing |

### Debug Commands

```typescript
// Check MQTT connection
const mqtt = getMQTTService();
console.log('Connected:', mqtt.isConnectedToMQTT());

// Get cached metrics
const metrics = getDeviceDataService().getMetrics(deviceId);
console.log('Metrics:', metrics);

// Get provisioned devices
const devices = await getStorageService().getProvisionedDevices();
console.log('Devices:', devices);

// Check BLE state
const ble = useBle();
console.log('Bluetooth enabled:', ble.bluetoothEnabled);
console.log('Scanning:', ble.isScanning);
console.log('Discovered:', ble.discoveredDevices);
```

---

## 🎨 UI Components

### Colors

```typescript
const colors = {
  primary: '#3B82F6',      // Blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  background: '#F6F7FB',   // Light gray
  card: '#FFFFFF',         // White
  text: '#1F2937',         // Dark gray
  textSecondary: '#6B7280', // Medium gray
  textTertiary: '#9CA3AF',  // Light gray
};
```

### Common Styles

```typescript
// Card
{
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
}

// Button
{
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  backgroundColor: '#3B82F6',
  alignItems: 'center',
}

// Text
{
  fontSize: 14,
  fontWeight: '600',
  color: '#1F2937',
}
```

---

## 📊 Data Types

### ProvisionedDevice

```typescript
interface ProvisionedDevice {
  id: string;              // BLE MAC address
  name: string;            // User-friendly name
  mqttDeviceId: string;    // Short ID for MQTT (e.g., "26B7B3F8")
  ssid: string;            // Connected WiFi network
  status: 'online' | 'offline' | 'connecting';
  lastSeen: string;        // ISO timestamp
  createdAt: string;       // ISO timestamp
}
```

### DeviceMetrics

```typescript
interface DeviceMetrics {
  deviceId: string;
  soilMoisture?: number;   // 0-100 %
  wifiRSSI?: number;       // dBm
  ledStatus?: boolean;     // ON/OFF
  uptime?: number;         // seconds
  freeHeap?: number;       // bytes
  temperature?: number;    // °C
  humidity?: number;       // %
  lastUpdate: number;      // timestamp
}
```

### WiFiNetwork

```typescript
interface WiFiNetwork {
  ssid: string;
  level: number;           // Signal strength (-100 to 0)
  isCurrentNetwork: boolean;
}
```

---

## 🔄 Lifecycle Hooks

### App Lifecycle

```typescript
// App.tsx
useEffect(() => {
  // Initialize MQTT on app start
  const initializeMQTT = async () => {
    const mqttService = getMQTTService();
    await mqttService.initialize();
    await mqttService.connect(config);
  };
  
  initializeMQTT();
  
  // Cleanup on unmount
  return () => {
    getMQTTService().disconnect();
  };
}, []);
```

### Screen Lifecycle

```typescript
// HomeScreen
useFocusEffect(
  useCallback(() => {
    // Load devices when screen focused
    loadProvisionedDevices();
  }, [])
);

useEffect(() => {
  // Subscribe to metrics
  devices.forEach(device => {
    const unsubscribe = deviceDataService.subscribe(device.id, listener);
    unsubscribersRef.current.set(device.id, unsubscribe);
  });
  
  // Cleanup on unmount
  return () => {
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
  };
}, [devices]);
```

---

## 🚨 Error Handling

### WiFi Errors

```typescript
enum WiFiErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_DISABLED = 'LOCATION_DISABLED',
  SCAN_FAILED = 'SCAN_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Handle error
try {
  const result = await wifiService.scanNetworks();
} catch (error) {
  if (error instanceof WiFiError) {
    console.log('Error type:', error.type);
    console.log('User message:', error.getUserMessage());
    console.log('Action label:', error.getActionLabel());
  }
}
```

### MQTT Errors

```typescript
// MQTT auto-reconnects with 1s interval
// Check connection status
if (!mqttService.isConnectedToMQTT()) {
  console.warn('MQTT not connected');
}

// Set error callback
mqttService.setOnErrorCallback((error) => {
  console.error('MQTT error:', error);
});
```

---

## 📝 Code Examples

### Subscribe to Device Metrics

```typescript
import { getDeviceDataService } from '../services/deviceDataService';

export const MetricsScreen = ({ device }) => {
  const [metrics, setMetrics] = useState(null);
  const deviceDataService = getDeviceDataService();
  
  useEffect(() => {
    const mqttDeviceId = device.mqttDeviceId || device.id;
    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics) => {
      setMetrics(newMetrics);
    });
    
    return () => unsubscribe();
  }, [device]);
  
  return (
    <View>
      <Text>Soil Moisture: {metrics?.soilMoisture}%</Text>
      <Text>WiFi RSSI: {metrics?.wifiRSSI} dBm</Text>
    </View>
  );
};
```

### Control LED

```typescript
import { getDeviceDataService } from '../services/deviceDataService';

export const ControllerScreen = ({ device }) => {
  const [ledStatus, setLedStatus] = useState(false);
  const deviceDataService = getDeviceDataService();
  
  const handleToggleLED = async () => {
    const mqttDeviceId = device.mqttDeviceId || device.id;
    await deviceDataService.updateLEDStatus(mqttDeviceId, !ledStatus);
    // UI updates when ESP32 responds via MQTT
  };
  
  return (
    <TouchableOpacity onPress={handleToggleLED}>
      <Text>{ledStatus ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  );
};
```

### Add Device to Storage

```typescript
import { getStorageService } from '../services/storageService';

const device = {
  id: 'AA:BB:CC:DD:EE:FF',
  name: 'My Plant',
  mqttDeviceId: '26B7B3F8',
  ssid: 'MyNetwork',
  status: 'online',
  lastSeen: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const storageService = getStorageService();
await storageService.addProvisionedDevice(device);
```

---

## 🔗 Useful Links

- [React Native Docs](https://reactnative.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [MQTT.js Docs](https://github.com/mqttjs/MQTT.js)
- [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud/)
- [BLE PLX Docs](https://github.com/dotintent/react-native-ble-plx)

---

## 📞 Support

For issues or questions:
1. Check the DOCUMENTATION.md file
2. Check the ARCHITECTURE.md file
3. Review the relevant service file
4. Check console logs with [prefix] tags
5. Verify MQTT connection and device status

