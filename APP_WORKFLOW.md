# SmartHomeApp - Complete Unified Workflow

## Overview
This document describes the complete application workflow from startup to device control.

---

## PHASE 1: APP STARTUP (0-3 seconds)

### 1.1 App Initialization
**File:** `App.tsx`

```
React Native loads App.tsx
    ↓
SafeAreaProvider wraps app
    ↓
BleProvider wraps for BLE context
    ↓
RootNavigator renders
```

### 1.2 MQTT Initialization
**File:** `App.tsx` → `src/services/mqttService.ts`

**Step 1: Initialize MQTT Client**
```typescript
const mqttService = getMQTTService();
await mqttService.initialize();
```
- Creates JavaScript MQTT client using `mqtt` v5.15.1
- Registers event callbacks

**Step 2: Connect to HiveMQ**
```typescript
const connected = await mqttService.connect({
  url: 'wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt',
  username: 'bluetooth',
  password: 'Ble_12345',
  clientId: `smartapp-${Date.now()}_${Math.random().toString(16).slice(3)}`,
});
```

**Console Output:**
```
[App] 🚀 Initializing MQTT...
[MQTT] 🔧 Initializing MQTT client...
[MQTT] ✅ Client initialized successfully
[App] 🔌 Connecting to HiveMQ...
[MQTT] ✅ Connected to HiveMQ successfully!
[App] ✅ MQTT connected successfully to HiveMQ
```

**Timeline:**
- T+0s: App starts
- T+1-2s: TLS handshake
- T+2-3s: Authentication succeeds
- T+3s: Connected and ready

---

## PHASE 2: STARTUP SCREEN (3-5 seconds)

### 2.1 Navigate to StartupScreen
**File:** `src/screens/StartupScreen.tsx`

- Shows splash screen with logo
- Checks if user completed onboarding
- Checks if user has provisioned devices

### 2.2 Request Permissions (if needed)
**File:** `src/screens/StartupScreen.tsx`

**Permissions Requested:**
1. Bluetooth (BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_SCAN, BLUETOOTH_CONNECT)
2. Location (ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION)

**Console Output:**
```
[Permissions] Requesting Bluetooth permissions...
[Permissions] Requesting Location permissions...
[Permissions] ✅ All permissions granted
```

---

## PHASE 3: HOME SCREEN (5+ seconds)

### 3.1 Load Provisioned Devices
**File:** `src/screens/HomeScreen.tsx`

**Step 1: Retrieve Devices from Storage**
```typescript
const provisionedDevices = await storageService.getProvisionedDevices();
```

**Device Structure:**
```typescript
{
  id: "F8:B3:B7:26:4D:D2",           // BLE MAC address
  name: "Living Room Plant",
  macAddress: "F8:B3:B7:26:4D:D2",
  mqttDeviceId: "26B7B3F8",           // ← MQTT device ID
  ssid: "MyWiFi",
  status: "online",
  lastSeen: "2026-05-15T10:30:00Z",
  provisionedAt: "2026-05-15T10:25:00Z"
}
```

**Console Output:**
```
[Storage] Retrieved provisioned devices: 1
[HomeScreen] Loaded provisioned devices: 1
```

### 3.2 Subscribe to Device Metrics
**File:** `src/screens/HomeScreen.tsx` → `src/services/deviceDataService.ts`

```typescript
provisionedDevices.forEach(device => {
  const mqttDeviceId = device.mqttDeviceId || device.id;
  
  const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (metrics) => {
    // Metrics updated
  });
});
```

**What Happens:**
- For each device, subscribes to MQTT topics
- Uses SHORT device ID (e.g., "26B7B3F8")
- Subscribes to 3 topics:
  - `esp32/26B7B3F8/data`
  - `esp32/26B7B3F8/status`
  - `esp32/26B7B3F8/led/state`

**Console Output:**
```
[DeviceData] ✅ Subscribed to MQTT for device: 26B7B3F8
[MQTT] 📡 Subscribing to topics for device: 26B7B3F8
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/data
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/status
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/led/state
```

### 3.3 Display Devices
**File:** `src/screens/HomeScreen.tsx`

- Renders device cards for each provisioned device
- Shows device name, status, and metrics
- Displays KPI cards:
  - Soil Moisture
  - WiFi RSSI
  - Temperature
  - Humidity
  - Uptime
  - Free Heap

### 3.4 Receive Real-Time Metrics
**File:** `src/services/mqttService.ts` → `src/services/deviceDataService.ts`

**When ESP32 Publishes Data:**
```
ESP32 publishes to: esp32/26B7B3F8/data
Payload: {"soil_pct":45,"rssi":-65,"temp":28.5,"humidity":60,"uptime":3600,"free_heap":50000}
```

