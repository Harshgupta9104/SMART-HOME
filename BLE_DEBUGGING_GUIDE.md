# BLE Scanning Debugging Guide

## Issue: BLE Not Scanning / Not Finding Devices

The SimpleBleProvisionScreen has been updated with **detailed console logging** to help diagnose the issue. Follow these steps:

### Step 1: Check Console Logs
When you tap "Add Device" and navigate to the BLE scanning screen, check the React Native console for these log messages:

```
[SimpleBLE] ========== STARTING BLE PROVISIONING FLOW ==========
[SimpleBLE] Step 1: Checking if provisioning permissions already granted...
[SimpleBLE] Permission check result: { bluetooth: true, location: true, ... }
[SimpleBLE] Step 2: Permissions not granted, requesting them now...
[SimpleBLE] ✓ Permissions already granted, proceeding with scan
[SimpleBLE] Step 3: Checking if Bluetooth is enabled...
[SimpleBLE] Bluetooth enabled: true
[SimpleBLE] ✓ Step 4: Starting BLE scan...
```

### Step 2: Verify Each Step

**If you see "❌ User denied permissions":**
- Go to Android Settings → Apps → SmartHomeApp → Permissions
- Enable: Bluetooth, Location, Notifications
- Restart the app

**If you see "❌ Bluetooth is disabled":**
- Enable Bluetooth on your Android device
- Settings → Bluetooth → Toggle ON

**If you see "✓ Step 4: Starting BLE scan...":**
- The scan is running
- Look for device discovery logs:
  ```
  [SimpleBLE] 📱 Device found: "PROV_26B7B3F8" (ID: ..., RSSI: ...)
  [SimpleBLE] ✓ PROVISIONING DEVICE FOUND: PROV_26B7B3F8
  ```

### Step 3: Check Device Requirements

For a device to appear in the list:
1. **Device name must start with "PROV_"** (e.g., PROV_26B7B3F8)
2. **Device must be powered on and in range** (within ~10 meters)
3. **Device must be advertising BLE** (check ESP32 firmware)

If you see:
```
[SimpleBLE] ⊘ Skipping non-PROV device: "MyDevice"
```
This means the device is found but doesn't have a PROV_ name.

### Step 4: Check BLE Service Logs

Look for BLE service logs:
```
[BLE] Preparing to start scan...
[BLE] Previous scan stopped
[BLE] Starting BLE scan...
[BLE] Device found: "PROV_26B7B3F8" (ID: ..., RSSI: ...)
[BLE] ✓ PROVISIONING DEVICE FOUND: PROV_26B7B3F8
```

### Common Issues & Solutions

| Issue | Logs | Solution |
|-------|------|----------|
| No devices found | `[SimpleBLE] ⊘ Skipping non-PROV device` | Check ESP32 device name starts with PROV_ |
| Permissions denied | `[SimpleBLE] ❌ User denied permissions` | Grant permissions in Android Settings |
| Bluetooth off | `[SimpleBLE] Bluetooth enabled: false` | Enable Bluetooth on device |
| Scan error | `[SimpleBLE] ❌ Scan error: ...` | Check error message in logs |
| BleManager not initialized | `[BLE] BleManager not initialized` | Restart app |

### Step 5: Test the Flow

1. **Open the app** and navigate to "Add Device"
2. **Tap "Nearby Setup"** to go to BLE scanning screen
3. **Check console logs** for the diagnostic messages above
4. **Power on your ESP32 device** (should be in provisioning mode)
5. **Wait 5-10 seconds** for device to appear in the list
6. **Tap the device** to connect

### Logs to Share

If BLE is still not working, share these logs:
1. Full console output from "Step 1" to "Step 4"
2. Any error messages with `❌` prefix
3. Device name shown in "Device found" logs
4. Bluetooth state (enabled/disabled)
5. Permission status (all granted/denied)

---

**Updated:** SimpleBleProvisionScreen.tsx with enhanced logging
**Last Modified:** 2026-05-29
