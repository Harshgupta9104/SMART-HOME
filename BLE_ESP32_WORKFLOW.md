# BLE Provisioning & ESP32 Workflow

## Overview
BLE (Bluetooth Low Energy) is used for device discovery and provisioning. Once provisioned, the ESP32 connects to WiFi and communicates via MQTT. This document explains the complete BLE provisioning flow and ESP32 system architecture.

---

## 1. BLE Provisioning Overview

### What is BLE Provisioning?
BLE provisioning is the process of:
1. Discovering new ESP32 devices via Bluetooth
2. Connecting to the device
3. Sending WiFi credentials (SSID + password) via BLE
4. Waiting for the device to connect to WiFi
5. Saving the device to the app

### Why BLE for Provisioning?
- No WiFi needed to discover devices
- Works out of the box (no configuration)
- Secure local communication
- Fast and reliable
- Low power consumption

---

## 2. BLE Service & Characteristic UUIDs

### Service UUIDs

```
Provisioning Service: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
  └─ Used for sending WiFi credentials

Device ID Service: 12345678-1234-1234-1234-1234567890ab
  └─ Used for reading device ID
```

### Characteristic UUIDs

```
Provisioning Characteristic: beb5483e-36e1-4688-b7f5-ea07361b26a8
  ├─ Service: Provisioning Service
  ├─ Properties: Write, Notify
  ├─ Purpose: Send SSID + password, receive confirmation
  └─ Data format: JSON or binary

Device ID Characteristic: 12345678-1234-1234-1234-1234567890cd
  ├─ Service: Device ID Service
  ├─ Properties: Read
  ├─ Purpose: Read device ID (BLE MAC address)
  └─ Data format: String (e.g., "26B7B3F8")
```

---

## 3. BLE Provisioning State Machine

### Complete State Flow

```
IDLE
  ↓ User taps "Add Device"
CONNECTING_BLE
  ├─ Connect to ESP32 via BLE
  ├─ Discover services and characteristics
  ├─ Read device ID from Device ID characteristic
  ├─ Extract short ID (e.g., "26B7B3F8")
  └─ Success → SENDING_CREDENTIALS
      or Error → ERROR state
  ↓
SENDING_CREDENTIALS
  ├─ Prepare WiFi credentials (SSID + password)
  ├─ Write to Provisioning characteristic
  ├─ Wait for acknowledgment (BLE notification)
  └─ Success → WAITING_WIFI
      or Error → ERROR state
  ↓
WAITING_WIFI
  ├─ Wait for ESP32 to connect to WiFi
  ├─ Listen for confirmation via BLE notification
  ├─ Timeout after 30 seconds
  └─ Success → SUCCESS
      or Timeout → ERROR state
  ↓
SUCCESS
  ├─ Save device to AsyncStorage
  ├─ Device ID (BLE MAC)
  ├─ Device name
  ├─ MQTT device ID (short ID)
  ├─ WiFi SSID
  └─ Status: "online"
  ↓
ERROR
  ├─ Show error message
  ├─ Provide retry option
  └─ User can try again
```

---

## 4. Step-by-Step Provisioning Flow

### Step 1: BLE Device Discovery

```
SimpleBleProvisionScreen
  ├─ User taps "Add Device"
  ├─ Start BLE scan
  │   └─ Scan for devices with name prefix "PROV_"
  │       Example: "PROV_26B7B3F8"
  │
  ├─ Show discovered devices
  │   ├─ Device name
  │   ├─ Signal strength (RSSI in dBm)
  │   └─ Example: "PROV_26B7B3F8 (-45 dBm)"
  │
  ├─ Auto-stop scan after 30 seconds
  │
  └─ User selects device
      └─ Navigate to WiFiProvisioningScreen
```

### Step 2: WiFi Network Selection

```
WiFiProvisioningScreen
  ├─ Scan nearby WiFi networks
  │   ├─ Get current WiFi network (highest priority)
  │   ├─ Scan for other available networks
  │   └─ Show list with signal strength
  │
  ├─ Auto-select current network if available
  │   └─ User can change selection
  │
  ├─ User selects network
  │   └─ Network name (SSID) is selected
  │
  ├─ User enters password
  │   ├─ Check Keychain for saved password
  │   ├─ Auto-fill if available
  │   └─ User can edit or enter new password
  │
  └─ User taps "Connect Device"
      └─ Navigate to ProvisioningProgressScreen
```

