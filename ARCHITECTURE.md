# SmartHomeApp - Architecture & Design Patterns

## 🏗️ System Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      UI Layer (Screens)                         │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ StartupScreen│ HomeScreen   │ DeviceDetails│ Provisioning │  │
│  │              │              │ Screen       │ Screens      │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Context & Hooks Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ BleContext (Global BLE state)                            │  │
│  │ useProvisioning Hook (State machine)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (Singletons)                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ MqttService  │ DeviceData   │ BleService   │ WiFiService  │  │
│  │              │ Service      │              │              │  │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤  │
│  │ StorageService             │ PermissionService           │  │
│  │                            │                             │  │
│  ├────────────────────────────┼─────────────────────────────┤  │
│  │ KeychainService            │ LocationService             │  │
│  └────────────────────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                             │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ HiveMQ Cloud │ BLE Hardware  │ WiFi Manager │ AsyncStorage │  │
│  │ (MQTT)       │ (react-native-│ (Android)    │ (React Native)│  │
│  │              │ ble-plx)      │              │              │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

### Initialization Flow

```
App.tsx
  ├─ SafeAreaProvider
  ├─ BleProvider (wraps RootNavigator)
  │   └─ BleContext.Provider
  │       └─ RootNavigator
  │           ├─ Check onboarding_completed
  │           ├─ If not set → StartupScreen
  │           └─ If set → HomeScreen
  │
  └─ useEffect: Initialize MQTT
      ├─ getMQTTService().initialize()
      ├─ getMQTTService().connect(config)
      └─ On success: Ready for device subscriptions
```

### Device Subscription Flow

```
HomeScreen mounts
  ├─ Load provisioned devices from AsyncStorage
  ├─ For each device:
  │   ├─ Get MQTT device ID (mqttDeviceId or fallback to id)
  │   ├─ Call deviceDataService.subscribe(mqttDeviceId, listener)
  │   │   ├─ DeviceDataService subscribes to MQTT topics:
  │   │   │   ├─ esp32/{id}/data
  │   │   │   ├─ esp32/{id}/status
  │   │   │   └─ esp32/{id}/led/state
  │   │   ├─ MqttService.subscribe() adds listener
  │   │   └─ Returns unsubscribe function
  │   └─ Store unsubscribe function for cleanup
  │
  └─ On unmount: Call all unsubscribe functions
```

### Real-Time Update Flow

```
ESP32 publishes to esp32/{id}/data
  ↓
MqttService receives message
  ├─ Parses topic: esp32/{id}/...
  ├─ Extracts device ID
  ├─ Parses JSON payload
  └─ Calls handleMessage()
      ├─ Finds listeners for device ID
      └─ Calls each listener with data
          ↓
DeviceDataService listener
  ├─ Normalizes field names
  ├─ Creates DeviceMetrics object
  ├─ Updates metricsCache
  └─ Calls notifyListeners()
      ├─ Finds all UI listeners for device
      └─ Calls each listener with metrics
          ↓
UI Component (MetricsScreen, ControllerScreen)
  ├─ Receives metrics update
  ├─ Updates local state
  ├─ Triggers animation
  └─ Re-renders with new values
```

---

## 🎯 Service Patterns

### 1. Singleton Pattern

All services use the singleton pattern to ensure a single instance across the app:

```typescript
// Service definition
class MyService {
  private static instance: MyService | null = null;
  
  private constructor() {}
  
  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}

// Usage
const service = getMyService(); // Always returns same instance
```

**Services using this pattern:**
- MqttService
- DeviceDataService
- StorageService
- BleService
- WiFiService
- PermissionService
- KeychainService
- LocationService

### 2. Listener/Observer Pattern

Services notify UI components of state changes:

```typescript
// Service
class DeviceDataService {
  private listeners: Map<string, Set<DeviceDataListener>> = new Map();
  
  subscribe(deviceId: string, listener: DeviceDataListener): () => void {
    if (!this.listeners.has(deviceId)) {
      this.listeners.set(deviceId, new Set());
    }
    this.listeners.get(deviceId)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(deviceId)?.delete(listener);
    };
  }
  
  private notifyListeners(deviceId: string, metrics: DeviceMetrics) {
    this.listeners.get(deviceId)?.forEach(listener => listener(metrics));
  }
}

// UI Component
useEffect(() => {
  const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
    setMetrics(metrics);
  });
  return () => unsubscribe();
}, [deviceId]);
```