**Console Output:**
```
[MQTT] 📨 Received message on esp32/26B7B3F8/data: {"soil_pct":45,"rssi":-65}
[MQTT] 📊 Parsed sensor data: {soil_pct: 45, rssi: -65, temp: 28.5}
[MQTT] 📢 Notifying 1 listener(s) for device: 26B7B3F8
[DeviceData] 📊 Updated from MQTT: 26B7B3F8
[HomeScreen] Device metrics updated: 26B7B3F8
```

---

## PHASE 4: ADD NEW DEVICE (Provisioning Flow)

### 4.1 User Taps "Add Device"
**File:** `src/screens/HomeScreen.tsx`

- Navigation to SimpleBleProvisionScreen
- BLE scan starts

### 4.2 BLE Scan for Devices
**File:** `src/context/BleContext.tsx`

- Scans for BLE devices with provisioning service UUID
- Filters devices that have SERVICE_UUID
- Displays list of available devices

**Console Output:**
```
[BLE Context] Starting BLE scan...
[BLE] Found device: ESP32_26B7B3F8 (F8:B3:B7:26:4D:D2)
```

### 4.3 User Selects Device
**File:** `src/screens/SimpleBleProvisionScreen.tsx`

- User taps on device in list
- Navigation to WiFiProvisioningScreen
- Passes device ID and name

### 4.4 WiFi Network Selection
**File:** `src/screens/WiFiProvisioningScreen.tsx`

**Step 1: Check Permissions**
```typescript
const permsStatus = await permissionService.checkProvisioningPermissions();
```

**Step 2: Scan WiFi Networks**
```typescript
const scanResult = await wifiService.scanNetworks();
```

**Console Output:**
```
[WiFiProvisioning] Step 1: Checking provisioning permissions...
[WiFiProvisioning] ✅ Permissions already granted
[WiFiProvisioning] Step 3: Scanning networks...
[WiFiService] ✅ Scan result: 5 networks found
[WiFiProvisioning] ✅ Auto-selecting current network: MyWiFi
[WiFiProvisioning] ✅ INITIALIZATION COMPLETE
```

### 4.5 User Enters WiFi Credentials
**File:** `src/screens/WiFiProvisioningScreen.tsx`

- User selects WiFi network
- User enters password
- User taps "Connect Device"
- Validation checks pass

### 4.6 Navigate to Provisioning Progress Screen
**File:** `src/screens/WiFiProvisioningScreen.tsx`

- Navigation to ProvisioningProgressScreen
- Shows provisioning animation

### 4.7 Start Provisioning
**File:** `src/hooks/useProvisioning.ts` → `src/services/bleService.ts`

**Step 1: Initialize Provisioning State**
```typescript
setProvisioningState(ProvisioningState.CONNECTING_BLE);
setStatusLogs([]);
setIsLoading(true);
```

**Step 2: Send WiFi Credentials via BLE**
```typescript
const mqttDeviceId = await bleService.sendWiFiCredentials(
  deviceId,
  ssid,
  password,
  (status, isError, returnedMqttId) => {
    // Callback for status updates
  }
);
```

**Console Output:**
```
[Provisioning] Starting provisioning...
[BLE] Connecting to device: F8:B3:B7:26:4D:D2
[BLE] ✅ Connected to device
[BLE] Discovering services...
[BLE] ✅ Services discovered
[BLE] Found provisioning service
[BLE] Found provisioning characteristic
```

### 4.8 Read Device ID from ESP32
**File:** `src/services/bleService.ts`

**Critical Step - Device ID Reading:**
```typescript
const devIdService = services.find(
  s => s.uuid.toLowerCase() === DEVID_SERVICE_UUID.toLowerCase()
);

if (devIdService) {
  const devIdCharacteristics = await devIdService.characteristics();
  const devIdChar = devIdCharacteristics.find(
    c => c.uuid.toLowerCase() === DEVID_CHAR_UUID.toLowerCase()
  );
  
  const readChar = await devIdChar.read();
  const fullDeviceId = Buffer.from(readChar.value, 'base64').toString('utf-8');
  // fullDeviceId = "ESP32_26B7B3F8"
  
  let shortId = fullDeviceId;
  if (fullDeviceId.startsWith('ESP32_')) {
    shortId = fullDeviceId.replace('ESP32_', '');
  }
  // shortId = "26B7B3F8"
  
  mqttDeviceId = shortId;
}
```

**Console Output:**
```
[BLE] Reading device ID from ESP32...
[BLE] ✅ Device ID read: 26B7B3F8
[BLE] 📊 Device ID mapping:
[BLE]   BLE MAC: F8:B3:B7:26:4D:D2
[BLE]   Full ID: ESP32_26B7B3F8
[BLE]   MQTT ID: 26B7B3F8
```

