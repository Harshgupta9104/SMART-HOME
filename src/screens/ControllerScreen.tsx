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
import { useTheme } from '../context/ThemeContext';

interface ControllerScreenProps {
  device: ProvisionedDevice;
}

const ControllerScreen: React.FC<ControllerScreenProps> = ({ device }) => {
  const { theme } = useTheme();
  const [relayStatus, setRelayStatus] = useState(false);
  const [isUpdatingRelay, setIsUpdatingRelay] = useState(false);
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
      setRelayStatus(newMetrics.relayStatus || false);
    });
    return () => unsubscribe();
  }, [device]);

  // Pulsing glow when relay is OFF (inverted logic)
  useEffect(() => {
    if (!relayStatus) {  // ← Changed from "if (relayStatus)" to "if (!relayStatus)"
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
  }, [relayStatus]);

  const handleRelayPress = async () => {
    if (isUpdatingRelay) return;

    // Press scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setIsUpdatingRelay(true);

    try {
      const mqttDeviceId = device.mqttDeviceId || device.id;
      const newState = !relayStatus;
      
      console.log('[Controller] Sending relay command:', newState ? 'ON' : 'OFF');
      
      // Send command and wait for MQTT response
      const success = await deviceDataService.updateRelayStatus(mqttDeviceId, newState);
      
      if (!success) {
        console.warn('[Controller] Relay command failed');
        setIsUpdatingRelay(false);
        return;
      }
      
      // Wait max 2 seconds for response, then unlock button
      setTimeout(() => {
        setIsUpdatingRelay(false);
      }, 2000);
      
    } catch (error) {
      console.error('[Controller] Error updating relay:', error);
      setIsUpdatingRelay(false);
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
      {/* Relay Control Card */}
      <View style={styles.controlCard}>

        {/* Card background glow when ON */}
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
              backgroundColor: theme.danger,
            },
          ]}
          pointerEvents="none"
        />

        {/* Label */}
        <Text style={styles.controlName}>Relay Control (GPIO23)</Text>

        {/* Tappable Relay Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleRelayPress}
            activeOpacity={0.85}
            disabled={isUpdatingRelay}
            style={styles.relayTouchable}
          >
            {/* Outer glow ring */}
            <Animated.View
              style={[
                styles.glowRing,
                {
                  opacity: ringOpacity,
                  shadowRadius: glowRadius,
                  shadowOpacity: glowOpacity,
                  shadowColor: theme.danger,
                  borderColor: relayStatus ? theme.danger : 'transparent',
                },
              ]}
            />

            {/* Relay circle */}
            <View style={[styles.relayCircle, relayStatus && styles.relayCircleOn]}>
              <Text style={[styles.relayIcon, relayStatus && styles.relayIconOn]}>
                {isUpdatingRelay ? 'Updating...' : 'Relay'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Status text */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, relayStatus ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.statusLabel, { color: relayStatus ? theme.danger : theme.textMuted }]}>
            {isUpdatingRelay ? 'Updating...' : relayStatus ? 'OFF  —  Relay is off' : 'ON  —  Relay is active'}
          </Text>
        </View>

        {/* Tap hint */}
        <Text style={styles.tapHint}>Tap the relay to toggle</Text>
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
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  // Control Card
  controlCard: {
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
    marginBottom: 32,
    letterSpacing: 0.3,
  },

  // Relay
  relayTouchable: {
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
  relayCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  relayCircleOn: {
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDotOff: {
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tapHint: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Stats Card
  statsCard: {
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
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ControllerScreen;
