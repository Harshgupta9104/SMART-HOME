import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ProvisionedDevice } from '../services/storageService';
import { getStorageService } from '../services/storageService';
import { getWiFiService, WiFiNetwork } from '../services/wifiService';
import { getDeviceDataService } from '../services/deviceDataService';

interface SettingsScreenProps {
  device: ProvisionedDevice;
  onDeviceRemoved: () => void;
}

type WifiModalStep = 'scanning' | 'select' | 'password' | 'sending' | 'success' | 'failed';

const getSignalBars = (level: number) => {
  if (level > -55) return '▂▄▆█';
  if (level > -70) return '▂▄▆░';
  if (level > -80) return '▂▄░░';
  return '▂░░░';
};

const getSignalColor = (level: number) => {
  if (level > -55) return '#10B981';
  if (level > -70) return '#F59E0B';
  return '#EF4444';
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ device, onDeviceRemoved }) => {
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // WiFi modal state
  const [wifiModalVisible, setWifiModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<WifiModalStep>('scanning');
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const storageService = getStorageService();
  const wifiService = getWiFiService();
  const deviceDataService = getDeviceDataService();

  // ─── WiFi Modal ────────────────────────────────────────────────
  const openWifiModal = async () => {
    setWifiModalVisible(true);
    setModalStep('scanning');
    setScanError(null);
    setNetworks([]);
    setSelectedNetwork(null);
    setPassword('');

    try {
      const result = await wifiService.scanNetworks();
      setNetworks(result.networks);
      setModalStep('select');
    } catch (err: any) {
      setScanError(err?.message || 'Failed to scan WiFi networks');
      setModalStep('select'); // still show manual entry
    }
  };

  const handleSelectNetwork = (network: WiFiNetwork) => {
    setSelectedNetwork(network);
    setPassword('');
    setModalStep('password');
  };

  const handleSendWifi = async () => {
    if (!selectedNetwork || !password.trim()) return;

    setModalStep('sending');

    try {
      const mqttDeviceId = device.mqttDeviceId || device.id;
      const success = await deviceDataService.reconfigureWiFi(
        mqttDeviceId,
        selectedNetwork.ssid,
        password
      );

      if (success) {
        setModalStep('success');
        // Auto-close after 2.5s
        setTimeout(() => {
          setWifiModalVisible(false);
        }, 2500);
      } else {
        setModalStep('failed');
      }
    } catch (err) {
      console.error('[Settings] WiFi reconfigure error:', err);
      setModalStep('failed');
    }
  };

  const closeWifiModal = () => {
    setWifiModalVisible(false);
    setModalStep('scanning');
    setSelectedNetwork(null);
    setPassword('');
    setScanError(null);
  };

  // ─── Danger Zone ───────────────────────────────────────────────
  const handleRestartDevice = () => {
    Alert.alert('Restart Device', 'Are you sure you want to restart the device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restart', onPress: () => Alert.alert('Success', 'Device restart command sent'), style: 'destructive' },
    ]);
  };

  const handleResetWiFi = () => {
    Alert.alert('Reset WiFi', 'This will reset the WiFi configuration. The device will enter provisioning mode.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => Alert.alert('Success', 'WiFi reset command sent'), style: 'destructive' },
    ]);
  };

  const handleRemoveDevice = () => {
    Alert.alert('Remove Device', `Remove "${device?.name}" from your dashboard?`, [
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
            Alert.alert('Error', 'Failed to remove device');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  // ─── Render WiFi Modal Content ─────────────────────────────────
  const renderModalContent = () => {
    // Scanning
    if (modalStep === 'scanning') {
      return (
        <View style={styles.modalCenter}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.modalScanningText}>Scanning nearby networks...</Text>
        </View>
      );
    }

    // Success
    if (modalStep === 'success') {
      return (
        <View style={styles.modalCenter}>
          <Text style={styles.modalResultIcon}>✅</Text>
          <Text style={styles.modalResultTitle}>Command Sent</Text>
          <Text style={styles.modalResultSubtitle}>
            ESP32 is connecting to {selectedNetwork?.ssid}.{'\n'}
            It will reconnect automatically if successful.
          </Text>
        </View>
      );
    }

    // Failed
    if (modalStep === 'failed') {
      return (
        <View style={styles.modalCenter}>
          <Text style={styles.modalResultIcon}>❌</Text>
          <Text style={styles.modalResultTitle}>Failed to Send</Text>
          <Text style={styles.modalResultSubtitle}>MQTT not connected or command failed.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setModalStep('select')}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Sending
    if (modalStep === 'sending') {
      return (
        <View style={styles.modalCenter}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.modalScanningText}>Sending WiFi credentials...</Text>
          <Text style={styles.modalScanningSubtext}>via MQTT → esp32/{device.mqttDeviceId || device.id}/config</Text>
        </View>
      );
    }

    // Password entry
    if (modalStep === 'password') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Back */}
          <TouchableOpacity style={styles.modalBackRow} onPress={() => setModalStep('select')}>
            <Text style={styles.modalBackIcon}>‹</Text>
            <Text style={styles.modalBackText}>Back to networks</Text>
          </TouchableOpacity>

          {/* Selected network */}
          <View style={styles.selectedNetworkRow}>
            <Text style={styles.selectedNetworkIcon}>📶</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedNetworkName}>{selectedNetwork?.ssid}</Text>
              <Text style={styles.selectedNetworkSub}>Enter the WiFi password below</Text>
            </View>
          </View>

          {/* Password input */}
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="WiFi Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Connect button */}
          <TouchableOpacity
            style={[styles.connectBtn, !password.trim() && styles.connectBtnDisabled]}
            onPress={handleSendWifi}
            disabled={!password.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.connectBtnText}>Connect Device</Text>
          </TouchableOpacity>

          <Text style={styles.passwordNote}>
            The ESP32 will test this network and roll back if it fails.
          </Text>
        </KeyboardAvoidingView>
      );
    }

    // Network list (select step)
    return (
      <>
        <Text style={styles.modalSectionLabel}>
          {scanError ? '⚠️  Scan failed — enter manually below' : 'Select a network'}
        </Text>

        {networks.length > 0 && (
          <View style={styles.networkList}>
            {networks.map((net, i) => (
              <TouchableOpacity
                key={`${net.ssid}-${i}`}
                style={[
                  styles.networkRow,
                  i === networks.length - 1 && styles.networkRowLast,
                  net.isCurrentNetwork && styles.networkRowCurrent,
                ]}
                onPress={() => handleSelectNetwork(net)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.networkName}>{net.ssid}</Text>
                  {net.isCurrentNetwork && (
                    <Text style={styles.networkCurrentBadge}>Currently connected</Text>
                  )}
                </View>
                <Text style={[styles.networkBars, { color: getSignalColor(net.level) }]}>
                  {getSignalBars(net.level)}
                </Text>
                <Text style={styles.networkChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Manual entry */}
        <Text style={styles.manualLabel}>Or enter manually</Text>
        <TouchableOpacity
          style={styles.manualEntryBtn}
          onPress={() => {
            setSelectedNetwork({ ssid: '', level: -70 });
            setModalStep('password');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.manualEntryIcon}>✏️</Text>
          <Text style={styles.manualEntryText}>Enter network name manually</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────
  return (
    <>
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
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: device.status === 'online' ? '#10B981' : '#EF4444' }]}>
              {device.status}
            </Text>
          </View>
        </View>

        {/* WiFi Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>WiFi Information</Text>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>WiFi Network</Text>
            <View style={styles.wifiValueRow}>
              <Text style={styles.infoValue} numberOfLines={1}>{device.ssid || '—'}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={openWifiModal}
                activeOpacity={0.7}
              >
                <Text style={styles.editBtnIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Advanced Settings */}
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

      {/* WiFi Edit Modal */}
      <Modal
        visible={wifiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeWifiModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (modalStep === 'select' || modalStep === 'password') closeWifiModal();
          }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change WiFi Network</Text>
              {(modalStep === 'select' || modalStep === 'password' || modalStep === 'failed') && (
                <TouchableOpacity onPress={closeWifiModal} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {renderModalContent()}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { padding: 16 },

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
  settingRowLast: { borderBottomWidth: 0 },
  settingInfo: { flex: 1, paddingRight: 12 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  settingDescription: { fontSize: 12, color: '#9CA3AF' },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 12, color: '#1F2937', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  // WiFi edit row
  wifiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '60%',
  },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editBtnIcon: { fontSize: 14 },

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
  advancedToggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  advancedToggleChevron: { fontSize: 11, color: '#9CA3AF' },

  // Danger Zone
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  dangerTitle: { fontSize: 15, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  dangerSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
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
  dangerButtonIcon: { fontSize: 16, marginRight: 10 },
  dangerButtonText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  deleteButton: { backgroundColor: '#EF4444', borderColor: '#EF4444', marginBottom: 0 },
  deleteButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseIcon: { fontSize: 13, color: '#6B7280', fontWeight: '700' },

  // Scanning / result center
  modalCenter: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  modalScanningText: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  modalScanningSubtext: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  modalResultIcon: { fontSize: 52 },
  modalResultTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalResultSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Network list
  modalSectionLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 10 },
  networkList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    overflow: 'hidden',
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  networkRowLast: { borderBottomWidth: 0 },
  networkRowCurrent: { backgroundColor: '#F0FDF4' },
  networkName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  networkCurrentBadge: { fontSize: 11, color: '#10B981', fontWeight: '500', marginTop: 2 },
  networkBars: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  networkChevron: { fontSize: 18, color: '#D1D5DB' },

  // Manual entry
  manualLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 10 },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  manualEntryIcon: { fontSize: 16 },
  manualEntryText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },

  // Back row
  modalBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  modalBackIcon: { fontSize: 22, color: '#3B82F6', fontWeight: '300' },
  modalBackText: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },

  // Selected network
  selectedNetworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedNetworkIcon: { fontSize: 24 },
  selectedNetworkName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  selectedNetworkSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Password input
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 14,
  },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },

  // Connect button
  connectBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  connectBtnDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0 },
  connectBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  passwordNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});

export default SettingsScreen;
