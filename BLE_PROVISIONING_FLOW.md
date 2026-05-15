# BLE Provisioning Flow - Complete Implementation

## Overview
This document describes the Bluetooth Low Energy (BLE) device provisioning flow from scanning to WiFi credential delivery.

---

## BLE Provisioning Flow (15 Steps)

### Step 1: User Initiates Device Addition
**File:** `src/screens/HomeScreen.tsx`

```
User taps "Add Device" button
    ↓
handleAddDevice() called
    ↓
Navigation to SimpleBleProvisionScreen
```

**Console Output:**
```
[HomeScreen] Add device pressed
```

---

### Step 2: Start BLE Scan
**File:** `src/context/BleContext.tsx`

```typescript
const startScan = async () => {
  try {
    console.log('[BLE Context] Starting BLE scan...');
    
    // Scan for devices with provisioning service UUID
    this.bleManager.startDeviceScan(
      [SERVICE_UUID],
      null,
      (error, device) => {
        if (error) {
          console.error('[BLE] Scan error:', error);
          return;
        }
        
        if (device) {
          console.log('[BLE] Found device:', device.name, device.id);
          // Add to discovered devices list
        }
      }
    );
  } catch (error) {
    console.error('[BLE] Error starting scan:', error);
  }
};
```

**Console Output:**
```
[BLE Context] Starting BLE scan...
[BLE] Found device: ESP32_26B7B3F8 (F8:B3:B7:26:4D:D2)
[BLE] Found device: ESP32_A1B2C3D4 (AA:BB:CC:DD:EE:FF)
```

---

### Step 3: Display Available Devices
**File:** `src/screens/SimpleBleProvisionScreen.tsx`

- Shows list of discovered BLE devices
- Each device shows:
  - Device name (e.g., "ESP32_26B7B3F8")
  - BLE MAC address (e.g., "F8:B3:B7:26:4D:D2")
  - Signal strength (RSSI)

---

### Step 4: User Selects Device
**File:** `src/screens/SimpleBleProvisionScreen.tsx`

```typescript
const handleSelectDevice = (device) => {
  console.log('[SimpleBleProvision] Device selected:', device.name);
  
  // Navigate to WiFi provisioning screen
  navigation.navigate('WiFiProvisioning', {
    deviceId: device.id,           // BLE MAC: F8:B3:B7:26:4D:D2
    deviceName: device.name,       // ESP32_26B7B3F8
  });
};
```

**Console Output:**
```
[SimpleBleProvision] Device selected: ESP32_26B7B3F8
```

---

### Step 5: Navigate to WiFi Provisioning Screen
**File:** `src/screens/WiFiProvisioningScreen.tsx`

- Receives device ID and name from navigation params
- Initializes WiFi network scanning

---

### Step 6: Connect to BLE Device
**File:** `src/services/bleService.ts`

```typescript
const connectToDevice = async (deviceId: string) => {
  try {
    console.log('[BLE] Connecting to device:', deviceId);
    
    const device = await this.bleManager.connectToDevice(deviceId);
    
    console.log('[BLE] ✅ Connected to device');
    this.connectedDeviceId = deviceId;
    
    return device;
  } catch (error) {
    console.error('[BLE] Connection error:', error);
    throw error;
  }
};
```

**Console Output:**
```
[BLE] Connecting to device: F8:B3:B7:26:4D:D2
[BLE] ✅ Connected to device
```

---

### Step 7: Discover Services and Characteristics
**File:** `src/services/bleService.ts`

```typescript
const discoverServices = async (deviceId: string) => {
  try {
    console.log('[BLE] Discovering services...');
    
    const services = await this.bleManager.discoverAllServicesAndCharacteristics(deviceId);
    
    console.log('[BLE] ✅ Services discovered');
    
    return services;
  } catch (error) {
    console.error('[BLE] Discovery error:', error);
    throw error;
  }
};
```

**Console Output:**
```
[BLE] Discovering services...
[BLE] ✅ Services discovered
```

---

### Step 8: Find Provisioning Service
**File:** `src/services/bleService.ts`

```typescript
const services = await discoverServices(deviceId);

const provisioningService = services.find(
  s => s.uuid.toLowerCase() === SERVICE_UUID.toLowerCase()
);

if (!provisioningService) {
  throw new Error('Provisioning service not found on device');
}

console.log('[BLE] Found provisioning service');
```

**Console Output:**
```
[BLE] Found provisioning service
```

---

### Step 9: Find Provisioning Characteristic
**File:** `src/services/bleService.ts`

```typescript
const characteristics = await provisioningService.characteristics();

const provisioningChar = characteristics.find(
  c => c.uuid.toLowerCase() === CHARACTERISTIC_UUID.toLowerCase()
);

if (!provisioningChar) {
  throw new Error('Provisioning characteristic not found');
}

console.log('[BLE] Found provisioning characteristic');
```

