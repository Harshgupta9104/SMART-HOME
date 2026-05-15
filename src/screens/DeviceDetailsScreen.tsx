import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProvisionedDevice } from '../services/storageService';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';
import { getMQTTService } from '../services/mqttService';

interface DeviceDetailsScreenProps {
  navigation: any;
  route: any;
}

const DeviceDetailsScreen: React.FC<DeviceDetailsScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const device: ProvisionedDevice = route?.params?.device;
  
  const [activeTab, setActiveTab] = useState<'control' | 'settings'>('control');
  const [ledStatus, setLedStatus] = useState(false);
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [isUpdatingLED, setIsUpdatingLED] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);

  const deviceDataService = getDeviceDataService();
  const mqttService = getMQTTService();

  // Subscribe to real-time metrics and check MQTT status
  useEffect(() => {
    if (!device) return;

    // Check MQTT connection status
    setMqttConnected(mqttService.isConnectedToMQTT());

    // Use MQTT device ID if available, fallback to device.id
    const mqttDeviceId = device.mqttDeviceId || device.id;

    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics: DeviceMetrics) => {
      setMetrics(newMetrics);
      setLedStatus(newMetrics.ledStatus || false);
    });

    return () => unsubscribe();
  }, [device, deviceDataService, mqttService]);

  const handleLEDToggle = async (value: boolean) => {
    setIsUpdatingLED(true);
    try {
      // Use MQTT device ID if available, fallback to device.id
      const mqttDeviceId = device.mqttDeviceId || device.id;
      const success = await deviceDataService.updateLEDStatus(mqttDeviceId, value);
      if (success) {
        setLedStatus(value);
      }
    } catch (error) {
      console.error('[DeviceDetails] Error updating LED:', error);
    } finally {
      setIsUpdatingLED(false);
    }
  };

  if (!device) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Device not found</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'offline':
        return '#EF4444';
      case 'connecting':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'connecting':
        return '🟡';
      default:
        return '⚪';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Device Info */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusDot}>{getStatusDot(device.status)}</Text>
            <Text style={[styles.statusText, { color: getStatusColor(device.status) }]}>
              {device.status}
            </Text>
          </View>
        </View>

        {/* MQTT Status Box */}
        <View style={[styles.mqttStatusBox, mqttConnected ? styles.mqttConnected : styles.mqttDisconnected]}>
          <View style={[styles.mqttStatusDot, mqttConnected ? styles.mqttDotConnected : styles.mqttDotDisconnected]} />
          <Text style={styles.mqttStatusText}>{mqttConnected ? 'MQTT' : 'Offline'}</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'control' && styles.tabActive]}
          onPress={() => setActiveTab('control')}
        >
          <Text style={[styles.tabText, activeTab === 'control' && styles.tabTextActive]}>
            💡 LED Control
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            ⚙️ Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'control' && (
          <View style={styles.tabContent}>
            {/* LED Control Section */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Text style={styles.controlTitle}>LED Status</Text>
                <Text style={styles.controlIcon}>💡</Text>
              </View>
              
              <View style={styles.ledStatusContainer}>
                <Text style={styles.ledStatusLabel}>
                  {ledStatus ? 'LED is ON' : 'LED is OFF'}
                </Text>
                <View style={[styles.ledIndicator, ledStatus && styles.ledIndicatorOn]} />
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Toggle LED</Text>
                <Switch
                  value={ledStatus}
                  onValueChange={handleLEDToggle}
                  disabled={isUpdatingLED}
                  trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                  thumbColor={ledStatus ? '#10B981' : '#9CA3AF'}
                  style={styles.switch}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, ledStatus && styles.buttonActive, isUpdatingLED && styles.buttonDisabled]}
                onPress={() => handleLEDToggle(!ledStatus)}
                disabled={isUpdatingLED}
              >
                <Text style={styles.buttonText}>
                  {isUpdatingLED ? 'Updating...' : (ledStatus ? 'Turn OFF' : 'Turn ON')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Real-Time Metrics Grid */}
            <View style={styles.metricsGrid}>
              <Text style={styles.metricsTitle}>Real-Time Metrics</Text>
              
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>💧</Text>
                  <Text style={styles.metricLabel}>Soil Moisture</Text>
                  <Text style={styles.metricValue}>
                    {metrics?.soilMoisture !== undefined ? `${metrics.soilMoisture}%` : 'N/A'}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>📶</Text>
                  <Text style={styles.metricLabel}>WiFi RSSI</Text>
                  <Text style={styles.metricValue}>
                    {metrics?.wifiRSSI !== undefined ? `${metrics.wifiRSSI} dBm` : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>🌡️</Text>
                  <Text style={styles.metricLabel}>Temperature</Text>
                  <Text style={styles.metricValue}>
                    {metrics?.temperature !== undefined ? `${metrics.temperature}°C` : 'N/A'}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>💨</Text>
                  <Text style={styles.metricLabel}>Humidity</Text>
                  <Text style={styles.metricValue}>
                    {metrics?.humidity !== undefined ? `${metrics.humidity}%` : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>⏱️</Text>
                  <Text style={styles.metricLabel}>Uptime</Text>
                  <Text style={styles.metricValue}>
                    {metrics?.uptime !== undefined ? `${Math.floor(metrics.uptime / 3600)}h` : 'N/A'}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>💾</Text>
                  <Text style={styles.metricLabel}>Free Heap</Text>
                  <Text style={styles.metricValue}>
                    {metrics?.freeHeap !== undefined ? `${Math.floor(metrics.freeHeap / 1024)}KB` : 'N/A'}
                  </Text>
                </View>
              </View>

              {metrics?.lastUpdate && (
                <Text style={styles.lastUpdateText}>
                  Last updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
                </Text>
              )}
            </View>

            {/* Device Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Device Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Device ID</Text>
                <Text style={styles.infoValue}>{device.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MAC Address</Text>
                <Text style={styles.infoValue}>{device.macAddress}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>WiFi Network</Text>
                <Text style={styles.infoValue}>{device.ssid}</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.tabContent}>
            {/* Device Settings */}
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Device Settings</Text>

              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>Auto-reconnect</Text>
                  <Text style={styles.settingDescription}>Automatically reconnect when offline</Text>
                </View>
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                  thumbColor="#10B981"
                />
              </View>

              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>Notifications</Text>
                  <Text style={styles.settingDescription}>Receive device alerts</Text>
                </View>
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                  thumbColor="#10B981"
                />
              </View>

              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>Debug Mode</Text>
                  <Text style={styles.settingDescription}>Show detailed logs</Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                  thumbColor="#10B981"
                />
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerCard}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              
              <TouchableOpacity style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Restart Device</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Reset WiFi</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.dangerButton, styles.deleteButton]}>
                <Text style={styles.deleteButtonText}>Remove Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },

  backButton: {
    fontSize: 28,
    color: '#1F2937',
    fontWeight: '300',
  },

  headerInfo: {
    flex: 1,
  },

  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    fontSize: 12,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // MQTT Status Box
  mqttStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },

  mqttConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },

  mqttDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },

  mqttStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  mqttDotConnected: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },

  mqttDotDisconnected: {
    backgroundColor: '#EF4444',
  },

  mqttStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  tabActive: {
    borderBottomColor: '#3B82F6',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  tabTextActive: {
    color: '#3B82F6',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  tabContent: {
    gap: 16,
  },

  // LED Control Card
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  controlTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },

  controlIcon: {
    fontSize: 24,
  },

  ledStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 16,
  },

  ledStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  ledIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },

  ledIndicatorOn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },

  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },

  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },

  button: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonActive: {
    backgroundColor: '#EF4444',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  infoValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },

  // Metrics Grid
  metricsGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  metricsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  metricCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },

  metricIcon: {
    fontSize: 24,
    marginBottom: 6,
  },

  metricLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },

  lastUpdateText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Settings Card
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  settingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },

  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Danger Zone
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
  },

  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },

  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },

  deleteButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },

  deleteButtonText: {
    color: '#FFFFFF',
  },
});

export default DeviceDetailsScreen;
