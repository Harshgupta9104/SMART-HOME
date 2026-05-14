import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWiFiService, WiFiNetwork } from '../services/wifiService';
import { getKeychainService } from '../services/keychainService';
import { getPermissionService } from '../services/permissionService';
import { WiFiError, WiFiErrorType } from '../services/wifiErrors';
import { useProvisioning } from '../hooks/useProvisioning';
import { ProvisioningState } from '../constants/provisioningStates';
import WiFiSelector from '../components/provisioning/WiFiSelector';
import PasswordInput from '../components/provisioning/PasswordInput';

type ScreenState = 'loading' | 'permission_required' | 'location_disabled' | 'ready' | 'error';

const WiFiProvisioningScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { deviceId, deviceName } = route.params;

  // State
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
  const [currentSSID, setCurrentSSID] = useState<string | null>(null);
  const [selectedSSID, setSelectedSSID] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberNetwork, setRememberNetwork] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<WiFiErrorType | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Services
  const wifiService = getWiFiService();
  const keychainService = getKeychainService();
  const permissionService = getPermissionService();

  // Provisioning hook
  const {
    provisioningState,
    startProvisioning,
    cancelProvisioning,
  } = useProvisioning();

  // Initialize screen
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        console.log('[WiFiProvisioning] ========== INITIALIZING SCREEN ==========');
        console.log('[WiFiProvisioning] Device:', deviceName, 'ID:', deviceId);
        
        // Step 1: Check provisioning permissions
        console.log('[WiFiProvisioning] Step 1: Checking provisioning permissions...');
        const permsStatus = await permissionService.checkProvisioningPermissions();
        console.log('[WiFiProvisioning] Permission check result:', permsStatus);

        // Step 2: If permissions missing, request them
        if (!permsStatus.allGranted) {
          console.log('[WiFiProvisioning] Step 2: Permissions missing, requesting...');
          setScreenState('permission_required');
          setErrorType(WiFiErrorType.PERMISSION_DENIED);
          setErrorMessage('WiFi scanning requires Bluetooth and Location permissions.');
          return;
        }

        console.log('[WiFiProvisioning] ✅ Permissions already granted');

        // Step 3: Scan networks
        console.log('[WiFiProvisioning] Step 3: Scanning networks...');
        try {
          const scanResult = await wifiService.scanNetworks();
          console.log('[WiFiProvisioning] ✅ Scan result:', {
            networks: scanResult.networks.length,
            currentDetected: scanResult.currentNetworkDetected,
            nearbyDetected: scanResult.nearbyNetworksDetected,
          });

          setWifiNetworks(scanResult.networks);

          // Step 4: Auto-select current network if available
          if (scanResult.currentNetworkDetected && scanResult.networks.length > 0) {
            const currentNetwork = scanResult.networks.find(n => n.isCurrentNetwork);
            if (currentNetwork) {
              console.log('[WiFiProvisioning] ✅ Auto-selecting current network:', currentNetwork.ssid);
              setSelectedSSID(currentNetwork.ssid);
              setCurrentSSID(currentNetwork.ssid);
              
              // Try to get saved password
              const savedPassword = await keychainService.getPassword(currentNetwork.ssid);
              if (savedPassword) {
                console.log('[WiFiProvisioning] ✅ Found saved password for current network');
                setPassword(savedPassword);
              }
            }
          }

          setScreenState('ready');
          console.log('[WiFiProvisioning] ✅ INITIALIZATION COMPLETE');
          console.log('[WiFiProvisioning] ========== SCREEN READY ==========');

          // Fade in animation
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        } catch (scanError) {
          // Handle WiFi scanning errors
          if (scanError instanceof WiFiError) {
            console.error('[WiFiProvisioning] WiFi Error:', scanError.type, scanError.message);
            
            if (scanError.type === WiFiErrorType.PERMISSION_DENIED) {
              setScreenState('permission_required');
              setErrorType(WiFiErrorType.PERMISSION_DENIED);
              setErrorMessage(scanError.getUserMessage());
            } else if (scanError.type === WiFiErrorType.LOCATION_DISABLED) {
              setScreenState('location_disabled');
              setErrorType(WiFiErrorType.LOCATION_DISABLED);
              setErrorMessage(scanError.getUserMessage());
            } else {
              setScreenState('error');
              setErrorType(scanError.type);
              setErrorMessage(scanError.getUserMessage());
            }
          } else {
            console.error('[WiFiProvisioning] Unknown error:', scanError);
            setScreenState('error');
            setErrorMessage('An unexpected error occurred.');
          }
        }
      } catch (err) {
        console.error('[WiFiProvisioning] ❌ FATAL ERROR initializing:', err);
        setScreenState('error');
        setErrorMessage(`Error: ${err}`);
      }
    };

    initializeScreen();
  }, []);

  const handleRequestPermissions = async () => {
    try {
      console.log('[WiFiProvisioning] Requesting permissions...');
      const status = await permissionService.requestProvisioningPermissions();
      console.log('[WiFiProvisioning] Permission request result:', status);

      if (status.allGranted) {
        console.log('[WiFiProvisioning] ✅ Permissions granted, retrying scan...');
        // Retry initialization
        setScreenState('loading');
        setErrorMessage(null);
        setErrorType(null);
        
        // Re-run initialization
        const initializeScreen = async () => {
          try {
            const scanResult = await wifiService.scanNetworks();
            setWifiNetworks(scanResult.networks);

            if (scanResult.currentNetworkDetected && scanResult.networks.length > 0) {
              const currentNetwork = scanResult.networks.find(n => n.isCurrentNetwork);
              if (currentNetwork) {
                setSelectedSSID(currentNetwork.ssid);
                setCurrentSSID(currentNetwork.ssid);
                const savedPassword = await keychainService.getPassword(currentNetwork.ssid);
                if (savedPassword) {
                  setPassword(savedPassword);
                }
              }
            }

            setScreenState('ready');
          } catch (scanError) {
            if (scanError instanceof WiFiError) {
              if (scanError.type === WiFiErrorType.LOCATION_DISABLED) {
                setScreenState('location_disabled');
                setErrorType(WiFiErrorType.LOCATION_DISABLED);
                setErrorMessage(scanError.getUserMessage());
              } else {
                setScreenState('error');
                setErrorType(scanError.type);
                setErrorMessage(scanError.getUserMessage());
              }
            } else {
              setScreenState('error');
              setErrorMessage('An unexpected error occurred.');
            }
          }
        };
        
        initializeScreen();
      } else {
        console.warn('[WiFiProvisioning] ⚠️ Permissions still not granted');
        setErrorMessage('Permissions were not granted. Please try again.');
      }
    } catch (error) {
      console.error('[WiFiProvisioning] Error requesting permissions:', error);
      setErrorMessage('Failed to request permissions.');
    }
  };

  const handleOpenSettings = async () => {
    try {
      if (errorType === WiFiErrorType.LOCATION_DISABLED) {
        // Open location settings
        Linking.openSettings();
      } else {
        // Open app settings
        Linking.openSettings();
      }
    } catch (error) {
      console.error('[WiFiProvisioning] Error opening settings:', error);
      Alert.alert('Error', 'Could not open settings');
    }
  };

  const validateCredentials = (): boolean => {
    if (!selectedSSID.trim()) {
      setErrorMessage('Network name cannot be empty');
      return false;
    }

    if (selectedSSID.length > 32) {
      setErrorMessage('Network name is too long (max 32 characters)');
      return false;
    }

    if (!password) {
      setErrorMessage('Password cannot be empty');
      return false;
    }

    return true;
  };

  const handleConnectDevice = async () => {
    if (!validateCredentials()) {
      return;
    }

    setErrorMessage(null);
    
    // Navigate to progress screen first
    navigation.navigate('ProvisioningProgress', { 
      deviceName,
      deviceId,
      ssid: selectedSSID,
    });

    // Start provisioning with callback to navigate to dashboard on completion
    await startProvisioning(
      deviceId, 
      deviceName, 
      selectedSSID, 
      password, 
      rememberNetwork,
      (provisionedDeviceId: string, provisionedDeviceName: string) => {
        // Navigate to home dashboard with provisioning complete flag
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'HomeMain',
              params: {
                justProvisioned: true,
                deviceId: provisionedDeviceId,
                deviceName: provisionedDeviceName,
              },
            },
          ],
        });
      }
    );
  };

  const handleCancel = () => {
    cancelProvisioning();
    navigation.goBack();
  };

  const handleSelectNetwork = async (ssid: string) => {
    setSelectedSSID(ssid);

    // Try to get saved password
    const savedPassword = await keychainService.getPassword(ssid);
    if (savedPassword) {
      setPassword(savedPassword);
    }
  };

  // Render permission required state
  if (screenState === 'permission_required') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            disabled={provisioningState !== ProvisioningState.IDLE}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>WiFi Setup</Text>
            <Text style={styles.deviceName}>{deviceName}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.permissionRequiredContainer}>
            <Text style={styles.permissionIcon}>🔐</Text>
            <Text style={styles.permissionTitle}>Permissions Required</Text>
            <Text style={styles.permissionMessage}>
              WiFi scanning requires Bluetooth and Location permissions to discover nearby networks.
            </Text>
            
            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionCheckmark}>✓</Text>
                <Text style={styles.permissionItemText}>Bluetooth Access</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionCheckmark}>✓</Text>
                <Text style={styles.permissionItemText}>Location Access</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.grantButton}
              onPress={handleRequestPermissions}
            >
              <Text style={styles.grantButtonText}>Grant Permissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render location disabled state
  if (screenState === 'location_disabled') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            disabled={provisioningState !== ProvisioningState.IDLE}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>WiFi Setup</Text>
            <Text style={styles.deviceName}>{deviceName}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.locationDisabledContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationTitle}>Location Services Disabled</Text>
            <Text style={styles.locationMessage}>
              Android requires Location Services to be enabled for WiFi network discovery.
            </Text>
            
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>To enable Location Services:</Text>
              <Text style={styles.instructionStep}>1. Open Settings</Text>
              <Text style={styles.instructionStep}>2. Go to Location</Text>
              <Text style={styles.instructionStep}>3. Toggle Location ON</Text>
            </View>

            <Text style={styles.alternativeText}>
              You can still provision using your currently connected WiFi network or enter a network manually.
            </Text>

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleOpenSettings}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setScreenState('ready')}
            >
              <Text style={styles.continueButtonText}>Continue Without Location</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render error state
  if (screenState === 'error') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            disabled={provisioningState !== ProvisioningState.IDLE}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>WiFi Setup</Text>
            <Text style={styles.deviceName}>{deviceName}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleCancel}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render loading state
  if (screenState === 'loading') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            disabled={provisioningState !== ProvisioningState.IDLE}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>WiFi Setup</Text>
            <Text style={styles.deviceName}>{deviceName}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Scanning WiFi networks...</Text>
        </View>
      </View>
    );
  }

  // Render ready state (normal form)
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          disabled={provisioningState !== ProvisioningState.IDLE}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>WiFi Setup</Text>
          <Text style={styles.deviceName}>{deviceName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <WiFiSelector
          selectedSSID={selectedSSID}
          onSelectSSID={handleSelectNetwork}
          networks={wifiNetworks}
          currentSSID={currentSSID}
          isScanning={false}
        />

        <PasswordInput
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.rememberNetworkContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRememberNetwork(!rememberNetwork)}
          >
            <View style={[styles.checkbox, rememberNetwork && styles.checkboxChecked]}>
              {rememberNetwork && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Remember this network</Text>
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerIcon}>⚠️</Text>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnectDevice}
        >
          <Text style={styles.connectButtonText}>Connect Device</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  deviceName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerSpacer: {
    width: 36,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  permissionRequiredContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  permissionMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionsList: {
    width: '100%',
    marginBottom: 32,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginBottom: 8,
  },
  permissionCheckmark: {
    fontSize: 18,
    color: '#10B981',
    marginRight: 12,
    fontWeight: '600',
  },
  permissionItemText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  grantButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  grantButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  locationDisabledContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  locationIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  locationMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  instructionsBox: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  alternativeText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  settingsButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rememberNetworkContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerIcon: {
    fontSize: 18,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  connectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default WiFiProvisioningScreen;
