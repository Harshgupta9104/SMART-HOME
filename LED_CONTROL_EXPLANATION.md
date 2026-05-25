# LED Control in ControllerScreen - Detailed Explanation

## 🎯 Which LED Are We Controlling?

### **GPIO2 - Built-in Status LED on ESP32**

This is the **physical LED on the ESP32 board** itself, not the relay or any external LED.

---

## 📍 Hardware Mapping

| Component | GPIO | Purpose | Status |
|-----------|------|---------|--------|
| **Status LED** | **GPIO2** | **Controlled by app** | ✅ **This one** |
| Relay | GPIO23 | Relay control | Separate |
| Reset Button | GPIO4 | Factory reset | Separate |
| Soil Sensor | GPIO34 | Soil moisture | Separate |
| OLED SDA | GPIO21 | Display | Separate |
| OLED SCL | GPIO22 | Display | Separate |

---

## 🔌 Control Flow

### In the App (ControllerScreen)

```typescript
// User taps the bulb
const handleBulbPress = async () => {
  const mqttDeviceId = device.mqttDeviceId || device.id;
  const newState = !ledStatus;
  
  // Send command to ESP32 via MQTT
  const success = await deviceDataService.updateLEDStatus(mqttDeviceId, newState);
  
  // UI updates when ESP32 responds
};
```

### In the Firmware (ESP32)

```cpp
// MQTT callback receives command
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Handle LED control
  if (strcmp(topic, g_topicLedSet.c_str()) == 0) {
    String cmd = String(g_mqttMsgBuf);
    cmd.trim(); cmd.toUpperCase();
    
    if (cmd == "ON") {
      digitalWrite(LED_PIN, HIGH);      // GPIO2 = HIGH (LED ON)
      publishLedState(true);
    } else if (cmd == "OFF") {
      digitalWrite(LED_PIN, LOW);       // GPIO2 = LOW (LED OFF)
      publishLedState(false);
    }
  }
}
```

---

## 📊 MQTT Communication

### Command Flow

```
ControllerScreen (App)
  ↓
User taps bulb
  ↓
deviceDataService.updateLEDStatus()
  ↓
mqttService.sendLEDCommand()
  ↓
Publish to: esp32/{id}/led/set
Message: "ON" or "OFF"
  ↓
ESP32 receives command
  ↓
GPIO2 toggles (HIGH or LOW)
  ↓
ESP32 publishes state to: esp32/{id}/led/state
Message: "ON" or "OFF"
  ↓
App receives state via MQTT
  ↓
ControllerScreen updates UI
```

---

## 🎨 Visual Representation in App

### ControllerScreen UI

```
┌─────────────────────────────────────┐
│      Grow Light (Label)             │
│                                     │
│            💡 (Bulb Icon)           │
│         (160x160 circle)            │
│                                     │
│  ● ON — Light is active             │
│  (Green dot + text)                 │
│                                     │
│  Tap the bulb to toggle             │
└─────────────────────────────────────┘
```

