import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { getNotificationService, Notification, NotificationSettings } from '../services/notificationService';
import { formatTimeAgo, getNotificationIcon, getSeverityColor } from '../utils/notificationHelpers';

type TabType = 'activity' | 'settings';

const NotificationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const notificationService = getNotificationService();
  
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings>({
    deviceAlerts: true,
    firmwareUpdates: true,
    homeActivity: true,
    securityAlerts: true,
    offlineDevices: true,
    automationTriggered: true,
    physicalSwitchEvents: true,
    relayChangeEvents: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        await notificationService.initialize();
        setIsLoading(false);
      } catch (error) {
        console.error('[NotificationScreen] Error initializing:', error);
        setIsLoading(false);
      }
    };
    initNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = () => {
    const notifSettings = notificationService.getSettings();
    setSettings(notifSettings);

    const unsubscribeFn = notificationService.subscribe((count, notifs) => {
      setUnreadCount(count);
      setNotifications(notifs);
    });

    setUnsubscribe(() => unsubscribeFn);

    return () => {
      unsubscribeFn();
    };
  };

  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  const handleToggleSetting = async (key: keyof NotificationSettings) => {
    await notificationService.updateSettings(key, !settings[key]);
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await notificationService.deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await notificationService.clearAll();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background, paddingTop: insets.top }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4" style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold" style={{ color: theme.textPrimary }}>Notifications</Text>
          {unreadCount > 0 && (
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#EF4444' }}>
              <Text className="text-xs font-bold" style={{ color: '#FFFFFF' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
        <View className="w-6" />
      </View>

      {/* Tabs */}
      <View className="flex-row" style={{ borderBottomColor: theme.border, borderBottomWidth: 1, backgroundColor: theme.surface }}>
        <TouchableOpacity
          className="flex-1 py-3 items-center"
          style={{ borderBottomWidth: 3, borderBottomColor: activeTab === 'activity' ? theme.primary : 'transparent' }}
          onPress={() => setActiveTab('activity')}
        >
          <Text className="text-sm font-semibold" style={{ color: activeTab === 'activity' ? theme.primary : theme.textMuted }}>
            Activity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-3 items-center"
          style={{ borderBottomWidth: 3, borderBottomColor: activeTab === 'settings' ? theme.primary : 'transparent' }}
          onPress={() => setActiveTab('settings')}
        >
          <Text className="text-sm font-semibold" style={{ color: activeTab === 'settings' ? theme.primary : theme.textMuted }}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activity Tab */}
      {activeTab === 'activity' ? (
        <View className="flex-1 px-4">
          {notifications.length === 0 ? (
            <View className="flex-1 justify-center items-center py-16">
              <Icon name="bell" size={48} color={theme.textMuted} />
              <Text className="text-lg font-bold mt-4" style={{ color: theme.textPrimary }}>No Notifications</Text>
              <Text className="text-sm mt-1" style={{ color: theme.textMuted }}>You're all caught up!</Text>
            </View>
          ) : (
            <>
              {notificationService.getUnreadCount() > 0 && (
                <TouchableOpacity
                  className="py-3 px-4 rounded-lg mt-4 mb-4"
                  style={{ backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', borderWidth: 1 }}
                  onPress={handleMarkAllAsRead}
                >
                  <Text className="text-sm font-semibold text-center" style={{ color: theme.primary }}>Mark all as read</Text>
                </TouchableOpacity>
              )}
              
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View
                    className="rounded-2xl p-4 mb-3 flex-row justify-between items-start border"
                    style={{
                      backgroundColor: !item.read ? '#F0F9FF' : theme.card,
                      borderColor: !item.read ? '#DBEAFE' : theme.border,
                    }}
                  >
                    <View className="flex-row flex-1 gap-3">
                      <View className="pt-0.5">
                        <View
                          className="w-10 h-10 rounded-2xl justify-center items-center"
                          style={{
                            backgroundColor: getSeverityColor(item.severity) + '20',
                          }}
                        >
                          <Icon
                            name={getNotificationIcon(item.type)}
                            size={20}
                            color={getSeverityColor(item.severity)}
                          />
                        </View>
                      </View>
                      
                      <View className="flex-1">
                        <Text className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary, fontWeight: !item.read ? '700' : '600' }}>
                          {item.title}
                        </Text>
                        <Text className="text-xs mb-2 leading-5" style={{ color: theme.textSecondary }}>
                          {item.message}
                        </Text>
                        <View className="flex-row gap-2 items-center">
                          {item.deviceName && (
                            <Text className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
                              {item.deviceName}
                            </Text>
                          )}
                          <Text className="text-xs" style={{ color: theme.textMuted }}>
                            {formatTimeAgo(item.createdAt)}
                          </Text>
                        </View>
                      </View>

                      {!item.read && (
                        <View className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: theme.primary }} />
                      )}
                    </View>

                    <View className="flex-row gap-2 ml-3">
                      <TouchableOpacity
                        className="w-8 h-8 rounded-lg justify-center items-center"
                        style={{ backgroundColor: theme.surface }}
                        onPress={() => handleMarkAsRead(item.id)}
                      >
                        <Icon name="check" size={16} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="w-8 h-8 rounded-lg justify-center items-center"
                        style={{ backgroundColor: theme.surface }}
                        onPress={() => handleDeleteNotification(item.id)}
                      >
                        <Icon name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />

              {notifications.length > 0 && (
                <TouchableOpacity
                  className="py-3 px-4 rounded-lg mt-4 mb-8"
                  style={{ backgroundColor: '#FEE2E2', borderColor: '#FECACA', borderWidth: 1 }}
                  onPress={handleClearAll}
                >
                  <Text className="text-sm font-semibold text-center" style={{ color: '#DC2626' }}>Clear all notifications</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      ) : (
        /* Settings Tab */
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Device Alerts */}
          <View className="mb-6 mt-4">
            <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>DEVICE ALERTS</Text>
            
            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Device Alerts</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Get notified when devices change state</Text>
              </View>
              <Switch
                value={settings.deviceAlerts}
                onValueChange={() => handleToggleSetting('deviceAlerts')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.deviceAlerts ? '#FFFFFF' : theme.textMuted}
              />
            </View>

            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Offline Devices</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Alert when devices go offline</Text>
              </View>
              <Switch
                value={settings.offlineDevices}
                onValueChange={() => handleToggleSetting('offlineDevices')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.offlineDevices ? '#FFFFFF' : theme.textMuted}
              />
            </View>
          </View>

          {/* System Updates */}
          <View className="mb-6">
            <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>SYSTEM UPDATES</Text>
            
            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Firmware Updates</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Notify about available device updates</Text>
              </View>
              <Switch
                value={settings.firmwareUpdates}
                onValueChange={() => handleToggleSetting('firmwareUpdates')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.firmwareUpdates ? '#FFFFFF' : theme.textMuted}
              />
            </View>
          </View>

          {/* Home Activity */}
          <View className="mb-6">
            <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>HOME ACTIVITY</Text>
            
            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Home Activity</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Get updates on home events</Text>
              </View>
              <Switch
                value={settings.homeActivity}
                onValueChange={() => handleToggleSetting('homeActivity')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.homeActivity ? '#FFFFFF' : theme.textMuted}
              />
            </View>

            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Automation Triggered</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Notify when automations run</Text>
              </View>
              <Switch
                value={settings.automationTriggered}
                onValueChange={() => handleToggleSetting('automationTriggered')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.automationTriggered ? '#FFFFFF' : theme.textMuted}
              />
            </View>

            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Physical Switch Events</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Notify when physical switches are pressed</Text>
              </View>
              <Switch
                value={settings.physicalSwitchEvents}
                onValueChange={() => handleToggleSetting('physicalSwitchEvents')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.physicalSwitchEvents ? '#FFFFFF' : theme.textMuted}
              />
            </View>

            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Relay Change Events</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Notify when relays change state</Text>
              </View>
              <Switch
                value={settings.relayChangeEvents}
                onValueChange={() => handleToggleSetting('relayChangeEvents')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.relayChangeEvents ? '#FFFFFF' : theme.textMuted}
              />
            </View>
          </View>

          {/* Security */}
          <View className="mb-6">
            <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>SECURITY</Text>
            
            <View className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center justify-between" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Security Alerts</Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>Critical security notifications</Text>
              </View>
              <Switch
                value={settings.securityAlerts}
                onValueChange={() => handleToggleSetting('securityAlerts')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={settings.securityAlerts ? '#FFFFFF' : theme.textMuted}
              />
            </View>
          </View>

          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
};

export default NotificationScreen;