### 3. State Machine Pattern

The provisioning flow uses a state machine:

```typescript
enum ProvisioningState {
  IDLE = 'IDLE',
  CONNECTING_BLE = 'CONNECTING_BLE',
  SENDING_CREDENTIALS = 'SENDING_CREDENTIALS',
  WAITING_WIFI = 'WAITING_WIFI',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
}

// State transitions
IDLE → CONNECTING_BLE → SENDING_CREDENTIALS → WAITING_WIFI → SUCCESS
                                                            ↘ ERROR
                                                            ↘ TIMEOUT
```

### 4. Error Handling Pattern

Structured error types with user-friendly messages:

```typescript
enum WiFiErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_DISABLED = 'LOCATION_DISABLED',
  SCAN_FAILED = 'SCAN_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

class WiFiError extends Error {
  type: WiFiErrorType;
  
  constructor(type: WiFiErrorType, message: string) {
    super(message);
    this.type = type;
  }
  
  getUserMessage(): string {
    switch (this.type) {
      case WiFiErrorType.PERMISSION_DENIED:
        return 'WiFi scanning requires Location permission';
      case WiFiErrorType.LOCATION_DISABLED:
        return 'Please enable Location Services';
      // ...
    }
  }
  
  getActionLabel(): string {
    switch (this.type) {
      case WiFiErrorType.PERMISSION_DENIED:
        return 'Grant Permission';
      case WiFiErrorType.LOCATION_DISABLED:
        return 'Enable Location';
      // ...
    }
  }
}
```

---

## 🔌 MQTT Architecture

### Connection Management

```
App.tsx
  └─ useEffect: Initialize MQTT
      ├─ getMQTTService().initialize()
      │   └─ Sets up event handlers
      │
      └─ getMQTTService().connect(config)
          ├─ Creates mqtt.connect() with WebSocket
          ├─ Sets up event listeners:
          │   ├─ 'connect' → isConnected = true
          │   ├─ 'message' → handleMessage()
          │   ├─ 'error' → error handling
          │   ├─ 'offline' → isConnected = false
          │   └─ 'reconnect' → logging
          │
          └─ Returns Promise<boolean>
              ├─ Resolves true on successful connection
              └─ Resolves false on timeout (30s)
```

### Subscription Management

```
DeviceDataService.subscribe(deviceId, listener)
  ├─ Check if already subscribed to device
  ├─ If not:
  │   ├─ Call MqttService.subscribe(deviceId, callback)
  │   │   ├─ Add listener to Map<deviceId, Set<listeners>>
  │   │   ├─ Subscribe to MQTT topics:
  │   │   │   ├─ esp32/{id}/data
  │   │   │   ├─ esp32/{id}/status
  │   │   │   └─ esp32/{id}/led/state
  │   │   └─ Return unsubscribe function
  │   └─ Store unsubscribe function
  │
  ├─ Add UI listener to Set
  └─ Return unsubscribe function for UI
```

### Message Handling

```
MqttService receives message on topic
  ├─ Parse topic: esp32/{deviceId}/...
  ├─ Extract device ID
  ├─ Parse message based on topic type:
  │   ├─ /data → JSON parse
  │   ├─ /status → string
  │   └─ /led/state → string
  │
  ├─ Find listeners for device ID
  └─ Call each listener with parsed data
      └─ DeviceDataService listener
          ├─ Normalize field names
          ├─ Update cache
          └─ Notify UI listeners
```

---

## 🔐 BLE Architecture

### Device Discovery

```
SimpleBleProvisionScreen
  ├─ useBle() hook
  │   └─ BleContext.startScan()
  │       ├─ Check Bluetooth enabled
  │       ├─ Call BleService.startScan()
  │       │   ├─ Start native BLE scan
  │       │   ├─ Filter for PROV_* devices
  │       │   └─ Call callback on each device found
  │       │
  │       ├─ Update discoveredDevices state
  │       └─ Auto-stop after 30 seconds
  │
  └─ Display discovered devices in list
```

### Device Provisioning

