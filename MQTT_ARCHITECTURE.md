# MQTT Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SmartHomeApp (React Native)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      App.tsx                             │   │
│  │  - Initializes MQTT on startup                          │   │
│  │  - Connects to HiveMQ broker                            │   │
│  │  - Cleans up on unmount                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              mqttService.ts (Singleton)                 │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Connection Management                              │ │   │
│  │  │ - connect(config) → Promise<boolean>              │ │   │
│  │  │ - disconnect()                                     │ │   │
│  │  │ - isConnectedToMQTT() → boolean                   │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Topic Management                                   │ │   │
│  │  │ - subscribe(deviceId, callback) → unsubscribe()  │ │   │
│  │  │ - handleMessage(topic, message)                   │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Command Publishing                                 │ │   │
│  │  │ - sendLEDCommand(deviceId, state)                 │ │   │
│  │  │ - sendWiFiUpdate(deviceId, ssid, password)        │ │   │
│  │  │ - sendFactoryReset(deviceId)                      │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         deviceDataService.ts (Singleton)               │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Subscription Management                            │ │   │
│  │  │ - subscribe(deviceId, listener) → unsubscribe()  │ │   │
│  │  │ - subscribeMQTT(deviceId)                          │ │   │
│  │  │ - unsubscribeMQTT(deviceId)                        │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Data Processing                                    │ │   │
│  │  │ - handleMQTTData(deviceId, data)                   │ │   │
│  │  │ - notifyListeners(deviceId, metrics)              │ │   │
│  │  │ - getMetrics(deviceId) → DeviceMetrics            │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Device Control                                     │ │   │
│  │  │ - updateLEDStatus(deviceId, status)               │ │   │
│  │  │ - reconfigureWiFi(deviceId, ssid, password)       │ │   │
│  │  │ - factoryReset(deviceId)                          │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Caching                                            │ │   │
│  │  │ - metricsCache: Map<deviceId, DeviceMetrics>      │ │   │
│  │  │ - listeners: Map<deviceId, Set<Listener>>         │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    UI Components                        │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ HomeScreen                                         │ │   │
│  │  │ - Subscribes to device metrics                    │ │   │
│  │  │ - Displays real-time data                         │ │   │
│  │  │ - Shows device status                             │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ DeviceDetailsScreen                                │ │   │
│  │  │ - Subscribes to device metrics                    │ │   │
│  │  │ - Controls LED via MQTT                           │ │   │
│  │  │ - Sends commands to device                        │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    HiveMQ Cloud Broker                           │
│  Host: b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud    │
│  Port: 8883 (TLS)                                               │
│  Username: bluetooth                                             │
│  Password: Ble_12345                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ESP32 Devices                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Device 1: F8:B3:B7:26:4D:D2                              │ │
│  │ - Publishes to: esp32/F8:B3:B7:26:4D:D2/data            │ │
│  │ - Subscribes to: esp32/F8:B3:B7:26:4D:D2/led/set        │ │
│  │ - Subscribes to: esp32/F8:B3:B7:26:4D:D2/config         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Device 2: XX:XX:XX:XX:XX:XX                              │ │
│  │ - Publishes to: esp32/XX:XX:XX:XX:XX:XX/data            │ │
│  │ - Subscribes to: esp32/XX:XX:XX:XX:XX:XX/led/set        │ │
│  │ - Subscribes to: esp32/XX:XX:XX:XX:XX:XX/config         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Receiving Sensor Data

```
ESP32 Device
    │
    │ Publishes every 5 seconds
    │ Topic: esp32/{deviceId}/data
    │ Payload: {"soil_pct": 45, "rssi": -53, "led": false, ...}
    ↓
HiveMQ Broker
    │
    │ Routes message to subscribers
    ↓
mqttService.handleMessage()
    │
    │ 1. Parse topic: esp32/{deviceId}/data
    │ 2. Extract deviceId
    │ 3. Parse JSON payload
    ↓
deviceDataService.handleMQTTData()
    │
    │ 1. Map fields to DeviceMetrics
    │ 2. Update metricsCache
    │ 3. Notify all listeners
    ↓
HomeScreen / DeviceDetailsScreen
    │
    │ 1. Receive metrics update
    │ 2. Update state
    │ 3. Re-render UI
    ↓
User sees real-time data
```

---

## Data Flow: Sending LED Command

```
User toggles LED in DeviceDetailsScreen
    │
    │ handleLEDToggle(true)
    ↓
deviceDataService.updateLEDStatus(deviceId, true)
    │
    │ 1. Check MQTT connection
    │ 2. Call mqttService.sendLEDCommand()
    ↓
mqttService.sendLEDCommand(deviceId, true)
    │
    │ 1. Create topic: esp32/{deviceId}/led/set
    │ 2. Create message: "ON"
    │ 3. Publish with QoS 1
    ↓
HiveMQ Broker
    │
    │ Routes message to ESP32
    ↓
ESP32 Device
    │
    │ 1. Receives message on esp32/{deviceId}/led/set
    │ 2. Parses "ON"
    │ 3. Toggles LED
    │ 4. Publishes new state
    ↓
HiveMQ Broker
    │
    │ Routes status update
    ↓
App receives update
    │
    │ Updates UI with new LED state
    ↓
User sees LED toggled
```

