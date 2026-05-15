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
import { getMQTTService } from '../services/mqttService';
import MetricsScreen from './MetricsScreen';
import ControllerScreen from './ControllerScreen';
import SettingsScreen from './SettingsScreen';

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
  <SettingsScreen device={device} onDeviceRemoved={onDeviceRemoved} />;

const DeviceDetailsScreen: React.FC<DeviceDetailsScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const device: ProvisionedDevice = route?.params?.device;
  const mqttService = getMQTTService();
  const mqttConnected = mqttService.isConnectedToMQTT();

  const handleDeviceRemoved = () => {
    navigation.goBack();
  };

  if (!device) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Device not found</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'offline': return '#EF4444';
      case 'connecting': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(device.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(device.status) }]}>
              {device.status}
            </Text>
          </View>
        </View>

        {/* MQTT badge */}
        <View style={[styles.mqttBadge, mqttConnected ? styles.mqttOn : styles.mqttOff]}>
          <View style={[styles.mqttDot, mqttConnected ? styles.mqttDotOn : styles.mqttDotOff]} />
          <Text style={styles.mqttText}>{mqttConnected ? 'MQTT' : 'Offline'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <Tab.Navigator
        initialRouteName="Controller"
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarIndicatorStyle: {
            backgroundColor: '#3B82F6',
            height: 2,
            borderRadius: 2,
          },
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
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
          options={{ tabBarLabel: '📊  Metrics' }}
        >
          {() => <MetricsTab device={device} />}
        </Tab.Screen>

        <Tab.Screen
          name="Controller"
          options={{ tabBarLabel: '💡  Controller' }}
        >
          {() => <ControllerTab device={device} />}
        </Tab.Screen>

        <Tab.Screen
          name="Settings"
          options={{ tabBarLabel: '⚙️  Settings' }}
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
    backgroundColor: '#F6F7FB',
  },
  errorText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#1F2937',
    fontWeight: '300',
    lineHeight: 28,
  },
  headerInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
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

  // MQTT Badge
  mqttBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
  },
  mqttOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: '#10B981',
  },
  mqttOff: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: '#EF4444',
  },
  mqttDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  mqttDotOn: {
    backgroundColor: '#10B981',
  },
  mqttDotOff: {
    backgroundColor: '#EF4444',
  },
  mqttText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
});

export default DeviceDetailsScreen;
