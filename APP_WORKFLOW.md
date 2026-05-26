# App Workflow - SmartHomeApp Complete Guide

## Overview
SmartHomeApp is a React Native app that discovers, provisions, and controls ESP32 smart home devices. It uses BLE for device discovery and provisioning, and MQTT for real-time communication.

---

## 1. App Startup Flow

```
App.tsx starts
  ↓
Initialize MQTT connection to HiveMQ Cloud
  ↓
Check AsyncStorage for onboarding_completed flag
  ↓
  ├─ Flag NOT set → Show StartupScreen
  │   ├─ 3.5s splash animation
  │   ├─ Permission explanation
  │   ├─ Request all permissions
  │   └─ Set onboarding_completed flag
  │
  └─ Flag set → Go directly to HomeScreen
      ↓
  HomeScreen (Main Hub)
  ├─ Load provisioned devices from AsyncStorage
  ├─ Subscribe to MQTT for each device
  ├─ Show device list with status
  └─ Add Device FAB button
```

---

## 2. Device Provisioning Flow

### Step 1: User taps "Add Device"
```
HomeScreen
  ↓
SimpleBleProvisionScreen
  ├─ Start BLE scan
  ├─ Filter for devices with name prefix "PROV_"
  ├─ Show discovered devices with signal strength (RSSI)
  └─ Auto-stop scan after 30 seconds
```

### Step 2: User selects a device
```
SimpleBleProvisionScreen
  ↓
WiFiProvisioningScreen
  ├─ Scan nearby WiFi networks
  ├─ Auto-select current WiFi if available
  ├─ Show list of available networks
  ├─ User selects network
  ├─ User enters WiFi password
  └─ Retrieve saved password from Keychain if available
```

### Step 3: User taps "Connect Device"
```
WiFiProvisioningScreen
  ↓
ProvisioningProgressScreen
  ├─ State 1: CONNECTING_BLE
  │   ├─ Connect to ESP32 via BLE
  │   ├─ Read device ID from BLE characteristic
  │   └─ Extract short ID (e.g., "26B7B3F8")
  │
  ├─ State 2: SENDING_CREDENTIALS
  │   ├─ Write SSID to BLE characteristic
  │   ├─ Write password to BLE characteristic
  │   └─ Wait for acknowledgment
  │
  ├─ State 3: WAITING_WIFI
  │   ├─ Wait for ESP32 to connect to WiFi
  │   ├─ ESP32 publishes confirmation via BLE notification
  │   └─ Timeout after 30 seconds
  │
  └─ State 4: SUCCESS or ERROR
      ├─ SUCCESS: Save device to AsyncStorage
      │   ├─ Device ID (BLE MAC)
      │   ├─ Device name
      │   ├─ MQTT device ID (short ID)
      │   ├─ WiFi SSID
      │   └─ Status: "online"
      │
      └─ ERROR: Show error message + retry button
```

### Step 4: Device appears on HomeScreen
```
Device saved to AsyncStorage
  ↓
HomeScreen reloads device list
  ↓
DeviceDataService subscribes to MQTT topics:
  ├─ esp32/{id}/data (sensor data)
  ├─ esp32/{id}/status (online/offline)
  ├─ esp32/{id}/led/state (LED state)
  └─ esp32/{id}/relay/state (relay state)
  ↓
Real-time metrics start flowing
```

---

## 3. Device Control - LED & Relay

### LED Control Flow

```
User taps bulb in ControllerScreen
  ↓
handleBulbPress()
  ├─ Play press animation (scale 0.93 → 1.0)
  ├─ Lock button for 2 seconds
  └─ Send MQTT command
      ↓
MqttService.sendLEDCommand(deviceId, state)
  ├─ Publish to: esp32/{id}/led/set
  ├─ Payload: "ON" or "OFF"
  └─ QoS: 1 (at least once)
      ↓
ESP32 receives command
  ├─ Toggle LED on GPIO pin
  ├─ Publish state to: esp32/{id}/led/state
  └─ Payload: "ON" or "OFF"
      ↓
MqttService receives state update
  ├─ Parse message
  ├─ Call DeviceDataService listener
  └─ Update metrics cache
      ↓
ControllerScreen receives update
  ├─ Update ledStatus state
  ├─ Show glow animation if ON
  ├─ Hide glow animation if OFF
  └─ Unlock button
```

