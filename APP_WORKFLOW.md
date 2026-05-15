# App Workflow

## Navigation Structure

```
First launch:
  StartupScreen (splash → permissions) → HomeScreen

Return visits:
  HomeScreen (direct, onboarding_completed flag in AsyncStorage)

HomeScreen
  ├── + Add Device → SimpleBleProvisionScreen
  │     └── WiFiProvisioningScreen
  │           └── ProvisioningProgressScreen → HomeScreen
  └── Device card → DeviceDetailsScreen
        ├── Tab: Metrics
        ├── Tab: Controller  ← default
        └── Tab: Settings
```

## Onboarding Gate

`RootNavigator` checks `AsyncStorage` for `onboarding_completed`.
- Not set → shows `StartupScreen` (splash + permission request)
- Set → goes directly to `HomeScreen`

## Device Provisioning Flow

1. User taps "Add Device" on HomeScreen
2. `SimpleBleProvisionScreen` — scans for BLE devices (filtered by name prefix `PROV_`)
3. User selects a device → navigates to `WiFiProvisioningScreen` with `deviceId` + `deviceName`
4. `WiFiProvisioningScreen` — scans nearby WiFi, user picks SSID + enters password
5. Taps "Connect Device" → navigates to `ProvisioningProgressScreen`
6. `useProvisioning` hook drives the state machine:
   - `CONNECTING_BLE` → connect to device via BLE
   - `SENDING_CREDENTIALS` → write SSID + password to BLE characteristic
   - `WAITING_WIFI` → wait for ESP32 WiFi connection confirmation
   - `SUCCESS` → device saved to storage, navigate to HomeScreen
   - `ERROR` / `TIMEOUT` → show retry option

## Device Details Tabs

### Metrics Tab
- Plant health hero card (soil moisture → state: Desert Dry / Dry / Healthy / Wet / Saturated)
- Color + glow changes based on state
- WiFi signal, temperature, humidity, uptime stat cards
- Last updated timestamp

### Controller Tab (default)
- Single grow light card with one big Switch
- Animated yellow glow when light is ON
- Quick stats (uptime, free heap, WiFi RSSI)
- LED command sent via MQTT: `esp32/{id}/led/set` → `ON` / `OFF`

### Settings Tab
- Preferences: auto-reconnect, notifications toggles
- Device Information: ID, MAC, status
- WiFi Information: current SSID with ✏️ edit button
  - Opens bottom sheet → scans networks → select → enter password → sends via MQTT
- Advanced Settings (collapsed): Restart, Reset WiFi, Remove Device

## WiFi Reconfiguration Flow

1. Settings → WiFi Information → tap ✏️
2. Modal opens, scans nearby networks via `wifiService.scanNetworks()`
3. User selects network (or enters manually)
4. User enters password
5. App publishes to `esp32/{id}/config`:
   ```json
   { "type": "wifi_update", "ssid": "...", "password": "..." }
   ```
6. ESP32 tests new WiFi, rolls back if it fails, restarts on success
