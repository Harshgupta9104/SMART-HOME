# MQTT Flow

## Broker

HiveMQ Cloud (TLS WebSocket)
- URL: `wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt`
- Initialized in `App.tsx` on startup via `getMQTTService()`

## Topic Structure

All topics use the **short device ID** (e.g. `26B7B3F8`, not the full MAC).

| Topic | Direction | Payload | Purpose |
|---|---|---|---|
| `esp32/{id}/data` | ESP → App | JSON | Sensor data every 5s |
| `esp32/{id}/status` | ESP → App | string | `online` / `offline` |
| `esp32/{id}/led/state` | ESP → App | string | `ON` / `OFF` |
| `esp32/{id}/led/set` | App → ESP | string | `ON` / `OFF` |
| `esp32/{id}/config` | App → ESP | JSON | WiFi update / factory reset |

## Sensor Data Payload

```json
{
  "device": "ESP32_26B7B3F8",
  "fw": "3.0.0",
  "uptime": 5615,
  "rssi": -51,
  "heap": 112680,
  "min_heap": 99368,
  "ntp": "ok",
  "soil_raw": 4095,
  "soil_pct": 0,
  "led": true
}
```

Field mapping in `deviceDataService.ts`:
- `soil_pct` / `soilMoisture` / `soil_moisture` → `soilMoisture`
- `rssi` / `wifiRSSI` / `wifi_rssi` → `wifiRSSI`
- `led === 'ON'` or `led === true` → `ledStatus`
- `free_heap` / `freeHeap` → `freeHeap`
- `temperature` / `temp` → `temperature`

## LED Command

```
Topic:   esp32/{id}/led/set
Payload: ON  or  OFF
QoS:     1
```

## WiFi Update Command

```
Topic:   esp32/{id}/config
Payload: { "type": "wifi_update", "ssid": "...", "password": "..." }
QoS:     1
```

ESP32 behavior:
1. Receives command
2. Disconnects from current WiFi
3. Tries new credentials (3 attempts)
4. If success → saves to NVS → restarts
5. If fail → rolls back to previous WiFi → restarts

## Factory Reset Command

```
Topic:   esp32/{id}/config
Payload: { "type": "factory_reset" }
QoS:     1
```

## Service Architecture

```
App.tsx
  └── getMQTTService().initialize() + connect()

DeviceDetailsScreen / HomeScreen
  └── getDeviceDataService().subscribe(deviceId, listener)
        └── getMQTTService().subscribe(deviceId, callback)
              └── subscribes to: data, status, led/state topics
              └── notifies DeviceDataService on message
        └── DeviceDataService caches metrics + notifies UI listeners

ControllerScreen
  └── getDeviceDataService().updateLEDStatus(id, bool)
        └── getMQTTService().sendLEDCommand(id, state)

SettingsScreen
  └── getDeviceDataService().reconfigureWiFi(id, ssid, password)
        └── getMQTTService().sendWiFiUpdate(id, ssid, password)
```