---

## Topic Structure

```
esp32/{deviceId}/
├── data
│   ├── Direction: ESP32 → App
│   ├── Frequency: Every 5 seconds
│   ├── Format: JSON
│   └── Example: {"soil_pct": 45, "rssi": -53, "led": false, ...}
│
├── status
│   ├── Direction: ESP32 → App
│   ├── Frequency: On change
│   ├── Format: String
│   └── Example: "online" or "offline"
│
├── led/
│   ├── state
│   │   ├── Direction: ESP32 → App
│   │   ├── Frequency: On change
│   │   ├── Format: String
│   │   └── Example: "ON" or "OFF"
│   │
│   └── set
│       ├── Direction: App → ESP32
│       ├── Frequency: On user action
│       ├── Format: String
│       └── Example: "ON" or "OFF"
│
└── config
    ├── Direction: App → ESP32
    ├── Frequency: On user action
    ├── Format: JSON
    └── Examples:
        ├── WiFi update: {"type": "wifi_update", "ssid": "...", "password": "..."}
        └── Factory reset: {"type": "factory_reset"}
```

---

## Connection Lifecycle

```
App Starts
    │
    ├─→ App.tsx useEffect()
    │   └─→ initializeMQTT()
    │       └─→ mqttService.connect(config)
    │           │
    │           ├─→ Create MQTT client
    │           ├─→ Connect to broker
    │           ├─→ Wait for 'connect' event
    │           └─→ Return true/false
    │
    ├─→ HomeScreen mounts
    │   └─→ deviceDataService.subscribe(deviceId, listener)
    │       └─→ subscribeMQTT(deviceId)
    │           └─→ mqttService.subscribe(deviceId, callback)
    │               └─→ Subscribe to 3 topics
    │
    ├─→ Receive MQTT messages
    │   └─→ mqttService.handleMessage()
    │       └─→ deviceDataService.handleMQTTData()
    │           └─→ Notify listeners
    │               └─→ HomeScreen updates UI
    │
    ├─→ User toggles LED
    │   └─→ deviceDataService.updateLEDStatus()
    │       └─→ mqttService.sendLEDCommand()
    │           └─→ Publish to esp32/{deviceId}/led/set
    │
    ├─→ HomeScreen unmounts
    │   └─→ Unsubscribe from device
    │       └─→ mqttService.unsubscribe()
    │           └─→ Unsubscribe from topics
    │
    └─→ App closes
        └─→ App.tsx cleanup
            └─→ mqttService.disconnect()
                └─→ Close MQTT connection
```

---

## Error Handling Flow

```
Connection Error
    │
    ├─→ mqttService.on('error')
    │   └─→ Set isConnected = false
    │       └─→ Log error
    │
    ├─→ deviceDataService.subscribeMQTT()
    │   └─→ Check isConnectedToMQTT()
    │       └─→ If false, retry after 1 second
    │
    └─→ User tries to send command
        └─→ deviceDataService.updateLEDStatus()
            └─→ Check isConnectedToMQTT()
                └─→ If false, return false
                    └─→ Show error to user

Reconnection
    │
    ├─→ mqttService.on('reconnect')
    │   └─→ Increment reconnectAttempts
    │       └─→ Log reconnection attempt
    │
    ├─→ mqttService.on('connect')
    │   └─→ Set isConnected = true
    │       └─→ Reset reconnectAttempts
    │
    └─→ deviceDataService retries subscription
        └─→ Successfully subscribes to topics
            └─→ Resumes receiving data
```

---

## Listener Pattern

```
Multiple Screens Listening to Same Device
    │
    ├─→ HomeScreen subscribes to Device A
    │   └─→ deviceDataService.subscribe(deviceA, homeScreenListener)
    │       └─→ Creates listener set for Device A
    │           └─→ Subscribes to MQTT topics
    │
    ├─→ DeviceDetailsScreen subscribes to Device A
    │   └─→ deviceDataService.subscribe(deviceA, detailsScreenListener)
    │       └─→ Adds listener to existing set
    │           └─→ Reuses MQTT subscription
    │
    ├─→ MQTT message arrives
    │   └─→ mqttService.handleMessage()
    │       └─→ deviceDataService.handleMQTTData()
    │           └─→ Notify all listeners for Device A
    │               ├─→ homeScreenListener(metrics)
    │               │   └─→ HomeScreen updates
    │               │
    │               └─→ detailsScreenListener(metrics)
    │                   └─→ DeviceDetailsScreen updates
    │
    └─→ HomeScreen unmounts
        └─→ Unsubscribe homeScreenListener
            └─→ Listener set still has detailsScreenListener
                └─→ MQTT subscription remains active
                    └─→ DeviceDetailsScreen continues receiving data
```

---

## Summary

The MQTT implementation uses a **layered architecture**:

1. **mqttService** - Low-level MQTT communication
2. **deviceDataService** - High-level data management
3. **UI Components** - Display and control

This design provides:
- ✅ Separation of concerns
- ✅ Reusability across screens
- ✅ Efficient resource usage
- ✅ Easy testing and debugging
- ✅ Scalability for multiple devices
