import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getBleService } from '../services/bleService';
import { getStorageService } from '../services/storageService';
import { getKeychainService } from '../services/keychainService';
import {
  ProvisioningState,
  FirmwareStatus,
  FIRMWARE_ERROR_MESSAGES,
  PROVISIONING_TIMEOUT,
} from '../constants/provisioningStates';

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: number;
}

interface UseProvisioningReturn {
  provisioningState: ProvisioningState;
  statusLogs: LogEntry[];
  error: string | null;
  isLoading: boolean;
  startProvisioning: (
    deviceId: string,
    deviceName: string,
    ssid: string,
    password: string,
    rememberNetwork: boolean,
    displayName?: string,
    roomName?: string,
    deviceType?: string,
    relayCount?: number,
    onProvisioningComplete?: (deviceId: string, deviceName: string) => void
  ) => Promise<void>;
  retryProvisioning: () => void;
  cancelProvisioning: () => void;
  addLog: (message: string, type: 'info' | 'success' | 'error') => void;
  clearLogs: () => void;
}

export const useProvisioning = (): UseProvisioningReturn => {
  const [provisioningState, setProvisioningState] = useState<ProvisioningState>(
    ProvisioningState.IDLE
  );
  const [statusLogs, setStatusLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const provisioningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const currentDeviceIdRef = useRef<string | null>(null);

  const bleService = getBleService();
  const storageService = getStorageService();
  const keychainService = getKeychainService();

  const handleAppStateChange = useCallback((state: AppStateStatus) => {
    appStateRef.current = state;
    if (state === 'background' && provisioningState !== ProvisioningState.IDLE) {
      console.log('[Provisioning] App backgrounded, cleaning up');
      // Handle cleanup here without circular dependency
      if (provisioningTimeoutRef.current) {
        clearTimeout(provisioningTimeoutRef.current);
        provisioningTimeoutRef.current = null;
      }
      if (currentDeviceIdRef.current) {
        bleService.disconnectDevice(currentDeviceIdRef.current);
        currentDeviceIdRef.current = null;
      }
    }
  }, [provisioningState, bleService]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [provisioningState, handleAppStateChange]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const logEntry: LogEntry = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now(),
    };
    setStatusLogs(prev => [...prev, logEntry]);
    console.log(`[Provisioning] [${type.toUpperCase()}] ${message}`);
  }, []);

  const clearLogs = useCallback(() => {
    setStatusLogs([]);
  }, []);

  const cleanup = useCallback(() => {
    if (provisioningTimeoutRef.current) {
      clearTimeout(provisioningTimeoutRef.current);
      provisioningTimeoutRef.current = null;
    }

    if (currentDeviceIdRef.current) {
      bleService.disconnectDevice(currentDeviceIdRef.current);
      currentDeviceIdRef.current = null;
    }
  }, [bleService]);

  const handleStatusUpdate = useCallback(
    async (
      status: string,
      isError: boolean | undefined,
      ssid: string,
      password: string,
      rememberNetwork: boolean,
      deviceId: string,
      deviceName: string,
      displayName: string,
      roomName: string,
      deviceType: string | undefined,
      relayCount: number | undefined,
      mqttDeviceId: string | null,
      onProvisioningComplete?: (deviceId: string, deviceName: string) => void
    ) => {
      console.log('[Provisioning] Status update:', status);

      // Handle testing_wifi state
      if (status === 'testing_wifi' || status === FirmwareStatus.TESTING_WIFI) {
        setProvisioningState(ProvisioningState.WAITING_WIFI);
        addLog('Testing WiFi connection...', 'info');
      }
      // ✅ PROVISIONING COMPLETE - wifi_saved received
      else if (status === 'wifi_saved' || status === FirmwareStatus.WIFI_SAVED || status === 'ok') {
        console.log('[Provisioning] ✅ WiFi saved - provisioning complete!');
        setProvisioningState(ProvisioningState.SUCCESS);
        addLog('WiFi connection successful', 'success');

        // Save credentials if enabled
        if (rememberNetwork) {
          try {
            await keychainService.saveCredentials(ssid, password);
            addLog('Network credentials saved', 'success');
          } catch (err) {
            console.error('[Provisioning] Error saving credentials:', err);
          }
        }

        // Generate relay names based on relay count
        let relayNames: { relay1?: string; relay2?: string; relay3?: string; relay4?: string } | undefined;
        if (relayCount === 1) {
          relayNames = { relay1: 'Relay 1' };
        } else if (relayCount === 4) {
          relayNames = {
            relay1: 'Relay 1',
            relay2: 'Relay 2',
            relay3: 'Relay 3',
            relay4: 'Relay 4',
          };
        }

        // Store provisioned device immediately
        try {
          const device = {
            id: deviceId,
            name: deviceName,
            displayName: displayName || deviceName, // User-friendly name from DeviceConfig
            roomName: roomName || 'Unassigned', // Room from DeviceConfig
            macAddress: deviceId,
            mqttDeviceId: mqttDeviceId || deviceId, // ✅ SAVE MQTT DEVICE ID
            ssid: ssid,
            status: 'online' as const,
            deviceType: deviceType || 'unknown', // ✅ SAVE DEVICE TYPE
            relayCount: relayCount ?? 0, // ✅ SAVE RELAY COUNT
            relayNames: relayNames, // ✅ SAVE RELAY NAMES
            lastSeen: new Date().toISOString(),
            provisionedAt: new Date().toISOString(),
            justProvisioned: true,
          };

          await storageService.addProvisionedDevice(device);
          console.log('[Provisioning] Saved device model:', {
            id: device.id,
            mqttDeviceId: device.mqttDeviceId,
            deviceType: device.deviceType,
            relayCount: device.relayCount,
            relayNames: device.relayNames,
          });
          addLog('Device saved', 'success');
        } catch (err) {
          console.error('[Provisioning] Error storing device:', err);
        }

        // Cleanup BLE immediately
        cleanup();
        setIsLoading(false);

        // Trigger navigation to success screen
        if (onProvisioningComplete) {
          console.log('[Provisioning] Navigating to success screen...');
          setTimeout(() => {
            onProvisioningComplete(deviceId, displayName || deviceName);
          }, 500); // Small delay for smooth transition
        }
      }
      // Handle connecting_wifi state
      else if (status === 'connecting_wifi') {
        setProvisioningState(ProvisioningState.WAITING_WIFI);
        addLog('Connecting to WiFi...', 'info');
      }
      // Handle errors
      else if (status === 'error' || status === FirmwareStatus.WIFI_FAILED) {
        setProvisioningState(ProvisioningState.ERROR);
        addLog('WiFi connection failed', 'error');
        setError(FIRMWARE_ERROR_MESSAGES[FirmwareStatus.WIFI_FAILED] || 'Device error');
        cleanup();
        setIsLoading(false);
      } else if (status === 'json_parse' || status === FirmwareStatus.JSON_PARSE) {
        setProvisioningState(ProvisioningState.ERROR);
        addLog('Invalid JSON format', 'error');
        setError(FIRMWARE_ERROR_MESSAGES[FirmwareStatus.JSON_PARSE] || 'Invalid format');
        cleanup();
        setIsLoading(false);
      } else {
        // Generic status update
        addLog(status, isError ? 'error' : 'info');
      }
    },
    [addLog, keychainService, storageService, cleanup]
  );

  const startProvisioning = useCallback(
    async (
      deviceId: string,
      deviceName: string,
      ssid: string,
      password: string,
      rememberNetwork: boolean,
      displayName?: string,
      roomName?: string,
      deviceType?: string,
      relayCount?: number,
      onProvisioningComplete?: (deviceId: string, deviceName: string) => void
    ) => {
      try {
        setError(null);
        setProvisioningState(ProvisioningState.CONNECTING_BLE);
        setStatusLogs([]);
        currentDeviceIdRef.current = deviceId;
        setIsLoading(true);

        addLog('Starting provisioning...', 'info');

        // Set provisioning timeout
        provisioningTimeoutRef.current = setTimeout(() => {
          setProvisioningState(ProvisioningState.TIMEOUT);
          addLog('Provisioning timeout - device did not respond', 'error');
          setError('Device did not respond within 30 seconds');
          cleanup();
          setIsLoading(false);
        }, PROVISIONING_TIMEOUT);

        // Send WiFi credentials with proper callback
        let capturedMqttDeviceId: string | null = null;
        
        const mqttDeviceId = await bleService.sendWiFiCredentials(
          deviceId,
          ssid,
          password,
          (status: string, isError?: boolean, returnedMqttId?: string) => {
            // Capture MQTT device ID from any status update that provides it
            if (returnedMqttId) {
              capturedMqttDeviceId = returnedMqttId;
              console.log('[Provisioning] 📱 Captured MQTT Device ID:', capturedMqttDeviceId);
            }
            
            if (isError) {
              setProvisioningState(ProvisioningState.ERROR);
              addLog(status, 'error');
              setError(status);
              cleanup();
              setIsLoading(false);
            } else {
              // Pass the captured MQTT device ID to handleStatusUpdate
              // Use the returned ID if available, otherwise use the captured one
              const finalMqttId = returnedMqttId || capturedMqttDeviceId;
              handleStatusUpdate(
                status,
                isError,
                ssid,
                password,
                rememberNetwork,
                deviceId,
                deviceName,
                displayName || deviceName,
                roomName || 'Unassigned',
                deviceType,
                relayCount,
                finalMqttId,
                onProvisioningComplete
              );
            }
          }
        );

        // Also capture the return value from sendWiFiCredentials
        if (mqttDeviceId && !capturedMqttDeviceId) {
          capturedMqttDeviceId = mqttDeviceId;
          console.log('[Provisioning] 📱 Captured MQTT Device ID from return value:', capturedMqttDeviceId);
        }

        addLog('Credentials sent successfully', 'success');
      } catch (err) {
        console.error('[Provisioning] Error during provisioning:', err);
        setProvisioningState(ProvisioningState.ERROR);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        addLog(`Error: ${errorMsg}`, 'error');
        setError(errorMsg);
        cleanup();
        setIsLoading(false);
      }
    },
    [addLog, bleService, cleanup, handleStatusUpdate]
  );

  const retryProvisioning = useCallback(() => {
    setProvisioningState(ProvisioningState.IDLE);
    setStatusLogs([]);
    setError(null);
    setIsLoading(false);
    cleanup();
  }, [cleanup]);

  const cancelProvisioning = useCallback(() => {
    cleanup();
    setProvisioningState(ProvisioningState.IDLE);
    setStatusLogs([]);
    setError(null);
    setIsLoading(false);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    provisioningState,
    statusLogs,
    error,
    isLoading,
    startProvisioning,
    retryProvisioning,
    cancelProvisioning,
    addLog,
    clearLogs,
  };
};
