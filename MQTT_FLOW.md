# MQTT Flow - Complete Implementation

## Overview
This document describes the MQTT connection, subscription, and messaging flow.

---

## MQTT Connection Flow (11 States)

### State 1: App Startup
```
[App] 🚀 Initializing MQTT...
```
- App.tsx calls `getMQTTService()`
- Creates singleton MQTT service instance

### State 2: Client Initialization
```
[MQTT] 🔧 Initializing MQTT client...
[MQTT] ✅ Client initialized successfully
```
- `mqttService.initialize()` is called
- Creates native MQTT client with `createMqttClient()`
- Registers event handlers:
  - `setOnConnectCallback()` → Connection successful
  - `setOnMessageCallback()` → Incoming MQTT message
  - `setOnErrorCallback()` → Connection error
  - `setOnDisconnectCallback()` → Connection lost

### State 3: Connection Attempt
```
[MQTT] 🔌 Starting connection to HiveMQ...
[MQTT] URL: wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt
[MQTT] Username: bluetooth
```
- `mqttService.connect(config)` is called
- Calls `mqtt.connect()` with:
  - `url`: WebSocket URL with wss:// protocol
  - `port`: 8884 (WebSocket Secure port)
  - `username`: "bluetooth"
  - `password`: "Ble_12345"
  - `clean: true` (Start fresh session)
  - `reconnectPeriod: 1000` (Auto reconnect every 1 second)
  - `connectTimeout: 30000` (30 second timeout)

### State 4: WebSocket Connection
```
(No console output - happens internally)
```
- JavaScript MQTT library establishes WebSocket connection to HiveMQ
- Uses wss:// (WebSocket Secure) protocol
- Verifies SSL certificate
- Establishes encrypted WebSocket connection on port 8884

### State 5: Authentication
```
(No console output - happens internally)
```
- Sends MQTT CONNECT packet with credentials
- HiveMQ validates username/password
- If invalid: Error 134 (Invalid credentials)
- If unauthorized: Error 135 (Not authorized for topics)

### State 6: Connection Success
```
[MQTT] ✅ Connected to HiveMQ successfully!
[MQTT] URL: wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt
```
- MQTT CONNACK received from broker
- WebSocket connection established
- `isConnected` flag set to `true`
- Ready to subscribe/publish

### State 7: Device Subscription
```
[DeviceData] ✅ Subscribed to MQTT for device: 26B7B3F8
[MQTT] 📡 Subscribing to topics for device: 26B7B3F8
[MQTT] 📡 Topics: {
  dataTopic: "esp32/26B7B3F8/data",
  statusTopic: "esp32/26B7B3F8/status",
  ledStateTopic: "esp32/26B7B3F8/led/state"
}
```
- App subscribes to device topics
- Uses SHORT device ID (26B7B3F8) NOT full MAC address
- Subscribes to 3 topics per device:
  1. `esp32/{deviceId}/data`
  2. `esp32/{deviceId}/status`
  3. `esp32/{deviceId}/led/state`

### State 8: Subscription Confirmation
```
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/data
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/status
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/led/state
```
- HiveMQ confirms each subscription
- App is now listening for messages on these topics

### State 9: Incoming Messages
```
[MQTT] 📨 Received message on esp32/26B7B3F8/data: {"soil_pct":45,"rssi":-65,"temp":28.5}
[MQTT] 📊 Parsed sensor data: {soil_pct: 45, rssi: -65, temp: 28.5, humidity: 60, uptime: 3600, free_heap: 50000}
[MQTT] 📢 Notifying 1 listener(s) for device: 26B7B3F8
```
- ESP32 publishes sensor data to `esp32/26B7B3F8/data`
- App receives message
- Parses JSON payload
- Notifies all listeners (screens, services)

### State 10: Publishing Commands
```
[MQTT] 💡 Publishing LED command to: esp32/26B7B3F8/led/set Message: ON
[MQTT] ✅ Published to esp32/26B7B3F8/led/set: ON
```
- App publishes command to `esp32/{deviceId}/led/set`
- ESP32 receives and executes command
- Publishes response to `esp32/{deviceId}/led/state`

### State 11: Disconnection
```
[MQTT] 🔌 Disconnecting from broker...
[MQTT] ✅ Disconnected
```
- App calls `disconnect()`
- Closes TLS connection
- Clears listeners and subscriptions

---

## MQTT Topics Structure

### Topic Format
```
esp32/{deviceId}/{topic_type}
```

