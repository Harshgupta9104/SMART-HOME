# MQTT Implementation Guide - SmartHomeApp

## WHAT MQTT LIBRARY ARE WE USING?

### Library Name
**`@taoqf/react-native-mqtt`** (version 3.0.4)

### Why This Library?
- ✅ Works natively in React Native (Android & iOS)
- ✅ Supports TLS/SSL encryption (port 8883)
- ✅ Supports MQTT protocol version 4
- ✅ Handles reconnection automatically
- ✅ Lightweight and performant
- ✅ Active maintenance

### Installation
```bash
npm install @taoqf/react-native-mqtt@3.0.4
```

---

## HOW WE'RE USING IT

### 1. MQTT SERVICE ARCHITECTURE

**File:** `src/services/mqttService.ts`

The MQTT service is a **singleton** that manages the connection to HiveMQ Cloud broker.

#### Connection Configuration

```typescript
// CORRECT CONFIGURATION FOR @taoqf/react-native-mqtt
this.client = connect(
  `mqtt://${config.host}:${config.port}`,  // ← Use mqtt:// NOT mqtts://
  {
    username: config.username,              // ← 'bluetooth'
    password: config.password,              // ← 'Ble_12345'
    clientId: config.clientId,              // ← Unique client ID
    ssl: true,                              // ← ✅ CORRECT: Use ssl: true for TLS
    clean: true,                            // ← Start fresh session
    reconnectPeriod: 3000,                  // ← Retry every 3 seconds
    connectTimeout: 10000,                  // ← Wait 10 seconds for connection
    keepalive: 60,                          // ← Send keepalive every 60 seconds
    protocolVersion: 4,                     // ← MQTT v3.1.1
  }
);
```

#### Connection Details

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **Host** | `b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud` | HiveMQ Cloud broker |
| **Port** | `8883` | MQTT over TLS (NOT 8884 which is WebSocket) |
| **Username** | `bluetooth` | HiveMQ authentication |
| **Password** | `Ble_12345` | HiveMQ authentication |
| **SSL** | `true` | Enable TLS encryption |
| **Protocol** | `mqtt://` | Standard MQTT (SSL handles encryption) |

---

### 2. CONNECTION FLOW

```
App.tsx (startup)
    ↓
getMQTTService().connect(config)
    ↓
connect(`mqtt://broker:8883`, { ssl: true, ... })
    ↓
TLS Handshake (port 8883)
    ↓
MQTT Authentication (username/password)
    ↓
'connect' event → isConnected = true
    ↓
Ready to subscribe/publish
```

---

### 3. SUBSCRIBING TO DEVICE DATA

**File:** `src/services/deviceDataService.ts`

When a device is loaded on HomeScreen:

```typescript
// Subscribe to device metrics
deviceDataService.subscribe(deviceId, (metrics) => {
  // Update UI with real-time data
  setMetrics(metrics);
});
```

This internally:

```typescript
// 1. Check if MQTT is connected
if (!mqttService.isConnectedToMQTT()) {
  console.warn('MQTT not connected yet, retrying...');
  return;
}

// 2. Subscribe to 3 topics for the device
mqttService.subscribe(deviceId, (data) => {
  // Handle incoming data
});

// 3. Topics subscribed to:
// - esp32/{deviceId}/data       ← Sensor data (soil, temp, humidity, etc.)
// - esp32/{deviceId}/status     ← Online/offline status
// - esp32/{deviceId}/led/state  ← LED current state
```

---

### 4. RECEIVING MESSAGES

When ESP32 publishes data:

```
ESP32 publishes to: esp32/F8:B3:B7:26:4D:D2/data
Message: {"soil_pct":45,"rssi":-65,"led":true,"temp":28,"humidity":60}
    ↓
MQTT broker receives
    ↓
App subscribed to this topic
    ↓
'message' event triggered
    ↓
handleMessage(topic, message)
    ↓