```
WiFiProvisioningScreen
  ├─ User selects WiFi network
  ├─ User enters password
  └─ User taps "Connect Device"
      ↓
ProvisioningProgressScreen
  ├─ useProvisioning() hook starts state machine
  │
  ├─ CONNECTING_BLE
  │   ├─ BleService.connect(deviceId)
  │   ├─ Discover GATT services
  │   ├─ Read device ID from characteristic
  │   └─ Transition to SENDING_CREDENTIALS
  │
  ├─ SENDING_CREDENTIALS
  │   ├─ Write SSID to characteristic
  │   ├─ Write password to characteristic
  │   └─ Transition to WAITING_WIFI
  │
  ├─ WAITING_WIFI
  │   ├─ Monitor BLE notifications
  │   ├─ Wait for WiFi confirmation
  │   ├─ Timeout after 60 seconds
  │   └─ Transition to SUCCESS or TIMEOUT
  │
  ├─ SUCCESS
  │   ├─ Save device to AsyncStorage
  │   ├─ Store mqttDeviceId
  │   └─ Navigate to ProvisioningSuccessScreen
  │
  └─ ERROR / TIMEOUT
      ├─ Show error message
      └─ Offer retry option
```

---

## 💾 Storage Architecture

### AsyncStorage (Persistent)

```
AsyncStorage
├─ onboarding_completed: 'true' | undefined
│   └─ Set by StartupScreen after permissions granted
│   └─ Checked by RootNavigator on app start
│
└─ provisioned_devices: ProvisionedDevice[]
    ├─ Added by ProvisioningSuccessScreen
    ├─ Updated by HomeScreen (rename)
    └─ Removed by HomeScreen (delete)
```

### React Native Keychain (Secure)

```
Keychain
├─ {ssid}: password
│   ├─ Saved by WiFiProvisioningScreen
│   ├─ Retrieved by WiFiProvisioningScreen
│   └─ Used for auto-fill
│
└─ Encrypted on device
    └─ Requires device unlock to access
```

### DeviceDataService Cache (In-Memory)

```
DeviceDataService
├─ metricsCache: Map<deviceId, DeviceMetrics>
│   ├─ Updated on MQTT message
│   ├─ Accessed by getMetrics()
│   └─ Cleared on app unmount
│
└─ listeners: Map<deviceId, Set<DeviceDataListener>>
    ├─ Added by subscribe()
    ├─ Called on metric update
    └─ Removed by unsubscribe()
```

---

## 🎨 UI State Management

### Component State Patterns

#### 1. Real-Time Metrics (MetricsScreen)

```typescript
const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);

useEffect(() => {
  const unsubscribe = deviceDataService.subscribe(deviceId, (newMetrics) => {
    setMetrics(newMetrics);
  });
  return () => unsubscribe();
}, [deviceId]);
```

#### 2. Device List (HomeScreen)

```typescript
const [devices, setDevices] = useState<ProvisionedDevice[]>([]);

useFocusEffect(
  useCallback(() => {
    loadProvisionedDevices();
  }, [])
);

// Subscribe to metrics for each device
devices.forEach(device => {
  const unsubscribe = deviceDataService.subscribe(device.mqttDeviceId, (metrics) => {
    // Metrics cached in service, no local state needed
  });
});
```

#### 3. LED Control (ControllerScreen)

```typescript
const [ledStatus, setLedStatus] = useState(false);

useEffect(() => {
  // Subscribe to real device state
  const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
    setLedStatus(metrics.ledStatus || false); // Always reflects true state
  });
  return () => unsubscribe();
}, [deviceId]);

const handleBulbPress = async () => {
  // Send command, don't update state optimistically
  await deviceDataService.updateLEDStatus(deviceId, !ledStatus);
  // UI updates when ESP32 responds via MQTT
};
```

---

## 🔄 Lifecycle Management

### App Lifecycle

```
App.tsx
├─ useEffect: Initialize MQTT
│   ├─ On mount: Connect to MQTT
│   └─ On unmount: Disconnect
│
└─ BleProvider
    ├─ useEffect: Handle app state changes
    │   ├─ 'background' → Stop BLE scan
    │   ├─ 'inactive' → Stop BLE scan
    │   └─ 'active' → Re-check permissions
    │
    └─ useEffect: Cleanup on unmount
        └─ Stop BLE scan if active
```

