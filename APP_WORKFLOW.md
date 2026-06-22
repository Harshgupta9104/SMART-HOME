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

### Step 2: User selects a device → Device Configuration
```
SimpleBleProvisionScreen
  ↓
DeviceConfigScreen
  ├─ Display discovered device info
  ├─ User enters display name
  ├─ User selects device type
  ├─ User assigns to room
  └─ Validate all inputs
```

### Step 3: User confirms configuration → WiFi Setup
```
DeviceConfigScreen
  ↓
WiFiProvisioningScreen
  ├─ Scan nearby WiFi networks
  ├─ Auto-select current WiFi if available
  ├─ Show list of available networks
  ├─ User selects network
  ├─ User enters WiFi password
  └─ Retrieve saved password from Keychain if available
```

### Step 4: User taps "Connect Device" → Success Animation → Home
```
WiFiProvisioningScreen
  ↓
Provisioning Process
  ├─ State 1: CONNECTING_BLE
  │   ├─ Connect to ESP32 via BLE
  │   └─ Extract short ID (e.g., "26B7B3F8")
  │
  ├─ State 2: SENDING_CREDENTIALS
  │   ├─ Send WiFi credentials via BLE
  │   └─ Wait for acknowledgment
  │
  └─ State 3: WAITING_WIFI
      ├─ Wait for ESP32 to connect to WiFi
      ├─ ESP32 publishes "wifi_saved" via BLE notification
      └─ Receive MQTT Device ID from device
      
Success Animation (Inline - 2.2 seconds)
  ├─ Show green checkmark circle (400ms scale up)
  ├─ Show "Device Added!" message (300ms fade in)
  ├─ Hold on screen (1500ms)
  ├─ BLE disconnects automatically (device reboots)
  └─ Navigate to HomeScreen

Device saved to AsyncStorage
  ↓
HomeScreen reloads device list
  ↓
Device appears immediately with:
  ├─ User-configured display name
  ├─ Assigned room
  ├─ Online status
  └─ Device controls ready to use
```

---

## 3. Real-Time Notifications

### NotificationScreen Overview

```
NotificationScreen (Tabbed Interface)
  ├─ Activity Tab (default)
  │   ├─ Displays all notifications (max 100)
  │   ├─ Shows unread badge count
  │   ├─ Notification types:
  │   │   ├─ Device: Device online/offline, connection status
  │   │   ├─ Firmware: Updates, alerts
  │   │   ├─ Activity: User actions, device events
  │   │   ├─ Security: Access attempts, permission changes
  │   │   ├─ Offline: Offline device alerts
  │   │   └─ Automation: Automation triggers, schedules
  │   ├─ Mark individual notifications as read
  │   ├─ Delete individual notifications
  │   ├─ Mark all as read
  │   └─ Clear all notifications
  │
  └─ Settings Tab
      ├─ Configure notification preferences per type
      ├─ Enable/disable each notification type
      ├─ Settings persist to AsyncStorage
      └─ Customize notification behavior
```

### Notification Service Architecture

```
notificationService (Singleton)
  ├─ addNotification()
  │   ├─ Add new notification to queue
  │   ├─ Persist to AsyncStorage (max 100)
  │   └─ Notify listeners
  │
  ├─ getNotifications()
  │   └─ Retrieve all persisted notifications
  │
  ├─ markAsRead(notificationId)
  │   └─ Update read status in AsyncStorage
  │
  ├─ deleteNotification(notificationId)
  │   └─ Remove notification from storage
  │
  ├─ markAllAsRead()
  │   └─ Mark all notifications as read
  │
  ├─ clearAll()
  │   └─ Delete all notifications
  │
  ├─ getPreferences()
  │   └─ Get notification type preferences
  │
  ├─ updatePreferences(type, enabled)
  │   └─ Save preferences to AsyncStorage
  │
  └─ subscribe(listener)
      └─ Subscribe to notification updates
```

### Notification Example

```json
{
  "id": "unique-id",
  "type": "device",
  "title": "Device Online",
  "message": "Living Room Light connected to WiFi",
  "deviceId": "26B7B3F8",
  "deviceName": "Living Room Light",
  "timestamp": "2026-05-28T10:30:00Z",
  "read": false
}
```

### Usage in Other Services

