import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Switch,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getWiFiService, WiFiNetwork } from '../services/wifiService';
import { getPermissionService } from '../services/permissionService';
import { useProvisioning } from '../hooks/useProvisioning';

const WiFiProvisioningScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { deviceId, deviceName, displayName, roomName } = route.params;

  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
  const [selectedSSID, setSelectedSSID] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberNetwork, setRememberNetwork] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Success animation
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const checkScaleAnim = new Animated.Value(0);

  const wifiService = getWiFiService();
  const permissionService = getPermissionService();
  const { startProvisioning } = useProvisioning();

  // Load WiFi networks on mount
  useEffect(() => {
    loadWiFiNetworks();
  }, []);

  const loadWiFiNetworks = async () => {
    try {
      setIsLoading(true);
      console.log('[WiFi] Starting network scan...');
      
      // Check permissions
      const permsStatus = await permissionService.checkProvisioningPermissions();
      console.log('[WiFi] Permission status:', permsStatus);
      
      if (!permsStatus.allGranted) {
        console.log('[WiFi] Requesting permissions...');
        const requestStatus = await permissionService.requestProvisioningPermissions();
        if (!requestStatus.allGranted) {
          Alert.alert('Error', 'Permissions required to scan WiFi networks');
          setIsLoading(false);
          return;
        }
      }

      // Scan networks
      console.log('[WiFi] Scanning networks...');
      const scanResult = await wifiService.scanNetworks();
      console.log('[WiFi] Scan result:', scanResult);
      
      if (scanResult && scanResult.networks) {
        setWifiNetworks(scanResult.networks);
        console.log('[WiFi] Networks loaded:', scanResult.networks.length);
        
        // Auto-select first network
        if (scanResult.networks.length > 0) {
          setSelectedSSID(scanResult.networks[0].ssid);
          console.log('[WiFi] Auto-selected network:', scanResult.networks[0].ssid);
        }
      } else {
        console.warn('[WiFi] No networks found in scan result');
        setWifiNetworks([]);
      }
    } catch (error) {
      console.error('[WiFi] Error loading networks:', error);
      Alert.alert('Error', 'Failed to scan WiFi networks: ' + String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedSSID) {
      Alert.alert('Error', 'Please select a WiFi network');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter WiFi password');
      return;
    }

    setIsConnecting(true);
    try {
      // Start provisioning with WiFi credentials
      await startProvisioning(
        deviceId,
        deviceName,
        selectedSSID,
        password,
        rememberNetwork,
        displayName,
        roomName,
        (provisionedDeviceId: string, provisionedDeviceName: string) => {
          // Show success animation
          setShowSuccessAnimation(true);
          
          // Animate success
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(checkScaleAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(1500),
          ]).start(() => {
            // Navigate to HomeScreen
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'HomeMain',
                  params: {
                    justProvisioned: true,
                    deviceName: provisionedDeviceName,
                    deviceId: provisionedDeviceId,
                  },
                },
              ],
            });
          });
        }
      );
    } catch (error) {
      console.error('[WiFi] Provisioning error:', error);
      Alert.alert('Error', 'Failed to start provisioning');
    } finally {
      setIsConnecting(false);
    }
  };

  const getNetworkIcon = (level: number) => {
    return 'wifi';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Success Animation Modal */}
      <Modal
        visible={showSuccessAnimation}
        transparent
        animationType="none"
      >
        <View style={styles.successOverlay}>
          <Animated.View
            style={[
              styles.successCircle,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.checkmarkContainer,
                {
                  transform: [{ scale: checkScaleAnim }],
                },
              ]}
            >
              <Icon name="check" size={56} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={[
              styles.successMessageContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.successTitle}>Device Added!</Text>
            <Text style={styles.successSubtitle}>
              {displayName || deviceName} is ready to use
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Connect to WiFi</Text>
          <Text style={styles.headerSubtitle}>{displayName || deviceName}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: '66%' }]} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon name="wifi" size={20} color="#3B82F6" />
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>
                {wifiNetworks.length} network{wifiNetworks.length !== 1 ? 's' : ''} found nearby
              </Text>
              <Text style={styles.statusSubtitle}>Select your network below</Text>
            </View>
          </View>
          <TouchableOpacity onPress={loadWiFiNetworks} style={styles.refreshButton}>
            <Icon name="refresh-cw" size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Available Networks */}
        <Text style={styles.sectionLabel}>AVAILABLE NETWORKS</Text>
        <View style={styles.networksList}>
          {isLoading ? (
            <Text style={styles.loadingText}>Scanning networks...</Text>
          ) : wifiNetworks.length === 0 ? (
            <Text style={styles.emptyText}>No networks found</Text>
          ) : (
            wifiNetworks.map((network) => (
              <TouchableOpacity
                key={network.ssid}
                style={[
                  styles.networkCard,
                  selectedSSID === network.ssid && styles.networkCardSelected,
                ]}
                onPress={() => setSelectedSSID(network.ssid)}
              >
                <View style={styles.networkIcon}>
                  <Icon
                    name={getNetworkIcon(network.level)}
                    size={20}
                    color={selectedSSID === network.ssid ? '#FFFFFF' : '#3B82F6'}
                  />
                </View>
                <View style={styles.networkInfo}>
                  <Text style={[styles.networkName, selectedSSID === network.ssid && styles.networkNameSelected]}>
                    {network.ssid}
                  </Text>
                  <View style={styles.networkMeta}>
                    <Text style={styles.networkSignalStrength}>
                      Signal: {network.level}%
                    </Text>
                    {network.frequency && (
                      <Text style={styles.networkFreq}>{network.frequency}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.networkSignal}>
                  <Icon name="signal" size={16} color={selectedSSID === network.ssid ? '#3B82F6' : '#9CA3AF'} />
                  {selectedSSID === network.ssid && (
                    <View style={styles.checkmark}>
                      <Icon name="check" size={16} color="#3B82F6" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Password Section */}
        {selectedSSID && (
          <>
            <Text style={styles.sectionLabel}>PASSWORD</Text>
            <View style={styles.passwordCard}>
              <Text style={styles.passwordLabel}>{selectedSSID}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'eye' : 'eye-off'} size={18} color="#9CA3AF" />
                </TouchableOpacity>
                {password && (
                  <TouchableOpacity onPress={() => setPassword('')}>
                    <Icon name="x" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.passwordHint}>Enter password to check strength</Text>
            </View>
          </>
        )}

        {/* Settings */}
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Icon name="bookmark" size={20} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Remember network</Text>
                <Text style={styles.settingSubtitle}>Auto-join when in range</Text>
              </View>
            </View>
            <Switch
              value={rememberNetwork}
              onValueChange={setRememberNetwork}
              trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Icon name="repeat" size={20} color="#9CA3AF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto-reconnect on drop</Text>
                <Text style={styles.settingSubtitle}>Retry up to 3 times</Text>
              </View>
            </View>
            <Switch
              value={autoReconnect}
              onValueChange={setAutoReconnect}
              trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
              disabled
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Icon name="shield" size={20} color="#10B981" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Encrypted provisioning</Text>
                <Text style={styles.settingSubtitle}>TLS 1.3 handshake</Text>
              </View>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Connect Button */}
        <TouchableOpacity
          style={[
            styles.connectButton,
            (!selectedSSID || !password || isConnecting) && styles.connectButtonDisabled,
          ]}
          onPress={handleConnect}
          disabled={!selectedSSID || !password || isConnecting}
        >
          <Icon name="wifi" size={18} color="#FFFFFF" />
          <Text style={styles.connectButtonText}>
            {isConnecting ? 'Connecting...' : 'Connect device'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  // Success Animation
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    marginBottom: 32,
  },

  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  successMessageContainer: {
    alignItems: 'center',
  },

  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  successSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Progress Bar
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },

  progressBar: {
    height: 4,
    backgroundColor: '#3B82F6',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 32,
  },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },

  statusSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 2,
  },

  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Networks List
  networksList: {
    marginBottom: 24,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },

  emptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },

  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },

  networkCardSelected: {
    borderColor: '#3B82F6',
    borderLeftColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },

  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  networkInfo: {
    flex: 1,
  },

  networkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  networkNameSelected: {
    color: '#3B82F6',
  },

  networkMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },

  networkSecurity: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F59E0B',
  },

  networkSignalStrength: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F59E0B',
  },

  networkFreq: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
  },

  networkSignal: {
    alignItems: 'center',
    gap: 4,
  },

  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Password Card
  passwordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  passwordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 10,
  },

  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#111827',
  },

  passwordHint: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
  },

  // Settings Card
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  settingText: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  settingSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
  },

  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },

  // Connect Button
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  connectButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },

  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default WiFiProvisioningScreen;
