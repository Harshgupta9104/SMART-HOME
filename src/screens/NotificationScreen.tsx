import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const NotificationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState({
    deviceAlerts: true,
    firmwareUpdates: true,
    homeActivity: true,
    securityAlerts: true,
    offlineDevices: true,
    automationTriggered: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Device Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEVICE ALERTS</Text>
          
          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Device Alerts</Text>
              <Text style={styles.notificationSubtitle}>Get notified when devices change state</Text>
            </View>
            <Switch
              value={notifications.deviceAlerts}
              onValueChange={() => toggleNotification('deviceAlerts')}
              trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
              thumbColor={notifications.deviceAlerts ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Offline Devices</Text>
              <Text style={styles.notificationSubtitle}>Alert when devices go offline</Text>
            </View>
            <Switch
              value={notifications.offlineDevices}
              onValueChange={() => toggleNotification('offlineDevices')}
              trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
              thumbColor={notifications.offlineDevices ? '#10B981' : '#9CA3AF'}
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
              value={notifications.firmwareUpdates}
              onValueChange={() => toggleNotification('firmwareUpdates')}
              trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
              thumbColor={notifications.firmwareUpdates ? '#10B981' : '#9CA3AF'}
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
              value={notifications.homeActivity}
              onValueChange={() => toggleNotification('homeActivity')}
              trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
              thumbColor={notifications.homeActivity ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Automation Triggered</Text>
              <Text style={styles.notificationSubtitle}>Notify when automations run</Text>
            </View>
            <Switch
              value={notifications.automationTriggered}
              onValueChange={() => toggleNotification('automationTriggered')}
              trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
              thumbColor={notifications.automationTriggered ? '#10B981' : '#9CA3AF'}
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
              value={notifications.securityAlerts}
              onValueChange={() => toggleNotification('securityAlerts')}
              trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
              thumbColor={notifications.securityAlerts ? '#10B981' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  section: {
    marginBottom: 24,
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

  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
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
