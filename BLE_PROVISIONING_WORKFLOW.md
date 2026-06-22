# BLE Provisioning Workflow - Complete Guide

## Overview
The BLE provisioning workflow is a multi-step process that connects an ESP32 device to your WiFi network via Bluetooth Low Energy (BLE). The device starts in provisioning mode (advertising as `PROV_*`) and receives WiFi credentials through BLE, then connects to WiFi and reports back its MQTT device ID.

---

## Complete Workflow Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BLE PROVISIONING WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: DEVICE DISCOVERY (SimpleBleProvisionScreen)
├─ User clicks "Add Device" on HomeScreen
├─ App navigates to SimpleBleProvisionScreen
├─ Screen checks permissions (Bluetooth, Location)
├─ Starts BLE scan for 30 seconds
├─ Filters devices with name starting with "PROV_"
├─ Displays list sorted by signal strength (RSSI)
└─ User selects a device from the list

STEP 2: DEVICE CONFIGURATION (DeviceConfigScreen)
├─ App navigates to DeviceConfigScreen with device ID and name
├─ User enters:
│  ├─ Device display name
│  ├─ Device type (Light, Sensor, etc.)
│  └─ Room assignment (Living Room, Bedroom, Kitchen, etc.)
├─ Data is validated
└─ User clicks "Next" to proceed to WiFi selection

STEP 3: WIFI SELECTION (WiFiProvisioningScreen)
├─ App navigates to WiFiProvisioningScreen with device info & user config
├─ Screen checks provisioning permissions again
├─ Scans available WiFi networks:
│  ├─ Priority 1: Currently connected network (most reliable)
│  ├─ Priority 2: Nearby networks (requires Location Services)
│  └─ Priority 3: Manual entry fallback
├─ Auto-selects current network if available
├─ Tries to retrieve saved password from Keychain
├─ User can:
│  ├─ Select a different network
│  ├─ Enter WiFi password
│  └─ Check "Remember this network" to save credentials
└─ User clicks "Connect Device"

STEP 4: BLE COMMUNICATION & SUCCESS ANIMATION (WiFiProvisioningScreen)
├─ BLE Service connects to device via MAC address
├─ Sends WiFi credentials as JSON via BLE characteristic
├─ Device firmware receives and processes credentials
├─ Upon receiving "wifi_saved" status from device:
│  ├─ Shows inline success animation:
│  │  ├─ Green circle with white checkmark (400ms scale animation)
│  │  ├─ "Device Added!" message with device name (300ms fade animation)
│  │  └─ Auto-displays for 1.5 seconds
│  ├─ BLE disconnects automatically (expected behavior - device reboots)
│  └─ Navigates directly to HomeScreen
└─ Device appears in the device list immediately

STEP 5: DEVICE CONTROL (HomeScreen)
├─ Device appears in the device list with:
│  ├─ User-configured display name
│  ├─ Assigned room
│  ├─ Online status
│  └─ Device controls
├─ User can:
│  ├─ Toggle device on/off
│  ├─ View device metrics
│  └─ Manage device settings
└─ Device is connected to WiFi and MQTT broker
```

---

## Detailed Step Breakdown

### STEP 1: Device Discovery (SimpleBleProvisionScreen)

**What happens:**
1. User clicks "Add Device" button in bottom navigation
2. App navigates to `SimpleBleProvisionScreen`
3. Screen automatically starts BLE scan

**Permissions checked:**
- Bluetooth permission
- Location permission (required for BLE scanning on Android)

**Scan behavior:**
- Scans for 30 seconds automatically
- Filters devices with names starting with `PROV_`
- Displays devices sorted by signal strength (RSSI)
- Shows signal quality indicator (Excellent/Good/Fair/Poor)

**User action:**
- Taps a device from the list
- App captures: `deviceId` (MAC address), `deviceName`, `rssi`

**Navigation:**
```
HomeScreen 
  → SimpleBleProvisionScreen (scan for PROV_* devices)
    → DeviceConfigScreen (device name/type/room configuration)