### Device ID Format
| Format | Example | Usage |
|--------|---------|-------|
| BLE MAC Address | F8:B3:B7:26:4D:D2 | Connection address |
| Full Device ID | ESP32_26B7B3F8 | From BLE characteristic |
| MQTT Device ID | 26B7B3F8 | MQTT topics (USE THIS) |

### All Topics

#### 1. Data Topic (ESP32 → App)
```
Topic: esp32/26B7B3F8/data
Direction: ESP32 publishes, App subscribes
Payload: {"soil_pct":45,"rssi":-65,"temp":28.5,"humidity":60,"uptime":3600,"free_heap":50000}
Frequency: Every 5-10 seconds
```

#### 2. Status Topic (ESP32 → App)
```
Topic: esp32/26B7B3F8/status
Direction: ESP32 publishes, App subscribes
Payload: "online" or "offline" or "connecting"
Frequency: On status change
```

#### 3. LED State Topic (ESP32 → App)
```
Topic: esp32/26B7B3F8/led/state
Direction: ESP32 publishes, App subscribes
Payload: "ON" or "OFF"
Frequency: On LED state change
```

#### 4. LED Control Topic (App → ESP32)
```
Topic: esp32/26B7B3F8/led/set
Direction: App publishes, ESP32 subscribes
Payload: "ON" or "OFF"
Frequency: On user action
```

#### 5. Config Topic (App → ESP32)
```
Topic: esp32/26B7B3F8/config
Direction: App publishes, ESP32 subscribes
Payload: {"type":"wifi_update","ssid":"MyWiFi","password":"pass123"}
         or {"type":"factory_reset"}
Frequency: On user action
```

---

## MQTT Service Architecture

### Singleton Pattern
```typescript
// Only one MQTT instance per app
const mqttService = getMQTTService();
```

### Two-Step Initialization
```typescript
// Step 1: Initialize (setup callbacks)
await mqttService.initialize();

// Step 2: Connect (open connection)
await mqttService.connect(config);
```

### Event Handlers
```typescript
client.setOnConnectCallback(() => {
  // Connection successful
  isConnected = true;
  reconnectAttempts = 0;
});

client.setOnMessageCallback((topic, payload) => {
  // Incoming message
  handleMessage(topic, payload);
});

client.setOnErrorCallback((error) => {
  // Connection error
  isConnected = false;
  // Diagnose error code
});

client.setOnDisconnectCallback(() => {
  // Connection lost
  isConnected = false;
});
```

### Public Methods
```typescript
// Check connection status
mqttService.isConnectedToMQTT(): boolean

// Subscribe to device data
mqttService.subscribe(deviceId, callback): () => void

// Send LED command
mqttService.sendLEDCommand(deviceId, state): Promise<boolean>

// Send WiFi update
mqttService.sendWiFiUpdate(deviceId, ssid, password): Promise<boolean>

// Send factory reset
mqttService.sendFactoryReset(deviceId): Promise<boolean>

// Disconnect
mqttService.disconnect(): void
```

---

## Device Data Service

### Purpose
Sits on top of MQTT service and provides higher-level API for screens

### Subscription Flow
```typescript
// Screen subscribes to device metrics
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  // Update UI with metrics
});

// deviceDataService internally:
// 1. Checks if MQTT connected
// 2. Subscribes to MQTT topics
// 3. Caches metrics
// 4. Notifies all listeners
```

### Metrics Structure
```typescript
{
  deviceId: "26B7B3F8",
  soilMoisture: 45,           // 0-100 %
  wifiRSSI: -65,              // dBm
  ledStatus: true,            // ON/OFF
  uptime: 3600,               // seconds
  freeHeap: 50000,            // bytes
  temperature: 28.5,          // °C
  humidity: 60,               // %
  lastUpdate: 1715769000000   // timestamp
}
```

### Commands
```typescript
// Update LED
await deviceDataService.updateLEDStatus(deviceId, true);

// Reconfigure WiFi
await deviceDataService.reconfigureWiFi(deviceId, ssid, password);

// Factory reset
await deviceDataService.factoryReset(deviceId);
```

---

## HiveMQ Credentials

```
URL: wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt
Port: 8884 (WebSocket Secure)
Username: bluetooth
Password: Ble_12345
```

---

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 134 | Invalid username/password | Verify HiveMQ credentials |
| 135 | User not authorized | Check HiveMQ user permissions |
| Timeout | Connection failed | Check network/firewall |

---

## Complete Console Output Example

