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
import Icon from 'react-native-vector-icons/Feather';
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

  // Room list
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
        const mqttDeviceId = device.mqttDeviceId || device.id;
        
        // Unsubscribe from old listener if exists
        const oldUnsubscribe = unsubscribersRef.current.get(mqttDeviceId);
        if (oldUnsubscribe) oldUnsubscribe();

        // Subscribe to new metrics using MQTT device ID
        const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (metrics: DeviceMetrics) => {
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

  const handleDevicePress = (device: ProvisionedDevice) => {
    navigation.navigate('DeviceDetails', { device });
  };

  const handleDeviceLongPress = (device: ProvisionedDevice) => {
    setSelectedDevice(device);
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
      const deviceNameLower = device.name.toLowerCase();
      let success = false;

      if (deviceNameLower.includes('light') || deviceNameLower.includes('led')) {
        success = await deviceDataService.updateLEDStatus(mqttDeviceId, !metrics.ledStatus);
      } else if (deviceNameLower.includes('relay') || deviceNameLower.includes('pump')) {
        success = await deviceDataService.updateRelayStatus(mqttDeviceId, !metrics.relayStatus);
      } else {
        success = await deviceDataService.updateRelayStatus(mqttDeviceId, !metrics.relayStatus);
      }

      if (success) {
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

    setActivityLog(prev => [newLog, ...prev].slice(0, 5));
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
      `Remove "${selectedDevice.name}" from your dashboard?`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await storageService.removeProvisionedDevice(selectedDevice.id);
              setDevices(devices.filter(d => d.id !== selectedDevice.id));
              
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    const deviceCount = devices.length;
    const onlineCount = getOnlineCount();
    
    let greeting = {
      text: '',
      icon: '',
      subtitle: '',
      iconColor: '',
    };

    if (hour >= 5 && hour < 12) {
      greeting.text = 'Good morning';
      greeting.icon = 'sun';
      greeting.subtitle = 'Ready to power your day?';
      greeting.iconColor = '#FCD34D'; // Yellow sun
    } else if (hour >= 12 && hour < 17) {
      greeting.text = 'Good afternoon';
      greeting.icon = 'cloud';
      greeting.subtitle = 'Your home is running smoothly';
      greeting.iconColor = '#9CA3AF'; // Grey cloud
    } else if (hour >= 17 && hour < 22) {
      greeting.text = 'Good evening';
      greeting.icon = 'moon';
      greeting.subtitle = 'Relax and enjoy your evening';
      greeting.iconColor = '#6366F1'; // Indigo night
    } else {
      greeting.text = 'Good night';
      greeting.icon = 'cloud-rain';
      greeting.subtitle = 'Your home is secure tonight';
      greeting.iconColor = '#60A5FA'; // Blue rain
    }

    return greeting;
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
  const getActiveCount = () => devices.filter(d => d.status === 'online').length;

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
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.greetingContainer}>
            <Icon name={getGreeting().icon} size={18} color={getGreeting().iconColor} />
            <Text style={styles.greetingText}>{getGreeting().text}</Text>
          </View>
        </Animated.View>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>Smart Home</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Icon name="bell" size={19} color="#111827" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => console.log('Settings pressed')}>
              <Icon name="settings" size={19} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusBadgeText}>
            {getActiveCount()} device{getActiveCount() !== 1 ? 's' : ''} active • {getOnlineCount()} online • {getIdleCount()} idle
          </Text>
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
            {rooms.map((room, index) => {
              return (
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
              );
            })}
          </ScrollView>
        </View>

        {devices.length === 0 ? (
          // Empty State
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptySubtitle}>Tap "Add Device" to connect your first ESP32 device</Text>
          </View>
        ) : (
          <>
            {/* Devices Section Header */}
            <View style={styles.devicesSectionHeader}>
              <Text style={styles.devicesSectionTitle}>DEVICES</Text>
              <TouchableOpacity onPress={() => Alert.alert('Manage', 'Device management options')}>
                <Text style={styles.devicesSectionManage}>Manage</Text>
              </TouchableOpacity>
            </View>

            {/* Device Grid */}
            <View style={styles.deviceGrid}>
              {devices.map(device => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceCard,
                    device.status === 'offline' && styles.deviceCardOffline,
                  ]}
                  onPress={() => handleDevicePress(device)}
                  onLongPress={() => handleDeviceLongPress(device)}
                  delayLongPress={500}
                  activeOpacity={0.85}
                >
                  {/* Device Icon - Top */}
                  <View style={styles.deviceCardIconContainer}>
                    <Icon name="smartphone" size={28} color="#3B82F6" />
                  </View>

                  {/* Device Info - Middle */}
                  <View style={styles.deviceCardInfo}>
                    <Text style={styles.deviceCardName} numberOfLines={1}>
                      {device.name}
                    </Text>
                    <Text style={styles.deviceCardRoom} numberOfLines={1}>
                      {device.ssid || 'Connected'}
                    </Text>
                  </View>

                  {/* Status & Toggle - Bottom */}
                  <View style={styles.deviceCardFooter}>
                    <View style={styles.deviceCardStatus}>
                      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(device.status) }]} />
                      <Text style={styles.deviceCardStatusText}>{device.status}</Text>
                    </View>
                    <Switch
                      value={getDeviceToggleState(device)}
                      onValueChange={() => handleToggleDevice(device)}
                      disabled={togglingDevice === device.id || device.status !== 'online'}
                      trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                      thumbColor={getDeviceToggleState(device) ? '#10B981' : '#9CA3AF'}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Energy Usage Section - Only show if we have real data */}
            {/* Currently hidden as we only show real MQTT data */}

            {/* Recent Activity Section */}
            {activityLog.length > 0 && (
              <View style={styles.activitySection}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>Recent Activity</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Activity', 'View all activities')}>
                    <Text style={styles.activitySeeAll}>See all</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.activityList}>
                  {activityLog.map((log, index) => (
                    <View key={log.id} style={[styles.activityItem, index !== activityLog.length - 1 && styles.activityItemBorder]}>
                      <View style={styles.activityItemContent}>
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

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Device Button - Floating Above Nav */}
      <TouchableOpacity
        style={[styles.addDeviceButton, { bottom: insets.bottom + 16 }]}
        onPress={handleAddDevice}
        activeOpacity={0.8}
      >
        <Text style={styles.addDeviceButtonText}>+</Text>
      </TouchableOpacity>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => console.log('Home pressed')}
          activeOpacity={0.7}
        >
          <Icon name="home" size={24} color="#3B82F6" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleAddDevice()}
          activeOpacity={0.7}
        >
          <Icon name="plus" size={24} color="#666666" />
          <Text style={styles.navLabel}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => console.log('Activity pressed')}
          activeOpacity={0.7}
        >
          <Icon name="bar-chart-2" size={24} color="#666666" />
          <Text style={styles.navLabel}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => console.log('Settings pressed')}
          activeOpacity={0.7}
        >
          <Icon name="user" size={24} color="#666666" />
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
              <Text style={styles.menuItemText}>Rename Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowDeviceMenu(false);
                Alert.alert('WiFi Reconfiguration', 'Coming soon');
              }}
            >
              <Text style={styles.menuItemText}>Reconfigure WiFi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowDeviceMenu(false);
                Alert.alert('Restart Device', 'Device restart command sent');
              }}
            >
              <Text style={styles.menuItemText}>Restart Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleRemoveDevice}
            >
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
    backgroundColor: '#F4F7FB',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    gap: 4,
  },

  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },

  greetingIcon: {
    fontSize: 24,
    marginTop: 2,
  },

  greetingTextContainer: {
    flex: 1,
    gap: 2,
  },

  greetingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  greetingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#B4B8C1',
    lineHeight: 16,
  },

  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
    flexShrink: 1,
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },

  iconButton: {
    width: 39,
    height: 39,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },

  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },

  statusBadgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
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
  },

  roomTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  roomTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
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

  // Devices Section Header
  devicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },

  devicesSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
    letterSpacing: 1,
  },

  devicesSectionManage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
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

  deviceCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    justifyContent: 'space-between',
    minHeight: 200,
  },

  deviceCardOffline: {
    opacity: 0.5,
  },

  deviceCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  deviceCardInfo: {
    flex: 1,
    gap: 4,
    marginBottom: 12,
  },

  deviceCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  deviceCardRoom: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  deviceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  deviceCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  deviceCardStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'capitalize',
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

  energyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },

  energyProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
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

  // Activity Section
  activitySection: {
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

  activityHeader: {
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

  activityList: {
    gap: 0,
  },

  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },

  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  activityItemContent: {
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

  // Add Device Button
  addDeviceButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  addDeviceButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
  },

  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },

  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },

  navLabel: {
    fontSize: 11,
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