**Key Points:**
- No optimistic updates - UI only updates when ESP32 responds
- Button locked for 2 seconds to prevent multiple presses
- Glow animation shows when LED is ON
- Status always reflects true device state

### Relay Control Flow

```
User taps relay button in ControllerScreen
  ↓
handleRelayPress()
  ├─ Play press animation
  ├─ Lock button for 2 seconds
  └─ Send MQTT command
      ↓
MqttService.sendRelayCommand(deviceId, state)
  ├─ Publish to: esp32/{id}/relay/set
  ├─ Payload: "ON" or "OFF"
  └─ QoS: 1
      ↓
ESP32 receives command
  ├─ Toggle relay on GPIO23
  ├─ Publish state to: esp32/{id}/relay/state
  └─ Payload: "ON" or "OFF"
      ↓
MqttService receives state update
  ├─ Parse message
  ├─ Call DeviceDataService listener
  └─ Update metrics cache
      ↓
ControllerScreen receives update
  ├─ Update relayStatus state
  ├─ Show bulb icon (💡)
  ├─ Show ON/OFF label (inverted)
  └─ Unlock button
```

**Key Points:**
- Relay connected to GPIO23 on ESP32
- Same flow as LED control
- Button shows opposite state (when relay is ON, button shows "OFF" label)
- Bulb emoji (💡) indicates relay control

---

## 4. Real-Time Metrics Display

### Metrics Tab

```
MetricsScreen
  ├─ Subscribe to device metrics via DeviceDataService
  │
  ├─ Soil Moisture Ring
  │   ├─ Circular progress indicator
  │   ├─ Plant state: Desert Dry → Dry → Healthy → Wet → Saturated
  │   ├─ Colors: Red → Orange → Green → Blue → Indigo
  │   └─ Animated glow when "Healthy"
  │
  ├─ WiFi RSSI (signal strength)
  │   ├─ dBm value
  │   └─ Signal strength label
  │
  ├─ Temperature (°C)
  ├─ Humidity (%)
  ├─ Uptime (hours)
  └─ Last updated timestamp
```

### Controller Tab (Default)

```
ControllerScreen
  ├─ LED/Relay Bulb Control
  │   ├─ Large glowing bulb (160×160px)
  │   ├─ Tap to toggle ON/OFF
  │   ├─ Animated yellow glow when ON
  │   ├─ Press scale animation for tactile feedback
  │   └─ Status indicator (green dot when ON)
  │
  ├─ Quick Stats
  │   ├─ Uptime (hours)
  │   ├─ Free Heap (KB)
  │   └─ WiFi RSSI (dBm)
  │
  └─ Real-time feedback
      ├─ Button locked during MQTT wait
      ├─ UI updates when device responds
      └─ No optimistic updates
```

### Settings Tab

```
SettingsScreen
  ├─ Device Information
  │   ├─ Device ID (BLE MAC)
  │   ├─ MQTT Device ID (short ID)
  │   └─ Current status (online/offline)
  │
  ├─ WiFi Information
  │   ├─ Current SSID display
  │   ├─ Edit button (✏️) to reconfigure
  │   └─ Opens WiFi selection modal
  │
  ├─ Advanced Settings
  │   ├─ Restart device
  │   ├─ Reset WiFi to factory defaults
  │   └─ Remove device from app
  │
  └─ Device Management
      ├─ Rename device
      └─ Delete device
```

---

## 5. Data Flow Architecture

### Service Architecture

