import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
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

  // Glow animation for when LED is ON
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const deviceDataService = getDeviceDataService();

  useEffect(() => {
    if (!device) return;
    const mqttDeviceId = device.mqttDeviceId || device.id;
    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics: DeviceMetrics) => {
      setMetrics(newMetrics);
      setLedStatus(newMetrics.ledStatus || false);
    });
    return () => unsubscribe();
  }, [device]);

  // Start/stop glow based on LED state
  useEffect(() => {
    if (ledStatus) {
      glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ])
      );
      glowLoop.current.start();
    } else {
      glowLoop.current?.stop();
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [ledStatus]);

  const handleLEDToggle = async (value: boolean) => {
    if (isUpdatingLED) return;
    setIsUpdatingLED(true);
    // Optimistic update
    setLedStatus(value);
    try {
      const mqttDeviceId = device.mqttDeviceId || device.id;
      const success = await deviceDataService.updateLEDStatus(mqttDeviceId, value);
      if (!success) {
        // Revert on failure
        setLedStatus(!value);
      }
    } catch (error) {
      console.error('[Controller] Error updating LED:', error);
      setLedStatus(!value);
    } finally {
      setIsUpdatingLED(false);
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.25],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Grow Light Control Card */}
      <View style={styles.controlCard}>
        {/* Glow overlay when ON */}
        <Animated.View
          style={[
            styles.glowOverlay,
            { opacity: glowOpacity, backgroundColor: '#FCD34D' },
          ]}
          pointerEvents="none"
        />

        {/* Icon + Label */}
        <View style={styles.controlTop}>
          <Text style={[styles.controlIcon, ledStatus && styles.controlIconOn]}>
            {ledStatus ? '💡' : '🌙'}
          </Text>
          <Text style={styles.controlName}>Grow Light</Text>
          <Text style={[styles.controlStatus, { color: ledStatus ? '#10B981' : '#9CA3AF' }]}>
            {isUpdatingLED ? 'Updating...' : ledStatus ? 'ON' : 'OFF'}
          </Text>
        </View>

        {/* Big Switch */}
        <View style={styles.switchRow}>
          <Text style={styles.switchOffLabel}>Off</Text>
          <Switch
            value={ledStatus}
            onValueChange={handleLEDToggle}
            disabled={isUpdatingLED}
            trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
            thumbColor={ledStatus ? '#10B981' : '#D1D5DB'}
            ios_backgroundColor="#E5E7EB"
            style={styles.bigSwitch}
          />
          <Text style={styles.switchOnLabel}>On</Text>
        </View>

        {/* Status indicator dot */}
        <View style={styles.dotRow}>
          <View style={[styles.statusDot, ledStatus ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.dotLabel, { color: ledStatus ? '#10B981' : '#9CA3AF' }]}>
            {ledStatus ? 'Light is active' : 'Light is off'}
          </Text>
        </View>
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
    borderRadius: 24,
    padding: 32,
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
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },

  // Top section
  controlTop: {
    alignItems: 'center',
    marginBottom: 32,
  },
  controlIcon: {
    fontSize: 64,
    marginBottom: 12,
    opacity: 0.5,
  },
  controlIconOn: {
    opacity: 1,
  },
  controlName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  controlStatus: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  switchOffLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    width: 28,
    textAlign: 'right',
  },
  switchOnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    width: 28,
  },
  bigSwitch: {
    transform: [{ scaleX: 1.6 }, { scaleY: 1.6 }],
  },

  // Status dot
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotOn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDotOff: {
    backgroundColor: '#D1D5DB',
  },
  dotLabel: {
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 14,
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