**Console Output:**
```
[BLE] Found provisioning characteristic
```

---

### Step 10: Read Device ID from ESP32 (CRITICAL)
**File:** `src/services/bleService.ts`

```typescript
console.log('[BLE] Reading device ID from ESP32...');

let mqttDeviceId: string | null = null;

try {
  // Find Device ID service
  const devIdService = services.find(
    s => s.uuid.toLowerCase() === DEVID_SERVICE_UUID.toLowerCase()
  );

  if (devIdService) {
    const devIdCharacteristics = await devIdService.characteristics();
    const devIdChar = devIdCharacteristics.find(
      c => c.uuid.toLowerCase() === DEVID_CHAR_UUID.toLowerCase()
    );

    if (devIdChar) {
      // Read the characteristic value
      const readChar = await devIdChar.read();
      
      if (readChar && readChar.value) {
        // Decode from base64
        const fullDeviceId = Buffer.from(readChar.value, 'base64').toString('utf-8');
        // fullDeviceId = "ESP32_26B7B3F8"
        
        let shortId = fullDeviceId;
        
        // Extract short ID
        if (fullDeviceId.startsWith('ESP32_')) {
          shortId = fullDeviceId.replace('ESP32_', '');
        }
        if (fullDeviceId.startsWith('PROV_')) {
          shortId = fullDeviceId.replace('PROV_', '');
        }
        
        // shortId = "26B7B3F8"
        mqttDeviceId = shortId;
        
        console.log('[BLE] ✅ Device ID read:', shortId);
        console.log('[BLE] 📊 Device ID mapping:');
        console.log('[BLE]   BLE MAC:', deviceId);
        console.log('[BLE]   Full ID:', fullDeviceId);
        console.log('[BLE]   MQTT ID:', shortId);
        
        // Pass to callback
        onStatusUpdate(`Device ID: ${shortId}`, false, shortId);
      }
    }
  }
} catch (idReadError) {
  console.warn('[BLE] ⚠️ Error reading device ID:', idReadError);
  console.log('[BLE] Continuing with provisioning...');
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

**Device ID Formats:**
- **BLE MAC:** F8:B3:B7:26:4D:D2 (connection address)
- **Full Device ID:** ESP32_26B7B3F8 (from BLE characteristic)
- **MQTT Device ID:** 26B7B3F8 (short chip ID) ← **USE THIS FOR MQTT**

---

### Step 11: Setup Notification Listener
**File:** `src/services/bleService.ts`

```typescript
console.log('[BLE] Setting up notifications...');
onStatusUpdate('Setting up notifications...', false, mqttDeviceId);

this.notificationBuffer = ''; // Reset buffer

this.notificationSubscription = provisioningChar.monitor(
  (error, characteristic) => {
    if (error) {
      if (error.message && error.message.includes('Operation was cancelled')) {
        console.log('[BLE] Notification monitor cancelled (normal)');
        return;
      }
      console.error('[BLE] Notification error:', error);
      onStatusUpdate(`Notification error: ${error.message}`, true);
      clearTimeout(timeout);
      if (ackReject) ackReject(error);
      return;
    }

    if (characteristic && characteristic.value) {
      try {
        // Decode base64 notification
        const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf8');
        console.log('[BLE] Received notification:', decodedValue);

        // Buffer chunked responses
        this.notificationBuffer += decodedValue;

        // Try to parse as JSON
        try {
          const response = JSON.parse(this.notificationBuffer);
          console.log('[BLE] Parsed firmware response:', response);

          // Route status to callback - ALWAYS pass mqttDeviceId
          if (response.status) {
            onStatusUpdate(response.status, false, mqttDeviceId);
          } else if (response.msg) {
            onStatusUpdate(response.msg, true, mqttDeviceId);
          }

          // Check if this is an acknowledgment
          const statusMsg = response.msg || response.status;
          if (statusMsg === 'testing_wifi' || 
              statusMsg === 'wifi_saved' || 
              statusMsg === 'connecting_wifi' ||
              response.status === 'ok' || 
              response.status === 'info' ||
              response.status === 'error') {
            console.log('[BLE] ✅ Received acknowledgment from device - provisioning in progress');
            clearTimeout(timeout);
            if (ackResolve) ackResolve();
          }

          // Clear buffer after successful parse
          this.notificationBuffer = '';
        } catch (parseError) {
          console.log('[BLE] Buffering incomplete JSON...');
        }
      } catch (decodeError) {
        console.error('[BLE] Error decoding notification:', decodeError);
      }
    }
  }
);
```

**Console Output:**
```
[BLE] Setting up notifications...
```

---

### Step 12: Prepare WiFi Credentials
**File:** `src/services/bleService.ts`

```typescript
const credentialsPayload = {
  ssid: ssid.trim(),
  password: password,
};

