import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Device } from 'react-native-ble-plx';
import { AppState, AppStateStatus } from 'react-native';
import { getBleService } from '../services/bleService';
import { getPermissionService, PermissionStatus } from '../services/permissionService';

interface BleContextType {
  // Bluetooth state
  bluetoothEnabled: boolean;
  checkBluetoothState: () => Promise<void>;

  // Scanning state
  isScanning: boolean;
  discoveredDevices: Device[];
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;

  // Connected device (for future phases)
  connectedDevice: Device | null;
  setConnectedDevice: (device: Device | null) => void;

  // Permissions
  permissionStatus: PermissionStatus | null;
  checkPermissions: () => Promise<PermissionStatus>;
  requestPermissions: () => Promise<PermissionStatus>;
  isPermissionBlocked: () => Promise<boolean>;
  openAppSettings: () => Promise<void>;

  // Error handling
  error: string | null;
  clearError: () => void;
}

const BleContext = createContext<BleContextType | undefined>(undefined);

export const BleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bleService = getBleService();
  const permissionService = getPermissionService();

  const checkBluetoothState = useCallback(async () => {
    try {
      const enabled = await bleService.checkBluetoothState();
      setBluetoothEnabled(enabled);
      console.log('[BLE Context] Bluetooth state checked:', enabled);
    } catch (err) {
      console.error('[BLE Context] Error checking Bluetooth state:', err);
      setError('Failed to check Bluetooth state');
    }
  }, []);

  const checkPermissions = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const status = await permissionService.checkProvisioningPermissions();
      setPermissionStatus(status);
      console.log('[BLE Context] Permissions checked:', status);
      return status;
    } catch (err) {
      console.error('[BLE Context] Error checking permissions:', err);
      setError('Failed to check permissions');
      return {
        bluetooth: false,
        location: false,
        notifications: false,
        allGranted: false,
        anyBlocked: false,
      };
    }
  }, []);

  const stopScan = useCallback(async () => {
    try {
      await bleService.stopScan();
      setIsScanning(false);
      console.log('[BLE Context] Scan stopped');
    } catch (err) {
      console.error('[BLE Context] Error stopping scan:', err);
      setError('Failed to stop scan');
    }
  }, []);

  // Handle app state changes (pause/resume) - AFTER function definitions
  useEffect(() => {
    const handleAppStateChange = async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        console.log('[BLE Context] App backgrounded, stopping scan');
        if (isScanning) {
          await stopScan();
        }
      } else if (state === 'active') {
        console.log('[BLE Context] App resumed, checking permissions');
        // Re-check permissions when app returns to foreground
        await checkPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isScanning, stopScan, checkPermissions]);

  const requestPermissions = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const status = await permissionService.requestProvisioningPermissions();
      setPermissionStatus(status);
      console.log('[BLE Context] Permissions requested:', status);
      return status;
    } catch (err) {
      console.error('[BLE Context] Error requesting permissions:', err);
      setError('Failed to request permissions');
      return {
        bluetooth: false,
        location: false,
        notifications: false,
        allGranted: false,
        anyBlocked: false,
      };
    }
  }, []);

  const isPermissionBlocked = useCallback(async (): Promise<boolean> => {
    try {
      const blocked = await permissionService.isPermissionBlocked();
      console.log('[BLE Context] Permission blocked:', blocked);
      return blocked;
    } catch (err) {
      console.error('[BLE Context] Error checking if blocked:', err);
      return false;
    }
  }, []);

  const openAppSettings = useCallback(async () => {
    try {
      await permissionService.openAppSettings();
      console.log('[BLE Context] Opened app settings');
    } catch (err) {
      console.error('[BLE Context] Error opening settings:', err);
      setError('Failed to open settings');
    }
  }, []);

  const startScan = useCallback(async () => {
    try {
      setError(null);
      setDiscoveredDevices([]);

      // Check Bluetooth state
      await checkBluetoothState();
      if (!bluetoothEnabled) {
        console.log('[BLE Context] Bluetooth is disabled');
        setError('Bluetooth is disabled. Please enable Bluetooth to scan for devices.');
        return;
      }

      setIsScanning(true);
      console.log('[BLE Context] Starting scan...');

      bleService.startScan(
        (device: Device) => {
          console.log('[BLE Context] Device discovered callback:', device.name || device.localName);
          setDiscoveredDevices(prevDevices => {
            const deviceIndex = prevDevices.findIndex(d => d.id === device.id);
            if (deviceIndex >= 0) {
              // Update existing device
              const updated = [...prevDevices];
              updated[deviceIndex] = device;
              console.log('[BLE Context] Updated device:', device.name || device.localName);
              return updated;
            } else {
              // Add new device
              console.log('[BLE Context] Added new device:', device.name || device.localName);
              return [...prevDevices, device];
            }
          });
        },
        (scanError: Error) => {
          console.error('[BLE Context] Scan error:', scanError);
          setError(`Scan failed: ${scanError.message}`);
          setIsScanning(false);
        }
      );

      // Auto-stop scan after 30 seconds (increased from 10)
      setTimeout(async () => {
        console.log('[BLE Context] Auto-stopping scan after 30 seconds');
        await stopScan();
      }, 30000);
    } catch (err) {
      console.error('[BLE Context] Error starting scan:', err);
      setError('Failed to start scan');
      setIsScanning(false);
    }
  }, [bluetoothEnabled, checkBluetoothState]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        bleService.stopScan();
      }
    };
  }, []);

  const value: BleContextType = {
    bluetoothEnabled,
    checkBluetoothState,
    isScanning,
    discoveredDevices,
    startScan,
    stopScan,
    connectedDevice,
    setConnectedDevice,
    permissionStatus,
    checkPermissions,
    requestPermissions,
    isPermissionBlocked,
    openAppSettings,
    error,
    clearError,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
};

export const useBle = (): BleContextType => {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within a BleProvider');
  }
  return context;
};
