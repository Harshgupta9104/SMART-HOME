# BLE Device ID Reading - Complete Guide 🔥

## THE EXACT ISSUE

Your ESP32 firmware exposes the device ID via a **BLE GATT characteristic**:

```cpp
// ESP32 Firmware
#define DEVID_SERVICE_UUID   "12345678-1234-1234-1234-1234567890ab"
#define DEVID_CHAR_UUID      "12345678-1234-1234-1234-1234567890cd"

// Device ID is stored as: "ESP32_26B7B3F8"
g_pDevIdChar->setValue(g_deviceId.c_str());
```

Your app **must read this characteristic** to get the device ID.

---

## THE CORRECT BLE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    BLE Device (ESP32)                        │
│                                                              │
│  Service: 12345678-1234-1234-1234-1234567890ab             │
│    └─ Characteristic: 12345678-1234-1234-1234-1234567890cd │
│         └─ Value: "ESP32_26B7B3F8" (base64 encoded)        │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │
                    BLE Read Operation
                            │
┌─────────────────────────────────────────────────────────────┐
│                  React Native App                            │
│                                                              │
│  1. Scan → Find "PROV_26B7B3F8"                            │
│  2. Connect → await device.connect()                        │
│  3. Discover → await discoverAllServicesAndCharacteristics()│
│  4. Read → readCharacteristicForService(SERVICE, CHAR)     │
│  5. Decode → Buffer.from(value, 'base64').toString('utf-8')│
│  6. Extract → "ESP32_26B7B3F8" → "26B7B3F8"               │
│  7. Store → Use "26B7B3F8" for MQTT topics                 │
└─────────────────────────────────────────────────────────────┘
```

---

## STEP-BY-STEP IMPLEMENTATION

### Step 1: Define Correct UUIDs

```typescript
// src/services/bleService.ts
export const DEVID_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
export const DEVID_CHAR_UUID = '12345678-1234-1234-1234-1234567890cd';
```

✅ **MUST match ESP32 firmware exactly**

---

### Step 2: Connect to Device

```typescript
const device = await this.bleManager.connectToDevice(deviceId);
console.log('[BLE] ✅ Connected to device');
```

✅ `deviceId` is the BLE MAC address (e.g., "F8:B3:B7:26:4D:D2")

---

### Step 3: Discover Services (CRITICAL!)

```typescript
await this.bleManager.discoverAllServicesAndCharacteristics(deviceId);
console.log('[BLE] ✅ Services discovered');
```

⚠️ **WITHOUT THIS STEP, characteristic reads often fail!**

This is the most common bug in BLE apps.

---

### Step 4: Read Device ID Characteristic

```typescript
const characteristic = await this.bleManager.readCharacteristicForService(
  deviceId,
  DEVID_SERVICE_UUID,
  DEVID_CHAR_UUID
);

console.log('[BLE] Raw value:', characteristic.value);
// Output: "RVNQMzJfMjZCN0IzRjg=" (base64)
```

✅ Value is **base64 encoded** by BLE library

---

### Step 5: Decode Base64

```typescript
import { Buffer } from 'buffer';

const fullDeviceId = Buffer
  .from(characteristic.value, 'base64')
  .toString('utf-8');

console.log('[BLE] Decoded:', fullDeviceId);
// Output: "ESP32_26B7B3F8"
```

✅ Now you have the full device ID

---

### Step 6: Extract Short MQTT ID

```typescript
// Remove "ESP32_" prefix
let shortId = fullDeviceId;
if (fullDeviceId.startsWith('ESP32_')) {
  shortId = fullDeviceId.replace('ESP32_', '');
}