```typescript
// In deviceDataService or mqttService
import { getNotificationService } from '../services/notificationService';

const notificationService = getNotificationService();

// When device comes online
notificationService.addNotification({
  type: 'device',
  title: 'Device Online',
  message: 'Device is now connected',
  deviceId,
  deviceName,
});
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

✅ **BLE Provisioning** - Device discovery, device configuration (name/type/room), credential transmission, device ID capture  
✅ **Device Configuration** - 2-screen flow: name/type/room configuration, then WiFi setup  
✅ **WiFi Provisioning** - Network discovery, credential transmission, inline success animation  
✅ **Success Animation** - Green checkmark with device name message, auto-dismisses to HomeScreen  
✅ **MQTT Communication** - Real-time pub/sub with HiveMQ Cloud  
✅ **Notification System** - Persistent notifications with type preferences and activity tracking  
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

## 11. Firmware & App Integration

### Firmware Integration Overview

The app communicates with ESP32 devices through two channels:

**Channel 1: BLE (During Provisioning)**
- Device discovery ("PROV_*" advertising)
- WiFi credential transmission
- Device ID retrieval

**Channel 2: MQTT (After Provisioning)**
- Real-time control (LED, relay)
- Sensor data streaming
- Status updates

### Firmware Files in Project

```
SmartHomeApp/
├── ESP32_FIRMWARE.cpp        ← Your firmware code goes here
└── ESP32_CONFIG.h            ← Your configuration goes here
```

### Firmware Configuration Requirements

Your ESP32 firmware must define:

**MQTT Broker Settings:**
```cpp
#define MQTT_BROKER_URL "wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt"
#define MQTT_USERNAME "bluetooth"
#define MQTT_PASSWORD "Ble_12345"
```

**GPIO Pin Definitions:**
```cpp
#define LED_PIN 2           // LED control pin
#define RELAY_PIN 23        // Relay control pin
#define SOIL_PIN 34         // Soil moisture sensor (ADC)
#define TEMP_PIN 32         // Temperature sensor (DHT22)
```

**BLE Service UUIDs:**
```cpp
#define PROV_SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define PROV_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVICE_ID_SERVICE_UUID "12345678-1234-1234-1234-1234567890ab"
#define DEVICE_ID_CHAR_UUID "12345678-1234-1234-1234-1234567890cd"
```

### Firmware Requirements Checklist

Essential Features:
- [ ] BLE provisioning mode (advertise as "PROV_*")
- [ ] WiFi connection with retry logic (3 retries)
- [ ] MQTT connection to HiveMQ Cloud
- [ ] LED control via GPIO pin
- [ ] Relay control via GPIO23
- [ ] Sensor data publishing (every 5 seconds)
- [ ] Status publishing (online/offline)
- [ ] WiFi reconfiguration support
- [ ] Factory reset support
- [ ] Error handling and logging

### Firmware Testing

**Test BLE Provisioning:**
1. Flash firmware to ESP32
2. Open SmartHomeApp
3. Tap "Add Device"
4. Verify device appears in BLE scan
5. Complete provisioning flow
6. Verify device appears in HomeScreen

**Test MQTT Communication:**
1. Verify device appears in HomeScreen (online)
2. Tap device to open ControllerScreen
3. Tap LED bulb to toggle
4. Verify LED toggles on ESP32
5. Verify relay toggles on GPIO23

**Test Metrics:**
1. Open MetricsScreen
2. Verify sensor data updates every 5 seconds
3. Verify temperature, humidity, RSSI display
4. Verify uptime and heap memory display

---

## 10. Important Patterns

### No Optimistic Updates
The app **never** optimistically updates the UI. All state changes are driven by actual device responses via MQTT. This ensures the UI always reflects the true device state.

### Singleton Services
All services use the singleton pattern for global state.

### Listener Pattern
DeviceDataService uses a listener pattern to notify UI components.

### State Machine
Provisioning uses a state machine for complex flow orchestration.

---

## 12. Troubleshooting

### Device Discovery Issues

**Device Not Discovered**
- Check BLE advertising is enabled in firmware
- Verify device name starts with "PROV_"
- Move closer to device
- Restart ESP32
- Check Android BLE permissions are granted

**Device Discovered But Connection Fails**
- Check BLE service UUIDs are correct
- Verify ESP32 is in provisioning mode
- Check device doesn't have pairing enabled
- Restart device and try again

### WiFi Provisioning Issues

**WiFi Scan Returns No Networks**
- Enable Location Services on device
- Grant Location permissions
- Check WiFi is enabled on device
- Check WiFi is 2.4GHz (not 5GHz)

**WiFi Connection Fails During Provisioning**
- Verify WiFi credentials are correct
- Check WiFi SSID is in range
- Verify WiFi is 2.4GHz (not 5GHz)
- Check password is entered correctly

**BLE Disconnection During Provisioning (Expected)**
- This is normal - device reboots after receiving credentials
- App continues waiting for device to reconnect
- Device will reconnect via WiFi after boot
- If timeout occurs (30 seconds), provisioning fails - retry

### Device Not Appearing After Provisioning

**Device Not Showing in HomeScreen**
- Verify device saved to AsyncStorage
- Check MQTT connection is active
- Verify device ID is correct
- Check device is connected to WiFi
- Verify ESP32 is publishing to MQTT broker

**Device Shows Offline**
- Check WiFi connection on ESP32
- Verify MQTT broker URL is correct
- Check MQTT credentials
- Verify ESP32 is publishing status topic

### LED/Relay Toggle Not Working

**Toggle Button Not Responding**
- Check MQTT connection status
- Verify ESP32 is subscribed to correct topics
- Check device ID mapping (BLE MAC vs MQTT short ID)
- Verify button is not locked (wait 2 seconds between taps)

**Toggle Works But Device Doesn't Change**
- Verify GPIO pin is correct in firmware
- Check LED/relay hardware connections
- Verify MQTT command is being received by ESP32
- Check ESP32 is publishing state updates

**UI Updates But Device Doesn't Toggle**
- Check GPIO pin configuration in firmware
- Verify LED/relay is correctly wired
- Test GPIO pin directly with digitalWrite() in firmware

### Metrics Not Updating

**No Sensor Data Appearing**
- Check MQTT subscription is active
- Verify ESP32 is publishing to correct topic
- Check device ID is correct
- Verify sensor connections
- Check JSON payload format

**Partial Data Appearing**
- Check which fields are missing
- Verify sensor is connected
- Check sensor reading code in firmware
- Verify field names match field mapping in deviceDataService

### MQTT Connection Issues

**MQTT Connection Not Established**
- Check internet connection
- Verify broker URL is correct
- Check username/password
- Verify firewall allows WebSocket connections

**Commands Reach ESP32 But No Response**
- Check ESP32 is subscribed to correct topics
- Verify device ID is correct
- Check ESP32 MQTT callback function
- Add logging to firmware to debug

---

**Last Updated:** June 2026  
**Version:** 2.0
