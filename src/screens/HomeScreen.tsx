import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { getStorageService, ProvisionedDevice, RoomSortMode } from '../services/storageService';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';
import { useTheme } from '../context/ThemeContext';

interface ActivityLog {
  id: string;
  deviceName: string;
  action: string;
  timestamp: number;
}

const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [devices, setDevices] = useState<ProvisionedDevice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('All rooms');
  const [deviceMetrics, setDeviceMetrics] = useState<Map<string, DeviceMetrics>>(new Map());
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [togglingDevice, setTogglingDevice] = useState<string | null>(null);

  const storageService = getStorageService();
  const deviceDataService = getDeviceDataService();
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());
  const [rooms, setRooms] = useState<string[]>(['All rooms']);

  useFocusEffect(
    useCallback(() => {
      loadProvisionedDevices();
      loadRooms();
    }, [])
  );

  const loadRooms = async () => {
    try {
      const savedRooms = await storageService.getRooms();
      const sortMode = await storageService.getRoomSortMode();
      const sortedRooms = sortRooms(savedRooms, sortMode, devices);
      setRooms(['All rooms', ...sortedRooms]);
      
      // If selected room was deleted, reset to "All rooms"
      if (selectedRoom !== 'All rooms' && !['All rooms', ...sortedRooms].includes(selectedRoom)) {
        setSelectedRoom('All rooms');
      }
    } catch (error) {
      console.error('[HomeScreen] Error loading rooms:', error);
    }
  };

  const loadProvisionedDevices = async () => {
    try {
      const provisionedDevices = await storageService.getProvisionedDevices();
      setDevices(provisionedDevices);

      provisionedDevices.forEach((device: ProvisionedDevice) => {
        const mqttDeviceId = device.mqttDeviceId || device.id;
        const oldUnsubscribe = unsubscribersRef.current.get(mqttDeviceId);
        if (oldUnsubscribe) oldUnsubscribe();

        const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (metrics: DeviceMetrics) => {
          setDeviceMetrics(prev => new Map(prev).set(mqttDeviceId, metrics));
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
    loadRooms();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleAddDevice = () => {
    navigation.navigate('AddDevice');
  };

  const handleDevicePress = (device: ProvisionedDevice) => {
    navigation.navigate('DeviceDetails', { device });
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
        const action =
          deviceNameLower.includes('light') || deviceNameLower.includes('led')
            ? `LED turned ${!metrics.ledStatus ? 'ON' : 'OFF'}`
            : `Device turned ${!metrics.relayStatus ? 'ON' : 'OFF'}`;
        addActivityLog(device, action);
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

  const addActivityLog = (device: ProvisionedDevice, action: string) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      deviceName: device.displayName || device.name,
      action,
      timestamp: Date.now(),
    };
    setActivityLog(prev => [newLog, ...prev].slice(0, 5));
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

    if (hour >= 5 && hour < 12) {
      return { text: 'Good morning', icon: 'sun', color: theme.warning };
    } else if (hour >= 12 && hour < 17) {
      return { text: 'Good afternoon', icon: 'cloud', color: theme.textMuted };
    } else if (hour >= 17 && hour < 22) {
      return { text: 'Good evening', icon: 'moon', color: theme.primary };
    } else {
      return { text: 'Good night', icon: 'cloud-rain', color: theme.primary };
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

  const getDeviceDisplayName = (device: ProvisionedDevice): string => {
    return device.displayName || device.name || 'Smart Device';
  };

  const getDeviceRoom = (device: ProvisionedDevice): string => {
    return device.roomName || 'Unassigned';
  };

  // Helper: Normalize room names for safe comparison
  const normalizeRoomName = (roomName?: string): string => {
    return (roomName || 'Unassigned').trim().toLowerCase();
  };

  // Helper: Get device count for a specific room
  const getRoomDeviceCount = (room: string): number => {
    if (room === 'All rooms') return devices.length;
    return devices.filter(device => normalizeRoomName(device.roomName) === normalizeRoomName(room)).length;
  };

  // Helper: Get device count by room name (for sorting)
  const getRoomDeviceCountByName = (room: string, deviceList: ProvisionedDevice[]): number => {
    return deviceList.filter(device => normalizeRoomName(device.roomName) === normalizeRoomName(room)).length;
  };

  // Helper: Sort rooms based on sort mode
  const sortRooms = (roomList: string[], sortMode: RoomSortMode, deviceList: ProvisionedDevice[]): string[] => {
    const roomsCopy = [...roomList];
    switch (sortMode) {
      case 'name_asc':
        return roomsCopy.sort((a, b) => a.localeCompare(b));
      case 'name_desc':
        return roomsCopy.sort((a, b) => b.localeCompare(a));
      case 'device_count_desc':
        return roomsCopy.sort((a, b) => {
          const countDiff =
            getRoomDeviceCountByName(b, deviceList) - getRoomDeviceCountByName(a, deviceList);
          if (countDiff !== 0) return countDiff;
          return a.localeCompare(b);
        });
      case 'device_count_asc':
        return roomsCopy.sort((a, b) => {
          const countDiff =
            getRoomDeviceCountByName(a, deviceList) - getRoomDeviceCountByName(b, deviceList);
          if (countDiff !== 0) return countDiff;
          return a.localeCompare(b);
        });
      case 'custom':
      default:
        return roomsCopy;
    }
  };

  // Filter devices by selected room
  const filteredDevices = selectedRoom === 'All rooms'
    ? devices
    : devices.filter(device => normalizeRoomName(device.roomName) === normalizeRoomName(selectedRoom));

  const getActiveCount = (): number => {
    return devices.filter(device => device.status === 'online' && getDeviceToggleState(device)).length;
  };

  const getOnlineCount = (): number => {
    return devices.filter(device => device.status === 'online').length;
  };

  const getIdleCount = (): number => {
    return devices.filter(device => device.status === 'online' && !getDeviceToggleState(device)).length;
  };

  useEffect(() => {
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current.clear();
    };
  }, []);

  const greeting = getGreeting();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <Icon name={greeting.icon} size={18} color={greeting.color} />
            <Text style={[styles.greetingText, { color: theme.textSecondary }]}>{greeting.text}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Smart Home</Text>
            <View style={styles.headerIconsRow}>
              <TouchableOpacity
                style={[styles.headerIcon, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Icon name="bell" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerIcon, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => navigation.navigate('Settings')}
              >
                <Icon name="settings" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: theme.primarySoft }]}>
              <View style={[styles.statDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>{getActiveCount()} On</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: theme.primarySoft }]}>
              <View style={[styles.statDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>{getOnlineCount()} Online</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: theme.primarySoft }]}>
              <View style={[styles.statDot, { backgroundColor: theme.textMuted }]} />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>{getIdleCount()} Off</Text>
            </View>
          </View>
        </View>

        {/* Room Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomTabsScroll}>
          <View style={styles.roomTabsContent}>
            {rooms.map(room => {
              const roomCount = getRoomDeviceCount(room);
              return (
                <TouchableOpacity
                  key={room}
                  style={[
                    styles.roomTab,
                    {
                      backgroundColor: selectedRoom === room ? theme.primary : theme.chipBackground,
                      borderColor: selectedRoom === room ? 'transparent' : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedRoom(room)}
                >
                  <Text
                    style={[
                      styles.roomTabText,
                      { color: selectedRoom === room ? theme.background : theme.textSecondary },
                    ]}
                  >
                    {room} {roomCount > 0 ? `(${roomCount})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Content */}
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No devices found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Tap "Add Device" to connect your first ESP32 device
            </Text>
          </View>
        ) : filteredDevices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              No devices in {selectedRoom}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Devices assigned to this room will appear here
            </Text>
          </View>
        ) : (
          <>
            {/* Devices Section */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DEVICES</Text>
              <TouchableOpacity onPress={() => Alert.alert('Manage', 'Device management options')}>
                <Text style={[styles.manageText, { color: theme.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deviceGrid}>
              {filteredDevices.map(device => (
                <View key={device.id} style={styles.deviceGridCell}>
                  <TouchableOpacity
                    style={[
                      styles.deviceCard,
                      { backgroundColor: theme.card, opacity: device.status === 'offline' ? 0.5 : 1 },
                    ]}
                    onPress={() => handleDevicePress(device)}
                  >
                    <View style={[styles.deviceIconBox, { backgroundColor: theme.primarySoft }]}>
                      <Icon name="smartphone" size={24} color={theme.primary} />
                    </View>

                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {getDeviceDisplayName(device)}
                      </Text>
                      <Text style={[styles.deviceRoom, { color: theme.textSecondary }]} numberOfLines={1}>
                        {getDeviceRoom(device)}
                      </Text>
                    </View>

                    <View style={styles.deviceControl}>
                      <Text style={[styles.deviceStatus, { color: theme.textPrimary }]}>
                        {device.status === 'offline' ? 'Offline' : getDeviceToggleState(device) ? 'ON' : 'OFF'}
                      </Text>
                      <Switch
                        value={getDeviceToggleState(device)}
                        onValueChange={() => handleToggleDevice(device)}
                        disabled={togglingDevice === device.id || device.status !== 'online'}
                        trackColor={{ false: theme.border, true: theme.success }}
                        thumbColor={getDeviceToggleState(device) ? theme.success : theme.icon}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Activity Section */}
            <View style={[styles.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.activityHeader}>
                <Text style={[styles.activityTitle, { color: theme.textPrimary }]}>Live Activity</Text>
                {activityLog.length > 0 && (
                  <TouchableOpacity onPress={() => Alert.alert('Activity', 'View all activities')}>
                    <Text style={[styles.seeAll, { color: theme.primary }]}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>

              {activityLog.length > 0 ? (
                <View>
                  {activityLog.map((log, index) => (
                    <View
                      key={log.id}
                      style={[
                        styles.activityItem,
                        { borderBottomColor: theme.border, borderBottomWidth: index !== activityLog.length - 1 ? 1 : 0 },
                      ]}
                    >
                      <View style={[styles.activityDot, { backgroundColor: theme.primary }]} />
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityDeviceName, { color: theme.textPrimary }]}>
                          {log.deviceName}
                        </Text>
                        <Text style={[styles.activityAction, { color: theme.textSecondary }]}>{log.action}</Text>
                      </View>
                      <Text style={[styles.activityTime, { color: theme.textMuted }]}>
                        {formatActivityTime(log.timestamp)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyActivity}>
                  <View style={[styles.emptyActivityIcon, { backgroundColor: theme.background }]}>
                    <Icon name="activity" size={20} color={theme.danger} />
                  </View>
                  <Text style={[styles.emptyActivityText, { color: theme.textSecondary }]}>Everything is quiet</Text>
                  <Text style={[styles.emptyActivitySubtitle, { color: theme.textMuted }]}>
                    Device events will appear here
                  </Text>
                  {devices.length > 0 && (
                    <View style={styles.monitoringBadge}>
                      <View
                        style={[
                          styles.monitoringDot,
                          { backgroundColor: devices.some(d => d.status === 'online') ? theme.success : theme.border },
                        ]}
                      />
                      <Text style={[styles.monitoringText, { color: theme.textMuted }]}>
                        Monitoring {devices.length} {devices.length === 1 ? 'device' : 'devices'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={{ height: 140 }} />
          </>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: theme.bottomNav,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HomeMain')}>
          <Icon name="home" size={20} color={theme.primary} />
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleAddDevice}>
          <View style={[styles.addButton, { backgroundColor: theme.primarySoft }]}>
            <Icon name="plus" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Icon name="user" size={20} color={theme.textSecondary} />
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    flex: 1,
  },
  headerIconsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 10,
    fontWeight: '600',
  },
  roomTabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  roomTabsContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  roomTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  roomTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  manageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 10,
  },
  deviceGridCell: {
    width: '48%',
  },
  deviceCard: {
    borderRadius: 12,
    padding: 14,
    minHeight: 180,
    gap: 10,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
  },
  deviceRoom: {
    fontSize: 10,
    fontWeight: '500',
  },
  deviceControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  activityCard: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityContent: {
    flex: 1,
    gap: 2,
  },
  activityDeviceName: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityAction: {
    fontSize: 10,
  },
  activityTime: {
    fontSize: 9,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyActivityIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyActivityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyActivitySubtitle: {
    fontSize: 10,
    textAlign: 'center',
  },
  monitoringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  monitoringDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  monitoringText: {
    fontSize: 9,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  addButton: {
    width: 38,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
