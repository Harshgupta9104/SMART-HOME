# Firmware & App Integration Guide

## Overview
This document explains how the ESP32 firmware integrates with the SmartHomeApp. It covers the firmware architecture, configuration, and how to paste your ESP32 code into the provided files.

---

## 1. Firmware Files

The project includes two empty files for your ESP32 firmware:

### ESP32_FIRMWARE.cpp
- Contains the main ESP32 firmware code
- Handles BLE provisioning, WiFi connection, MQTT communication
- Controls LED and relay via GPIO pins
- Publishes sensor data

### ESP32_CONFIG.h
- Contains configuration constants
- WiFi credentials (if hardcoded)
- MQTT broker settings
- GPIO pin definitions
- Sensor calibration values

---

## 2. How to Add Your Firmware

### Step 1: Prepare Your Code
1. Get your ESP32 firmware code (Arduino IDE or PlatformIO)
2. Get your configuration header file

### Step 2: Paste into ESP32_FIRMWARE.cpp
1. Open `ESP32_FIRMWARE.cpp` in the project
2. Copy your entire firmware code
3. Paste it into the file
4. Save

### Step 3: Paste into ESP32_CONFIG.h
1. Open `ESP32_CONFIG.h` in the project
2. Copy your configuration header
3. Paste it into the file
4. Save

---

## 3. Firmware Requirements

Your ESP32 firmware must implement the following:

### BLE Provisioning
```cpp
// Advertise as "PROV_{shortId}" during provisioning
// Provide Provisioning Service with UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
// Provide Device ID Service with UUID: 12345678-1234-1234-1234-1234567890ab
// Accept WiFi credentials via BLE
// Send confirmation when WiFi is connected
```

### MQTT Topics
```
Subscribe to:
  - esp32/{id}/led/set       (LED control)
  - esp32/{id}/relay/set     (Relay control)
  - esp32/{id}/config        (WiFi/config commands)

Publish to:
  - esp32/{id}/data          (Sensor data every 5 seconds)
  - esp32/{id}/status        (Online/offline status)
  - esp32/{id}/led/state     (LED state)
  - esp32/{id}/relay/state   (Relay state)
```

### GPIO Control
```cpp
// LED Control
// - Receive ON/OFF command via MQTT
// - Toggle LED on GPIO pin
// - Publish state to esp32/{id}/led/state

// Relay Control (GPIO23)
// - Receive ON/OFF command via MQTT
// - Toggle relay on GPIO23
// - Publish state to esp32/{id}/relay/state
```

### Sensor Data
```cpp
// Publish JSON payload every 5 seconds:
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

---

## 4. Configuration Requirements

Your configuration header must define:

### MQTT Broker Settings
```cpp
#define MQTT_BROKER_URL "wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt"
#define MQTT_USERNAME "bluetooth"
#define MQTT_PASSWORD "Ble_12345"
```

### GPIO Pins
```cpp
#define LED_PIN 2           // LED control pin
#define RELAY_PIN 23        // Relay control pin
#define SOIL_PIN 34         // Soil moisture sensor (ADC)
#define TEMP_PIN 32         // Temperature sensor (DHT22)
```

### Sensor Calibration
```cpp
#define SOIL_DRY 4095       // ADC value when soil is dry
#define SOIL_WET 1500       // ADC value when soil is wet
```

### BLE UUIDs
```cpp
#define PROV_SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define PROV_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVICE_ID_SERVICE_UUID "12345678-1234-1234-1234-1234567890ab"
#define DEVICE_ID_CHAR_UUID "12345678-1234-1234-1234-1234567890cd"
```

---

## 5. Integration Checklist

- [ ] BLE provisioning implemented
- [ ] WiFi connection with retry logic
- [ ] MQTT connection to HiveMQ Cloud
- [ ] LED control via GPIO pin
- [ ] Relay control via GPIO23
- [ ] Sensor data publishing (every 5 seconds)
- [ ] Status publishing (online/offline)
- [ ] WiFi reconfiguration support
- [ ] Factory reset support
- [ ] Error handling and logging

---

## 6. Testing the Integration

### Test BLE Provisioning
1. Flash firmware to ESP32
2. Open SmartHomeApp
3. Tap "Add Device"
4. Verify device appears in BLE scan
5. Select device and enter WiFi credentials
6. Verify device connects to WiFi

### Test MQTT Communication
1. Verify device appears in HomeScreen
2. Tap device to open ControllerScreen
3. Tap LED bulb to toggle LED
4. Verify LED toggles on ESP32
5. Verify relay toggles on GPIO23

### Test Metrics
1. Open MetricsScreen
2. Verify sensor data updates every 5 seconds
3. Verify WiFi RSSI displays correctly
4. Verify temperature and humidity display

---

## 7. Troubleshooting

### Device Not Discovered
- Check BLE advertising is enabled
- Verify device name starts with "PROV_"
- Check BLE service UUIDs are correct

### WiFi Connection Fails
- Verify WiFi SSID and password are correct
- Check WiFi is 2.4GHz (not 5GHz)
- Verify WiFi credentials are being received via BLE

### MQTT Connection Fails
- Verify broker URL is correct
- Check username and password
- Verify internet connection is active

### LED/Relay Not Toggling
- Verify GPIO pins are correct
- Check MQTT subscription is active
- Verify device ID is correct

### Metrics Not Updating
- Verify sensor connections
- Check MQTT publishing is working
- Verify JSON payload format is correct

---

## 8. File Structure

```
SmartHomeApp/
├── ESP32_FIRMWARE.cpp          ← Paste your firmware code here
├── ESP32_CONFIG.h              ← Paste your configuration here
├── APP_WORKFLOW.md             ← App workflow documentation
├── BLE_ESP32_WORKFLOW.md       ← BLE & ESP32 documentation
├── MQTT_WORKFLOW.md            ← MQTT documentation
├── README.md                   ← Project overview
└── src/
    ├── services/
    │   ├── mqttService.ts      ← MQTT client
    │   ├── deviceDataService.ts ← Device metrics
    │   └── wifiService.ts      ← WiFi scanning
    └── screens/
        ├── ControllerScreen.tsx ← LED/relay control
        ├── MetricsScreen.tsx    ← Sensor metrics
        └── ...
```

---

## 9. Next Steps

1. **Prepare Your Firmware**
   - Get your ESP32 firmware code
   - Get your configuration header

2. **Paste Code**
   - Paste firmware into `ESP32_FIRMWARE.cpp`
   - Paste configuration into `ESP32_CONFIG.h`

3. **Test Integration**
   - Flash firmware to ESP32
   - Test BLE provisioning
   - Test MQTT communication
   - Test LED/relay control

4. **Deploy**
   - Build release APK
   - Test on device
   - Share with users

---

**Last Updated:** May 2026  
**Version:** 1.0
