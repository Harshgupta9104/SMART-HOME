# Relay Control Implementation Guide

## 🎯 Quick Start: Add Relay Control to Your App

This guide shows you exactly how to add relay control UI to the ControllerScreen in 3 simple steps.

---

## Step 1: Update DeviceMetrics Interface

**File:** `src/services/deviceDataService.ts`

Find this section:
```typescript
export interface DeviceMetrics {
  deviceId: string;
  soilMoisture?: number;
  wifiRSSI?: number;
  ledStatus?: boolean;
  uptime?: number;
  freeHeap?: number;
  temperature?: number;
  humidity?: number;
  lastUpdate: number;
}
```

Add `relayStatus`:
```typescript
export interface DeviceMetrics {
  deviceId: string;
  soilMoisture?: number;
  wifiRSSI?: number;
  ledStatus?: boolean;
  relayStatus?: boolean;  // ← ADD THIS LINE
  uptime?: number;
  freeHeap?: number;
  temperature?: number;
  humidity?: number;
  lastUpdate: number;
}
```

---

## Step 2: Update Field Mapping

**File:** `src/services/deviceDataService.ts`

Find the `handleMQTTData()` method:
```typescript
private handleMQTTData(deviceId: string, data: any): void {
  try {
    const metrics: DeviceMetrics = {
      deviceId,
      soilMoisture: data.soil_pct ?? data.soilMoisture ?? data.soil_moisture,
      wifiRSSI: data.rssi ?? data.wifiRSSI ?? data.wifi_rssi,
      ledStatus: data.led === 'ON' || data.led === true || data.ledStatus === true,
      uptime: data.uptime,
      freeHeap: data.free_heap ?? data.freeHeap,
      temperature: data.temperature ?? data.temp,
      humidity: data.humidity,
      lastUpdate: Date.now(),
    };
```

Add relay status mapping:
```typescript
private handleMQTTData(deviceId: string, data: any): void {
  try {
    const metrics: DeviceMetrics = {
      deviceId,
      soilMoisture: data.soil_pct ?? data.soilMoisture ?? data.soil_moisture,
      wifiRSSI: data.rssi ?? data.wifiRSSI ?? data.wifi_rssi,
      ledStatus: data.led === 'ON' || data.led === true || data.ledStatus === true,
      relayStatus: data.relay === 'ON' || data.relay === true || data.relayStatus === true,  // ← ADD THIS
      uptime: data.uptime,
      freeHeap: data.free_heap ?? data.freeHeap,
      temperature: data.temperature ?? data.temp,
      humidity: data.humidity,
      lastUpdate: Date.now(),
    };
```

---

## Step 3: Add Relay Control Method

**File:** `src/services/deviceDataService.ts`

Add this method after `updateLEDStatus()`:

```typescript
/**
 * Update relay status for a device
 * Sends command via MQTT
 * 
 * NOTE: Does NOT update cache optimistically.
 * The UI will update when the ESP32 responds via MQTT with the actual state.
 */
async updateRelayStatus(deviceId: string, status: boolean): Promise<boolean> {
  try {
    console.log('[DeviceData] 🔌 Sending Relay command for device:', deviceId, 'Status:', status ? 'ON' : 'OFF');

    const mqttService = getMQTTService();

    if (!mqttService.isConnectedToMQTT()) {
      console.warn('[DeviceData] MQTT not connected');
      return false;
    }

    // Send relay command via MQTT
    const topic = `esp32/${deviceId}/relay/set`;
    const message = status ? 'ON' : 'OFF';

    return new Promise((resolve) => {
      if (mqttService.client?.publish) {
        mqttService.client.publish(topic, message, { qos: 1 }, (err) => {
          if (err) {
            console.error('[DeviceData] ❌ Publish error:', err);
            resolve(false);
          } else {
            console.log('[DeviceData] ✅ Published to', topic, ':', message);
            resolve(true);
          }
        });
      } else {
        console.error('[DeviceData] ❌ Client not ready');
        resolve(false);
      }
    });
  } catch (error) {
    console.error('[DeviceData] Error updating relay status:', error);
    return false;
  }
}
```

---

## Step 4: Update ControllerScreen

**File:** `src/screens/ControllerScreen.tsx`