Parse device ID from topic: F8:B3:B7:26:4D:D2
    ↓
Parse JSON payload
    ↓
Notify all listeners for this device
    ↓
UI updates with real-time metrics
```

---

### 5. SENDING COMMANDS

#### LED Control

```typescript
// User toggles LED in DeviceDetailsScreen
await deviceDataService.updateLEDStatus(deviceId, true);

// Internally:
mqttService.sendLEDCommand(deviceId, true);

// Publishes to: esp32/{deviceId}/led/set
// Message: "ON" or "OFF"

// ESP32 receives → toggles LED → publishes status back
// App receives status → updates UI
```

#### WiFi Reconfiguration

```typescript
// User changes WiFi network
await deviceDataService.reconfigureWiFi(deviceId, 'NewSSID', 'password123');

// Publishes to: esp32/{deviceId}/config
// Message: {"type":"wifi_update","ssid":"NewSSID","password":"password123"}

// ESP32 receives → connects to new WiFi → publishes status
```

#### Factory Reset

```typescript
// User factory resets device
await deviceDataService.factoryReset(deviceId);

// Publishes to: esp32/{deviceId}/config
// Message: {"type":"factory_reset"}

// ESP32 receives → resets → reboots
```

---

### 6. EVENT HANDLERS

The MQTT client listens to these events:

```typescript
// Connection successful
client.on('connect', () => {
  isConnected = true;
  console.log('✅ Connected to HiveMQ');
});

// New message received
client.on('message', (topic, message) => {
  // Parse and notify listeners
});

// Connection error
client.on('error', (error) => {
  console.error('❌ Connection error:', error);
  isConnected = false;
});

// Disconnected
client.on('disconnect', () => {
  console.log('Disconnected');
  isConnected = false;
});

// Auto-reconnecting
client.on('reconnect', () => {
  console.log('🔄 Reconnecting...');
});

// Client went offline
client.on('offline', () => {
  console.log('⚠️ Client offline');
  isConnected = false;
});
```

---

### 7. INTEGRATION WITH UI

#### HomeScreen
```typescript
// On screen focus
useFocusEffect(() => {
  loadProvisionedDevices();
  
  // Subscribe to each device
  devices.forEach(device => {
    deviceDataService.subscribe(device.id, (metrics) => {
      // Metrics cached, UI updates automatically
    });
  });
});
```

#### DeviceDetailsScreen
```typescript
// Show real-time metrics
useEffect(() => {
  // Check MQTT status
  setMqttConnected(mqttService.isConnectedToMQTT());
  
  // Subscribe to device metrics
  deviceDataService.subscribe(device.id, (metrics) => {
    setMetrics(metrics);
    setLedStatus(metrics.ledStatus);
  });
}, [device]);