### Successful Connection & Provisioning
```
[App] 🚀 Initializing MQTT...
[MQTT] 🔧 Initializing MQTT client...
[MQTT] ✅ Client initialized successfully
[App] ✅ MQTT client initialized
[App] 🔌 Connecting to HiveMQ...
[MQTT] 🔌 Starting connection to HiveMQ...
[MQTT] Host: b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud
[MQTT] Port: 8883
[MQTT] Username: bluetooth
[MQTT] ✅ Connected to HiveMQ successfully!
[App] ✅ MQTT connected successfully to HiveMQ

[WiFiProvisioning] Device: Living Room Plant ID: F8:B3:B7:26:4D:D2
[BLE] Reading device ID from ESP32...
[BLE] ✅ Device ID read: 26B7B3F8
[BLE] 📊 Device ID mapping:
[BLE]   BLE MAC: F8:B3:B7:26:4D:D2
[BLE]   Full ID: ESP32_26B7B3F8
[BLE]   MQTT ID: 26B7B3F8
[Provisioning] 📱 Captured MQTT Device ID: 26B7B3F8
[Provisioning] Device stored locally with MQTT ID: 26B7B3F8
[Provisioning] ✅ WiFi saved - provisioning complete!

[HomeScreen] Loaded provisioned devices: 1
[MQTT] 📡 Subscribing to topics for device: 26B7B3F8
[MQTT] 📡 Topics: {
  dataTopic: "esp32/26B7B3F8/data",
  statusTopic: "esp32/26B7B3F8/status",
  ledStateTopic: "esp32/26B7B3F8/led/state"
}
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/data
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/status
[MQTT] ✅ Subscribed to: esp32/26B7B3F8/led/state

[MQTT] 📨 Received message on esp32/26B7B3F8/data: {"soil_pct":45,"rssi":-65,"temp":28.5,"humidity":60,"uptime":3600,"free_heap":50000}
[MQTT] 📊 Parsed sensor data: {soil_pct: 45, rssi: -65, temp: 28.5, humidity: 60, uptime: 3600, free_heap: 50000}
[MQTT] 📢 Notifying 1 listener(s) for device: 26B7B3F8
[DeviceData] 📊 Updated from MQTT: 26B7B3F8

[DeviceDetails] Device metrics updated: 26B7B3F8
```

---

## Testing Checklist

### Connection Test
- [ ] App starts and connects to HiveMQ within 2-3 seconds
- [ ] Console shows: `[MQTT] ✅ Connected to HiveMQ successfully!`
- [ ] No error codes (134, 135) in console

### Provisioning Test
- [ ] Device ID read from ESP32
- [ ] Console shows: `[BLE] ✅ Device ID read: 26B7B3F8`
- [ ] Device saved with MQTT ID
- [ ] Console shows: `[Provisioning] Device stored locally with MQTT ID: 26B7B3F8`

### Subscription Test
- [ ] Device appears in HomeScreen
- [ ] Console shows: `[MQTT] ✅ Subscribed to: esp32/26B7B3F8/data`
- [ ] Metrics display in DeviceDetailsScreen

### Data Reception Test
- [ ] ESP32 publishes sensor data
- [ ] Console shows: `[MQTT] 📨 Received message on esp32/26B7B3F8/data`
- [ ] Metrics update in real-time

### LED Control Test
- [ ] Toggle LED in DeviceDetailsScreen
- [ ] Console shows: `[MQTT] 💡 Publishing LED command to: esp32/26B7B3F8/led/set`
- [ ] LED state updates on ESP32

### WiFi Reconfiguration Test
- [ ] Long-press device in HomeScreen
- [ ] Select "Reconfigure WiFi"
- [ ] Enter new WiFi credentials
- [ ] Console shows: `[MQTT] 📶 Publishing WiFi update to: esp32/26B7B3F8/config`

### Factory Reset Test
- [ ] Long-press device in HomeScreen
- [ ] Select "Factory Reset"
- [ ] Confirm action
- [ ] Console shows: `[MQTT] 🔄 Publishing factory reset to: esp32/26B7B3F8/config`

---

## Summary

**MQTT Implementation Status:** ✅ Complete

**Key Points:**
1. Uses `mqtt` v5.15.1 (JavaScript library)
2. Connects to HiveMQ Cloud on port 8884 with WebSocket
3. Uses wss:// (WebSocket Secure) protocol
4. Two-step initialization (initialize + connect)
5. Device ID captured during provisioning
5. Topics use short device ID format (26B7B3F8)
6. Real-time metrics via MQTT
7. LED control via MQTT
8. WiFi reconfiguration via MQTT
9. Factory reset via MQTT
10. Proper error handling and diagnostics