### Step 3: BLE Connection & Credential Transmission

```
ProvisioningProgressScreen
  ├─ useProvisioning hook starts state machine
  │
  ├─ State: CONNECTING_BLE
  │   ├─ Connect to ESP32 via BLE
  │   │   └─ Use device ID from SimpleBleProvisionScreen
  │   │
  │   ├─ Discover services
  │   │   ├─ Find Provisioning Service
  │   │   └─ Find Device ID Service
  │   │
  │   ├─ Discover characteristics
  │   │   ├─ Find Provisioning Characteristic
  │   │   └─ Find Device ID Characteristic
  │   │
  │   ├─ Read device ID
  │   │   ├─ Read from Device ID Characteristic
  │   │   ├─ Extract short ID (e.g., "26B7B3F8")
  │   │   └─ This becomes the MQTT device ID
  │   │
  │   └─ Success → SENDING_CREDENTIALS
  │
  ├─ State: SENDING_CREDENTIALS
  │   ├─ Prepare WiFi credentials
  │   │   ├─ SSID: "MyWiFi"
  │   │   └─ Password: "password123"
  │   │
  │   ├─ Write to Provisioning Characteristic
  │   │   ├─ Format: JSON or binary
  │   │   ├─ Example: {"ssid":"MyWiFi","password":"password123"}
  │   │   └─ Write with response
  │   │
  │   ├─ Enable notifications on Provisioning Characteristic
  │   │   └─ Listen for acknowledgment
  │   │
  │   └─ Success → WAITING_WIFI
  │
  ├─ State: WAITING_WIFI
  │   ├─ Wait for ESP32 to connect to WiFi
  │   │   ├─ ESP32 receives credentials
  │   │   ├─ ESP32 connects to WiFi
  │   │   ├─ ESP32 publishes confirmation via BLE notification
  │   │   └─ Timeout: 30 seconds
  │   │
  │   ├─ Listen for BLE notification
  │   │   ├─ Payload: "WIFI_CONNECTED" or similar
  │   │   └─ Indicates WiFi connection successful
  │   │
  │   └─ Success → SUCCESS
  │
  └─ State: SUCCESS or ERROR
      ├─ SUCCESS
      │   ├─ Save device to AsyncStorage
      │   ├─ Device ID (BLE MAC)
      │   ├─ Device name (user input or default)
      │   ├─ MQTT device ID (short ID from BLE)
      │   ├─ WiFi SSID
      │   ├─ Status: "online"
      │   └─ Navigate to ProvisioningSuccessScreen
      │
      └─ ERROR
          ├─ Show error message
          ├─ Provide retry button
          └─ User can try again
```

---

## 5. BLE Communication Details

### Reading Device ID

```typescript
// In BleService
async readDeviceId(deviceId: string): Promise<string> {
  // Connect to device
  const device = await this.manager.connectToDevice(deviceId);
  
  // Discover services
  await device.discoverAllServicesAndCharacteristics();
  
  // Get Device ID Service
  const service = await device.serviceForUUID('12345678-1234-1234-1234-1234567890ab');
  
  // Get Device ID Characteristic
  const characteristic = await service.characteristicForUUID(
    '12345678-1234-1234-1234-1234567890cd'
  );
  
  // Read value
  const data = await characteristic.read();
  
  // Convert to string
  const shortId = Buffer.from(data.value, 'base64').toString('utf8');
  
  return shortId; // e.g., "26B7B3F8"
}
```

### Writing WiFi Credentials

```typescript
// In BleService
async sendWiFiCredentials(
  deviceId: string,
  ssid: string,
  password: string
): Promise<void> {
  // Connect to device
  const device = await this.manager.connectToDevice(deviceId);
  
  // Discover services
  await device.discoverAllServicesAndCharacteristics();
  
  // Get Provisioning Service
  const service = await device.serviceForUUID(
    '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
  );
  
  // Get Provisioning Characteristic
  const characteristic = await service.characteristicForUUID(
    'beb5483e-36e1-4688-b7f5-ea07361b26a8'
  );
  
  // Prepare credentials
  const credentials = JSON.stringify({ ssid, password });
  const base64 = Buffer.from(credentials).toString('base64');
  
  // Write to characteristic
  await characteristic.writeWithResponse(base64);
}
```