```

---

### STEP 2: Device Configuration (DeviceConfigScreen)

**What happens:**
1. User is shown the device discovered via BLE
2. Screen displays the device name and type options
3. User configures:
   - **Display Name**: How to call the device (e.g., "Living Room Light")
   - **Device Type**: Type of device (Light, Sensor, etc.)
   - **Room Assignment**: Which room the device is in

**Validation:**
- Display name cannot be empty
- Room must be selected
- Device type should be specified

**User action:**
- Enters/confirms device configuration
- Clicks "Next" to proceed

**Navigation:**
```
DeviceConfigScreen
  → WiFiProvisioningScreen (with displayName, roomName, deviceType)
```

---

### STEP 3: WiFi Selection (WiFiProvisioningScreen)

**What happens:**
1. Screen initializes and checks permissions again
2. Scans available WiFi networks with priority system:

**Priority 1: Current Network (Most Reliable)**
- Gets currently connected WiFi SSID
- Always shown first in the list
- Marked as "current network"

**Priority 2: Nearby Networks (Requires Location Services)**
- Calls `WifiManager.loadWifiList()`
- Requires `ACCESS_FINE_LOCATION` permission
- Requires `NEARBY_WIFI_DEVICES` permission (Android 13+)
- Requires Location Services to be enabled
- Filters out hidden networks and duplicates
- Sorted by signal strength

**Priority 3: Manual Entry**
- User can type network name manually if not found

**Credential handling:**
- Tries to retrieve saved password from Keychain
- If found, auto-fills the password field
- User can modify or enter new password

**User actions:**
- Select a WiFi network (or type manually)
- Enter WiFi password
- Optionally check "Remember this network"
- Click "Connect Device"

**Validation:**
- Network name cannot be empty
- Network name max 32 characters
- Password cannot be empty

**Navigation:**
```
WiFiProvisioningScreen → HomeScreen (directly after success animation)
```

---

### STEP 4: WiFi Provisioning & Success Animation

**What happens:**
1. Provisioning starts with BLE connection to device
2. WiFi credentials sent via BLE to ESP32
3. Device connects to WiFi and reports back status
4. Upon success (receiving "wifi_saved"):

**Success Animation (Inline - 2.2 seconds total):**
```
Timeline:
0ms   - Success animation starts
400ms - Green circle + checkmark scales to full size
700ms - "Device Added!" message fades in
1500ms - Hold on screen
2200ms - Navigate to HomeScreen
```

**Visual Elements:**
- Green circle (120×120px) with shadow
- White checkmark icon (56px)
- "Device Added!" title
- Device name subtitle (e.g., "Living Room Light is ready to use")
- Semi-transparent dark overlay

**BLE Connection After Success:**
- Disconnects automatically (expected behavior - device reboots)
- Not treated as error
- Device reboots to load new WiFi credentials

**Navigation:**
```
Success animation completes
  ↓
HomeScreen (device immediately visible)
```

---

## Detailed Step Breakdown (Old - Reference Only)

The following screens have been removed from the current implementation:

### REMOVED: ProvisioningProgressScreen
- Previously showed 3-step progress animation
- Now replaced by inline success animation in WiFiProvisioningScreen
- Removed to simplify UX and provide immediate feedback

### REMOVED: DeviceNamingScreen
- Previously shown after provisioning
- Device naming now happens in Step 2 (DeviceConfigScreen)
- User configures name before WiFi setup, not after

---

## Key Data Flow

### Data Passed Between Screens

```
SimpleBleProvisionScreen → DeviceConfigScreen
├─ deviceId (MAC address)
├─ deviceName (from BLE discovery)
└─ rssi (signal strength)

DeviceConfigScreen → WiFiProvisioningScreen
├─ deviceId
├─ deviceName
├─ displayName (user-configured name)
├─ roomName (user-assigned room)
└─ deviceType (if applicable)

