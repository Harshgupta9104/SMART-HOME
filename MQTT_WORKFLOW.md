# MQTT Workflow - Real-Time Communication

## Overview
MQTT is used for real-time communication between the app and ESP32 devices. The app publishes commands and subscribes to device data, status, and state updates.

---

## 1. MQTT Broker Configuration

### HiveMQ Cloud Setup
```
Broker URL: wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt
Protocol: WebSocket with TLS (secure)
Username: bluetooth
Password: Ble_12345
QoS: 1 (At least once delivery)
```

### Why WebSocket?
- Works on mobile devices
- Firewall-friendly
- TLS encryption for security
- Persistent connection

---

## 2. MQTT Library & Setup

### Library Used
```typescript
import mqtt from 'mqtt';
```

### Initialization in App.tsx
```typescript
const mqttService = getMQTTService();
await mqttService.initialize();
await mqttService.connect();
```

---

## 3. Topic Structure

All topics use the **short device ID** (e.g., `26B7B3F8`).

### Subscribe Topics (ESP32 → App)
```
esp32/{id}/data          - Sensor data (every 5 seconds)
esp32/{id}/status        - Online/offline status
esp32/{id}/led/state     - LED state (ON/OFF)
esp32/{id}/relay/state   - Relay state (ON/OFF)
```

### Publish Topics (App → ESP32)
```
esp32/{id}/led/set       - LED command (ON/OFF)
esp32/{id}/relay/set     - Relay command (ON/OFF)
esp32/{id}/config        - WiFi/config commands
```

---

## 4. Sensor Data Payload

### Example from ESP32
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

### Field Mapping
The app normalizes various field name formats:
- `soil_pct` / `soilMoisture` / `soil_moisture`
- `rssi` / `wifiRSSI` / `wifi_rssi`
- `led` (boolean or "ON"/"OFF")
- `relay` (boolean or "ON"/"OFF")
- `free_heap` / `freeHeap` / `heap`
- `temperature` / `temp`
- `humidity`
- `uptime`

---

## 5. LED Control Flow

```
User taps LED bulb
  ↓
App sends: esp32/{id}/led/set = "ON" or "OFF"
  ↓
ESP32 toggles LED on GPIO pin
  ↓
ESP32 publishes: esp32/{id}/led/state = "ON" or "OFF"
  ↓
App receives state update
  ↓
UI updates with glow animation
```

---

## 6. Relay Control Flow

```
User taps relay button
  ↓
App sends: esp32/{id}/relay/set = "ON" or "OFF"
  ↓
ESP32 toggles relay on GPIO23
  ↓
ESP32 publishes: esp32/{id}/relay/state = "ON" or "OFF"
  ↓
App receives state update
  ↓
UI updates with button state
```

---

## 7. Real-Time Metrics Flow

```
ESP32 publishes sensor data every 5 seconds
  ↓
App receives: esp32/{id}/data = JSON payload
  ↓
App parses and normalizes field names
  ↓
UI updates with new metrics
```

---

## 8. Connection Management

### Automatic Reconnection
- Reconnects every 1 second if disconnected
- Maintains persistent connection
- Handles network interruptions gracefully

### Connection Status
```typescript
const isConnected = mqttService.isConnectedToMQTT();
```

---

## 9. QoS Levels

### QoS 1 (At Least Once)
- Used for all commands (LED, relay, WiFi)
- Ensures reliable delivery
- Good balance for mobile devices

---

## 10. Key Implementation Files

### mqttService.ts
- Manages MQTT connection
- Handles pub/sub
- Methods: connect(), subscribe(), sendLEDCommand(), sendRelayCommand()

### deviceDataService.ts
- Subscribes to MQTT via mqttService
- Caches real-time metrics
- Normalizes field names
- Methods: subscribe(), updateLEDStatus(), updateRelayStatus()

### ControllerScreen.tsx
- Displays LED/relay controls
- Sends commands via deviceDataService
- Receives updates via listener

---

## 11. Troubleshooting

### MQTT Connection Not Established
- Check internet connection
- Verify broker URL is correct
- Check username/password

### Commands Not Reaching ESP32
- Verify device ID is correct
- Check ESP32 is subscribed to correct topics

### Metrics Not Updating
- Verify ESP32 is publishing to correct topic
- Check MQTT connection is active

---

**Last Updated:** May 2026  
**Version:** 1.0