Replace the entire file with this updated version:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { ProvisionedDevice } from '../services/storageService';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';

interface ControllerScreenProps {
  device: ProvisionedDevice;
}

const ControllerScreen: React.FC<ControllerScreenProps> = ({ device }) => {
  const [ledStatus, setLedStatus] = useState(false);
  const [relayStatus, setRelayStatus] = useState(false);
  const [isUpdatingLED, setIsUpdatingLED] = useState(false);
  const [isUpdatingRelay, setIsUpdatingRelay] = useState(false);
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);

  // Animations
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const relayScaleAnim = useRef(new Animated.Value(1)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const deviceDataService = getDeviceDataService();

  // Subscribe to real MQTT state
  useEffect(() => {
    if (!device) return;
    const mqttDeviceId = device.mqttDeviceId || device.id;
    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics: DeviceMetrics) => {
      setMetrics(newMetrics);
      setLedStatus(newMetrics.ledStatus || false);
      setRelayStatus(newMetrics.relayStatus || false);
    });
    return () => unsubscribe();
  }, [device]);

  // Pulsing glow when LED ON
  useEffect(() => {
    if (ledStatus) {
      glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1400, useNativeDriver: false }),
        ])
      );
      glowLoop.current.start();
    } else {
      glowLoop.current?.stop();
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start();
    }
  }, [ledStatus]);

  const handleBulbPress = async () => {
    if (isUpdatingLED) return;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setIsUpdatingLED(true);

    try {
      const mqttDeviceId = device.mqttDeviceId || device.id;
      const newState = !ledStatus;
      
      console.log('[Controller] Sending LED command:', newState ? 'ON' : 'OFF');
      
      const success = await deviceDataService.updateLEDStatus(mqttDeviceId, newState);
      
      if (!success) {
        console.warn('[Controller] LED command failed');
      }
    } catch (error) {
      console.error('[Controller] Error updating LED:', error);
    } finally {
      setIsUpdatingLED(false);
    }
  };

  const handleRelayPress = async () => {
    if (isUpdatingRelay) return;

    Animated.sequence([
      Animated.timing(relayScaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(relayScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setIsUpdatingRelay(true);

    try {
      const mqttDeviceId = device.mqttDeviceId || device.id;
      const newState = !relayStatus;
      
      console.log('[Controller] Sending Relay command:', newState ? 'ON' : 'OFF');
      
      const success = await deviceDataService.updateRelayStatus(mqttDeviceId, newState);
      
      if (!success) {
        console.warn('[Controller] Relay command failed');
      }
    } catch (error) {
      console.error('[Controller] Error updating relay:', error);
    } finally {
      setIsUpdatingRelay(false);
    }
  };

  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.85],
  });
  const ringOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* LED Control Card */}
      <View style={styles.controlCard}>
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
              backgroundColor: '#FCD34D',
            },
          ]}
          pointerEvents="none"
        />

        <Text style={styles.controlName}>Grow Light</Text>

        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleBulbPress}
            activeOpacity={0.85}
            disabled={isUpdatingLED}
            style={styles.bulbTouchable}
          >
            <Animated.View
              style={[
                styles.glowRing,
                {
                  opacity: ringOpacity,
                  shadowRadius: glowRadius,
                  shadowOpacity: glowOpacity,
                  shadowColor: '#FFD54F',
                  borderColor: ledStatus ? '#FFD54F' : 'transparent',
                },
              ]}
            />

            <View style={[styles.bulbCircle, ledStatus && styles.bulbCircleOn]}>
              <Text style={[styles.bulbIcon, ledStatus && styles.bulbIconOn]}>
                {isUpdatingLED ? '⏳' : '💡'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, ledStatus ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.statusLabel, { color: ledStatus ? '#10B981' : '#9CA3AF' }]}>
            {isUpdatingLED ? 'Updating...' : ledStatus ? 'ON  —  Light is active' : 'OFF  —  Light is off'}
          </Text>
        </View>

        <Text style={styles.tapHint}>Tap the bulb to toggle</Text>
      </View>

      {/* Relay Control Card */}
      <View style={styles.controlCard}>
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: relayStatus ? 0.15 : 0,
              backgroundColor: '#EC4899',
            },
          ]}
          pointerEvents="none"
        />

        <Text style={styles.controlName}>Relay Switch</Text>

        <Animated.View style={{ transform: [{ scale: relayScaleAnim }], alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleRelayPress}
            activeOpacity={0.85}
            disabled={isUpdatingRelay}
            style={styles.relayTouchable}
          >
            <View style={[styles.relayCircle, relayStatus && styles.relayCircleOn]}>
              <Text style={[styles.relayIcon, relayStatus && styles.relayIconOn]}>
                {isUpdatingRelay ? '⏳' : '🔌'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, relayStatus ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.statusLabel, { color: relayStatus ? '#10B981' : '#9CA3AF' }]}>
            {isUpdatingRelay ? 'Updating...' : relayStatus ? 'ON  —  Relay is active' : 'OFF  —  Relay is off'}
          </Text>
        </View>

        <Text style={styles.tapHint}>Tap to toggle relay</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Quick Stats</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Uptime</Text>
          <Text style={styles.statValue}>
            {metrics?.uptime !== undefined ? `${Math.floor(metrics.uptime / 3600)}h` : 'N/A'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Free Heap</Text>
          <Text style={styles.statValue}>
            {metrics?.freeHeap !== undefined ? `${Math.floor(metrics.freeHeap / 1024)} KB` : 'N/A'}
          </Text>
        </View>

        <View style={[styles.statRow, styles.statRowLast]}>
          <Text style={styles.statLabel}>WiFi RSSI</Text>
          <Text style={styles.statValue}>
            {metrics?.wifiRSSI !== undefined ? `${metrics.wifiRSSI} dBm` : 'N/A'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  // Control Card
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
  },

  controlName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 32,
    letterSpacing: 0.3,
  },

  // LED Bulb
  bulbTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  bulbCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  bulbCircleOn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  bulbIcon: {
    fontSize: 72,
    opacity: 0.35,
  },
  bulbIconOn: {
    opacity: 1,
  },

  // Relay Switch
  relayTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  relayCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  relayCircleOn: {
    backgroundColor: '#FCE7F3',
    borderColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  relayIcon: {
    fontSize: 72,
    opacity: 0.35,
  },
  relayIconOn: {
    opacity: 1,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusDotOn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDotOff: {
    backgroundColor: '#D1D5DB',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tapHint: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '700',
  },
});

