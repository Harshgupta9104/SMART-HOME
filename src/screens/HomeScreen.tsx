import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Animated,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getStorageService, ProvisionedDevice } from '../services/storageService';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';

interface ActivityLog {
  id: string;
  deviceName: string;
  action: string;
  timestamp: number;
}

const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<ProvisionedDevice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ProvisionedDevice | null>(null);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [longPressDevice, setLongPressDevice] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('All rooms');
  const [deviceMetrics, setDeviceMetrics] = useState<Map<string, DeviceMetrics>>(new Map());
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [togglingDevice, setTogglingDevice] = useState<string | null>(null);

  // Entry animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const storageService = getStorageService();
  const deviceDataService = getDeviceDataService();
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());

  // Room list - extracted from device names
  const rooms = ['All rooms', 'Living room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office'];

  // Entry animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
          // Update metrics cache
          setDeviceMetrics(prev => new Map(prev).set(mqttDeviceId, metrics));
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

  const handleToggleDevice = async (device: ProvisionedDevice) => {
    const mqttDeviceId = device.mqttDeviceId || device.id;
    const metrics = deviceMetrics.get(mqttDeviceId);
    
    if (!metrics) {
      Alert.alert('Error', 'Device metrics not available');
      return;
    }

    setTogglingDevice(device.id);
    
    try {
      // Determine which control to toggle based on device type
      const deviceNameLower = device.name.toLowerCase();
      let success = false;

      if (deviceNameLower.includes('light') || deviceNameLower.includes('led')) {
        // Toggle LED
        success = await deviceDataService.updateLEDStatus(mqttDeviceId, !metrics.ledStatus);
      } else if (deviceNameLower.includes('relay') || deviceNameLower.includes('pump')) {
        // Toggle Relay
        success = await deviceDataService.updateRelayStatus(mqttDeviceId, !metrics.relayStatus);
      } else {
        // Default to relay
        success = await deviceDataService.updateRelayStatus(mqttDeviceId, !metrics.relayStatus);
      }

      if (success) {
        // Add to activity log
        const action = deviceNameLower.includes('light') || deviceNameLower.includes('led')
          ? `LED turned ${!metrics.ledStatus ? 'ON' : 'OFF'}`
          : `Device turned ${!metrics.relayStatus ? 'ON' : 'OFF'}`;
        
        addActivityLog(device.name, action);
      } else {
        Alert.alert('Error', 'Failed to control device');
      }
    } catch (error) {
      console.error('[HomeScreen] Error toggling device:', error);
      Alert.alert('Error', 'Failed to control device');
    } finally {
      setTogglingDevice(null);
    }
  };

  const addActivityLog = (deviceName: string, action: string) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      deviceName,
      action,
      timestamp: Date.now(),
    };

    setActivityLog(prev => [newLog, ...prev].slice(0, 5)); // Keep last 5 activities
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

  const formatActivityTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase();
    if (name.includes('plant') || name.includes('soil')) return '🌱';
    if (name.includes('light') || name.includes('led')) return '💡';
    if (name.includes('temp') || name.includes('sensor')) return '🌡️';
    if (name.includes('motion')) return '🔍';
    if (name.includes('door') || name.includes('window')) return '🚪';
    if (name.includes('pump') || name.includes('relay')) return '🔌';
    if (name.includes('ac') || name.includes('air')) return '❄️';
    if (name.includes('lock')) return '🔒';
    return '📱';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const greetings = {
      morning: [
        '🌅 Good morning',
        '☀️ Rise and shine',
        '👋 Welcome back',
        '✨ Your smart home is ready',
        '🌤 Hope you have a productive day',
        '⚡ Everything looks good this morning',
        '🏡 Home is active and running smoothly',
      ],
      afternoon: [
        '🌤 Good afternoon',
        '✨ Hope your day is going well',
        '⚡ Your home is running smoothly',
        '📶 Devices are active and connected',
        '🔋 Energy usage looks normal today',
        '🏡 SmartHome Hub is online',
        '👌 Everything is under control',
      ],
      evening: [
        '🌙 Good evening',
        '👋 Welcome home',
        '✨ Your home is calm tonight',
        '🔒 Relax, everything is secure',
        '💡 Evening ambiance is ready',
        '⚡ Devices are stable and connected',
        '🌙 Time to unwind',
      ],
      night: [
        '🌌 Good night',
        '🌙 Your home is resting',
        '🔒 Everything is calm and secure',
        '✨ Night mode is active',
        '😴 Sleep well',
        '⚡ Lights and devices are under control',
        '🏡 SmartHome Hub is protecting your home',
      ],
    };

    let period = 'afternoon';
    if (hour >= 5 && hour < 12) {
      period = 'morning';
    } else if (hour >= 12 && hour < 17) {
      period = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      period = 'evening';
    } else {
      period = 'night';
    }

    const periodGreetings = greetings[period as keyof typeof greetings];
    return periodGreetings[Math.floor(Math.random() * periodGreetings.length)];
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

  const getDeviceToggleState = (device: ProvisionedDevice): boolean => {
    const mqttDeviceId = device.mqttDeviceId || device.id;
    const metrics = deviceMetrics.get(mqttDeviceId);
    
    if (!metrics) return false;
    
    const deviceNameLower = device.name.toLowerCase();
    if (deviceNameLower.includes('light') || deviceNameLower.includes('led')) {
      return metrics.ledStatus || false;
    } else if (deviceNameLower.includes('relay') || deviceNameLower.includes('pump')) {
      return metrics.relayStatus || false;
    }
    
    return false;
  };

  const getOnlineCount = () => devices.filter(d => d.status === 'online').length;
  const getIdleCount = () => devices.filter(d => d.status === 'offline').length;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current.clear();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>SmartHome Hub</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => Alert.alert('Notifications', 'No new notifications')}
              activeOpacity={0.7}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleSettingsPress}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.statusOverview}>
          <View style={styles.statusDot} />
          <Text style={styles.statusOverviewText}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} active
          </Text>
          <Text style={styles.statusOnline}>{getOnlineCount()} online</Text>
          <Text style={styles.statusIdle}>{getIdleCount()} idle</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Room Tabs */}
        <View style={styles.roomTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.roomTabs}
            contentContainerStyle={styles.roomTabsContent}
          >
            {rooms.map(room => (
              <TouchableOpacity
                key={room}
                style={[
                  styles.roomTab,
                  selectedRoom === room && styles.roomTabActive,
                ]}
                onPress={() => setSelectedRoom(room)}
              >
                <Text
                  style={[
                    styles.roomTabText,
                    selectedRoom === room && styles.roomTabTextActive,
                  ]}
                >
                  {room}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {devices.length === 0 ? (
          // Empty State
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptySubtitle}>Tap "Add Device" to connect your first ESP32 device</Text>
          </View>
        ) : (
          <>
            {/* Device Grid */}
            <View style={styles.deviceGrid}>
              {devices.map(device => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceGridCard,
                    device.status === 'offline' && styles.deviceGridCardOffline,
                    longPressDevice === device.id && styles.deviceGridCardPressed,
                  ]}
                  onPress={() => handleDevicePress(device)}
                  onLongPress={() => handleDeviceLongPress(device)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                  {/* Status Indicator */}
                  <View style={styles.deviceCardHeader}>
                    <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(device.status) }]} />
                    <Text style={styles.deviceStatusText}>{device.status}</Text>
                  </View>

                  {/* Device Icon */}
                  <Text style={styles.deviceGridIcon}>{getDeviceIcon(device.name)}</Text>

                  {/* Device Name */}
                  <Text style={styles.deviceGridName} numberOfLines={2}>
                    {device.name}
                  </Text>

                  {/* Room Location */}
                  <Text style={styles.deviceGridRoom}>
                    {device.name}
                  </Text>

                  {/* Status and Toggle Row */}
                  <View style={styles.statusToggleRow}>
                    <View style={styles.statusBadgeContainer}>
                      <View style={[styles.statusBadgeDot, { backgroundColor: getStatusColor(device.status) }]} />
                      <Text style={styles.statusBadgeText}>{device.status}</Text>
                    </View>
                    <View style={styles.toggleContainer}>
                      <Switch
                        value={getDeviceToggleState(device)}
                        onValueChange={() => handleToggleDevice(device)}
                        disabled={togglingDevice === device.id || device.status !== 'online'}
                        trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                        thumbColor={getDeviceToggleState(device) ? '#10B981' : '#9CA3AF'}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Add Device Card */}
              <TouchableOpacity
                style={styles.addDeviceCard}
                onPress={handleAddDevice}
                activeOpacity={0.8}
              >
                <View style={styles.addDeviceIconCircle}>
                  <Text style={styles.addDeviceIconPlus}>+</Text>
                </View>
                <Text style={styles.addDeviceText}>Add Device</Text>
                <Text style={styles.addDeviceSubtext}>Connect Zigbee or WiFi</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Activity Section */}
            {activityLog.length > 0 && (
              <View style={styles.activitySection}>
                <View style={styles.activityHeaderRow}>
                  <Text style={styles.activityTitle}>Recent Activity</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Activity', 'View all activities')}>
                    <Text style={styles.activitySeeAll}>See all</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.activityList}>
                  {activityLog.map(log => (
                    <View key={log.id} style={styles.activityItem}>
                      <View style={styles.activityItemLeft}>
                        <Text style={styles.activityDeviceName}>{log.deviceName}</Text>
                        <Text style={styles.activityAction}>{log.action}</Text>
                      </View>
                      <Text style={styles.activityTime}>{formatActivityTime(log.timestamp)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button - Above Nav Bar */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 70 }]}
        onPress={handleAddDevice}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => console.log('Home pressed')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Devices')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>💻</Text>
          <Text style={styles.navLabel}>Devices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('MetricsScreen')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>�</Text>
          <Text style={styles.navLabel}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>�</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },

  // Header
  header: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  greetingRow: {
    marginBottom: 8,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  headerLeft: {
    flex: 1,
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  notificationButton: {
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

  notificationButtonBg: {
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
    position: 'relative',
  },

  notificationIcon: {
    fontSize: 20,
  },

  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },

  greeting: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 4,
    fontWeight: '400',
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 0,
  },

  statusOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },

  statusOverviewText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },

  statusOnline: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },

  statusIdle: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },

  settingsButton: {
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
  },

  // Room Tabs
  roomTabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  roomTabs: {
    flexGrow: 0,
  },

  roomTabsContent: {
    gap: 8,
    paddingHorizontal: 0,
  },

  roomTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  roomTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  roomTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },

  roomTabTextActive: {
    color: '#FFFFFF',
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

  // Device Grid
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    justifyContent: 'space-between',
  },

  deviceGridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  deviceGridCardOffline: {
    opacity: 0.5,
  },

  deviceGridCardPressed: {
    transform: [{ scale: 0.95 }],
  },

  deviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },

  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  deviceStatusText: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  deviceGridIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  deviceGridName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    height: 36,
  },

  deviceGridStatus: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 10,
    fontWeight: '500',
  },

  deviceGridRoom: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 8,
    fontWeight: '400',
  },

  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 0,
  },

  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusBadgeText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Add Device Card
  addDeviceCard: {
    width: '48%',
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0E8FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  addDeviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  addDeviceIconPlus: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },

  addDeviceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },

  addDeviceSubtext: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '400',
    textAlign: 'center',
  },

  // Activity Section
  activitySection: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },

  activitySeeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Energy Section
  energySection: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  energyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },

  energyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
  },

  energyProgressContainer: {
    gap: 8,
  },

  energyProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },

  energyProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },

  energyLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  energyLegendText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },

  activityList: {
    gap: 12,
  },

  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  activityItemLeft: {
    flex: 1,
  },

  activityDeviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },

  activityAction: {
    fontSize: 12,
    color: '#666666',
  },

  activityTime: {
    fontSize: 11,
    color: '#999999',
    marginLeft: 12,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 70,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },

  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  navIcon: {
    fontSize: 22,
    marginBottom: 3,
  },

  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666666',
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