### Screen Lifecycle

```
HomeScreen
├─ useFocusEffect: Load devices when screen focused
│   ├─ Load from AsyncStorage
│   ├─ Subscribe to MQTT for each device
│   └─ Store unsubscribe functions
│
└─ useEffect: Cleanup on unmount
    └─ Call all unsubscribe functions
```

### Service Cleanup

```
DeviceDataService
├─ subscribe() returns unsubscribe function
│   └─ Removes listener from Set
│   └─ If no listeners left, unsubscribes from MQTT
│
└─ destroy() method
    ├─ Unsubscribe from all MQTT topics
    ├─ Clear all listeners
    └─ Clear metrics cache
```

---

## 🚀 Performance Considerations

### Optimization Strategies

1. **Singleton Services**
   - Single instance across app
   - Shared state between screens
   - Reduced memory footprint

2. **Listener Pattern**
   - Only notify interested components
   - Unsubscribe when not needed
   - Prevent memory leaks

3. **Caching**
   - DeviceDataService caches metrics
   - Reduces MQTT message processing
   - Faster UI updates

4. **Lazy Loading**
   - Devices loaded on HomeScreen focus
   - Metrics loaded on DeviceDetailsScreen focus
   - Reduces initial app load time

5. **Animations**
   - Use `useNativeDriver: true` where possible
   - Offload to native thread
   - Smooth 60fps animations

### Memory Management

```
Cleanup on unmount:
├─ Unsubscribe from MQTT
├─ Remove event listeners
├─ Clear cached data
└─ Cancel pending operations

Cleanup on app background:
├─ Stop BLE scan
├─ Pause animations
└─ Reduce MQTT polling
```

---

## 🔒 Security Considerations

### Data Security

1. **Credentials Storage**
   - WiFi passwords stored in Keychain (encrypted)
   - MQTT credentials in code (hardcoded for demo)
   - Device IDs stored in AsyncStorage (not sensitive)

2. **Communication**
   - MQTT over WebSocket with TLS
   - BLE communication is local (no network)
   - No sensitive data in logs

3. **Permissions**
   - Requested during onboarding
   - Bundled request (all at once)
   - User can revoke anytime

### Error Handling

1. **Network Errors**
   - MQTT auto-reconnect with 1s interval
   - Graceful degradation
   - User-friendly error messages

2. **Permission Errors**
   - Structured error types
   - User guidance with action buttons
   - Settings navigation

3. **BLE Errors**
   - Timeout handling
   - Retry logic
   - Error state UI

---

## 📊 State Diagram

### App State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    App Initialization                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
   onboarding_completed                   onboarding_completed
   NOT set                                 set
        ↓                                       ↓
   StartupScreen                          HomeScreen
   ├─ Splash                              ├─ Device list
   ├─ Permissions                         ├─ Add device FAB
   └─ Set flag                            └─ Device details
        ↓                                       ↓
   HomeScreen ←──────────────────────────────┘
```

### Device Provisioning State Machine

```
IDLE
  ↓ startProvisioning()
CONNECTING_BLE
  ├─ BLE connected ✓
  ├─ Device ID read ✓
  └─ Transition to SENDING_CREDENTIALS
      ↓
SENDING_CREDENTIALS
  ├─ SSID written ✓
  ├─ Password written ✓
  └─ Transition to WAITING_WIFI
      ↓
WAITING_WIFI
  ├─ WiFi connected ✓
  │   └─ Transition to SUCCESS
  │
  ├─ Timeout (60s)
  │   └─ Transition to TIMEOUT
  │
  └─ Error
      └─ Transition to ERROR
          ↓
SUCCESS / TIMEOUT / ERROR
  └─ Show result to user
```

---

## 🧪 Testing Strategy

### Unit Tests
- Service methods (MQTT, BLE, WiFi)
- Error handling
- State transitions

### Integration Tests
- Device provisioning flow
- MQTT subscription and messaging
- Storage operations

### E2E Tests
- Complete provisioning journey
- Device control and monitoring
- Error scenarios

### Manual Testing
- BLE device discovery
- WiFi scanning
- LED control
- Metrics display
- Permission requests

