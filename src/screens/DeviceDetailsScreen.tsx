import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ProvisionedDevice } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import MetricsScreen from './MetricsScreen';
import ControllerScreen from './ControllerScreen';
import DeviceSettingsScreen from './DeviceSettingsScreen';

const Tab = createMaterialTopTabNavigator();

interface DeviceDetailsScreenProps {
  navigation: any;
  route: any;
}

// Wrapper components so each tab receives the device prop
const MetricsTab = ({ device }: { device: ProvisionedDevice }) =>
  <MetricsScreen device={device} />;

const ControllerTab = ({ device }: { device: ProvisionedDevice }) =>
  <ControllerScreen device={device} />;

const SettingsTab = ({ device, onDeviceRemoved }: { device: ProvisionedDevice; onDeviceRemoved: () => void }) =>
  <DeviceSettingsScreen device={device} onDeviceRemoved={onDeviceRemoved} />;

const DeviceDetailsScreen: React.FC<DeviceDetailsScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const device: ProvisionedDevice = route?.params?.device;
  // MQTT service available but not needed for current implementation

  const handleDeviceRemoved = () => {
    navigation.goBack();
  };

  if (!device) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textMuted }]}>Device not found</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return theme.success;
      case 'offline': return theme.danger;
      case 'connecting': return theme.warning;
      default: return theme.textMuted;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.backIcon, { color: theme.textPrimary }]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.deviceName, { color: theme.textPrimary }]} numberOfLines={1}>{device.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(device.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(device.status) }]}>
              {device.status}
            </Text>
          </View>
        </View>

        {/* Notification Bell Icon */}
        <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: theme.primarySoft }]} />
      </View>

      {/* Tabs */}
      <Tab.Navigator
        initialRouteName="Controller"
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarIndicatorStyle: {
            backgroundColor: theme.primary,
            height: 2,
            borderRadius: 2,
          },
          tabBarStyle: {
            backgroundColor: theme.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarPressColor: 'rgba(59, 130, 246, 0.08)',
        }}
      >
        <Tab.Screen
          name="Metrics"
          options={{ tabBarLabel: 'Metrics' }}
        >
          {() => <MetricsTab device={device} />}
        </Tab.Screen>

        <Tab.Screen
          name="Controller"
          options={{ tabBarLabel: 'Controller' }}
        >
          {() => <ControllerTab device={device} />}
        </Tab.Screen>

        <Tab.Screen
          name="Settings"
          options={{ tabBarLabel: 'Settings' }}
        >
          {() => <SettingsTab device={device} onDeviceRemoved={handleDeviceRemoved} />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 28,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default DeviceDetailsScreen;
