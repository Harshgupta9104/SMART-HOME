# BLE Provisioning Flow

## Overview

New devices are provisioned over BLE. The ESP32 advertises as `PROV_{shortId}` while in provisioning mode. The app connects, sends WiFi credentials via GATT, and the ESP32 connects to WiFi and starts publishing MQTT data.

## State Machine (`useProvisioning.ts`)

```
IDLE
  ↓ startProvisioning()
CONNECTING_BLE
  ↓ BLE connected
SENDING_CREDENTIALS
  ↓ SSID + password written to characteristic
WAITING_WIFI
  ↓ ESP32 confirms WiFi connected (BLE notification)
SUCCESS  ──→ device saved to storage, navigate to HomeScreen
  or
ERROR / TIMEOUT  ──→ show retry
```

## BLE Service / Characteristic UUIDs

Defined in `bleService.ts`. The provisioning service exposes:
- WiFi SSID characteristic (write)
- WiFi password characteristic (write)
- Status characteristic (notify) — ESP32 sends `wifi_connected` or `wifi_failed`

## Screens Involved

| Screen | Role |
|---|---|
| `SimpleBleProvisionScreen` | Scan for `PROV_*` devices, user selects one |
| `WiFiProvisioningScreen` | Scan nearby WiFi, user picks SSID + enters password |
| `ProvisioningProgressScreen` | Shows live state machine progress with animations |
| `ProvisioningSuccessScreen` | Confirmation before returning to HomeScreen |

## Android Permissions Required

All requested once during onboarding (`StartupScreen`):
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `NEARBY_WIFI_DEVICES` (Android 13+)

## After Provisioning

1. Device saved to `AsyncStorage` via `storageService.addProvisionedDevice()`
2. Device appears on `HomeScreen` device list
3. `DeviceDataService` subscribes to MQTT topics for the device
4. Real-time metrics start flowing within seconds