```
App.tsx
  ├─ Initialize MqttService
  ├─ Initialize BleContext
  └─ Render RootNavigator

RootNavigator
  ├─ Check onboarding flag
  └─ Route to StartupScreen or HomeScreen

HomeScreen
  ├─ Load devices from AsyncStorage
  ├─ Subscribe to DeviceDataService
  └─ Display device list

DeviceDetailsScreen
  ├─ MetricsTab
  │   └─ Subscribe to device metrics
  ├─ ControllerTab
  │   ├─ Subscribe to device metrics
  │   └─ Send LED/relay commands
  └─ SettingsTab
      ├─ Display device info
      └─ Send WiFi/config commands

Services (Singletons)
  ├─ MqttService
  │   ├─ WebSocket connection to HiveMQ
  │   ├─ Pub/Sub for device topics
  │   └─ Listener pattern for callbacks
  │
  ├─ DeviceDataService
  │   ├─ Cache real-time metrics
  │   ├─ Subscribe to MQTT via MqttService
  │   └─ Notify UI listeners on updates
  │
  ├─ BleService
  │   ├─ Device discovery
  │   ├─ BLE connection
  │   └─ Credential transmission
  │
  ├─ WiFiService
  │   ├─ Network scanning
  │   └─ Error handling
  │
  ├─ StorageService
  │   ├─ AsyncStorage for device list
  │   └─ Device metadata
  │
  └─ PermissionService
      └─ Android permission management
```

---

## 6. Permissions Required

Requested during onboarding (StartupScreen):

```
BLUETOOTH_SCAN
  ├─ Required for BLE device discovery
  └─ Requested during provisioning

BLUETOOTH_CONNECT
  ├─ Required to connect to BLE devices
  └─ Requested during provisioning

ACCESS_FINE_LOCATION
  ├─ Required for WiFi scanning
  └─ Requested during provisioning

ACCESS_COARSE_LOCATION
  ├─ Required for WiFi scanning
  └─ Requested during provisioning

NEARBY_WIFI_DEVICES (Android 13+)
  ├─ Required for WiFi scanning on Android 13+
  └─ Requested during provisioning
```

---

## 7. Storage

### AsyncStorage (Persistent)
```
onboarding_completed: boolean
  └─ Flag to skip onboarding on return visits

provisioned_devices: ProvisionedDevice[]
  ├─ id: string (BLE MAC)
  ├─ name: string (user-friendly name)
  ├─ mqttDeviceId: string (short ID for MQTT)
  ├─ ssid: string (WiFi network)
  ├─ status: "online" | "offline" | "connecting"
  ├─ lastSeen: string (ISO timestamp)
  └─ createdAt: string (ISO timestamp)
```

### React Native Keychain (Secure)
```
WiFi passwords for saved networks
  └─ Encrypted storage on device
```

### DeviceDataService Cache (In-Memory)
```
Real-time device metrics
  ├─ Updated via MQTT subscriptions
  └─ Cleared on app unmount
```

---

## 8. Key Features

✅ **BLE Provisioning** - Device discovery, credential transmission, device ID capture  
✅ **MQTT Communication** - Real-time pub/sub with HiveMQ Cloud  
✅ **WiFi Scanning** - Network discovery with error handling  
✅ **LED Control** - Interactive bulb with real-time state feedback  
✅ **Relay Control** - GPIO23 relay control with real-time feedback  
✅ **Metrics Display** - Beautiful sensor visualization with animations  
✅ **Device Storage** - AsyncStorage + Keychain for secure credentials  
✅ **Permission Management** - Bundled request during onboarding  
✅ **Error Handling** - Structured errors with user-friendly messages  
✅ **State Machine** - Complex provisioning flow with progress UI  
✅ **Real-time Updates** - Live metrics with fade animations  

---

## 9. Important Patterns

### No Optimistic Updates
The app **never** optimistically updates the UI. All state changes are driven by actual device responses via MQTT. This ensures the UI always reflects the true device state.

### Singleton Services
All services use the singleton pattern for global state.

### Listener Pattern
DeviceDataService uses a listener pattern to notify UI components.

### State Machine
Provisioning uses a state machine for complex flow orchestration.

---

## 10. Troubleshooting

### LED/Relay Toggle Not Working
- Check MQTT connection status
- Verify ESP32 is publishing to `esp32/{id}/led/state` or `esp32/{id}/relay/state`
- Check device ID mapping (BLE MAC vs MQTT short ID)
- Verify button is not locked (wait 2 seconds)

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

**Last Updated:** May 2026  
**Version:** 1.0