WiFiProvisioningScreen → HomeScreen (after success animation)
├─ Device saved to AsyncStorage with:
│  ├─ id (MAC address)
│  ├─ displayName (user-configured name)
│  ├─ roomName (assigned room)
│  ├─ ssid (WiFi network)
│  ├─ mqttDeviceId (from device firmware)
│  └─ status (online)
└─ Device immediately appears in device list
```

### Storage

**Local Storage (AsyncStorage):**
```javascript
{
  id: "MAC_ADDRESS",
  name: "Device Name",
  displayName: "User-renamed name",
  macAddress: "MAC_ADDRESS",
  mqttDeviceId: "UNIQUE_MQTT_ID",
  ssid: "WiFi Network Name",
  status: "online",
  roomName: "Living room",
  lastSeen: "2024-05-28T10:30:00Z",
  provisionedAt: "2024-05-28T10:25:00Z",
  justProvisioned: true
}
```

**Keychain (Secure Storage):**
```javascript
// If "Remember this network" is checked
{
  ssid: "WiFi Network Name",
  password: "WiFi Password"
}
```

---

## Error Handling

### Permission Errors
- **Missing Bluetooth permission** → Show permission request screen
- **Missing Location permission** → Show permission request screen
- **Location Services disabled** → Show location settings screen

### WiFi Scan Errors
- **No networks found** → Check if Location Services enabled
- **Scan failed** → Retry or manual entry
- **Current network not detected** → Allow manual entry

### Provisioning Errors
- **BLE connection failed** → Device not found or out of range
- **Timeout (30s)** → Device didn't respond
- **WiFi connection failed** → Wrong password or network issue
- **JSON parse error** → Invalid credentials format
- **BLE disconnection during WiFi** → Expected behavior (device reboots), navigate to HomeScreen

### Recovery Options
- Retry provisioning from WiFiProvisioningScreen
- Go back and select different network
- Go back and select different device
- Manual WiFi entry

---

## BLE Disconnection During Provisioning

### When Disconnection Occurs (Expected Behavior)

**Timeline of Events:**

```
1. Credentials Sent Successfully ✅
   ↓
2. ESP32 Receives & Parses WiFi Credentials
   ├─ Firmware receives JSON: {"ssid":"...","password":"..."}
   ├─ Parses successfully
   └─ Starts WiFi connection attempt
   ↓
3. ESP32 Reboots to Apply Settings
   ├─ Device disconnects from BLE (EXPECTED)
   ├─ Notification listener stops receiving updates
   └─ Error: "Device is not connected"
   ↓
4. App Continues Waiting for Acknowledgment
   ├─ Timeout: 30 seconds maximum
   ├─ Ignores "not connected" errors
   └─ Waits for WiFi success status
   ↓
5. ESP32 Reconnects via WiFi
   ├─ Connects to WiFi network
   ├─ Gets IP address
   ├─ Syncs time (NTP)
   ├─ Connects to MQTT broker
   └─ Sends WiFi success status via BLE notification
   ↓
6. Provisioning Completes Successfully ✅
   ├─ App receives "wifi_saved" status
   ├─ Shows success animation
   └─ Navigates to HomeScreen
```

### Disconnection Scenarios

**Scenario A: Device Disconnects BEFORE Sending Credentials**
```
❌ Error: "Failed to send credentials"
→ Provisioning fails immediately
→ User sees error screen
→ User can retry
```

**Scenario B: Device Disconnects AFTER Sending (EXPECTED)**
```
✅ Credentials sent successfully to device
⚠️ Device disconnects (rebooting - normal behavior)
⏳ App waits for acknowledgment (30 second timeout)
  ├─ If ESP32 sends status → Success ✅
  └─ If timeout → Error ❌
