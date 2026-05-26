# MQTT Workflow - How MQTT is Implemented

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

**mqtt** is a popular JavaScript MQTT client library that works with React Native.

### Initialization in App.tsx

```typescript
// Initialize MQTT on app startup
const mqttService = getMQTTService();
await mqttService.initialize();
await mqttService.connect();
```

### Connection Code (mqttService.ts)

```typescript
private async connect(): Promise<void> {
  const client = mqtt.connect(
    'wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt',
    {
      username: 'bluetooth',
      password: 'Ble_12345',
      clientId: `app_${Date.now()}`,
      clean: true,
      reconnectPeriod: 1000, // Retry every 1 second
    }
  );

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    this.isConnected = true;
  });

  client.on('message', (topic, message) => {
    this.handleMessage(topic, message);
  });

  client.on('error', (error) => {
    console.error('[MQTT] Error:', error);
  });

  this.client = client;
}
```

---

## 3. Topic Structure

All topics use the **short device ID** (e.g., `26B7B3F8`, not the full MAC address).

### Subscribe Topics (ESP → App)

```
esp32/{id}/data
  ├─ Direction: ESP32 publishes, App subscribes
  ├─ Frequency: Every 5 seconds
  ├─ Payload: JSON with sensor data
  └─ Example: {"device":"ESP32_26B7B3F8","soil_pct":45,"led":true}

esp32/{id}/status
  ├─ Direction: ESP32 publishes, App subscribes
  ├─ Frequency: On connect/disconnect
  ├─ Payload: String "online" or "offline"
  └─ Example: "online"

esp32/{id}/led/state
  ├─ Direction: ESP32 publishes, App subscribes
  ├─ Frequency: On LED change
  ├─ Payload: String "ON" or "OFF"
  └─ Example: "ON"

esp32/{id}/relay/state
  ├─ Direction: ESP32 publishes, App subscribes
  ├─ Frequency: On relay change
  ├─ Payload: String "ON" or "OFF"
  └─ Example: "ON"
```

### Publish Topics (App → ESP)

```
esp32/{id}/led/set
  ├─ Direction: App publishes, ESP32 subscribes
  ├─ Payload: String "ON" or "OFF"
  ├─ QoS: 1
  └─ Example: "ON"

esp32/{id}/relay/set
  ├─ Direction: App publishes, ESP32 subscribes
  ├─ Payload: String "ON" or "OFF"
  ├─ QoS: 1
  └─ Example: "OFF"

esp32/{id}/config
  ├─ Direction: App publishes, ESP32 subscribes
  ├─ Payload: JSON with command
  ├─ QoS: 1
  └─ Examples:
      {"type":"wifi_update","ssid":"MyWiFi","password":"pass123"}
      {"type":"factory_reset"}
```

---

## 4. Sensor Data Payload

### Example Payload from ESP32

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
  "soil_pct": 45,
  "temperature": 28.5,
  "humidity": 65,
  "led": true,
  "relay": false
}
```

### Field Mapping in DeviceDataService

The app normalizes various field name formats:

```typescript
// Soil moisture (multiple possible names)
soilMoisture = payload.soil_pct || payload.soilMoisture || payload.soil_moisture;

// WiFi signal strength (multiple possible names)
wifiRSSI = payload.rssi || payload.wifiRSSI || payload.wifi_rssi;

// LED status (boolean or string)
ledStatus = payload.led === 'ON' || payload.led === true;

// Relay status (boolean or string)
relayStatus = payload.relay === 'ON' || payload.relay === true;

// Free heap memory (multiple possible names)
freeHeap = payload.free_heap || payload.freeHeap || payload.heap;

// Temperature (multiple possible names)
temperature = payload.temperature || payload.temp;

// Humidity
humidity = payload.humidity;