### Listening for Notifications

```typescript
// In BleService
async listenForWiFiConfirmation(
  deviceId: string,
  timeout: number = 30000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const device = this.manager.getConnectedDevices()[0];
    
    if (!device) {
      reject(new Error('Device not connected'));
      return;
    }
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('WiFi connection timeout'));
    }, timeout);
    
    // Listen for notifications
    device.onCharacteristicValueUpdated((characteristic) => {
      if (characteristic.uuid === 'beb5483e-36e1-4688-b7f5-ea07361b26a8') {
        const value = Buffer.from(characteristic.value, 'base64').toString('utf8');
        
        if (value === 'WIFI_CONNECTED') {
          clearTimeout(timeoutId);
          resolve();
        }
      }
    });
  });
}
```

---

## 6. ESP32 System Architecture

### ESP32 Firmware Components

```
ESP32 Firmware
├─ BLE Module
│   ├─ Advertise as "PROV_{shortId}" during provisioning
│   ├─ Provisioning Service (UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b)
│   │   └─ Provisioning Characteristic (receive credentials, send confirmation)
│   ├─ Device ID Service (UUID: 12345678-1234-1234-1234-1234567890ab)
│   │   └─ Device ID Characteristic (read-only, returns short ID)
│   └─ Disable BLE after WiFi connection
│
├─ WiFi Module
│   ├─ Receive credentials via BLE
│   ├─ Connect to WiFi network
│   ├─ Retry 3 times if connection fails
│   ├─ Publish confirmation via BLE notification
│   └─ Save credentials to NVS (non-volatile storage)
│
├─ MQTT Module
│   ├─ Connect to HiveMQ Cloud broker
│   ├─ Subscribe to control topics
│   │   ├─ esp32/{id}/led/set
│   │   ├─ esp32/{id}/relay/set
│   │   └─ esp32/{id}/config
│   ├─ Publish to state topics
│   │   ├─ esp32/{id}/led/state
│   │   ├─ esp32/{id}/relay/state
│   │   └─ esp32/{id}/data (sensor data)
│   └─ Publish status topic
│       └─ esp32/{id}/status (online/offline)
│
├─ Sensor Module
│   ├─ Read soil moisture sensor
│   ├─ Read temperature sensor
│   ├─ Read humidity sensor
│   └─ Publish every 5 seconds
│
├─ GPIO Control Module
│   ├─ LED Control (GPIO pin)
│   │   ├─ Receive ON/OFF command via MQTT
│   │   ├─ Toggle LED
│   │   └─ Publish state via MQTT
│   │
│   └─ Relay Control (GPIO23)
│       ├─ Receive ON/OFF command via MQTT
│       ├─ Toggle relay
│       └─ Publish state via MQTT
│
└─ System Module
    ├─ Monitor WiFi connection
    ├─ Monitor MQTT connection
    ├─ Auto-reconnect on disconnect
    ├─ Publish device status (online/offline)
    └─ Handle factory reset command
```

---

## 7. ESP32 Provisioning Mode

### Entering Provisioning Mode

```
ESP32 starts
  ├─ Check if WiFi credentials exist in NVS
  │
  ├─ If YES
  │   ├─ Connect to saved WiFi
  │   ├─ Connect to MQTT
  │   └─ Start normal operation
  │
  └─ If NO
      ├─ Enter provisioning mode
      ├─ Start BLE advertising
      ├─ Advertise as "PROV_{shortId}"
      │   └─ shortId = last 8 chars of MAC address
      ├─ Wait for BLE connection
      ├─ Listen for WiFi credentials
      └─ After WiFi connection, exit provisioning mode
```

### Exiting Provisioning Mode

```
ESP32 in provisioning mode
  ├─ Receives WiFi credentials via BLE
  ├─ Attempts to connect to WiFi
  │
  ├─ If connection successful
  │   ├─ Save credentials to NVS
  │   ├─ Publish confirmation via BLE notification
  │   ├─ Disable BLE
  │   ├─ Connect to MQTT
  │   ├─ Start publishing sensor data
  │   └─ Exit provisioning mode
  │
  └─ If connection fails
      ├─ Retry 3 times
      ├─ If all retries fail
      │   ├─ Publish error via BLE notification
      │   ├─ Stay in provisioning mode
      │   └─ Wait for new credentials
      └─ User can try again
```

