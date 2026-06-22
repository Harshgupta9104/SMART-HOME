import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  Animated,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { getStorageService, ProvisionedDevice } from '../services/storageService';
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

  // Entry animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const storageService = getStorageService();
  const deviceDataService = getDeviceDataService();

  // Reference for MQTT unsubscribers
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

      // Subscribe to real-time metrics for each device
      provisionedDevices.forEach((device: ProvisionedDevice) => {
        const mqttDeviceId = device.mqttDeviceId || device.id;

        // Unsubscribe from old listener if exists
        const oldUnsubscribe = unsubscribersRef.current.get(mqttDeviceId);
        if (oldUnsubscribe) oldUnsubscribe();

        // Subscribe to new metrics using MQTT device ID
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
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
      greeting.iconColor = theme.warning;
    } else if (hour >= 12 && hour < 17) {
      greeting.text = 'Good afternoon';
      greeting.icon = 'cloud';
      greeting.subtitle = 'Your home is running smoothly';
      greeting.iconColor = theme.textMuted;
    } else if (hour >= 17 && hour < 22) {
      greeting.text = 'Good evening';
      greeting.icon = 'moon';
      greeting.subtitle = 'Relax and enjoy your evening';
      greeting.iconColor = theme.primary;
    } else {
      greeting.text = 'Good night';
      greeting.icon = 'cloud-rain';
      greeting.subtitle = 'Your home is secure tonight';
      greeting.iconColor = theme.primary;
    }

    return greeting;
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
    if (device.displayName) {
      return device.displayName;
    }
    return device.name || 'Smart Device';
  };

  const getDeviceRoom = (device: ProvisionedDevice): string => {
    if (device.roomName) {
      return device.roomName;
    }
    return 'Home';
  };

  const getActiveCount = (): number => {
    return devices.filter(device => device.status === 'online' && getDeviceToggleState(device)).length;
  };

  const getOnlineCount = (): number => {
    return devices.filter(device => device.status === 'online').length;
  };

  const getIdleCount = (): number => {
    return devices.filter(device => device.status === 'online' && !getDeviceToggleState(device)).length;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribersRef.current.clear();
    };
  }, []);

  return (
    <Animated.View
      className="flex-1"
      style={{
        paddingTop: insets.top,
        backgroundColor: theme.background,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View className="px-5 py-4 gap-1">
        <Animated.View style={{ opacity: fadeAnim }}>
          <View className="flex-row items-start gap-2 mb-1">
            <Icon name={getGreeting().icon} size={18} color={getGreeting().iconColor} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>
              {getGreeting().text}
            </Text>
          </View>
        </Animated.View>
        <View className="flex-row justify-between items-center gap-4 mt-1">
          <Text
            className="text-4xl font-extrabold shrink"
            style={{ color: theme.textPrimary, letterSpacing: -1 }}
          >
            Smart Home
          </Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="w-10 h-10 rounded-lg justify-center items-center"
              style={{
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="bell" size={19} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 rounded-lg justify-center items-center"
              style={{
                backgroundColor: theme.surface,
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
                borderWidth: 1,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              }}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings" size={19} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Chips */}
        <View className="flex-row gap-2 mt-1">
          <View
            className="flex-row items-center gap-1 px-3 py-2 rounded-full border"
            style={{
              backgroundColor: theme.primarySoft,
              borderColor: isDark ? `rgba(16, 185, 129, 0.3)` : `rgba(16, 185, 129, 0.2)`,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>{getActiveCount()} On</Text>
          </View>
          <View
            className="flex-row items-center gap-1 px-3 py-2 rounded-full border"
            style={{
              backgroundColor: theme.primarySoft,
              borderColor: isDark ? `rgba(59, 130, 246, 0.3)` : `rgba(59, 130, 246, 0.2)`,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>
              {getOnlineCount()} Online
            </Text>
          </View>
          <View
            className="flex-row items-center gap-1 px-3 py-2 rounded-full border"
            style={{
              backgroundColor: theme.primarySoft,
              borderColor: isDark ? `rgba(209, 213, 219, 0.3)` : `rgba(209, 213, 219, 0.2)`,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.textMuted }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>{getIdleCount()} Off</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Room Tabs */}
        <View className="px-4 py-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {rooms.map(room => {
              return (
                <TouchableOpacity
                  key={room}
                  className="px-3 py-2 rounded-full border flex-row items-center gap-2"
                  style={{
                    backgroundColor: selectedRoom === room ? theme.primary : theme.chipBackground,
                    borderColor: selectedRoom === room ? theme.primary : theme.border,
                    shadowColor: theme.shadow,
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }}
                  onPress={() => setSelectedRoom(room)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: selectedRoom === room ? theme.background : theme.textSecondary,
                    }}
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
          <View className="justify-center items-center py-24">
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.textPrimary, marginBottom: 8 }}>
              No devices found
            </Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 20 }}>
              Tap "Add Device" to connect your first ESP32 device
            </Text>
          </View>
        ) : (
          <>
            {/* Devices Section Header */}
            <View className="flex-row justify-between items-center px-4 py-3 mt-2">
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted, letterSpacing: 1 }}>
                DEVICES
              </Text>
              <TouchableOpacity onPress={() => Alert.alert('Manage', 'Device management options')}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>Manage</Text>
              </TouchableOpacity>
            </View>

            {/* Device Grid */}
            <View className="flex-row flex-wrap px-3 py-2 gap-3 justify-between">
              {devices.map(device => (
                <TouchableOpacity
                  key={device.id}
                  className="w-1/2 rounded-3xl p-4 justify-between"
                  style={[
                    {
                      backgroundColor: theme.card,
                      minHeight: 200,
                      shadowColor: theme.shadow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 12,
                      elevation: 6,
                    },
                    device.status === 'offline' && { opacity: 0.5 },
                  ]}
                  onPress={() => handleDevicePress(device)}
                  activeOpacity={0.85}
                >
                  {/* Device Icon - Top */}
                  <View
                    className="w-14 h-14 rounded-2xl justify-center items-center mb-3"
                    style={{ backgroundColor: theme.primarySoft }}
                  >
                    <Icon name="smartphone" size={28} color={theme.primary} />
                  </View>

                  {/* Device Info - Middle */}
                  <View className="flex-1 gap-1 mb-3">
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
                      {getDeviceDisplayName(device)}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary }} numberOfLines={1}>
                      {getDeviceRoom(device)}
                    </Text>
                  </View>

                  {/* Status & Toggle - Bottom */}
                  <View className="flex-row justify-between items-center gap-2">
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
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
              ))}
            </View>

            {/* Live Activity Section */}
            <View
              className="mx-4 my-4 rounded-3xl p-5 border"
              style={{
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 6,
                borderColor: theme.border,
              }}
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>Live Activity</Text>
                {activityLog.length > 0 && (
                  <TouchableOpacity onPress={() => Alert.alert('Activity', 'View all activities')}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>
              {activityLog.length > 0 ? (
                <View className="gap-0">
                  {activityLog.map((log, index) => (
                    <View
                      key={log.id}
                      className="flex-row items-center py-3 gap-2"
                      style={[
                        index !== activityLog.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                      ]}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.primary,
                        }}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>
                          {log.deviceName}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>{log.action}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>{formatActivityTime(log.timestamp)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="py-6 items-center gap-2">
                  <View
                    className="w-12 h-12 rounded-xl justify-center items-center"
                    style={{ backgroundColor: theme.background }}
                  >
                    <Icon name="activity" size={24} color={theme.danger} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textSecondary }}>Everything is quiet</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center' }}>
                    Device events will appear here
                  </Text>
                  {devices.length > 0 && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <View
                        style={[
                          {
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: devices.some(d => d.status === 'online') ? theme.success : theme.border,
                          },
                        ]}
                      />
                      <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '500' }}>
                        Monitoring {devices.length} {devices.length === 1 ? 'device' : 'devices'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Bottom Spacing */}
        <View className="h-24" />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View
        className="absolute bottom-4 left-4 right-4 flex-row justify-around items-center rounded-2xl px-1 py-1"
        style={{
          backgroundColor: theme.bottomNav,
          paddingBottom: insets.bottom,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 6,
          borderWidth: 0,
        }}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center py-2 gap-1"
          onPress={() => {
            navigation.navigate('HomeMain');
          }}
          activeOpacity={0.7}
        >
          <Icon name="home" size={20} color={theme.primary} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textSecondary }}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center justify-center py-2 gap-1"
          onPress={() => handleAddDevice()}
          activeOpacity={0.7}
        >
          <View
            className="w-12 h-10 rounded-lg justify-center items-center"
            style={{ backgroundColor: theme.primarySoft }}
          >
            <Icon name="plus" size={20} color={theme.primary} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textSecondary }}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center justify-center py-2 gap-1"
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Icon name="user" size={20} color={theme.textSecondary} />
          <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textSecondary }}>Profile</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default HomeScreen;
