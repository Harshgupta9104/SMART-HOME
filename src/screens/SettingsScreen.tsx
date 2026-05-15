import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { ProvisionedDevice } from '../services/storageService';
import { getStorageService } from '../services/storageService';

interface SettingsScreenProps {
  device: ProvisionedDevice;
  onDeviceRemoved: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ device, onDeviceRemoved }) => {
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const storageService = getStorageService();

  const handleRestartDevice = () => {
    Alert.alert(
      'Restart Device',
      'Are you sure you want to restart the device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: () => Alert.alert('Success', 'Device restart command sent'),
          style: 'destructive',
        },
      ]
    );
  };

  const handleResetWiFi = () => {
    Alert.alert(
      'Reset WiFi',
      'This will reset the WiFi configuration. The device will enter provisioning mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => Alert.alert('Success', 'WiFi reset command sent'),
          style: 'destructive',
        },
      ]
    );
  };

  const handleRemoveDevice = () => {
    Alert.alert(
      'Remove Device',
      `Remove "${device?.name}" from your dashboard?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              if (device) {
                await storageService.removeProvisionedDevice(device.id);
                onDeviceRemoved();
              }
            } catch (error) {
              console.error('[Settings] Error removing device:', error);
              Alert.alert('Error', 'Failed to remove device');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Preferences */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-reconnect</Text>
            <Text style={styles.settingDescription}>Reconnect automatically when offline</Text>
          </View>
          <Switch
            value={autoReconnect}
            onValueChange={setAutoReconnect}
            trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
            thumbColor={autoReconnect ? '#10B981' : '#9CA3AF'}
          />
        </View>

        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>Receive device status alerts</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
            thumbColor={notifications ? '#10B981' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Device Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Device ID</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{device.id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MAC Address</Text>
          <Text style={styles.infoValue}>{device.macAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>WiFi Network</Text>
          <Text style={styles.infoValue}>{device.ssid}</Text>
        </View>
        <View style={[styles.infoRow, styles.infoRowLast]}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: device.status === 'online' ? '#10B981' : '#EF4444' }]}>
            {device.status}
          </Text>
        </View>
      </View>

      {/* Advanced Settings (collapsed by default) */}
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
        activeOpacity={0.7}
      >
        <Text style={styles.advancedToggleText}>Advanced Settings</Text>
        <Text style={styles.advancedToggleChevron}>{showAdvanced ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠️  Danger Zone</Text>
          <Text style={styles.dangerSubtitle}>These actions cannot be undone easily.</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleRestartDevice} activeOpacity={0.7}>
            <Text style={styles.dangerButtonIcon}>🔄</Text>
            <Text style={styles.dangerButtonText}>Restart Device</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={handleResetWiFi} activeOpacity={0.7}>
            <Text style={styles.dangerButtonIcon}>📶</Text>
            <Text style={styles.dangerButtonText}>Reset WiFi Configuration</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.dangerButton, styles.deleteButton]} onPress={handleRemoveDevice} activeOpacity={0.7}>
            <Text style={styles.dangerButtonIcon}>🗑️</Text>
            <Text style={styles.deleteButtonText}>Remove Device</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  content: {
    padding: 16,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },

  // Advanced Toggle
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  advancedToggleChevron: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Danger Zone
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  dangerButtonIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    marginBottom: 0,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SettingsScreen;