---

## 8. LED Control on ESP32

### LED Hardware Setup

```
ESP32 GPIO Pin (configurable, typically GPIO2 or GPIO4)
  ├─ Connected to LED anode (positive)
  ├─ Resistor (220Ω) for current limiting
  └─ Ground (negative)
```

### LED Control Flow

```
App sends MQTT command
  ├─ Topic: esp32/{id}/led/set
  ├─ Payload: "ON" or "OFF"
  └─ QoS: 1
      ↓
ESP32 receives command
  ├─ Parse payload
  ├─ If "ON" → Set GPIO pin HIGH
  ├─ If "OFF" → Set GPIO pin LOW
  └─ Publish state to esp32/{id}/led/state
      ↓
App receives state update
  ├─ Update UI
  ├─ Show glow animation if ON
  └─ Hide glow animation if OFF
```

### ESP32 LED Code Example

```cpp
// Define LED pin
#define LED_PIN 2

// Setup
void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // LED off initially
}

// MQTT callback
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = String((char*)payload).substring(0, length);
  
  if (String(topic).endsWith("/led/set")) {
    if (message == "ON") {
      digitalWrite(LED_PIN, HIGH);
      publishLEDState("ON");
    } else if (message == "OFF") {
      digitalWrite(LED_PIN, LOW);
      publishLEDState("OFF");
    }
  }
}

void publishLEDState(String state) {
  String topic = "esp32/" + deviceId + "/led/state";
  mqttClient.publish(topic.c_str(), state.c_str());
}
```

---

## 9. Relay Control on ESP32

### Relay Hardware Setup

```
ESP32 GPIO23
  ├─ Connected to relay control pin
  ├─ Relay module (typically 5V relay)
  ├─ Relay coil (5V)
  ├─ Relay contacts (NO/NC/COM)
  └─ Load connected to relay contacts
```

### Relay Control Flow

```
App sends MQTT command
  ├─ Topic: esp32/{id}/relay/set
  ├─ Payload: "ON" or "OFF"
  └─ QoS: 1
      ↓
ESP32 receives command
  ├─ Parse payload
  ├─ If "ON" → Set GPIO23 HIGH (relay energized)
  ├─ If "OFF" → Set GPIO23 LOW (relay de-energized)
  └─ Publish state to esp32/{id}/relay/state
      ↓
App receives state update
  ├─ Update UI
  ├─ Show relay status
  └─ Update button label
```

### ESP32 Relay Code Example

```cpp
// Define relay pin
#define RELAY_PIN 23

// Setup
void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Relay off initially
}

// MQTT callback
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = String((char*)payload).substring(0, length);
  
  if (String(topic).endsWith("/relay/set")) {
    if (message == "ON") {
      digitalWrite(RELAY_PIN, HIGH);
      publishRelayState("ON");
    } else if (message == "OFF") {
      digitalWrite(RELAY_PIN, LOW);
      publishRelayState("OFF");
    }
  }
}

void publishRelayState(String state) {
  String topic = "esp32/" + deviceId + "/relay/state";
  mqttClient.publish(topic.c_str(), state.c_str());
}
```

---

## 10. Sensor Data Publishing

### Sensor Reading Flow