```

**Scenario C: Device Sends Acknowledgment After Reconnecting**
```
✅ Credentials sent successfully
⚠️ Device disconnects (rebooting)
✅ Device boots up with new WiFi settings
✅ Device reconnects to WiFi and MQTT
✅ Device sends "wifi_saved" via BLE or MQTT
✅ Provisioning completes successfully
```

### Code Handling of Disconnection

In the BLE Service, disconnection errors are handled gracefully:

```typescript
try {
  await sendCredentialsViaBLE(deviceId, ssid, password);
} catch (writeError) {
  const errorMsg = String(writeError);
  
  // ✅ Handle expected disconnection
  if (errorMsg.includes('not connected')) {
    console.log('Device disconnected (expected - device is rebooting)');
    // Don't throw - continue waiting for acknowledgment
    // App waits up to 30 seconds for device to reconnect
  } else {
    // ❌ Handle unexpected errors
    throw new Error(`Failed to send credentials: ${writeError}`);
  }
}
```

**Key Point:** The app **does not treat disconnection as a failure**. It gracefully continues waiting for the device to reconnect and send the success status.

---

## Provisioning States (State Machine)

```typescript
enum ProvisioningState {
  IDLE = 'idle',                          // Not provisioning
  CONNECTING_BLE = 'connecting_ble',      // Step 1: Connecting to device
  SENDING_CREDENTIALS = 'sending_creds',  // Step 2: Sending WiFi credentials
  WAITING_WIFI = 'waiting_wifi',          // Step 3: Waiting for WiFi connection
  SUCCESS = 'success',                    // Step 4: Provisioning complete
  ERROR = 'error',                        // Error occurred
  TIMEOUT = 'timeout',                    // 30 second timeout
  BLE_DISCONNECTED = 'ble_disconnected',  // Device disconnected (expected during reboot)
}

State Transitions:
IDLE
  ↓ User taps "Connect Device"
CONNECTING_BLE (Connect to ESP32 via BLE)
  ├─ Success → SENDING_CREDENTIALS
  └─ Error → ERROR
  ↓
SENDING_CREDENTIALS (Send WiFi credentials via BLE write)
  ├─ Success → WAITING_WIFI
  ├─ Device disconnects (expected) → WAITING_WIFI (continue waiting)
  └─ Error (other than "not connected") → ERROR
  ↓
WAITING_WIFI (Wait for device to connect to WiFi)
  ├─ BLE notification received → SUCCESS
  ├─ Device disconnects (normal reboot) → WAITING_WIFI (continue)
  ├─ Timeout (30 seconds) → TIMEOUT
  └─ Error → ERROR
  ↓
SUCCESS (Device confirmed WiFi connection)
  └─ Show success animation → Navigate to HomeScreen
  ↓
ERROR or TIMEOUT
  └─ Show error message → Offer retry option
```

---

## Firmware Status Messages

Device firmware sends these status messages via BLE or after WiFi connection via MQTT:

| Status | Meaning | Action | Handling |
|--------|---------|--------|----------|
| `testing_wifi` | Device testing WiFi connection | Show "Testing WiFi connection..." | Continue waiting |
| `connecting_wifi` | Device connecting to WiFi | Show "Connecting to WiFi..." | Continue waiting |
| `wifi_saved` | ✅ SUCCESS - WiFi saved | Navigate to device naming | **Provisioning Complete** |
| `error` | ❌ WiFi connection failed | Show error, allow retry | Check credentials |
| `json_parse` | ❌ Invalid JSON format | Show error, allow retry | Check payload format |
| *(BLE Disconnection)* | Device disconnects (expected) | App continues waiting (30s timeout) | **Expected - Device Rebooting** |

---

## Timeout Behavior

**Default timeout: 30 seconds**

If device doesn't send "wifi_saved" within 30 seconds:
1. Provisioning state changes to TIMEOUT
2. BLE connection is closed
3. Error message shown: "Device did not respond within 30 seconds"
4. User can retry or go back

**Common timeout causes:**
- Device powered off
- Device out of BLE range
- Device stuck in provisioning mode
- WiFi network not available
- Device firmware issue

---

## BLE Service & Characteristic UUIDs

### Service UUIDs
```
Provisioning Service: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
  └─ Used for sending WiFi credentials

Device ID Service: 12345678-1234-1234-1234-1234567890ab
  └─ Used for reading device ID (MQTT short ID)
```

### Characteristic UUIDs
```
Provisioning Characteristic: beb5483e-36e1-4688-b7f5-ea07361b26a8
  ├─ Service: Provisioning Service
  ├─ Properties: Write, Notify
  ├─ Purpose: Send SSID + password, receive confirmation
  └─ Data format: JSON payload