// Uptime in seconds
uptime = payload.uptime;
```

---

## 5. Implementation Steps

### Step 1: Subscribe to Device Topics

When a device is loaded, the app subscribes to its MQTT topics:

```typescript
// In DeviceDataService
private subscribeToDevice(deviceId: string): void {
  const mqttService = getMQTTService();
  
  // Subscribe to data topic
  mqttService.subscribe(`esp32/${deviceId}/data`, (message) => {
    const payload = JSON.parse(message);
    this.updateMetrics(deviceId, payload);
  });

  // Subscribe to status topic
  mqttService.subscribe(`esp32/${deviceId}/status`, (message) => {
    this.updateStatus(deviceId, message);
  });

  // Subscribe to LED state topic
  mqttService.subscribe(`esp32/${deviceId}/led/state`, (message) => {
    this.updateLEDState(deviceId, message);
  });

  // Subscribe to relay state topic
  mqttService.subscribe(`esp32/${deviceId}/relay/state`, (message) => {
    this.updateRelayState(deviceId, message);
  });
}
```

### Step 2: Handle Incoming Messages

```typescript
// In MqttService
private handleMessage(topic: string, message: Buffer): void {
  const messageStr = message.toString();
  
  // Extract device ID from topic
  const match = topic.match(/esp32\/([^/]+)\//);
  if (!match) return;
  
  const deviceId = match[1];
  
  // Call registered listeners for this device
  const listeners = this.listeners.get(deviceId) || [];
  listeners.forEach(listener => listener(topic, messageStr));
}
```

### Step 3: Send Commands

#### LED Control

```typescript
// In MqttService
public async sendLEDCommand(deviceId: string, state: boolean): Promise<void> {
  const topic = `esp32/${deviceId}/led/set`;
  const payload = state ? 'ON' : 'OFF';
  
  return new Promise((resolve, reject) => {
    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('[MQTT] LED command failed:', error);
        reject(error);
      } else {
        console.log('[MQTT] LED command sent:', payload);
        resolve();
      }
    });
  });
}
```

#### Relay Control

```typescript
// In MqttService
public async sendRelayCommand(deviceId: string, state: boolean): Promise<void> {
  const topic = `esp32/${deviceId}/relay/set`;
  const payload = state ? 'ON' : 'OFF';
  
  return new Promise((resolve, reject) => {
    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('[MQTT] Relay command failed:', error);
        reject(error);
      } else {
        console.log('[MQTT] Relay command sent:', payload);
        resolve();
      }
    });
  });
}
```

#### WiFi Reconfiguration

```typescript
// In MqttService
public async sendWiFiUpdate(
  deviceId: string,
  ssid: string,
  password: string
): Promise<void> {
  const topic = `esp32/${deviceId}/config`;
  const payload = JSON.stringify({
    type: 'wifi_update',
    ssid,
    password,
  });
  
  return new Promise((resolve, reject) => {
    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('[MQTT] WiFi update failed:', error);
        reject(error);
      } else {
        console.log('[MQTT] WiFi update sent');
        resolve();
      }
    });
  });
}
```

### Step 4: Update UI with Received Data

```typescript
// In DeviceDataService
private updateMetrics(deviceId: string, payload: any): void {
  // Normalize field names
  const metrics: DeviceMetrics = {
    soilMoisture: payload.soil_pct || payload.soilMoisture,
    wifiRSSI: payload.rssi || payload.wifiRSSI,
    ledStatus: payload.led === 'ON' || payload.led === true,
    relayStatus: payload.relay === 'ON' || payload.relay === true,
    freeHeap: payload.free_heap || payload.freeHeap,
    temperature: payload.temperature || payload.temp,
    humidity: payload.humidity,
    uptime: payload.uptime,
  };

  // Update cache
  this.metricsCache.set(deviceId, metrics);

  // Notify all listeners for this device
  const listeners = this.listeners.get(deviceId) || [];
  listeners.forEach(listener => listener(metrics));
}
```

---

## 6. Complete LED Control Flow

```
User taps LED bulb in ControllerScreen
  ↓
handleBulbPress()
  ├─ Lock button for 2 seconds
  └─ Call deviceDataService.updateLEDStatus(deviceId, newState)
      ↓
DeviceDataService.updateLEDStatus()
  └─ Call mqttService.sendLEDCommand(deviceId, newState)
      ↓
MqttService.sendLEDCommand()
  ├─ Create topic: esp32/{deviceId}/led/set
  ├─ Create payload: "ON" or "OFF"
  └─ Publish to MQTT broker with QoS 1
      ↓
MQTT Broker
  └─ Routes message to ESP32
      ↓
ESP32 receives message on esp32/{deviceId}/led/set
  ├─ Parse payload
  ├─ Toggle LED on GPIO pin
  ├─ Publish state to esp32/{deviceId}/led/state
  └─ Payload: "ON" or "OFF"
      ↓
MQTT Broker
  └─ Routes message back to App
      ↓
MqttService receives message on esp32/{deviceId}/led/state
  ├─ Parse topic and extract deviceId
  ├─ Call registered listeners
  └─ Pass message to DeviceDataService
      ↓
DeviceDataService listener
  ├─ Update ledStatus in metrics cache
  └─ Notify UI listeners
      ↓
ControllerScreen receives update
  ├─ Update ledStatus state
  ├─ Trigger glow animation if ON
  ├─ Remove glow animation if OFF
  └─ Unlock button
```

---

## 7. Complete Relay Control Flow

```
User taps relay button in ControllerScreen
  ↓
handleRelayPress()
  ├─ Lock button for 2 seconds
  └─ Call deviceDataService.updateRelayStatus(deviceId, newState)
      ↓
DeviceDataService.updateRelayStatus()
  └─ Call mqttService.sendRelayCommand(deviceId, newState)
      ↓
