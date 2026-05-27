import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Device } from 'react-native-ble-plx';
import { getBleService } from '../services/bleService';
import { getPermissionService } from '../services/permissionService';

interface ScannedDevice {
  id: string;
  name: string;
  rssi: number;
  macAddress: string;
}

const SimpleBleProvisionScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTime, setScanTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bleService = getBleService();
  const permissionService = getPermissionService();

  // Start scanning on mount
  useEffect(() => {
    startScanning();
  }, []);

  // Timer for scan duration
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setScanTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setError(null);
      setDevices([]);
      setScanTime(0);

      console.log('[SimpleBLE] Starting BLE provisioning flow...');

      // Step 1: Check if permissions are already granted (silent check)
      console.log('[SimpleBLE] Checking if provisioning permissions already granted...');
      const permsStatus = await permissionService.checkProvisioningPermissions();
      console.log('[SimpleBLE] Permission check result:', permsStatus);

      // Step 2: If permissions not granted, request them
      if (!permsStatus.allGranted) {
        console.log('[SimpleBLE] Permissions not granted, requesting them now...');
        const requestStatus = await permissionService.requestProvisioningPermissions();
        console.log('[SimpleBLE] Permission request result:', requestStatus);

        if (!requestStatus.allGranted) {
          console.log('[SimpleBLE] User denied permissions');
          setError('Permissions not granted. Please enable Bluetooth, Location, and Notification permissions to scan devices.');
          return;
        }
      } else {
        console.log('[SimpleBLE] Permissions already granted, proceeding with scan');
      }

      // Step 3: Check Bluetooth is enabled
      const btEnabled = await bleService.checkBluetoothState();
      if (!btEnabled) {
        setError('Bluetooth is disabled. Please enable it in your device settings.');
        return;
      }

      setIsScanning(true);
      console.log('[SimpleBLE] Starting BLE scan...');

      // Step 4: Start scanning
      bleService.startScan(
        (device: Device) => {
          const deviceName = device.name || device.localName || 'Unknown';
          
          // Only add PROV_ devices
          if (deviceName.startsWith('PROV_')) {
            console.log('[SimpleBLE] Found device:', deviceName, 'RSSI:', device.rssi);
            
            setDevices(prevDevices => {
              const existingIndex = prevDevices.findIndex(d => d.id === device.id);
              const newDevice: ScannedDevice = {
                id: device.id,
                name: deviceName,
                rssi: device.rssi || -100,
                macAddress: device.id,
              };

              if (existingIndex >= 0) {
                // Update existing device
                const updated = [...prevDevices];
                updated[existingIndex] = newDevice;
                return updated;
              } else {
                // Add new device
                return [...prevDevices, newDevice];
              }
            });
          }
        },
        (error) => {
          console.error('[SimpleBLE] Scan error:', error);
          setError(`Scan error: ${error.message}`);
          setIsScanning(false);
        }
      );

      // Auto-stop after 30 seconds
      setTimeout(() => {
        stopScanning();
      }, 30000);
    } catch (err) {
      console.error('[SimpleBLE] Error:', err);
      setError(`Error: ${err}`);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      await bleService.stopScan();
      setIsScanning(false);
      console.log('[SimpleBLE] Scan stopped');
    } catch (err) {
      console.error('[SimpleBLE] Error stopping scan:', err);
    }
  };

  const handleDeviceSelect = async (device: ScannedDevice) => {
    stopScanning();
    
    try {
      console.log('[SimpleBLE] Device selected:', device.name, 'MAC:', device.id);
      
      // Use BLE MAC address as device ID for now
      // Device ID will be read during WiFi provisioning
      navigation.navigate('WiFiProvisioning', {
        deviceId: device.id,        // Use MAC address as device ID
        macAddress: device.id,      // Store MAC for reference
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

  const getSignalColor = (rssi: number): string => {
    if (rssi > -55) return '#10B981';
    if (rssi > -70) return '#F59E0B';
    if (rssi > -85) return '#EF4444';
    return '#6B7280';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Devices</Text>
        <TouchableOpacity onPress={isScanning ? stopScanning : startScanning}>
          <Text style={styles.stopButton}>{isScanning ? 'Stop' : 'Scan'}</Text>
        </TouchableOpacity>
      </View>

      {/* Scanning Info */}
      <View style={styles.scanInfo}>
        <Text style={styles.scanTitle}>Scanning for ESP32 devices...</Text>
        <View style={styles.scanStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>{scanTime}s</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>{devices.length} found</Text>
          </View>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Scanning Indicator */}
      {isScanning && (
        <View style={styles.scanningIndicator}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.scanningText}>Scanning...</Text>
        </View>
      )}

      {/* Devices List */}
      <FlatList
        data={devices.sort((a, b) => b.rssi - a.rssi)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceCard}
            onPress={() => handleDeviceSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.deviceIcon}>
              <Text style={styles.deviceIconText}>Device</Text>
            </View>

            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceMac}>{item.macAddress}</Text>
              
              {/* Signal Bar */}
              <View style={styles.signalBar}>
                <View
                  style={[
                    styles.signalFill,
                    {
                      width: `${Math.max(20, Math.min(100, (item.rssi + 100) * 1.5))}%`,
                      backgroundColor: getSignalColor(item.rssi),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.deviceSignal}>
              <Text style={[styles.rssiValue, { color: getSignalColor(item.rssi) }]}>
                {item.rssi} dBm
              </Text>
              <Text style={[styles.signalQuality, { color: getSignalColor(item.rssi) }]}>
                {getSignalQuality(item.rssi)}
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isScanning && devices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No devices found</Text>
              <Text style={styles.emptySubtext}>Make sure your device is powered on</Text>
            </View>
          ) : null
        }
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 28,
    color: '#1F2937',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  stopButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  scanInfo: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scanTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 12,
  },
  scanStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
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
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  scanningText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceIconText: {
    fontSize: 24,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  deviceMac: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  signalBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  signalFill: {
    height: '100%',
    borderRadius: 2,
  },
  deviceSignal: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  rssiValue: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  signalQuality: {
    fontSize: 11,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#D1D5DB',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default SimpleBleProvisionScreen;
