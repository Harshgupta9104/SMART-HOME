# BLE Device Disconnection Flow

## When BLE Device Disconnects During Provisioning

### Timeline of Events:

```
1. WiFiProvisioningScreen
   ↓
2. startProvisioning() called
   ↓
3. BLE Service: sendWiFiCredentials()
   ├─ Connect to device ✅
   ├─ Discover services ✅
   ├─ Read device ID ✅
   ├─ Setup notification listener ✅
   ├─ Send credentials via BLE ✅
   └─ Device receives: {"ssid":"...", "password":"..."}
   ↓
4. ESP32 Firmware Receives Credentials
   ├─ Parses JSON
   ├─ Starts WiFi connection attempt
   └─ Reboots to apply settings
   ↓
5. BLE Connection Drops (EXPECTED)
   ├─ Device disconnects from BLE
   ├─ Notification listener stops
   └─ Error: "Device is not connected"
   ↓
6. App Continues Waiting for Acknowledgment
   ├─ Timeout: 10 seconds
   ├─ If no response → Error state
   └─ If response received → Success state
   ↓
7. ESP32 Reconnects via WiFi
   ├─ Connects to WiFi network
   ├─ Gets IP address
   ├─ Syncs time (NTP)
   └─ Connects to MQTT broker
   ↓
8. Device Now Available via MQTT
   ├─ BLE no longer needed
   ├─ All control via MQTT
   └─ HomeScreen displays device
```

---

## Current Code Flow

### 1. **WiFiProvisioningScreen.tsx** - User Initiates Provisioning
```typescript
const handleConnect = async () => {
  await startProvisioning(
    deviceId,
    deviceName,
    selectedSSID,
    password,
    rememberNetwork,
    displayName,
    roomName,
    onProvisioningComplete  // Callback when done
  );
}
```

### 2. **useProvisioning.ts** - Manages Provisioning State
```typescript
const startProvisioning = async (...) => {
  setProvisioningState(ProvisioningState.CONNECTING_BLE);
  
  // Send credentials via BLE
  const mqttDeviceId = await bleService.sendWiFiCredentials(
    deviceId,
    ssid,
    password,
    (status, isError, returnedMqttId) => {
      // Handle status updates from BLE service
      handleStatusUpdate(status, isError, ...);
    }
  );
}
```

### 3. **bleService.ts** - Sends Credentials & Handles Disconnection
```typescript
async sendWiFiCredentials(deviceId, ssid, password, onStatusUpdate) {
  // Step 1: Connect to device
  const device = await this.connectToDevice(deviceId);
  
  // Step 2: Setup notification listener
  this.notificationSubscription = provisioningChar.monitor(
    (error, characteristic) => {
      if (error) {
        // Handle notification errors
        onStatusUpdate(`Error: ${error.message}`, true);
      }
      // Process incoming notifications
    }
  );
  
  // Step 3: Send credentials
  try {
    await this.bleManager.writeCharacteristicWithResponseForDevice(
      deviceId,
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      encodedPayload
    );
  } catch (writeError) {
    // ⚠️ EXPECTED: Device disconnects after sending credentials
    if (writeError.includes('not connected')) {
      console.log('Device disconnected (expected - rebooting)');
      // Continue waiting for acknowledgment
    } else {
      throw error;
    }
  }
  
  // Step 4: Wait for acknowledgment
  await ackPromise;  // Resolves when device sends status
  return mqttDeviceId;
}
```

### 4. **What Happens on Disconnection**

#### Scenario A: Device Disconnects BEFORE Sending Credentials
```
❌ Error: "Failed to send credentials"
→ Provisioning fails
→ User sees error screen
→ User can retry
```

#### Scenario B: Device Disconnects AFTER Sending Credentials (EXPECTED)
```
✅ Credentials sent successfully
⚠️ Device disconnects (rebooting)
⏳ App waits for acknowledgment (10 second timeout)
  ├─ If ESP32 sends status → Success ✅
  └─ If timeout → Error ❌
```

#### Scenario C: Device Sends Acknowledgment After Reconnecting
```
✅ Credentials sent
⚠️ Device disconnects
✅ Device reconnects via WiFi
✅ Device sends status via BLE notification
✅ Provisioning completes
```

---

## Disconnection Handling in Code

### In **bleService.ts** (Line 475-495):
```typescript
try {
  await this.bleManager.writeCharacteristicWithResponseForDevice(
    deviceId,
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    encodedPayload
  );
} catch (writeError) {
  const errorMsg = String(writeError);
  
  // ✅ Handle expected disconnection
  if (errorMsg.includes('not connected')) {
    console.log('Device disconnected (expected - device is rebooting)');
    // Don't throw - continue waiting for acknowledgment
  } else {
    // ❌ Handle unexpected errors
    throw new Error(`Failed to send credentials: ${writeError}`);
  }
}
```

### Notification Listener (Line 420-460):
```typescript
this.notificationSubscription = provisioningChar.monitor(
  (error, characteristic) => {
    if (error) {
      // Ignore "Operation was cancelled" - normal when disconnecting
      if (error.message?.includes('Operation was cancelled')) {
        console.log('Notification monitor cancelled (normal)');
        return;
      }
      // Handle real errors
      onStatusUpdate(`Error: ${error.message}`, true);
    }
    
    // Process incoming data
    if (characteristic?.value) {
      const decodedValue = Buffer.from(characteristic.value, 'base64').toString();
      // Parse and route status
    }
  }
);
```

---

## State Transitions During Disconnection

```
IDLE
  ↓
CONNECTING_BLE (Connecting to device)
  ↓
WAITING_WIFI (Credentials sent, waiting for WiFi)
  ├─ Device disconnects here (expected)
  ├─ Notification listener stops
  └─ App continues waiting
  ↓
SUCCESS (Device sends "wifi_saved" status)
  OR
ERROR (Timeout after 10 seconds)
```

---

## What Happens After Disconnection

### If Provisioning Succeeds:
1. Device stores WiFi credentials
2. Device reboots
3. Device connects to WiFi
4. Device syncs time (NTP)
5. Device connects to MQTT broker
6. Device appears in HomeScreen
7. User can control device via MQTT

### If Provisioning Fails:
1. Device disconnects
2. App waits 10 seconds for acknowledgment
3. Timeout occurs
4. Error state displayed
5. User can retry provisioning

---

## Key Points

✅ **Expected Behavior**: Device disconnects after sending credentials (it's rebooting)

✅ **Handled Gracefully**: App continues waiting for acknowledgment

✅ **Timeout Protection**: 10-second timeout prevents infinite waiting

✅ **Error Distinction**: 
- "not connected" errors are expected and ignored
- Other errors are treated as failures

✅ **Recovery**: Device can reconnect via WiFi and send status

❌ **Failure Cases**:
- WiFi credentials incorrect
- WiFi network not in range
- Device fails to boot
- MQTT broker unreachable
