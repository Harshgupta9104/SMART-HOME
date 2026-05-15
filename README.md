# SmartHomeApp

React Native app for provisioning and managing ESP32-based smart home devices over BLE and MQTT.

## Tech Stack

- React Native 0.84 (TypeScript)
- `react-native-ble-plx` — BLE scanning & provisioning
- `mqtt` (WebSocket) — real-time device data via HiveMQ cloud
- `react-native-wifi-reborn` — WiFi network scanning
- `@react-navigation/native` + `@react-navigation/material-top-tabs` — navigation
- `@react-native-async-storage/async-storage` — onboarding state
- `react-native-keychain` — saved WiFi passwords

## Project Structure

```
src/
  screens/
    StartupScreen.tsx          # Splash + permission onboarding
    HomeScreen.tsx             # Device list dashboard
    SimpleBleProvisionScreen.tsx  # BLE scan & connect
    WiFiProvisioningScreen.tsx    # WiFi network selection
    ProvisioningProgressScreen.tsx # BLE provisioning progress
    ProvisioningSuccessScreen.tsx  # Success confirmation
    DeviceDetailsScreen.tsx    # Tab container (Metrics/Controller/Settings)
    MetricsScreen.tsx          # Plant health + sensor data
    ControllerScreen.tsx       # LED grow light control
    SettingsScreen.tsx         # Preferences + WiFi reconfig + danger zone
  services/
    mqttService.ts             # HiveMQ WebSocket connection
    deviceDataService.ts       # MQTT metrics cache + listeners
    bleService.ts              # BLE scan & GATT operations
    wifiService.ts             # WiFi network scanning
    storageService.ts          # AsyncStorage device persistence
    keychainService.ts         # Secure WiFi password storage
    permissionService.ts       # Android permission management
    locationService.ts         # Location services check
    wifiErrors.ts              # Structured WiFi error types
  context/
    BleContext.tsx             # BLE state provider
  hooks/
    useProvisioning.ts         # BLE provisioning state machine
  constants/
    provisioningStates.ts      # Provisioning state enum
  navigation/
    RootNavigator.tsx          # Stack navigator + onboarding gate
```

## Running

```bash
# Start Metro bundler
npx react-native start

# Build and install on Android
npx react-native run-android
```

## Device Flow

1. First launch → StartupScreen requests BT + location permissions
2. Home → tap "Add Device" → BLE scan → connect to ESP32
3. WiFi provisioning → select network → enter password → send via BLE
4. Device saved → appears on Home dashboard
5. Tap device → Metrics / Controller / Settings tabs

## MQTT Topics

All topics use the short device ID (e.g. `26B7B3F8`):

| Topic | Direction | Purpose |
|---|---|---|
| `esp32/{id}/data` | ESP → App | Sensor data (soil, temp, humidity, RSSI, uptime, heap) |
| `esp32/{id}/status` | ESP → App | online/offline |
| `esp32/{id}/led/state` | ESP → App | LED state |
| `esp32/{id}/led/set` | App → ESP | LED command (ON/OFF) |
| `esp32/{id}/config` | App → ESP | WiFi update / factory reset |