### 4.9 Setup Notification Listener & Send Credentials
**File:** `src/services/bleService.ts`

```typescript
onStatusUpdate('Setting up notifications...', false, mqttDeviceId);

this.notificationSubscription = provisioningChar.monitor(
  (error, characteristic) => {
    // Handle incoming notifications
  }
);

// Prepare WiFi credentials
const credentialsPayload = {
  ssid: "MyWiFi",
  password: "password123"
};

const jsonString = JSON.stringify(credentialsPayload);
const encodedPayload = Buffer.from(jsonString, 'utf8').toString('base64');

// Send credentials
await this.bleManager.writeCharacteristicWithResponseForDevice(
  deviceId,
  SERVICE_UUID,
  CHARACTERISTIC_UUID,
  encodedPayload
);
```

**Console Output:**
```
[BLE] Setting up notifications...
[BLE] Credentials payload: {"ssid":"MyWiFi","password":"password123"}
[BLE] Payload length: 45 bytes
[BLE] Sending credentials via BLE...
[BLE] Credentials sent successfully
[BLE] ⏳ Waiting for acknowledgment from device...
```

### 4.10 Wait for Acknowledgment
**File:** `src/services/bleService.ts`

```typescript
// ESP32 sends: {"status":"ok","msg":"wifi_saved"}
// or: {"status":"info","msg":"connecting_wifi"}

await ackPromise; // Waits for acknowledgment
```

**Console Output:**
```
[BLE] Received notification: {"status":"ok","msg":"connecting_wifi"}
[BLE] Parsed firmware response: {status: "ok", msg: "connecting_wifi"}
[BLE] ✅ Received acknowledgment from device - provisioning in progress
```

### 4.11 Capture MQTT Device ID in Hook
**File:** `src/hooks/useProvisioning.ts`

```typescript
let capturedMqttDeviceId: string | null = null;

const mqttDeviceId = await bleService.sendWiFiCredentials(
  deviceId,
  ssid,
  password,
  (status: string, isError?: boolean, returnedMqttId?: string) => {
    // Capture MQTT device ID from any status update
    if (returnedMqttId) {
      capturedMqttDeviceId = returnedMqttId;
      console.log('[Provisioning] 📱 Captured MQTT Device ID:', capturedMqttDeviceId);
    }
    
    // Handle status updates
    handleStatusUpdate(status, isError, ssid, password, rememberNetwork, deviceId, deviceName, capturedMqttDeviceId, onProvisioningComplete);
  }
);

// Also capture from return value
if (mqttDeviceId && !capturedMqttDeviceId) {
  capturedMqttDeviceId = mqttDeviceId;
  console.log('[Provisioning] 📱 Captured MQTT Device ID from return value:', capturedMqttDeviceId);
}
```

**Console Output:**
```
[Provisioning] 📱 Captured MQTT Device ID: 26B7B3F8
[Provisioning] 📱 Captured MQTT Device ID from return value: 26B7B3F8
```

### 4.12 Handle Provisioning Status Updates
**File:** `src/hooks/useProvisioning.ts`

**Status Flow:**

1. **Testing WiFi**
   ```
   Status: "testing_wifi"
   State: WAITING_WIFI
   Log: "Testing WiFi connection..."
   ```

2. **Connecting WiFi**
   ```
   Status: "connecting_wifi"
   State: WAITING_WIFI
   Log: "Connecting to WiFi..."
   ```

3. **WiFi Saved (SUCCESS)**
   ```typescript
   if (status === 'wifi_saved' || status === 'ok') {
     // Save credentials if enabled
     if (rememberNetwork) {
       await keychainService.saveCredentials(ssid, password);
     }
     
     // Store device with MQTT ID
     const device = {
       id: deviceId,
       name: deviceName,
       macAddress: deviceId,
       mqttDeviceId: mqttDeviceId || deviceId, // ← SAVE MQTT ID
       ssid: ssid,
       status: 'online',
       lastSeen: new Date().toISOString(),
       provisionedAt: new Date().toISOString(),
       justProvisioned: true,
     };
     
     await storageService.addProvisionedDevice(device);
     
     // Cleanup BLE
     cleanup();
     
     // Navigate to dashboard
     onProvisioningComplete(deviceId, deviceName);
   }
   ```

**Console Output:**
```
[Provisioning] Status update: wifi_saved
[Provisioning] ✅ WiFi saved - provisioning complete!
[Provisioning] [SUCCESS] WiFi connection successful
[Provisioning] [SUCCESS] Network credentials saved
[Provisioning] Device stored locally with MQTT ID: 26B7B3F8
[Provisioning] [SUCCESS] Device saved
[Provisioning] Navigating to dashboard...
```