const jsonString = JSON.stringify(credentialsPayload);
console.log('[BLE] Credentials payload:', jsonString);
console.log('[BLE] Payload length:', jsonString.length, 'bytes');

// Encode to base64 for BLE transmission
const encodedPayload = Buffer.from(jsonString, 'utf8').toString('base64');
console.log('[BLE] Encoded payload length:', encodedPayload.length);
console.log('[BLE] Encoded payload:', encodedPayload);
```

**Console Output:**
```
[BLE] Credentials payload: {"ssid":"MyWiFi","password":"password123"}
[BLE] Payload length: 45 bytes
[BLE] Encoded payload length: 60
[BLE] Encoded payload: eyJzc2lkIjoiTXlXaUZpIiwicGFzc3dvcmQiOiJwYXNzd29yZDEyMyJ9
```

---

### Step 13: Send WiFi Credentials via BLE
**File:** `src/services/bleService.ts`

```typescript
console.log('[BLE] Sending credentials via BLE...');

try {
  await this.bleManager.writeCharacteristicWithResponseForDevice(
    deviceId,
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    encodedPayload
  );
  console.log('[BLE] Credentials sent successfully');
} catch (writeError) {
  console.error('[BLE] Error sending credentials:', writeError);
  clearTimeout(timeout);
  throw new Error(`Failed to send credentials: ${writeError}`);
}
```

**Console Output:**
```
[BLE] Sending credentials via BLE...
[BLE] Credentials sent successfully
[BLE] ⏳ Waiting for acknowledgment from device...
```

---

### Step 14: Wait for Acknowledgment from ESP32
**File:** `src/services/bleService.ts`

```typescript
// ESP32 sends acknowledgment via BLE notification:
// {"status":"ok","msg":"wifi_saved"}
// or {"status":"info","msg":"connecting_wifi"}

await ackPromise; // Waits for acknowledgment (10 second timeout)
console.log('[BLE] ✅ Acknowledgment received - device is provisioning');
```

**Console Output:**
```
[BLE] Received notification: {"status":"ok","msg":"connecting_wifi"}
[BLE] Parsed firmware response: {status: "ok", msg: "connecting_wifi"}
[BLE] ✅ Received acknowledgment from device - provisioning in progress
```

---

### Step 15: Return MQTT Device ID
**File:** `src/services/bleService.ts`

```typescript
// Return the MQTT device ID to the caller
return mqttDeviceId; // Returns "26B7B3F8"
```

---

## Device ID Capture in Provisioning Hook

**File:** `src/hooks/useProvisioning.ts`

```typescript
let capturedMqttDeviceId: string | null = null;

const mqttDeviceId = await bleService.sendWiFiCredentials(
  deviceId,
  ssid,
  password,
  (status: string, isError?: boolean, returnedMqttId?: string) => {
    // Capture MQTT device ID from any status update that provides it
    if (returnedMqttId) {
      capturedMqttDeviceId = returnedMqttId;
      console.log('[Provisioning] 📱 Captured MQTT Device ID:', capturedMqttDeviceId);
    }
    
    if (isError) {
      setProvisioningState(ProvisioningState.ERROR);
      addLog(status, 'error');
      setError(status);
      cleanup();
      setIsLoading(false);
    } else {
      // Pass the captured MQTT device ID to handleStatusUpdate
      const finalMqttId = returnedMqttId || capturedMqttDeviceId;
      handleStatusUpdate(status, isError, ssid, password, rememberNetwork, deviceId, deviceName, finalMqttId, onProvisioningComplete);
    }
  }
);

// Also capture the return value from sendWiFiCredentials
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

---

## Device Storage with MQTT ID

**File:** `src/hooks/useProvisioning.ts`

```typescript
if (status === 'wifi_saved' || status === 'ok') {
  // Store device with MQTT ID
  const device = {
    id: deviceId,                          // BLE MAC: F8:B3:B7:26:4D:D2
    name: deviceName,                      // Living Room Plant
    macAddress: deviceId,                  // F8:B3:B7:26:4D:D2
    mqttDeviceId: mqttDeviceId || deviceId, // ← SAVE MQTT ID: 26B7B3F8
    ssid: ssid,                            // MyWiFi
    status: 'online' as const,
    lastSeen: new Date().toISOString(),
    provisionedAt: new Date().toISOString(),
    justProvisioned: true,
  };

  await storageService.addProvisionedDevice(device);
  console.log('[Provisioning] Device stored locally with MQTT ID:', mqttDeviceId);
}
```

