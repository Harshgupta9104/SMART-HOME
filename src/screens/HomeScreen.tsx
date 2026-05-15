import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getStorageService, ProvisionedDevice } from '../services/storageService';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';

const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<ProvisionedDevice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ProvisionedDevice | null>(null);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [longPressDevice, setLongPressDevice] = useState<string | null>(null);

  const storageService = getStorageService();
  const deviceDataService = getDeviceDataService();
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());

  // Load devices on screen focus
  useFocusEffect(
    useCallback(() => {
      loadProvisionedDevices();
    }, [])
  );

  const loadProvisionedDevices = async () => {
    try {
      const provisionedDevices = await storageService.getProvisionedDevices();
      setDevices(provisionedDevices);
      console.log('[HomeScreen] Loaded provisioned devices:', provisionedDevices.length);

      // Subscribe to real-time metrics for each device
      provisionedDevices.forEach(device => {
        // Use MQTT device ID if available, fallback to device.id
        const mqttDeviceId = device.mqttDeviceId || device.id;
        
        // Unsubscribe from old listener if exists
        const oldUnsubscribe = unsubscribersRef.current.get(mqttDeviceId);
        if (oldUnsubscribe) oldUnsubscribe();

        // Subscribe to new metrics using MQTT device ID
        const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (metrics: DeviceMetrics) => {
          // Metrics are cached in deviceDataService, no need to store locally
          console.log('[HomeScreen] Device metrics updated:', mqttDeviceId);
        });

        unsubscribersRef.current.set(mqttDeviceId, unsubscribe);
      });
    } catch (error) {
      console.error('[HomeScreen] Error loading provisioned devices:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProvisionedDevices();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleAddDevice = () => {
    console.log('[HomeScreen] Add device pressed');
    navigation.navigate('SimpleBleProvision');
  };

  const handleSettingsPress = () => {
    console.log('[HomeScreen] Settings pressed');
    navigation.navigate('Settings');
  };

  const handleDevicePress = (device: ProvisionedDevice) => {
    navigation.navigate('DeviceDetails', { device });
  };

  const handleDeviceLongPress = (device: ProvisionedDevice) => {
    setSelectedDevice(device);
    setLongPressDevice(device.id);
    setShowDeviceMenu(true);
  };

  const handleRenameDevice = async () => {
    if (!selectedDevice || !newDeviceName.trim()) return;

    try {
      const updatedDevice = {
        ...selectedDevice,
        name: newDeviceName.trim(),
      };
      await storageService.addProvisionedDevice(updatedDevice);
      setDevices(devices.map(d => d.id === selectedDevice.id ? updatedDevice : d));
      setShowRenameModal(false);
      setShowDeviceMenu(false);
      setNewDeviceName('');
    } catch (error) {
      console.error('[HomeScreen] Error renaming device:', error);
      Alert.alert('Error', 'Failed to rename device');
    }
  };

  const handleRemoveDevice = () => {
    if (!selectedDevice) return;

    Alert.alert(
      'Remove Device',
      `Remove "${selectedDevice.name}" from your dashboard?\n\nThis will remove the device from your dashboard.`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await storageService.removeProvisionedDevice(selectedDevice.id);
              setDevices(devices.filter(d => d.id !== selectedDevice.id));
              
              // Unsubscribe from metrics
              const unsubscribe = unsubscribersRef.current.get(selectedDevice.id);
              if (unsubscribe) unsubscribe();
              unsubscribersRef.current.delete(selectedDevice.id);

              setShowDeviceMenu(false);
              setSelectedDevice(null);
            } catch (error) {
              console.error('[HomeScreen] Error removing device:', error);
              Alert.alert('Error', 'Failed to remove device');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleReconfigureWiFi = () => {
    if (!selectedDevice) return;
    setShowDeviceMenu(false);
    // TODO: Navigate to WiFi reconfiguration screen
    Alert.alert('WiFi Reconfiguration', 'Coming soon');
  };

  const handleRestartDevice = () => {
    if (!selectedDevice) return;
    setShowDeviceMenu(false);
    // TODO: Send restart command via BLE/MQTT
    Alert.alert('Restart Device', 'Device restart command sent');
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase();
    if (name.includes('plant') || name.includes('soil')) return '🌱';
    if (name.includes('light') || name.includes('led')) return '💡';
    if (name.includes('temp') || name.includes('sensor')) return '🌡️';
    if (name.includes('motion')) return '🔍';
    if (name.includes('door') || name.includes('window')) return '🚪';
    return '📱';
  };

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current.clear();
    };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Good Afternoon 👋</Text>
          <Text style={styles.headerTitle}>SmartHome Hub</Text>
          <Text style={styles.headerSubtitle}>{devices.length} Device{devices.length !== 1 ? 's' : ''} Connected</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
          activeOpacity={0.7}
        >
          <View style={styles.settingsButtonBg}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {devices.length === 0 ? (
          // Empty State
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptySubtitle}>Tap "Add Device" to connect your first ESP32 device</Text>
          </View>
        ) : (
          // Device Cards
          <View style={styles.deviceList}>
            {devices.map(device => (
              <TouchableOpacity
                key={device.id}
                style={[
                  styles.deviceCard,
                  device.status === 'offline' && styles.deviceCardOffline,
                  longPressDevice === device.id && styles.deviceCardPressed,
                ]}
                onPress={() => handleDevicePress(device)}
                onLongPress={() => handleDeviceLongPress(device)}
                delayLongPress={500}
                activeOpacity={0.8}
              >
                {/* Status Dot */}
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(device.status) }]}>
                  {device.status === 'online' && <View style={styles.statusPulse} />}
                </View>

                {/* Device Icon */}
                <Text style={styles.deviceIcon}>{getDeviceIcon(device.name)}</Text>

                {/* Device Info */}
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName} numberOfLines={1}>
                      {device.name}
                    </Text>
                    <Text style={styles.statusDot}>{getStatusDot(device.status)}</Text>
                  </View>

                  <Text style={styles.deviceStatus}>
                    {device.status === 'online' ? `Connected to ${device.ssid}` : 'Device Offline'}
                  </Text>

                  <Text style={styles.deviceLastSeen}>
                    Last Seen: {formatLastSeen(device.lastSeen)}
                  </Text>
                </View>

                {/* Chevron */}
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={handleAddDevice}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>＋</Text>
        <Text style={styles.fabText}>Add Device</Text>
      </TouchableOpacity>

      {/* Device Menu Bottom Sheet */}
      <Modal
        visible={showDeviceMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeviceMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeviceMenu(false)}
        >
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.bottomSheetHandle} />

            <Text style={styles.bottomSheetTitle}>Manage Device</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowDeviceMenu(false);
                setShowRenameModal(true);
                setNewDeviceName(selectedDevice?.name || '');
              }}
            >
              <Text style={styles.menuItemIcon}>✏️</Text>
              <Text style={styles.menuItemText}>Rename Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReconfigureWiFi}
            >
              <Text style={styles.menuItemIcon}>📶</Text>
              <Text style={styles.menuItemText}>Reconfigure WiFi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRestartDevice}
            >
              <Text style={styles.menuItemIcon}>🔄</Text>
              <Text style={styles.menuItemText}>Restart Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleRemoveDevice}
            >
              <Text style={styles.menuItemIcon}>🗑️</Text>
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Remove Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItemCancel}
              onPress={() => setShowDeviceMenu(false)}
            >
              <Text style={styles.menuItemCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRenameModal(false)}
        >
          <View style={styles.renameModal}>
            <Text style={styles.renameTitle}>Rename Device</Text>

            <TextInput
              style={styles.renameInput}
              placeholder="Enter device name"
              placeholderTextColor="#9CA3AF"
              value={newDeviceName}
              onChangeText={setNewDeviceName}
              maxLength={30}
            />

            <View style={styles.renameButtonRow}>
              <TouchableOpacity
                style={[styles.renameButton, styles.renameCancelButton]}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.renameCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.renameButton, styles.renameSaveButton]}
                onPress={handleRenameDevice}
              >
                <Text style={styles.renameSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  headerLeft: {
    flex: 1,
  },

  greeting: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#999999',
  },

  settingsButton: {
    padding: 8,
  },

  settingsButtonBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  settingsIcon: {
    fontSize: 20,
  },

  // Scroll View
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Device List
  deviceList: {
    paddingVertical: 12,
    gap: 12,
  },

  // Device Card
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  deviceCardOffline: {
    opacity: 0.6,
  },

  deviceCardPressed: {
    transform: [{ scale: 0.98 }],
  },

  // Status Indicator
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    position: 'relative',
  },

  statusPulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    opacity: 0.5,
  },

  // Device Icon
  deviceIcon: {
    fontSize: 32,
    marginRight: 12,
  },

  // Device Info
  deviceInfo: {
    flex: 1,
  },

  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },

  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },

  statusDot: {
    fontSize: 12,
  },

  deviceStatus: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },

  deviceLastSeen: {
    fontSize: 11,
    color: '#999999',
  },

  // Chevron
  chevron: {
    fontSize: 20,
    color: '#CCCCCC',
    marginLeft: 8,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 28,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  fabIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    marginRight: 6,
  },

  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 100,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },

  // Bottom Sheet
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },

  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },

  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  menuItemDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  menuItemTextDanger: {
    color: '#EF4444',
  },

  menuItemCancel: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },

  menuItemCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Rename Modal
  renameModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    justifyContent: 'center',
  },

  renameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },

  renameInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },

  renameButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },

  renameButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  renameCancelButton: {
    backgroundColor: '#F3F4F6',
  },

  renameCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  renameSaveButton: {
    backgroundColor: '#3B82F6',
  },

  renameSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