### 4.13 Navigate to Home Dashboard
**File:** `src/screens/WiFiProvisioningScreen.tsx`

```typescript
navigation.reset({
  index: 0,
  routes: [
    {
      name: 'HomeMain',
      params: {
        justProvisioned: true,
        deviceId: provisionedDeviceId,
        deviceName: provisionedDeviceName,
      },
    },
  ],
});
```

### 4.14 Subscribe to New Device Metrics
**File:** `src/screens/HomeScreen.tsx`

- Device loaded from storage with `mqttDeviceId: "26B7B3F8"`
- `deviceDataService.subscribe("26B7B3F8", callback)`
- MQTT subscribes to topics

**Console Output:**
```
[Storage] Retrieved provisioned devices: 1
[HomeScreen] Loaded provisioned devices: 1
[DeviceData] ✅ Subscribed to MQTT for device: 26B7B3F8
[MQTT] 📡 Subscribing to topics for device: 26B7B3F8
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/data
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/status
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/led/state
```

---

## PHASE 5: DEVICE CONTROL

### 5.1 Open Device Details
**File:** `src/screens/HomeScreen.tsx`

- User taps device card
- Navigation to DeviceDetailsScreen
- Passes device object

### 5.2 Subscribe to Device Metrics
**File:** `src/screens/DeviceDetailsScreen.tsx`

```typescript
const mqttDeviceId = device.mqttDeviceId || device.id;

const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics) => {
  setMetrics(newMetrics);
  setLedStatus(newMetrics.ledStatus || false);
});
```

### 5.3 Display Real-Time Metrics
**File:** `src/screens/DeviceDetailsScreen.tsx`

- Displays 6 KPI cards:
  1. Soil Moisture: 45%
  2. WiFi RSSI: -65 dBm
  3. Temperature: 28.5°C
  4. Humidity: 60%
  5. Uptime: 3600 seconds
  6. Free Heap: 50000 bytes
- Updates in real-time as MQTT messages arrive

### 5.4 Toggle LED
**File:** `src/screens/DeviceDetailsScreen.tsx`

**Step 1: User Toggles LED Switch**
```typescript
const handleLEDToggle = async (value: boolean) => {
  setIsUpdatingLED(true);
  const mqttDeviceId = device.mqttDeviceId || device.id;
  const success = await deviceDataService.updateLEDStatus(mqttDeviceId, value);
  if (success) {
    setLedStatus(value);
  }
  setIsUpdatingLED(false);
};
```

**Step 2: deviceDataService Sends Command**
```typescript
async updateLEDStatus(deviceId: string, status: boolean) {
  const mqttService = getMQTTService();
  const success = await mqttService.sendLEDCommand(deviceId, status);
  return success;
}
```

**Step 3: MQTT Service Publishes Command**
```typescript
async sendLEDCommand(deviceId: string, state: boolean) {
  const topic = `esp32/${deviceId}/led/set`;
  const message = state ? 'ON' : 'OFF';
  
  return new Promise((resolve) => {
    if (this.client.publish) {
      this.client.publish(topic, message, 1, false, (err) => {
        if (err) {
          console.error('[MQTT] ❌ Publish error:', err);
          resolve(false);
        } else {
          console.log('[MQTT] ✅ Published to', topic, ':', message);
          resolve(true);
        }
      });
    }
  });
}
```

**Console Output:**
```
[DeviceDetails] 💡 Updating LED for device: 26B7B3F8 Status: ON
[DeviceData] 💡 Updating LED for device: 26B7B3F8 Status: ON
[MQTT] 💡 Publishing LED command to: esp32/26B7B3F8/led/set Message: ON
[MQTT] ✅ Published to esp32/26B7B3F8/led/set: ON
```

**Step 4: ESP32 Receives and Executes**
- ESP32 receives message on `esp32/26B7B3F8/led/set`
- Executes LED command
- Publishes response to `esp32/26B7B3F8/led/state`

**Step 5: App Receives LED State Update**
```
MQTT receives: esp32/26B7B3F8/led/state: "ON"
```

**Console Output:**
```
[MQTT] 📨 Received message on esp32/26B7B3F8/led/state: ON
[MQTT] 💡 LED state: ON
[MQTT] 📢 Notifying 1 listener(s) for device: 26B7B3F8
[DeviceData] 📊 Updated from MQTT: 26B7B3F8
[DeviceDetails] Device metrics updated: 26B7B3F8
```

---

## Summary

**Total Phases:** 5
**Total Steps:** 50+
**Key Files:** 15+
**MQTT Topics:** 5 per device
**Console Logs:** 100+ per session

**Status:** ✅ Complete and Detailed