**Console Output:**
```
[Provisioning] Device stored locally with MQTT ID: 26B7B3F8
```

---

## BLE Provisioning Status Flow

### Status Updates During Provisioning

1. **Reading Device ID**
   ```
   Status: "Reading device ID..."
   Log: "Reading device ID..."
   ```

2. **Setting Up Notifications**
   ```
   Status: "Setting up notifications..."
   Log: "Setting up notifications..."
   ```

3. **Sending Credentials**
   ```
   Status: "Sending credentials..."
   Log: "Sending credentials..."
   ```

4. **Testing WiFi**
   ```
   Status: "testing_wifi"
   State: WAITING_WIFI
   Log: "Testing WiFi connection..."
   ```

5. **Connecting WiFi**
   ```
   Status: "connecting_wifi"
   State: WAITING_WIFI
   Log: "Connecting to WiFi..."
   ```

6. **WiFi Saved (SUCCESS)**
   ```
   Status: "wifi_saved" or "ok"
   State: SUCCESS
   Log: "WiFi connection successful"
   ```

---

## Complete BLE Provisioning Console Output

```
[SimpleBleProvision] Device selected: ESP32_26B7B3F8
[WiFiProvisioning] Device: Living Room Plant ID: F8:B3:B7:26:4D:D2
[WiFiProvisioning] ✅ Permissions already granted
[WiFiService] ✅ Scan result: 5 networks found
[WiFiProvisioning] ✅ Auto-selecting current network: MyWiFi
[WiFiProvisioning] ✅ INITIALIZATION COMPLETE

[Provisioning] Starting provisioning...
[BLE] Connecting to device: F8:B3:B7:26:4D:D2
[BLE] ✅ Connected to device
[BLE] Discovering services...
[BLE] ✅ Services discovered
[BLE] Found provisioning service
[BLE] Found provisioning characteristic
[BLE] Reading device ID from ESP32...
[BLE] ✅ Device ID read: 26B7B3F8
[BLE] 📊 Device ID mapping:
[BLE]   BLE MAC: F8:B3:B7:26:4D:D2
[BLE]   Full ID: ESP32_26B7B3F8
[BLE]   MQTT ID: 26B7B3F8
[BLE] Setting up notifications...
[BLE] Credentials payload: {"ssid":"MyWiFi","password":"password123"}
[BLE] Payload length: 45 bytes
[BLE] Encoded payload length: 60
[BLE] Sending credentials via BLE...
[BLE] Credentials sent successfully
[BLE] ⏳ Waiting for acknowledgment from device...
[BLE] Received notification: {"status":"ok","msg":"connecting_wifi"}
[BLE] Parsed firmware response: {status: "ok", msg: "connecting_wifi"}
[BLE] ✅ Received acknowledgment from device - provisioning in progress
[Provisioning] 📱 Captured MQTT Device ID: 26B7B3F8
[Provisioning] 📱 Captured MQTT Device ID from return value: 26B7B3F8
[Provisioning] Status update: testing_wifi
[Provisioning] [INFO] Testing WiFi connection...
[Provisioning] Status update: connecting_wifi
[Provisioning] [INFO] Connecting to WiFi...
[Provisioning] Status update: wifi_saved
[Provisioning] ✅ WiFi saved - provisioning complete!
[Provisioning] [SUCCESS] WiFi connection successful
[Provisioning] [SUCCESS] Network credentials saved
[Provisioning] Device stored locally with MQTT ID: 26B7B3F8
[Provisioning] [SUCCESS] Device saved
[Provisioning] Navigating to dashboard...
```

---

## BLE Service Constants

```typescript
// Service UUIDs
const SERVICE_UUID = '0000180A-0000-1000-8000-00805F9B34FB';
const CHARACTERISTIC_UUID = '00002A29-0000-1000-8000-00805F9B34FB';

// Device ID Service UUIDs
const DEVID_SERVICE_UUID = '0000180B-0000-1000-8000-00805F9B34FB';
const DEVID_CHAR_UUID = '00002A2B-0000-1000-8000-00805F9B34FB';
```

---

## Summary

**BLE Provisioning Status:** ✅ Complete

**Key Points:**
1. Scans for BLE devices with provisioning service
2. Connects to selected ESP32 device
3. Discovers services and characteristics
4. **Reads device ID from ESP32** (critical step)
5. Extracts short MQTT device ID (26B7B3F8)
6. Sets up notification listener
7. Sends WiFi credentials via BLE
8. Waits for acknowledgment from ESP32
9. Captures MQTT device ID in provisioning hook
10. Saves device with MQTT ID to local storage
11. Navigates to home dashboard
12. Subscribes to MQTT topics using MQTT device ID
