import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';
import { ProvisionedDevice } from '../services/storageService';

interface MetricsScreenProps {
  device: ProvisionedDevice;
}

// ─── Plant state logic ────────────────────────────────────────────────────────
const getPlantState = (moisture: number | undefined) => {
  if (moisture === undefined)
    return { label: 'Waiting...', color: '#9CA3AF', bg: '#F9FAFB', ringColor: '#E5E7EB', icon: '🌿' };
  if (moisture < 20)
    return { label: 'Desert Dry', color: '#DC2626', bg: '#FEF2F2', ringColor: '#FCA5A5' };
  if (moisture < 40)
    return { label: 'Dry', color: '#F59E0B', bg: '#FFFBEB', ringColor: '#FCD34D' };
  if (moisture < 70)
    return { label: 'Healthy', color: '#10B981', bg: '#F0FDF4', ringColor: '#6EE7B7' };
  if (moisture < 90)
    return { label: 'Wet', color: '#3B82F6', bg: '#EFF6FF', ringColor: '#93C5FD' };
  return { label: 'Saturated', color: '#6366F1', bg: '#EEF2FF', ringColor: '#A5B4FC' };
};

const getSignalLabel = (rssi: number | undefined) => {
  if (rssi === undefined) return { label: '—', color: '#9CA3AF' };
  if (rssi > -55) return { label: 'Strong', color: '#10B981' };
  if (rssi > -75) return { label: 'Medium', color: '#F59E0B' };
  return { label: 'Weak', color: '#EF4444' };
};

// ─── Circular ring component ──────────────────────────────────────────────────
const RING_SIZE = 130;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface RingProps {
  pct: number;       // 0–100
  color: string;
  children: React.ReactNode;
}