```
ESP32 main loop
  ├─ Every 5 seconds
  │   ├─ Read soil moisture sensor (ADC)
  │   ├─ Read temperature sensor (DHT22 or similar)
  │   ├─ Read humidity sensor (DHT22 or similar)
  │   ├─ Get WiFi signal strength (RSSI)
  │   ├─ Get free heap memory
  │   ├─ Get uptime
  │   └─ Publish to esp32/{id}/data
  │
  └─ Payload: JSON with all sensor values
      └─ Example:
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

### ESP32 Sensor Code Example

```cpp
void publishSensorData() {
  // Read sensors
  int soilMoisture = analogRead(SOIL_PIN);
  float temperature = readTemperature();
  float humidity = readHumidity();
  int rssi = WiFi.RSSI();
  uint32_t freeHeap = ESP.getFreeHeap();
  uint32_t uptime = millis() / 1000;
  
  // Create JSON
  StaticJsonDocument<256> doc;
  doc["device"] = "ESP32_" + deviceId;
  doc["fw"] = "3.0.0";
  doc["uptime"] = uptime;
  doc["rssi"] = rssi;
  doc["heap"] = freeHeap;
  doc["soil_pct"] = map(soilMoisture, 0, 4095, 0, 100);
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["led"] = digitalRead(LED_PIN);
  doc["relay"] = digitalRead(RELAY_PIN);
  
  // Serialize and publish
  String payload;
  serializeJson(doc, payload);
  
  String topic = "esp32/" + deviceId + "/data";
  mqttClient.publish(topic.c_str(), payload.c_str());
}
```

---

## 11. WiFi Reconfiguration

### WiFi Update Command

```
App sends MQTT command
  ├─ Topic: esp32/{id}/config
  ├─ Payload: {"type":"wifi_update","ssid":"NewWiFi","password":"newpass"}
  └─ QoS: 1
      ↓
ESP32 receives command
  ├─ Parse JSON
  ├─ Disconnect from current WiFi
  ├─ Attempt to connect to new WiFi (3 retries)
  │
  ├─ If connection successful
  │   ├─ Save credentials to NVS
  │   ├─ Publish status: "online"
  │   └─ Restart (optional)
  │
  └─ If connection fails
      ├─ Restore previous WiFi credentials
      ├─ Reconnect to previous WiFi
      ├─ Publish status: "online"
      └─ Restart
```

---

## 12. Factory Reset

### Factory Reset Command

```
App sends MQTT command
  ├─ Topic: esp32/{id}/config
  ├─ Payload: {"type":"factory_reset"}
  └─ QoS: 1
      ↓
ESP32 receives command
  ├─ Clear WiFi credentials from NVS
  ├─ Clear MQTT settings
  ├─ Clear all saved data
  ├─ Restart
  │
  └─ After restart
      ├─ No WiFi credentials found
      ├─ Enter provisioning mode
      ├─ Advertise as "PROV_{shortId}"
      └─ Wait for new provisioning
```

---

## 13. Device Status Publishing

### Online/Offline Status

```
ESP32 connects to MQTT
  ├─ Publish "online" to esp32/{id}/status
  └─ Set up Last Will & Testament (LWT)
      └─ If connection drops, broker publishes "offline"
          ↓
App receives status update
  ├─ Update device status in UI
  ├─ Show "online" or "offline" indicator
  └─ Disable controls if offline
```

---

## 14. BLE Provisioning Error Handling

### Common Errors

```
BLE Connection Failed
  ├─ Cause: Device out of range or not in provisioning mode
  ├─ Solution: Move closer, restart device
  └─ User sees: "Failed to connect. Please try again."

WiFi Credentials Invalid
  ├─ Cause: Wrong SSID or password
  ├─ Solution: Verify credentials, try again
  └─ User sees: "WiFi connection failed. Please check credentials."

WiFi Connection Timeout
  ├─ Cause: Device can't connect within 30 seconds
  ├─ Solution: Check WiFi network, try again
  └─ User sees: "WiFi connection timeout. Please try again."

BLE Notification Not Received
  ├─ Cause: Device didn't send confirmation
  ├─ Solution: Restart device, try again
  └─ User sees: "Connection timeout. Please try again."
```

---

## 15. Troubleshooting

### Device Not Discovered
- Ensure ESP32 is in provisioning mode
- Check device name starts with "PROV_"
- Move closer to device
- Restart ESP32

### WiFi Credentials Not Sent
- Check BLE connection is active
- Verify WiFi SSID and password are correct
- Check Provisioning Characteristic UUID is correct
- Restart device

### Device Not Connecting to WiFi
- Verify WiFi network is available
- Check WiFi password is correct
- Ensure WiFi is 2.4GHz (not 5GHz)
- Check ESP32 WiFi module is working

### Metrics Not Updating
- Verify ESP32 is connected to WiFi
- Check MQTT connection is active
- Verify device ID is correct
- Check sensor connections

---

**Last Updated:** May 2026  
**Version:** 1.0