### When LED is ON
- Bulb icon is bright (opacity: 1)
- Circle background: #FFFBEB (light yellow)
- Border color: #FCD34D (yellow)
- Glow effect: Yellow shadow
- Status text: "ON — Light is active"
- Status dot: Green (#10B981)

### When LED is OFF
- Bulb icon is dim (opacity: 0.35)
- Circle background: #F3F4F6 (light gray)
- Border color: #E5E7EB (gray)
- No glow effect
- Status text: "OFF — Light is off"
- Status dot: Gray (#D1D5DB)

---

## 🔄 State Management

### App Side (React State)

```typescript
const [ledStatus, setLedStatus] = useState(false);  // true = ON, false = OFF
const [isUpdatingLED, setIsUpdatingLED] = useState(false);  // Loading state
const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);

// Subscribe to real-time updates
useEffect(() => {
  const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics) => {
    setMetrics(newMetrics);
    setLedStatus(newMetrics.ledStatus || false);  // Update from MQTT
  });
  return () => unsubscribe();
}, [device]);
```

### Firmware Side (C++ State)

```cpp
// Global state
bool g_manualLedControl = false;  // Track if manually controlled

// In MQTT callback
if (cmd == "ON") {
  g_manualLedControl = true;
  digitalWrite(LED_PIN, HIGH);
  publishLedState(true);
} else if (cmd == "OFF") {
  g_manualLedControl = true;
  digitalWrite(LED_PIN, LOW);
  publishLedState(false);
}

// In sensor data
doc["led"] = (digitalRead(LED_PIN) == HIGH);  // Read actual GPIO2 state
```

---

## 📱 Complete Control Sequence

### Step 1: User Interaction
```
User sees ControllerScreen
User taps the bulb circle
```

### Step 2: App Processing
```
handleBulbPress() called
  ├─ Play press animation (scale 0.93 → 1.0)
  ├─ Set isUpdatingLED = true
  ├─ Get current LED status
  ├─ Calculate new state (!ledStatus)
  └─ Call deviceDataService.updateLEDStatus()
```

### Step 3: MQTT Publishing
```
deviceDataService.updateLEDStatus()
  ├─ Check MQTT connection
  ├─ Call mqttService.sendLEDCommand()
  │   ├─ Create topic: esp32/{id}/led/set
  │   ├─ Create message: "ON" or "OFF"
  │   └─ Publish with QoS 1
  └─ Return success/failure
```

### Step 4: ESP32 Processing
```
ESP32 receives MQTT message
  ├─ Parse topic: esp32/{id}/led/set
  ├─ Parse message: "ON" or "OFF"
  ├─ Call mqttCallback()
  │   ├─ Set g_manualLedControl = true
  │   ├─ digitalWrite(GPIO2, HIGH/LOW)
  │   └─ publishLedState(true/false)
  └─ Publish state to esp32/{id}/led/state
```

### Step 5: App Update
```
App receives MQTT message on esp32/{id}/led/state
  ├─ MqttService receives message
  ├─ Calls DeviceDataService listener
  │   ├─ Updates metrics cache
  │   ├─ Calls UI listener
  │   └─ setLedStatus(newState)
  └─ ControllerScreen re-renders
      ├─ Updates bulb appearance
      ├─ Updates status text
      ├─ Updates status dot color
      └─ Triggers glow animation
```

---

## 🎯 Key Points

### What Gets Controlled
- **GPIO2** on the ESP32 board
- The built-in LED on the microcontroller
- Not an external LED (unless you wire one to GPIO2)
- Not the relay (that's GPIO23)

### How It Works
1. App sends MQTT command to `esp32/{id}/led/set`
2. ESP32 receives command and toggles GPIO2
3. ESP32 publishes state to `esp32/{id}/led/state`
4. App receives state and updates UI
5. UI always shows true device state (no optimistic updates)

### Why This Design
- **Real-time feedback** - UI reflects actual device state
- **Reliable** - No guessing if command succeeded
- **Consistent** - Multiple apps/devices see same state
- **Debuggable** - Can see actual GPIO state

---

## 🔍 Debugging

### Check LED Status in App
```typescript
// In ControllerScreen
console.log('LED Status:', ledStatus);  // true or false
console.log('Metrics:', metrics);       // Full metrics object
console.log('LED from metrics:', metrics?.ledStatus);
```

### Check LED Status on ESP32
```cpp
// In firmware
Serial.printf("[LED] GPIO2 state: %d\n", digitalRead(LED_PIN));
// Output: 0 (OFF) or 1 (ON)

// In MQTT message
Serial.printf("[LED] Publishing: %s\n", ledStatus ? "ON" : "OFF");
```

### Check MQTT Messages
```bash
# Subscribe to LED state topic
mosquitto_sub -h broker.hivemq.com -t esp32/26B7B3F8/led/state

# Should see: ON or OFF
```

---

## 📊 LED States Summary

| State | GPIO2 | Visual | MQTT Message |
|-------|-------|--------|--------------|
| **ON** | HIGH (1) | Bright bulb, yellow glow | "ON" |
| **OFF** | LOW (0) | Dim bulb, no glow | "OFF" |
| **Updating** | Current | Hourglass icon ⏳ | (sending) |

---

## 🎓 Related Components

### In App
- **ControllerScreen** - UI for LED control
- **DeviceDataService** - Manages LED state
- **MqttService** - Sends/receives MQTT messages

### In Firmware
- **GPIO2** - Physical LED pin
- **mqttCallback()** - Receives LED commands
- **publishLedState()** - Sends LED state
- **updateStatusLed()** - Updates LED for status indicators

---

## ✨ Summary

**You are controlling GPIO2 (the built-in LED on the ESP32 board) via MQTT from the ControllerScreen in the app.**

The control flow is:
1. User taps bulb in app
2. App sends MQTT command
3. ESP32 toggles GPIO2
4. ESP32 sends state back via MQTT
5. App receives state and updates UI

This ensures the UI always shows the true device state, not a guessed state.