const MoistureRing: React.FC<RingProps> = ({ pct, color, children }) => {
  // We fake the ring with two arcs using border tricks — pure RN, no SVG dep
  const filled = Math.min(Math.max(pct, 0), 100);
  const deg = (filled / 100) * 360;

  return (
    <View style={[ringStyles.wrapper, { width: RING_SIZE, height: RING_SIZE }]}>
      {/* Background track */}
      <View style={[ringStyles.track, { borderColor: '#F3F4F6' }]} />

      {/* Filled arc — clip trick using two half-circles */}
      {deg > 0 && (
        <View style={ringStyles.arcContainer}>
          {/* Right half */}
          <View style={ringStyles.halfClip}>
            <View
              style={[
                ringStyles.halfCircle,
                {
                  borderColor: color,
                  transform: [{ rotate: `${Math.min(deg, 180)}deg` }],
                },
              ]}
            />
          </View>
          {/* Left half — only shown when > 180° */}
          {deg > 180 && (
            <View style={[ringStyles.halfClip, ringStyles.halfClipLeft]}>
              <View
                style={[
                  ringStyles.halfCircle,
                  ringStyles.halfCircleLeft,
                  {
                    borderColor: color,
                    transform: [{ rotate: `${deg - 180}deg` }],
                  },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {/* Center content */}
      <View style={ringStyles.center}>{children}</View>
    </View>
  );
};

const ringStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    width: RING_SIZE - STROKE,
    height: RING_SIZE - STROKE,
    borderRadius: (RING_SIZE - STROKE) / 2,
    borderWidth: STROKE,
  },
  arcContainer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  halfClip: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: RING_SIZE / 2,
    height: RING_SIZE,
    overflow: 'hidden',
  },
  halfClipLeft: {
    right: undefined,
    left: 0,
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: STROKE,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transformOrigin: 'left center',
  },
  halfCircleLeft: {
    right: undefined,
    left: 0,
    borderLeftColor: undefined,
    borderBottomColor: undefined,
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    transformOrigin: 'right center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const MetricsScreen: React.FC<MetricsScreenProps> = ({ device }) => {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);

  // Fade animation for value updates
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // Glow pulse for healthy state
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const deviceDataService = getDeviceDataService();

  useEffect(() => {
    if (!device) return;
    const mqttDeviceId = device.mqttDeviceId || device.id;

    // Seed from cache immediately so screen isn't blank
    const cached = deviceDataService.getMetrics(mqttDeviceId);
    if (cached) setMetrics(cached);

    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics: DeviceMetrics) => {
      // Flash fade on update — feels live
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 120, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setMetrics(newMetrics);
    });
    return () => unsubscribe();
  }, [device]);

  const plantState = getPlantState(metrics?.soilMoisture);
  const signal = getSignalLabel(metrics?.wifiRSSI);
  const moisture = metrics?.soilMoisture ?? 0;

  // Start/stop glow based on healthy state
  useEffect(() => {
    if (plantState.label === 'Healthy') {
      glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
        ])
      );
      glowLoop.current.start();
    } else {
      glowLoop.current?.stop();
      glowAnim.setValue(0.6);
    }
  }, [plantState.label]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* ── MAIN KPI CARD ─────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.mainCard,
          { backgroundColor: plantState.bg },
          plantState.label === 'Healthy' && {
            shadowColor: plantState.color,
            shadowOpacity: glowAnim,
            shadowRadius: 24,
            elevation: 10,
          },
        ]}
      >
        {/* TOP FLOATING CARD — plant state */}
        <View style={[styles.floatingCard, styles.stateCard]}>
          <Text style={styles.stateIcon}>{plantState.icon}</Text>
          <Text style={[styles.stateLabel, { color: plantState.color }]}>
            {plantState.label}
          </Text>
        </View>

        {/* BOTTOM FLOATING CARD — moisture ring + value */}
        <Animated.View style={[styles.floatingCard, styles.moistureCard, { opacity: fadeAnim }]}>
          <MoistureRing pct={moisture} color={plantState.ringColor}>
            <Text style={[styles.moisturePct, { color: plantState.color }]}>
              {metrics?.soilMoisture !== undefined ? `${metrics.soilMoisture}` : '—'}
            </Text>
            {metrics?.soilMoisture !== undefined && (
              <Text style={[styles.moistureUnit, { color: plantState.color }]}>%</Text>
            )}
          </MoistureRing>
          <Text style={styles.moistureLabel}>Soil Moisture</Text>
        </Animated.View>

        {/* Last updated */}
        {metrics?.lastUpdate && (
          <Text style={styles.lastUpdated}>
            {new Date(metrics.lastUpdate).toLocaleTimeString()}
          </Text>
        )}
      </Animated.View>

      {/* ── SECONDARY STAT CARDS ──────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {metrics?.wifiRSSI !== undefined ? `${metrics.wifiRSSI}` : '—'}
          </Text>
          <Text style={styles.statUnit}>dBm</Text>
          <Text style={[styles.statBadge, { color: signal.color }]}>{signal.label}</Text>
          <Text style={styles.statLabel}>WiFi</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {metrics?.temperature !== undefined ? `${metrics.temperature}` : '—'}
          </Text>
          <Text style={styles.statUnit}>°C</Text>
          <Text style={styles.statBadge}> </Text>
          <Text style={styles.statLabel}>Temp</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💨</Text>
          <Text style={styles.statValue}>
            {metrics?.humidity !== undefined ? `${metrics.humidity}` : '—'}
          </Text>
          <Text style={styles.statUnit}>%</Text>
          <Text style={styles.statBadge}> </Text>
          <Text style={styles.statLabel}>Humidity</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statValue}>
            {metrics?.uptime !== undefined ? `${Math.floor(metrics.uptime / 3600)}` : '—'}
          </Text>
          <Text style={styles.statUnit}>hrs</Text>
          <Text style={styles.statBadge}> </Text>
          <Text style={styles.statLabel}>Uptime</Text>
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

  // ── Main KPI card
  mainCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  // ── Floating mini cards
  floatingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
    alignItems: 'center',
  },

  // State card (top)
  stateCard: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    justifyContent: 'center',
  },
  stateIcon: {
    fontSize: 26,
  },
  stateLabel: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Moisture card (bottom)
  moistureCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 10,
  },
  moisturePct: {
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 42,
    textAlign: 'center',
  },
  moistureUnit: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -4,
  },
  moistureLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Last updated
  lastUpdated: {
    fontSize: 10,
    color: '#C4C9D4',
    letterSpacing: 0.3,
  },

  // ── Secondary stat cards
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statUnit: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 2,
  },
  statBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
    minHeight: 14,
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default MetricsScreen;