MqttService.sendRelayCommand()
  ├─ Create topic: esp32/{deviceId}/relay/set
  ├─ Create payload: "ON" or "OFF"
  └─ Publish to MQTT broker with QoS 1
      ↓
MQTT Broker
  └─ Routes message to ESP32
      ↓
ESP32 receives message on esp32/{deviceId}/relay/set
  ├─ Parse payload
  ├─ Toggle relay on GPIO23
  ├─ Publish state to esp32/{deviceId}/relay/state
  └─ Payload: "ON" or "OFF"
      ↓
MQTT Broker
  └─ Routes message back to App
      ↓
MqttService receives message on esp32/{deviceId}/relay/state
  ├─ Parse topic and extract deviceId
  ├─ Call registered listeners
  └─ Pass message to DeviceDataService
      ↓
DeviceDataService listener
  ├─ Update relayStatus in metrics cache
  └─ Notify UI listeners
      ↓
ControllerScreen receives update
  ├─ Update relayStatus state
  ├─ Show bulb icon (💡)
  ├─ Show ON/OFF label (inverted)
  └─ Unlock button
```

---

## 8. Real-Time Metrics Flow

```
ESP32 publishes sensor data every 5 seconds
  ↓
ESP32 publishes to esp32/{deviceId}/data
  ├─ Payload: JSON with all sensor values
  └─ Example: {"soil_pct":45,"rssi":-51,"led":true,"relay":false}
      ↓
MQTT Broker
  └─ Routes message to App
      ↓
MqttService receives message on esp32/{deviceId}/data
  ├─ Parse topic and extract deviceId
  ├─ Call registered listeners
  └─ Pass message to DeviceDataService
      ↓
DeviceDataService listener
  ├─ Parse JSON payload
  ├─ Normalize field names
  ├─ Update metrics cache
  └─ Notify UI listeners
      ↓
MetricsScreen / ControllerScreen receives update
  ├─ Update state with new metrics
  ├─ Trigger fade animation
  └─ Re-render with new values
```

---

## 9. Connection Management

### Automatic Reconnection

```typescript
// In MqttService
private setupReconnection(): void {
  this.client.on('disconnect', () => {
    console.log('[MQTT] Disconnected');
    this.isConnected = false;
  });

  this.client.on('offline', () => {
    console.log('[MQTT] Offline, attempting to reconnect...');
    // Automatically reconnects with 1s interval
  });

  this.client.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...');
  });
}
```

### Connection Status

```typescript
// Check if connected
const isConnected = mqttService.isConnected();

// Wait for connection
await mqttService.waitForConnection();
```

---

## 10. Error Handling

### Publish Errors

```typescript
try {
  await mqttService.sendLEDCommand(deviceId, true);
} catch (error) {
  console.error('Failed to send LED command:', error);
  // Show error to user
  Alert.alert('Error', 'Failed to control LED. Please try again.');
}
```

### Subscription Errors

```typescript
// If subscription fails, listener won't be called
// App should handle missing updates gracefully
```

### Connection Errors

```typescript
// If connection fails, app will attempt to reconnect automatically
// UI should show "Connecting..." or "Offline" status
```

---

## 11. QoS Levels

### QoS 1 (At Least Once)
- Used for all commands (LED, relay, WiFi)
- Ensures message is delivered at least once
- May be delivered multiple times
- Broker stores message if client is offline

### Why QoS 1?
- Reliable delivery for critical commands
- Not too expensive (QoS 2 is slower)
- Good balance for mobile devices

---

## 12. Key Implementation Files

### mqttService.ts
- Manages MQTT connection
- Handles pub/sub
- Listener pattern for device-specific callbacks
- Methods: connect(), subscribe(), publish(), sendLEDCommand(), sendRelayCommand()

### deviceDataService.ts
- Subscribes to MQTT via mqttService
- Caches real-time metrics
- Normalizes field names
- Notifies UI listeners on updates
- Methods: subscribe(), getMetrics(), updateLEDStatus(), updateRelayStatus()

### ControllerScreen.tsx
- Displays LED/relay controls
- Sends commands via deviceDataService
- Receives updates via listener
- Shows real-time feedback

---

## 13. Troubleshooting

### MQTT Connection Not Established
- Check internet connection
- Verify broker URL is correct
- Check username/password
- Check firewall allows WebSocket

### Commands Not Reaching ESP32
- Verify device ID is correct
- Check ESP32 is subscribed to correct topics
- Verify MQTT broker is routing messages
- Check QoS setting

### Metrics Not Updating
- Verify ESP32 is publishing to correct topic
- Check device ID in topic matches
- Verify app is subscribed to correct topic
- Check MQTT connection is active

### Delayed Updates
- MQTT has ~100-500ms latency
- Network conditions affect speed
- Multiple devices may cause delays
- Consider reducing publish frequency if needed

---

**Last Updated:** May 2026  
**Version:** 1.0