console.log('[BLE] Short ID:', shortId);
// Output: "26B7B3F8"
```

✅ This is what MQTT uses for topics

---

### Step 7: Disconnect

```typescript
await this.bleManager.cancelDeviceConnection(deviceId);
console.log('[BLE] ✅ Disconnected');
```

✅ Always disconnect after reading

---

## COMPLETE IMPLEMENTATION

```typescript
async readDeviceId(deviceId: string): Promise<string | null> {
  try {
    console.log('[BLE] 📖 Reading device ID from:', deviceId);

    if (!this.bleManager) {
      console.error('[BLE] BleManager not initialized');
      return null;
    }

    // STEP 1: Connect
    console.log('[BLE] Step 1: Connecting...');
    await this.bleManager.connectToDevice(deviceId);
    console.log('[BLE] ✅ Connected');

    // STEP 2: Discover (CRITICAL!)
    console.log('[BLE] Step 2: Discovering services...');
    await this.bleManager.discoverAllServicesAndCharacteristics(deviceId);
    console.log('[BLE] ✅ Discovered');

    // STEP 3: Read characteristic
    console.log('[BLE] Step 3: Reading characteristic...');
    const characteristic = await this.bleManager.readCharacteristicForService(
      deviceId,
      DEVID_SERVICE_UUID,
      DEVID_CHAR_UUID
    );

    if (!characteristic?.value) {
      console.error('[BLE] ❌ No value received');
      await this.bleManager.cancelDeviceConnection(deviceId);
      return null;
    }

    // STEP 4: Decode base64
    console.log('[BLE] Step 4: Decoding...');
    const fullDeviceId = Buffer
      .from(characteristic.value, 'base64')
      .toString('utf-8');
    console.log('[BLE] ✅ Decoded:', fullDeviceId);

    // STEP 5: Extract short ID
    console.log('[BLE] Step 5: Extracting short ID...');
    let shortId = fullDeviceId;
    if (fullDeviceId.startsWith('ESP32_')) {
      shortId = fullDeviceId.replace('ESP32_', '');
    }
    console.log('[BLE] ✅ Short ID:', shortId);

    // STEP 6: Disconnect
    console.log('[BLE] Step 6: Disconnecting...');
    await this.bleManager.cancelDeviceConnection(deviceId);
    console.log('[BLE] ✅ Disconnected');

    return shortId;
  } catch (error) {
    console.error('[BLE] ❌ Error:', error);
    try {
      await this.bleManager?.cancelDeviceConnection(deviceId);
    } catch (e) {
      // Ignore
    }
    return null;
  }
}
```

---

## EXPECTED LOGS

### Success Case
```
[BLE] 📖 Reading device ID from: F8:B3:B7:26:4D:D2
[BLE] Step 1: Connecting...
[BLE] ✅ Connected to device
[BLE] Step 2: Discovering services and characteristics...
[BLE] ✅ Services discovered
[BLE] Step 3: Reading Device ID characteristic...
[BLE] Using UUIDs:
[BLE]   Service: 12345678-1234-1234-1234-1234567890ab
[BLE]   Characteristic: 12345678-1234-1234-1234-1234567890cd
[BLE] Step 4: Decoding base64 value...
[BLE] Raw base64: RVNQMzJfMjZCN0IzRjg=
[BLE] ✅ Decoded full device ID: ESP32_26B7B3F8
[BLE] Step 5: Extracting short MQTT device ID...
[BLE] ✅ Short MQTT device ID: 26B7B3F8
[BLE] 📊 Device ID mapping:
[BLE]   BLE MAC: F8:B3:B7:26:4D:D2
[BLE]   Full ID: ESP32_26B7B3F8
[BLE]   MQTT ID: 26B7B3F8
[BLE] Step 6: Disconnecting...
[BLE] ✅ Disconnected
```

### Failure Case (Missing discoverAllServicesAndCharacteristics)
```
[BLE] ❌ Error reading device ID: Error: Characteristic not found
```

⚠️ **This is why Step 2 (Discover) is CRITICAL!**

---

## DEVICE ID MAPPING

After reading, you have three identifiers:

| Identifier | Value | Purpose |
|-----------|-------|---------|
| **BLE MAC** | `F8:B3:B7:26:4D:D2` | BLE connection address |
| **Full Device ID** | `ESP32_26B7B3F8` | Firmware identifier |
| **MQTT Device ID** | `26B7B3F8` | MQTT topic base |

Store all three:
```typescript
const device = {
  bleMac: 'F8:B3:B7:26:4D:D2',
  fullDeviceId: 'ESP32_26B7B3F8',
  mqttDeviceId: '26B7B3F8',  // ← Use this for MQTT
  bleName: 'PROV_26B7B3F8',
};
```

---

## MQTT TOPICS (After Reading)

```
esp32/26B7B3F8/data        ← Subscribe (receive sensor data)
esp32/26B7B3F8/status      ← Subscribe (receive status)
esp32/26B7B3F8/led/state   ← Subscribe (receive LED state)
esp32/26B7B3F8/led/set     ← Publish (send LED commands)
esp32/26B7B3F8/config      ← Publish (send WiFi/reset commands)
```

---

## COMMON MISTAKES

### ❌ Mistake 1: Wrong UUID
```typescript
// WRONG
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

// CORRECT
const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
```

### ❌ Mistake 2: Missing discoverAllServicesAndCharacteristics()
```typescript
// WRONG - Will fail!
const char = await device.readCharacteristicForService(...);

// CORRECT
await device.discoverAllServicesAndCharacteristics();
const char = await device.readCharacteristicForService(...);
```

### ❌ Mistake 3: Not decoding base64
```typescript
// WRONG
const deviceId = characteristic.value;  // "RVNQMzJfMjZCN0IzRjg="

// CORRECT
const deviceId = Buffer
  .from(characteristic.value, 'base64')
  .toString('utf-8');  // "ESP32_26B7B3F8"
```

### ❌ Mistake 4: Using full ID for MQTT
```typescript
// WRONG
const topic = `esp32/ESP32_26B7B3F8/data`;

// CORRECT
const topic = `esp32/26B7B3F8/data`;
```

---

## TESTING

### Test 1: Can you read the characteristic?
```
✅ See logs: "[BLE] ✅ Decoded full device ID: ESP32_26B7B3F8"
```

### Test 2: Can you extract the short ID?
```
✅ See logs: "[BLE] ✅ Short MQTT device ID: 26B7B3F8"
```

### Test 3: Does MQTT connect with correct topics?
```
✅ See logs: "[MQTT] ✅ Subscribed to: esp32/26B7B3F8/data"
```

### Test 4: Do you receive sensor data?
```
✅ See logs: "[MQTT] 📨 Received message on esp32/26B7B3F8/data: {...}"
```

---

## SUMMARY

✅ **Read device ID from BLE characteristic**
✅ **Decode base64 value**
✅ **Extract short ID (remove "ESP32_" prefix)**
✅ **Use short ID for MQTT topics**
✅ **Always call discoverAllServicesAndCharacteristics() first**

🚀 **This will fix your entire provisioning + MQTT pipeline!**
