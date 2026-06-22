import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { getNotificationService, Notification, NotificationSettings } from '../services/notificationService';
import { formatTimeAgo, getNotificationIcon, getSeverityColor } from '../utils/notificationHelpers';

type TabType = 'activity' | 'settings';

const NotificationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
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

  // Initialize notification service
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

  // Load notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = () => {
    const notifSettings = notificationService.getSettings();
    setSettings(notifSettings);

    // Subscribe to notification updates
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
            Activity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activity Tab */}
      {activeTab === 'activity' ? (
        <View style={styles.tabContent}>
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="bell" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up!</Text>
            </View>
          ) : (
            <>
              {notificationService.getUnreadCount() > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={handleMarkAllAsRead}
                >
                  <Text style={styles.markAllButtonText}>Mark all as read</Text>
                </TouchableOpacity>
              )}
              
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.notificationCard,
                      !item.read && styles.notificationCardUnread,
                    ]}
                  >
                    <View style={styles.notificationCardContent}>
                      <View style={styles.notificationIconContainer}>
                        <View
                          style={[
                            styles.notificationIconBg,
                            { backgroundColor: getSeverityColor(item.severity) + '20' },
                          ]}
                        >
                          <Icon
                            name={getNotificationIcon(item.type)}
                            size={20}
                            color={getSeverityColor(item.severity)}
                          />
                        </View>
                      </View>
                      
                      <View style={styles.notificationTextContainer}>
                        <Text style={[styles.notificationTitle, !item.read && styles.notificationTitleUnread]}>
                          {item.title}
                        </Text>
                        <Text style={styles.notificationMessage}>{item.message}</Text>
                        <View style={styles.notificationMeta}>
                          {item.deviceName && (
                            <Text style={styles.notificationDevice}>{item.deviceName}</Text>
                          )}
                          <Text style={styles.notificationTime}>{formatTimeAgo(item.createdAt)}</Text>
                        </View>
                      </View>

                      {!item.read && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>

                    <View style={styles.notificationActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleMarkAsRead(item.id)}
                      >
                        <Icon name="check" size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
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
                  style={styles.clearAllButton}
                  onPress={handleClearAll}
                >
                  <Text style={styles.clearAllButtonText}>Clear all notifications</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      ) : (
        /* Settings Tab */
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {/* Device Alerts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DEVICE ALERTS</Text>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Device Alerts</Text>
                <Text style={styles.notificationSubtitle}>Get notified when devices change state</Text>
              </View>
              <Switch
                value={settings.deviceAlerts}
                onValueChange={() => handleToggleSetting('deviceAlerts')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.deviceAlerts ? '#10B981' : '#9CA3AF'}
              />
            </View>

            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Offline Devices</Text>
                <Text style={styles.notificationSubtitle}>Alert when devices go offline</Text>
              </View>
              <Switch
                value={settings.offlineDevices}
                onValueChange={() => handleToggleSetting('offlineDevices')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.offlineDevices ? '#10B981' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* System Updates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYSTEM UPDATES</Text>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Firmware Updates</Text>
                <Text style={styles.notificationSubtitle}>Notify about available device updates</Text>
              </View>
              <Switch
                value={settings.firmwareUpdates}
                onValueChange={() => handleToggleSetting('firmwareUpdates')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.firmwareUpdates ? '#10B981' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Home Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HOME ACTIVITY</Text>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Home Activity</Text>
                <Text style={styles.notificationSubtitle}>Get updates on home events</Text>
              </View>
              <Switch
                value={settings.homeActivity}
                onValueChange={() => handleToggleSetting('homeActivity')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.homeActivity ? '#10B981' : '#9CA3AF'}
              />
            </View>

            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Automation Triggered</Text>
                <Text style={styles.notificationSubtitle}>Notify when automations run</Text>
              </View>
              <Switch
                value={settings.automationTriggered}
                onValueChange={() => handleToggleSetting('automationTriggered')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.automationTriggered ? '#10B981' : '#9CA3AF'}
              />
            </View>

            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Physical Switch Events</Text>
                <Text style={styles.notificationSubtitle}>Notify when physical switches are pressed</Text>
              </View>
              <Switch
                value={settings.physicalSwitchEvents}
                onValueChange={() => handleToggleSetting('physicalSwitchEvents')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.physicalSwitchEvents ? '#10B981' : '#9CA3AF'}
              />
            </View>

            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Relay Change Events</Text>
                <Text style={styles.notificationSubtitle}>Notify when relays change state</Text>
              </View>
              <Switch
                value={settings.relayChangeEvents}
                onValueChange={() => handleToggleSetting('relayChangeEvents')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.relayChangeEvents ? '#10B981' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SECURITY</Text>
            
            <View style={styles.notificationItem}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Security Alerts</Text>
                <Text style={styles.notificationSubtitle}>Critical security notifications</Text>
              </View>
              <Switch
                value={settings.securityAlerts}
                onValueChange={() => handleToggleSetting('securityAlerts')}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={settings.securityAlerts ? '#10B981' : '#9CA3AF'}
              />
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
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

  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },

  markAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  markAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },

  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  notificationCardUnread: {
    backgroundColor: '#F0F9FF',
    borderColor: '#DBEAFE',
  },

  notificationCardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },

  notificationIconContainer: {
    justifyContent: 'flex-start',
    paddingTop: 2,
  },

  notificationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationTextContainer: {
    flex: 1,
  },

  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },

  notificationTitleUnread: {
    fontWeight: '700',
  },

  notificationMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },

  notificationMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  notificationDevice: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },

  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },

  notificationActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  clearAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  clearAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
  },

  section: {
    marginBottom: 24,
    marginTop: 16,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },

  notificationContent: {
    flex: 1,
    gap: 2,
  },

  notificationSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  bottomSpacing: {
    height: 40,
  },
});

export default NotificationScreen;