// Display metrics
<Text>Soil Moisture: {metrics?.soilMoisture}%</Text>
<Text>WiFi RSSI: {metrics?.wifiRSSI} dBm</Text>
<Text>Temperature: {metrics?.temperature}°C</Text>
```

---

## MQTT TOPIC STRUCTURE

### Topics Published by ESP32 (App Receives)

| Topic | Message Format | Example |
|-------|---|---|
| `esp32/{deviceId}/data` | JSON with sensor data | `{"soil_pct":45,"rssi":-65,"led":true,"temp":28,"humidity":60,"uptime":3600,"free_heap":102400}` |
| `esp32/{deviceId}/status` | Online/offline status | `"online"` or `"offline"` |
| `esp32/{deviceId}/led/state` | LED state | `"ON"` or `"OFF"` |

### Topics Subscribed by App (App Sends)

| Topic | Message Format | Example |
|-------|---|---|
| `esp32/{deviceId}/led/set` | LED command | `"ON"` or `"OFF"` |
| `esp32/{deviceId}/config` | JSON config command | `{"type":"wifi_update","ssid":"MyWiFi","password":"pass123"}` |

---

## DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    HiveMQ Cloud Broker                       │
│              (b01052fb9a1942c19262e349a38863d1...)          │
│                    Port 8883 (TLS)                           │
└─────────────────────────────────────────────────────────────┘
                    ↑                    ↑
                    │                    │
        MQTT Subscribe/Publish    MQTT Subscribe/Publish
                    │                    │
        ┌───────────┴────────┐  ┌────────┴──────────┐
        │                    │  │                   │
    ┌───────────────┐   ┌──────────────┐   ┌──────────────┐
    │   ESP32 #1    │   │   ESP32 #2   │   │  React App   │
    │               │   │              │   │              │
    │ Publishes:    │   │ Publishes:   │   │ Subscribes:  │
    │ - /data       │   │ - /data      │   │ - /data      │
    │ - /status     │   │ - /status    │   │ - /status    │
    │ - /led/state  │   │ - /led/state │   │ - /led/state │
    │               │   │              │   │              │
    │ Subscribes:   │   │ Subscribes:  │   │ Publishes:   │
    │ - /led/set    │   │ - /led/set   │   │ - /led/set   │
    │ - /config     │   │ - /config    │   │ - /config    │
    └───────────────┘   └──────────────┘   └──────────────┘
```

---

## CURRENT ISSUE & FIX

### Problem
```
[MQTT] ⚠️ Client went offline
[MQTT] Connection timeout after 20 seconds
```

### Root Cause
The library `@taoqf/react-native-mqtt` requires:
- ✅ `ssl: true` (NOT `protocol: 'mqtts'`)
- ✅ `mqtt://` URL scheme (NOT `mqtts://`)
- ✅ Port `8883` (NOT `8884`)

### Solution Applied
```typescript
// ❌ WRONG
this.client = connect(`mqtts://${host}:${port}`, {
  protocol: 'mqtts',
  rejectUnauthorized: false,
});

// ✅ CORRECT
this.client = connect(`mqtt://${host}:${port}`, {
  ssl: true,  // ← This enables TLS
});
```

---

## EXPECTED BEHAVIOR AFTER FIX

### Logs Should Show
```
[MQTT] Starting connection to: b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud
[MQTT] ✅ Connected to HiveMQ successfully
[MQTT] 📡 Subscribing to topics for device: F8:B3:B7:26:4D:D2
[MQTT] ✅ Subscribed to: esp32/F8:B3:B7:26:4D:D2/data
[MQTT] ✅ Subscribed to: esp32/F8:B3:B7:26:4D:D2/status
[MQTT] ✅ Subscribed to: esp32/F8:B3:B7:26:4D:D2/led/state
[MQTT] 📨 Received message on esp32/F8:B3:B7:26:4D:D2/data: {"soil_pct":45,...}
[DeviceData] 📊 Updated from MQTT: F8:B3:B7:26:4D:D2
```

### UI Should Show
- ✅ MQTT status box: GREEN (Connected)
- ✅ Real-time metrics: Soil Moisture, WiFi RSSI, Temperature, Humidity, etc.
- ✅ LED control: Toggle works
- ✅ Device status: Online/Offline updates in real-time

---

## SUMMARY

| Aspect | Details |
|--------|---------|
| **Library** | `@taoqf/react-native-mqtt` v3.0.4 |
| **Broker** | HiveMQ Cloud |
| **Port** | 8883 (MQTT over TLS) |
| **Authentication** | Username: `bluetooth`, Password: `Ble_12345` |
| **TLS Config** | `ssl: true` (NOT `protocol: 'mqtts'`) |
| **URL Scheme** | `mqtt://` (NOT `mqtts://`) |
| **Topics** | `esp32/{deviceId}/data`, `/status`, `/led/state`, `/led/set`, `/config` |
| **Data Format** | JSON for sensor data, plain text for commands |
| **Real-time** | Yes, updates every 5 seconds from ESP32 |
| **Reconnection** | Automatic every 3 seconds if disconnected |

