import React, { useState, useEffect } from 'react';
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

// Plant health state based on soil moisture
const getPlantState = (moisture: number | undefined) => {
  if (moisture === undefined) return { label: 'Unknown', color: '#9CA3AF', bg: '#F3F4F6', icon: '❓', glow: false };
  if (moisture < 20) return { label: 'Desert Dry', color: '#DC2626', bg: '#FEF2F2', icon: '🏜️', glow: false };
  if (moisture < 40) return { label: 'Dry', color: '#F59E0B', bg: '#FFFBEB', icon: '🌵', glow: false };
  if (moisture < 70) return { label: 'Healthy', color: '#10B981', bg: '#F0FDF4', icon: '🌱', glow: true };
  if (moisture < 90) return { label: 'Wet', color: '#3B82F6', bg: '#EFF6FF', icon: '💧', glow: false };
  return { label: 'Saturated', color: '#6366F1', bg: '#EEF2FF', icon: '🌊', glow: false };
};

const getSignalLabel = (rssi: number | undefined) => {
  if (rssi === undefined) return { label: 'Unknown', color: '#9CA3AF' };
  if (rssi > -55) return { label: 'Strong', color: '#10B981' };
  if (rssi > -75) return { label: 'Medium', color: '#F59E0B' };
  return { label: 'Weak', color: '#EF4444' };
};

const MetricsScreen: React.FC<MetricsScreenProps> = ({ device }) => {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const glowAnim = new Animated.Value(0.6);

  const deviceDataService = getDeviceDataService();

  useEffect(() => {
    if (!device) return;
    const mqttDeviceId = device.mqttDeviceId || device.id;
    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics: DeviceMetrics) => {
      setMetrics(newMetrics);
    });
    return () => unsubscribe();
  }, [device]);

  // Glow pulse animation for healthy state
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const plantState = getPlantState(metrics?.soilMoisture);
  const signal = getSignalLabel(metrics?.wifiRSSI);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Plant Health Hero Card */}
      <Animated.View
        style={[
          styles.heroCard,
          { backgroundColor: plantState.bg },
          plantState.glow && {
            shadowColor: plantState.color,
            shadowOpacity: glowAnim,
            shadowRadius: 20,
            elevation: 8,
          },
        ]}
      >
        <Text style={styles.heroIcon}>{plantState.icon}</Text>
        <Text style={styles.heroTitle}>Plant Health</Text>
        <Text style={[styles.heroState, { color: plantState.color }]}>{plantState.label}</Text>
        <Text style={[styles.heroMoisture, { color: plantState.color }]}>
          {metrics?.soilMoisture !== undefined ? `${metrics.soilMoisture}%` : '—'}
        </Text>
        <Text style={styles.heroLabel}>Soil Moisture</Text>
      </Animated.View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* WiFi Signal */}
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📶</Text>
          <Text style={styles.statValue}>
            {metrics?.wifiRSSI !== undefined ? `${metrics.wifiRSSI}` : '—'}
          </Text>
          <Text style={styles.statUnit}>dBm</Text>
          <Text style={[styles.statBadge, { color: signal.color }]}>{signal.label}</Text>
          <Text style={styles.statLabel}>WiFi Signal</Text>
        </View>

        {/* Temperature */}
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🌡️</Text>
          <Text style={styles.statValue}>
            {metrics?.temperature !== undefined ? `${metrics.temperature}` : '—'}
          </Text>
          <Text style={styles.statUnit}>°C</Text>
          <Text style={styles.statBadge}> </Text>
          <Text style={styles.statLabel}>Temperature</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {/* Humidity */}
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💨</Text>
          <Text style={styles.statValue}>
            {metrics?.humidity !== undefined ? `${metrics.humidity}` : '—'}
          </Text>
          <Text style={styles.statUnit}>%</Text>
          <Text style={styles.statBadge}> </Text>
          <Text style={styles.statLabel}>Humidity</Text>
        </View>

        {/* Uptime */}
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

      {/* Last Updated */}
      {metrics?.lastUpdate && (
        <Text style={styles.lastUpdated}>
          Last updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
        </Text>
      )}
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

  // Hero Card
  heroCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroState: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroMoisture: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
  },
  heroLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  statUnit: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 2,
  },
  statBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    minHeight: 16,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Last Updated
  lastUpdated: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default MetricsScreen;