export default ControllerScreen;
```

---

## ✅ Testing Your Changes

### 1. Verify Compilation
```bash
npm run lint
```

### 2. Test on Device
```bash
npm run android
# or
npm run ios
```

### 3. Test Relay Control

1. **Provision a device** (if not already done)
2. **Navigate to DeviceDetailsScreen**
3. **Go to ControllerTab**
4. **You should see:**
   - LED control (existing)
   - Relay control (new)
5. **Tap relay control:**
   - Relay should toggle on ESP32
   - UI should update with true state
   - OLED display should show relay state

### 4. Verify MQTT Messages

Check your MQTT broker for:
- **Published to:** `esp32/{id}/relay/set` with payload `ON` or `OFF`
- **Received from:** `esp32/{id}/relay/state` with payload `ON` or `OFF`
- **In data topic:** `esp32/{id}/data` includes `"relay": true/false`

---

## 🐛 Troubleshooting

### Relay Control Not Appearing
- [ ] Did you update `DeviceMetrics` interface?
- [ ] Did you update field mapping in `handleMQTTData()`?
- [ ] Did you add `updateRelayStatus()` method?
- [ ] Did you replace `ControllerScreen.tsx`?

### Relay Not Toggling
- [ ] Check MQTT connection status
- [ ] Verify relay topic subscription
- [ ] Check firmware logs for relay commands
- [ ] Verify GPIO23 wiring

### UI Not Updating
- [ ] Check MQTT subscription to `/data` topic
- [ ] Verify relay field in JSON payload
- [ ] Check DeviceMetrics mapping
- [ ] Verify UI listener subscription

---

## 📝 Summary

You've successfully added relay control to your app! The implementation:

✅ Follows the same pattern as LED control  
✅ Uses real-time MQTT feedback (no optimistic updates)  
✅ Includes animations and visual feedback  
✅ Handles loading states  
✅ Matches your app's design system  

Your firmware and app are now fully integrated for relay control!

