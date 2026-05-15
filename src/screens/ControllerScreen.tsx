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
  const [isUpdatingLED, setIsUpdatingLED] = useState(false);
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);

  // Animations
  const glowAnim = useRef(new Animated.Value(0)).current;       // pulsing glow radius
  const scaleAnim = useRef(new Animated.Value(1)).current;      // press scale
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const deviceDataService = getDeviceDataService();

  // Subscribe to real MQTT state — UI always reflects device truth
  useEffect(() => {
    if (!device) return;
    const mqttDeviceId = device.mqttDeviceId || device.id;
    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics: DeviceMetrics) => {
      setMetrics(newMetrics);
      setLedStatus(newMetrics.ledStatus || false);
    });
    return () => unsubscribe();
  }, [device]);

  // Pulsing glow when ON
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

    // Press scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setIsUpdatingLED(true);

    try {
      const mqttDeviceId = device.mqttDeviceId || device.id;
      const newState = !ledStatus;
      
      console.log('[Controller] Sending LED command:', newState ? 'ON' : 'OFF');
      
      // Send command and wait for MQTT response
      const success = await deviceDataService.updateLEDStatus(mqttDeviceId, newState);
      
      if (!success) {
        console.warn('[Controller] LED command failed');
      }
      // UI will update automatically via MQTT subscription when ESP responds
    } catch (error) {
      console.error('[Controller] Error updating LED:', error);
    } finally {
      setIsUpdatingLED(false);
    }
  };

  // Interpolated glow values (not useNativeDriver — shadow props)
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
      {/* Grow Light Card */}
      <View style={styles.controlCard}>

        {/* Card background glow when ON */}
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

        {/* Label */}
        <Text style={styles.controlName}>Grow Light</Text>

        {/* Tappable Bulb */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleBulbPress}
            activeOpacity={0.85}
            disabled={isUpdatingLED}
            style={styles.bulbTouchable}
          >
            {/* Outer glow ring */}
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

            {/* Bulb circle */}
            <View style={[styles.bulbCircle, ledStatus && styles.bulbCircleOn]}>
              <Text style={[styles.bulbIcon, ledStatus && styles.bulbIconOn]}>
                {isUpdatingLED ? '⏳' : '💡'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Status text */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, ledStatus ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.statusLabel, { color: ledStatus ? '#10B981' : '#9CA3AF' }]}>
            {isUpdatingLED ? 'Updating...' : ledStatus ? 'ON  —  Light is active' : 'OFF  —  Light is off'}
          </Text>
        </View>

        {/* Tap hint */}
        <Text style={styles.tapHint}>Tap the bulb to toggle</Text>
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

  // Bulb
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