Device ID Characteristic: 12345678-1234-1234-1234-1234567890cd
  ├─ Service: Device ID Service
  ├─ Properties: Read
  ├─ Purpose: Read device ID (short ID for MQTT, e.g., "26B7B3F8")
  └─ Data format: String (8 hex characters)
```

### BLE Payload Format

**WiFi Credentials Sent to Device:**
```json
{
  "ssid": "MyNetwork",
  "password": "MyPassword"
}
```

**Device Sends Confirmation After WiFi Connection:**
```
Status Message: "wifi_saved"
Includes: MQTT Device ID (short ID, e.g., "26B7B3F8")
```

---

## ESP32 Firmware Architecture

The ESP32 firmware consists of these key modules:

### 1. **BLE Module**
```
Provisioning Service (Provisioning UUID)
  ├─ Advertise as "PROV_{shortId}" during provisioning mode
  ├─ Accept WiFi credentials via BLE write
  ├─ Send confirmation after successful WiFi connection
  └─ Disable BLE after WiFi connection to save power

Device ID Service (Device ID UUID)
  ├─ Read-only characteristic
  ├─ Returns short ID (e.g., "26B7B3F8")
  └─ Used to identify device for MQTT topics
```

### 2. **WiFi Module**
```
On receiving credentials via BLE:
  ├─ Parse JSON payload (SSID + password)
  ├─ Attempt WiFi connection (3 retries)
  ├─ Save credentials to NVS (non-volatile storage)
  ├─ Send "wifi_saved" confirmation
  └─ Auto-reconnect if connection drops
```

### 3. **MQTT Module**
```
Subscribe Topics (Commands from App):
  ├─ esp32/{id}/led/set        (LED ON/OFF)
  ├─ esp32/{id}/relay/set      (Relay ON/OFF)
  └─ esp32/{id}/config         (WiFi/settings update)

Publish Topics (State Updates to App):
  ├─ esp32/{id}/data           (Sensor data every 5 seconds)
  ├─ esp32/{id}/status         (Online/offline)
  ├─ esp32/{id}/led/state      (LED state)
  └─ esp32/{id}/relay/state    (Relay state)
```

### 4. **GPIO Control Module**
```
LED Control (Configurable GPIO, typically GPIO2):
  ├─ Receive "ON" or "OFF" command via MQTT
  ├─ Toggle GPIO pin
  └─ Publish state via MQTT

Relay Control (GPIO23):
  ├─ Receive "ON" or "OFF" command via MQTT
  ├─ Energize/de-energize relay
  └─ Publish state via MQTT
```

### 5. **Sensor Module**
```
Publishes sensor data every 5 seconds:
  ├─ Soil moisture (ADC)
  ├─ Temperature (DHT22 or similar)
  ├─ Humidity (DHT22 or similar)
  ├─ WiFi signal strength (RSSI)
  ├─ Free heap memory
  ├─ Device uptime
  └─ Payload format: JSON
```

### Example Sensor Payload
```json
{
  "device": "ESP32_26B7B3F8",
  "fw": "3.0.0",
  "uptime": 5615,
  "rssi": -51,
  "heap": 112680,
  "soil_pct": 45,
  "temperature": 28.5,
  "humidity": 65,
  "led": true,
  "relay": false
}
```

---

## Security Considerations

1. **WiFi Credentials:**
   - Sent via BLE (encrypted by BLE protocol)
   - Optionally saved to Keychain (secure storage)
   - Never logged or displayed in plain text

2. **MQTT Device ID:**
   - Unique identifier for each device
   - Used for MQTT topic subscriptions
   - Prevents device spoofing

3. **Permissions:**
   - Bluetooth required for BLE communication
   - Location required for WiFi scanning (Android requirement)
   - Notification permission for alerts

---

## Summary

The BLE provisioning workflow is a secure, user-friendly process that:

1. **Discovers** ESP32 devices via BLE
2. **Scans** available WiFi networks
3. **Sends** credentials securely via BLE
4. **Monitors** provisioning progress
5. **Captures** device MQTT ID
6. **Stores** device locally
7. **Enables** device control via MQTT

The entire process is designed to be intuitive, with clear visual feedback at each step and comprehensive error handling for common issues.
