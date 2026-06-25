import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Device } from 'react-native-ble-plx';
import { getBleService } from '../services/bleService';
import { getPermissionService } from '../services/permissionService';

// Custom Device + Plus Icon Component (from AddDeviceScreen)
const DevicePlusIcon = ({ size = 32, color = '#3B82F6' }) => {
  const deviceSize = size * 0.75;
  const plusSize = size * 0.4;
  
  return (
    <View style={{ position: 'relative', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Device with gradient background */}
      <View
        style={{
          width: deviceSize,
          height: deviceSize * 1.3,
          borderRadius: deviceSize * 0.25,
          backgroundColor: color,
          opacity: 0.9,
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: deviceSize * 0.15,
          shadowColor: color,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        {/* Device screen area - WHITE */}
        <View
          style={{
            width: deviceSize * 0.85,
            height: deviceSize * 0.8,
            borderRadius: deviceSize * 0.12,
            backgroundColor: '#FFFFFF',
          }}
        />
        
        {/* Device home button */}
        <View
          style={{
            width: deviceSize * 0.25,
            height: deviceSize * 0.12,
            borderRadius: deviceSize * 0.06,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          }}
        />
      </View>
      
      {/* Plus badge on top-right */}
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: plusSize,
          height: plusSize,
          borderRadius: plusSize / 2,
          backgroundColor: '#5B5FFF',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 3,
          borderColor: '#F4F7FB',
          shadowColor: '#5B5FFF',
          shadowOpacity: 0.4,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 6,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: plusSize * 0.45, fontWeight: '700', lineHeight: plusSize * 0.45 }}>+</Text>
      </View>
    </View>
  );
};

interface ScannedDevice {
  id: string;
  name: string;
  rssi: number;
  macAddress: string;
  lastSeen?: number;
}

// Phone Device Icon Component
const DeviceIcon = ({ size = 24, color = '#5B5FFF' }) => {
  const phoneSize = size * 0.65;
  
  return (
    <View style={{ position: 'relative', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Phone body - tall rectangle */}
      <View
        style={{
          width: phoneSize,
          height: phoneSize * 1.6,
          borderRadius: phoneSize * 0.2,
          backgroundColor: color,
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: phoneSize * 0.12,
          paddingHorizontal: phoneSize * 0.08,
        }}
      >
        {/* Phone screen - WHITE */}
        <View
          style={{
            width: '100%',
            height: '85%',
            borderRadius: phoneSize * 0.1,
            backgroundColor: '#FFFFFF',
          }}
        />
        
        {/* Phone home button */}
        <View
          style={{
            width: phoneSize * 0.25,
            height: phoneSize * 0.12,
            borderRadius: phoneSize * 0.06,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          }}
        />
      </View>
    </View>
  );
};

// Animated Loading Dots Component - Premium Wave Effect
const AnimatedLoadingDots = () => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dot 1 animation - starts immediately
    Animated.loop(
      Animated.sequence([
        Animated.timing(dot1Anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dot1Anim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Dot 2 animation - starts 200ms later for wave effect
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 200);

    // Dot 3 animation - starts 400ms later for wave effect
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 400);
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.animatedDotsContainer}>
      <Animated.Text
        style={[
          styles.animatedDot,
          {
            opacity: dot1Anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          },
        ]}
      >
        •
      </Animated.Text>
      <Animated.Text
        style={[
          styles.animatedDot,
          {
            opacity: dot2Anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          },
        ]}
      >
        •
      </Animated.Text>
      <Animated.Text
        style={[
          styles.animatedDot,
          {
            opacity: dot3Anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          },
        ]}
      >
        •
      </Animated.Text>
    </View>
  );
};

// Frozen Scanning Icon Component - Grey Ripples (for Scan Stopped state)
const FrozenScanningIcon = () => {
  return (
    <View style={styles.frozenIconContainer}>
      {/* Ripple 1 - Largest */}
      <View style={styles.frozenRipple1} />
      
      {/* Ripple 2 - Medium */}
      <View style={styles.frozenRipple2} />
      
      {/* Ripple 3 - Small */}
      <View style={styles.frozenRipple3} />

      {/* Main device icon */}
      <View style={styles.frozenMainIcon}>
        <DevicePlusIcon size={48} color="#9CA3AF" />
      </View>
    </View>
  );
};
const AnimatedScanningIcon = () => {
  const ripple1Anim = useRef(new Animated.Value(0)).current;
  const ripple2Anim = useRef(new Animated.Value(0)).current;
  const ripple3Anim = useRef(new Animated.Value(0)).current;
  const ripple4Anim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ripple 1 - starts immediately with slower timing
    Animated.loop(
      Animated.sequence([
        Animated.timing(ripple1Anim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(ripple1Anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ripple 2 - starts after 750ms delay
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ripple2Anim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(ripple2Anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 750);

    // Ripple 3 - starts after 1500ms delay
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ripple3Anim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(ripple3Anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1500);

    // Ripple 4 - starts after 2250ms delay
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ripple4Anim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(ripple4Anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 2250);

    // Subtle float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, ripple1Anim, ripple2Anim, ripple3Anim, ripple4Anim]);

  return (
    <Animated.View
      style={[
        styles.animatedIconContainer,
        {
          transform: [{ translateY: floatAnim }],
        },
      ]}
    >
      {/* Main device icon container - rendered first so ripples appear on top */}
      <View style={styles.mainIconContainer}>
        <DevicePlusIcon size={48} color="#5B5FFF" />
      </View>

      {/* Ripple Wave 1 */}
      <Animated.View
        style={[
          styles.rippleWave,
          {
            transform: [
              {
                scale: ripple1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.2],
                }),
              },
            ],
            opacity: ripple1Anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.6, 0.3, 0],
            }),
          },
        ]}
      />

      {/* Ripple Wave 2 */}
      <Animated.View
        style={[
          styles.rippleWave,
          {
            transform: [
              {
                scale: ripple2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.2],
                }),
              },
            ],
            opacity: ripple2Anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.6, 0.3, 0],
            }),
          },
        ]}
      />

      {/* Ripple Wave 3 */}
      <Animated.View
        style={[
          styles.rippleWave,
          {
            transform: [
              {
                scale: ripple3Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.2],
                }),
              },
            ],
            opacity: ripple3Anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.6, 0.3, 0],
            }),
          },
        ]}
      />

      {/* Ripple Wave 4 */}
      <Animated.View
        style={[
          styles.rippleWave,
          {
            transform: [
              {
                scale: ripple4Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.2],
                }),
              },
            ],
            opacity: ripple4Anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.6, 0.3, 0],
            }),
          },
        ]}
      />
    </Animated.View>
  );
};

const SimpleBleProvisionScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_lastUpdateTime, _setLastUpdateTime] = useState<number>(Date.now());
  
  // Smooth transition animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const bleService = getBleService();
  const permissionService = getPermissionService();

  // Start scanning on mount
  useEffect(() => {
    startScanning();
  }, [startScanning]);

  // Smooth transition animation when state changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isScanning, devices.length, fadeAnim, slideAnim]);

  // Start scanning on mount
  const startScanning = useCallback(async () => {
    try {
      setError(null);
      setDevices([]);

      console.log('[SimpleBLE] ========== STARTING BLE PROVISIONING FLOW ==========');

      // Step 1: Check if permissions are already granted (silent check)
      console.log('[SimpleBLE] Step 1: Checking if provisioning permissions already granted...');
      const permsStatus = await permissionService.checkProvisioningPermissions();
      console.log('[SimpleBLE] Permission check result:', permsStatus);

      // Step 2: If permissions not granted, request them
      if (!permsStatus.allGranted) {
        console.log('[SimpleBLE] Step 2: Permissions not granted, requesting them now...');
        const requestStatus = await permissionService.requestProvisioningPermissions();
        console.log('[SimpleBLE] Permission request result:', requestStatus);

        if (!requestStatus.allGranted) {
          console.log('[SimpleBLE] ❌ User denied permissions');
          setError('Permissions not granted. Please enable Bluetooth, Location, and Notification permissions to scan devices.');
          return;
        }
      } else {
        console.log('[SimpleBLE] ✓ Permissions already granted, proceeding with scan');
      }

      // Step 3: Check Bluetooth is enabled
      console.log('[SimpleBLE] Step 3: Checking if Bluetooth is enabled...');
      const btEnabled = await bleService.checkBluetoothState();
      console.log('[SimpleBLE] Bluetooth enabled:', btEnabled);
      if (!btEnabled) {
        console.log('[SimpleBLE] ❌ Bluetooth is disabled');
        setError('Bluetooth is disabled. Please enable it in your device settings.');
        return;
      }

      setIsScanning(true);
      console.log('[SimpleBLE] ✓ Step 4: Starting BLE scan...');

      // Step 4: Start scanning
      bleService.startScan(
        (device: Device) => {
          const deviceName = device.name || device.localName || 'Unknown';
          const rssi = device.rssi || 0;
          
          console.log(`[SimpleBLE] 📱 Device found: "${deviceName}" (ID: ${device.id}, RSSI: ${rssi})`);
          
          // Add ALL devices (for debugging - remove filter to see all BLE devices)
          // If you want only PROV_ devices, uncomment the filter below:
          // if (!deviceName.startsWith('PROV_')) return;
          
          _setLastUpdateTime(Date.now());
          
          setDevices(prevDevices => {
            const existingIndex = prevDevices.findIndex(d => d.id === device.id);
            const newDevice: ScannedDevice = {
              id: device.id,
              name: deviceName,
              rssi: rssi,
              macAddress: device.id,
              lastSeen: Date.now(), // Track when device was last seen
            };

            if (existingIndex >= 0) {
              // Update existing device with new RSSI (real-time signal strength)
              const updated = [...prevDevices];
              updated[existingIndex] = newDevice;
              console.log(`[SimpleBLE] 📊 Updated device: ${deviceName} (RSSI: ${rssi})`);
              return updated;
            } else {
              // Add new device
              console.log(`[SimpleBLE] ✨ New device discovered: ${deviceName} (RSSI: ${rssi})`);
              return [...prevDevices, newDevice];
            }
          });
        },
        (error) => {
          console.error('[SimpleBLE] ❌ Scan error:', error);
          console.error('[SimpleBLE] Error message:', error.message);
          setError(`Scan error: ${error.message}`);
          setIsScanning(false);
        }
      );

      // Remove devices that haven't been seen in 2 seconds (device went out of range)
      deviceTimeoutIntervalRef.current = setInterval(() => {
        setDevices(prevDevices => {
          const now = Date.now();
          return prevDevices.filter(device => {
            const timeSinceLastSeen = now - (device.lastSeen || 0);
            if (timeSinceLastSeen > 2000) {
              console.log('[SimpleBLE] Device out of range, removing:', device.name);
              return false;
            }
            return true;
          });
        });
      }, 500);
    } catch (err) {
      console.error('[SimpleBLE] ❌ Error:', err);
      setError(`Error: ${err}`);
      setIsScanning(false);
    }
  }, [permissionService, bleService]);

  const deviceTimeoutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopScanning = useCallback(async () => {
    try {
      await bleService.stopScan();
      setIsScanning(false);
      // Clear the device timeout interval
      if (deviceTimeoutIntervalRef.current) {
        clearInterval(deviceTimeoutIntervalRef.current);
        deviceTimeoutIntervalRef.current = null;
      }
      console.log('[SimpleBLE] Scan stopped');
    } catch (err) {
      console.error('[SimpleBLE] Error stopping scan:', err);
    }
  }, [bleService]);

  // Auto-stop scanning after 60 seconds
  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        console.log('[SimpleBLE] Auto-stopping scan after 60 seconds');
        stopScanning();
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [isScanning, stopScanning]);

  const handleRefresh = async () => {
    console.log('[SimpleBLE] Pull-to-refresh triggered');
    setIsRefreshing(true);
    await stopScanning();
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for visual feedback
    await startScanning();
    setIsRefreshing(false);
  };

  const handleDeviceSelect = async (device: ScannedDevice) => {
    stopScanning();
    
    try {
      console.log('[SimpleBLE] Device selected:', device.name, 'MAC:', device.id);
      
      // Navigate to DeviceConfig screen
      navigation.navigate('DeviceConfig', {
        deviceId: device.id,
        macAddress: device.id,
        deviceName: device.name,
        rssi: device.rssi,
      });
    } catch (error) {
      console.error('[SimpleBLE] Error selecting device:', error);
      Alert.alert('Error', 'Failed to select device');
      startScanning();
    }
  };

  const getSignalQuality = (rssi: number): string => {
    if (rssi > -55) return 'Excellent';
    if (rssi > -70) return 'Good';
    if (rssi > -85) return 'Fair';
    return 'Poor';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header with Back and Step */}
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonPill}>
          <Icon name="chevron-left" size={18} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.stepPill}>
          <Text style={styles.stepIndicator}>Step 2 of 3</Text>
        </View>
      </View>

      {/* Main Content */}
      {isScanning && devices.length === 0 ? (
        <Animated.ScrollView 
          style={[
            styles.scrollView,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Icon with Rings */}
          <View style={styles.heroSection}>
            <AnimatedScanningIcon />
          </View>

          {/* Title */}
          <Text style={styles.scanningTitle}>Looking for devices</Text>
          <Text style={styles.scanningSubtitle}>Keep your device powered on and close by.</Text>

          {/* Searching Status Pill - Green */}
          <View style={styles.searchingStatusPill}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.searchingStatusText}>Searching nearby</Text>
            <AnimatedLoadingDots />
          </View>

          {/* Empty State Card - Compact */}
          <View style={styles.emptyStateCard}>
            {/* Icon Container */}
            <View style={styles.emptyStateIconContainer}>
              <DeviceIcon size={28} color="#FCA5A5" />
            </View>

            {/* Title */}
            <Text style={styles.emptyStateTitle}>No devices found yet</Text>
            <Text style={styles.emptyStateSubtitle}>Make sure the blue light is blinking.</Text>

            {/* Checklist */}
            <View style={styles.checklistContainer}>
              <View style={styles.checklistItem}>
                <View style={styles.checklistBullet} />
                <Text style={styles.checklistText}>Device is powered on</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={styles.checklistBullet} />
                <Text style={styles.checklistText}>Blue light is blinking</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={styles.checklistBullet} />
                <Text style={styles.checklistText}>Phone is close by</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={styles.checklistBullet} />
                <Text style={styles.checklistText}>Bluetooth is enabled</Text>
              </View>
            </View>
          </View>

          {/* Stop Search Button - HIDDEN */}
          {/* <TouchableOpacity style={styles.stopSearchButton} onPress={stopScanning}>
            <View style={styles.stopButtonIcon} />
            <Text style={styles.stopSearchButtonText}>Stop search</Text>
          </TouchableOpacity> */}

          {/* Help Link */}
          <TouchableOpacity style={styles.helpLinkContainer}>
            <Icon name="help-circle" size={14} color="#9CA3AF" />
            <Text style={styles.helpLinkText}>Can't find it? View tips</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      ) : isScanning && devices.length > 0 ? (
        <Animated.ScrollView 
          style={[
            styles.scrollView,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Icon with Rings */}
          <View style={styles.heroSection}>
            <AnimatedScanningIcon />
          </View>

          {/* Title */}
          <Text style={styles.scanningTitle}>Devices found</Text>
          <Text style={styles.scanningSubtitle}>Choose a device to continue setup.</Text>

          {/* Device Counter Pill - Green */}
          <View style={styles.searchingStatusPill}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.searchingStatusText}>{devices.length} device{devices.length !== 1 ? 's' : ''} found</Text>
          </View>

          {/* Section Label */}
          <Text style={styles.sectionLabel}>NEARBY DEVICES</Text>

          {/* Device List */}
          <View style={styles.deviceListContainer}>
            {devices.sort((a, b) => b.rssi - a.rssi).map((item) => {
              return (
                <View
                  key={item.id}
                  style={styles.deviceCardNew}
                >
                  {/* Top Row: Icon + Details */}
                  <View style={styles.deviceCardTopRow}>
                    {/* Left: Icon */}
                    <View style={styles.deviceIconNew}>
                      <DeviceIcon size={32} color="#3B82F6" />
                    </View>

                    {/* Right: Info */}
                    <View style={styles.deviceInfoNew}>
                      <Text style={styles.deviceNameNew}>Smart Device</Text>
                      
                      <View style={styles.statusRowNew}>
                        <Icon name="tag" size={12} color="#9CA3AF" />
                        <Text style={styles.deviceRawNameNew}>{item.name}</Text>
                      </View>
                      
                      <View style={styles.statusRowNew}>
                        <View style={styles.statusDotGreen} />
                        <Text style={styles.statusTextNew}>Ready to connect</Text>
                      </View>
                      
                      <View style={styles.signalRowNew}>
                        <Icon name="wifi" size={12} color="#9CA3AF" />
                        <View 
                          style={[
                            styles.signalIndicator,
                            item.rssi > -55 ? styles.signalExcellent :
                            item.rssi > -70 ? styles.signalGood :
                            item.rssi > -85 ? styles.signalFair :
                            styles.signalPoor
                          ]}
                        />
                        <Text style={styles.signalTextNew}>Signal: <Text style={styles.signalQualityHighlight}>{getSignalQuality(item.rssi)}</Text></Text>
                      </View>
                    </View>
                  </View>

                  {/* Bottom: Connect Button - ONLY THIS NAVIGATES */}
                  <TouchableOpacity
                    style={styles.connectButtonNew}
                    onPress={() => handleDeviceSelect(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.connectButtonTextNew}>Connect</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView 
          style={[
            styles.scrollView,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
        >
          {/* Hero Icon - Stopped State */}
          <View style={styles.heroSection}>
            <FrozenScanningIcon />
          </View>

          {/* Title */}
          <Text style={styles.scanningTitle}>Scan stopped</Text>
          <Text style={styles.scanningSubtitle}>No devices were found nearby. Make sure your device is on and in range.</Text>

          {/* Device Counter Pill - Grey */}
          <View style={styles.searchingStatusPill}>
            <View style={[styles.statusDotGreen, { backgroundColor: '#9CA3AF' }]} />
            <Text style={[styles.searchingStatusText, { color: '#9CA3AF' }]}>{devices.length} device{devices.length !== 1 ? 's' : ''} found</Text>
          </View>

          {/* Section Label */}
          <Text style={styles.sectionLabel}>NEARBY DEVICES</Text>

          {/* No Devices Detected Card */}
          {devices.length === 0 ? (
            <View style={styles.noDevicesCard}>
              <View style={styles.noDevicesIconContainer}>
                <Icon name="wifi-off" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.noDevicesTitle}>No devices detected</Text>
              <Text style={styles.noDevicesSubtitle}>Scanning ended without finding any compatible devices in range.</Text>
            </View>
          ) : (
            /* Device List */
            <View style={styles.deviceListContainer}>
              {devices.sort((a, b) => b.rssi - a.rssi).map((item) => {
                return (
                  <View
                    key={item.id}
                    style={styles.deviceCardNew}
                  >
                    {/* Top Row: Icon + Details */}
                    <View style={styles.deviceCardTopRow}>
                      {/* Left: Icon */}
                      <View style={styles.deviceIconNew}>
                        <DeviceIcon size={32} color="#3B82F6" />
                      </View>

                      {/* Right: Info */}
                      <View style={styles.deviceInfoNew}>
                        <Text style={styles.deviceNameNew}>Smart Device</Text>
                        
                        <View style={styles.statusRowNew}>
                          <Icon name="tag" size={12} color="#9CA3AF" />
                          <Text style={styles.deviceRawNameNew}>{item.name}</Text>
                        </View>
                        
                        <View style={styles.statusRowNew}>
                          <View style={styles.statusDotGreen} />
                          <Text style={styles.statusTextNew}>Ready to connect</Text>
                        </View>
                        
                        <View style={styles.signalRowNew}>
                          <Icon name="wifi" size={12} color="#9CA3AF" />
                          <View 
                            style={[
                              styles.signalIndicator,
                              item.rssi > -55 ? styles.signalExcellent :
                              item.rssi > -70 ? styles.signalGood :
                              item.rssi > -85 ? styles.signalFair :
                              styles.signalPoor
                            ]}
                          />
                          <Text style={styles.signalTextNew}>Signal: <Text style={styles.signalQualityHighlight}>{getSignalQuality(item.rssi)}</Text></Text>
                        </View>
                      </View>
                    </View>

                    {/* Bottom: Connect Button - ONLY THIS NAVIGATES */}
                    <TouchableOpacity
                      style={styles.connectButtonNew}
                      onPress={() => handleDeviceSelect(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.connectButtonTextNew}>Connect</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Troubleshooting Tips Section */}
          <Text style={styles.troubleshootingLabel}>TROUBLESHOOTING TIPS</Text>
          
          <View style={styles.troubleshootingCard}>
            <View style={styles.troubleshootingHeader}>
              <Icon name="help-circle" size={20} color="#3B82F6" />
              <Text style={styles.troubleshootingTitle}>Try these steps</Text>
            </View>

            {/* Tip 1 */}
            <View style={styles.tipItem}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>1</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipMainText}>Power cycle your device</Text>
                <Text style={styles.tipSubText}>Turn it off and back on, then try again.</Text>
              </View>
            </View>

            {/* Tip 2 */}
            <View style={styles.tipItem}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>2</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipMainText}>Move closer</Text>
                <Text style={styles.tipSubText}>Stay within 1-2 metres of the device for a stronger signal.</Text>
              </View>
            </View>

            {/* Tip 3 */}
            <View style={styles.tipItem}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>3</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipMainText}>Enable Bluetooth & location</Text>
                <Text style={styles.tipSubText}>Both are required for scanning.</Text>
              </View>
            </View>
          </View>

          {/* Scan Again Button */}
          <TouchableOpacity style={styles.scanAgainButtonLarge} onPress={handleRefresh}>
            <Icon name="arrow-right" size={16} color="#10B981" />
            <Text style={styles.scanAgainButtonTextLarge}>Scan again</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  // Header
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F4F7FB',
  },

  backButtonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  stepIndicator: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: 0.2,
  },

  // Progress Bar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F4F7FB',
  },

  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },

  progressSegmentActive: {
    backgroundColor: '#3B82F6',
  },

  progressSegmentInactive: {
    backgroundColor: '#E5E7EB',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  heroIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  // Animated Icon Container
  animatedIconContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 70,
  },

  rippleWave: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#5B5FFF',
  },

  mainIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B5FFF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // Frozen Scanning Icon (for Scan Stopped state)
  frozenIconContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 70,
  },

  frozenRipple1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },

  frozenRipple2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },

  frozenRipple3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },

  frozenMainIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9CA3AF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  scanningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },

  scanningSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Searching Status Pill - Green
  searchingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 24,
  },

  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  searchingStatusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },

  // Animated Loading Dots
  animatedDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },

  animatedDot: {
    fontSize: 14,
    fontWeight: '400',
    color: '#10B981',
    lineHeight: 14,
    letterSpacing: 1,
  },

  // Empty State Card
  emptyStateCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  emptyStateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(91, 95, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },

  emptyStateSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Checklist
  checklistContainer: {
    width: '100%',
    gap: 10,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  checklistBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    flexShrink: 0,
  },

  checklistText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  tipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 16,
  },

  // Stop Search Button
  stopSearchButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  stopButtonIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },

  stopSearchButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },

  // Restart Search Button
  restartSearchButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  restartSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Help Link
  helpLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  helpLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // Empty State Icon
  emptyStateIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Devices Found Section
  devicesFoundTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },

  devicesFoundSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },

  deviceCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  deviceCounterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  deviceListContainer: {
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },

  // Setup Cards
  deviceCardNew: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3B82F6',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  deviceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  deviceIconNew: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  deviceInfoNew: {
    flex: 1,
    gap: 6,
  },

  deviceNameNew: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  statusRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusTextNew: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },

  deviceRawNameNew: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
  },

  signalRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  signalTextNew: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
  },

  signalQualityHighlight: {
    color: '#10B981',
    fontWeight: '500',
  },

  // Real-time signal indicator
  signalIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },

  signalExcellent: {
    backgroundColor: '#10B981',
  },

  signalGood: {
    backgroundColor: '#F59E0B',
  },

  signalFair: {
    backgroundColor: '#EF4444',
  },

  signalPoor: {
    backgroundColor: '#6B7280',
  },

  connectButtonNew: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: '#3B82F6',
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  connectButtonTextNew: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Search Again Button (for devices found screen)
  searchAgainButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  searchAgainButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Scan Again Button (Large - for scan stopped state)
  scanAgainButtonLarge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#10B981',
    marginTop: 12,
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  scanAgainButtonTextLarge: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },

  // No Devices Card
  noDevicesCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },

  noDevicesIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  noDevicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },

  noDevicesSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Troubleshooting Section
  troubleshootingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },

  troubleshootingCard: {
    marginHorizontal: 0,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#E5E7EB',
  },

  troubleshootingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  troubleshootingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },

  tipItem: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    alignItems: 'flex-start',
  },

  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  tipNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },

  tipContent: {
    flex: 1,
    justifyContent: 'center',
  },

  tipMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 3,
  },

  tipSubText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 17,
  },

  // Error
  errorBox: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },

  errorText: {
    fontSize: 12,
    color: '#DC2626',
  },
});

export default SimpleBleProvisionScreen;
