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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [provisioningState]);

  const handleAppStateChange = (state: AppStateStatus) => {
    appStateRef.current = state;
    if (state === 'background' && provisioningState !== ProvisioningState.IDLE) {
      console.log('[Provisioning] App backgrounded, cleaning up');
      cleanup();
    }
  };

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

        // Store provisioned device immediately
        try {
          const device = {
            id: deviceId,
            name: deviceName,
            macAddress: deviceId,
            ssid: ssid,
            status: 'online' as const,
            lastSeen: new Date().toISOString(),
            provisionedAt: new Date().toISOString(),
            justProvisioned: true,
          };

          await storageService.addProvisionedDevice(device);
          console.log('[Provisioning] Device stored locally');
          addLog('Device saved', 'success');
        } catch (err) {
          console.error('[Provisioning] Error storing device:', err);
        }

        // Cleanup BLE immediately
        cleanup();
        setIsLoading(false);

        // Trigger navigation to dashboard
        if (onProvisioningComplete) {
          console.log('[Provisioning] Navigating to dashboard...');
          setTimeout(() => {
            onProvisioningComplete(deviceId, deviceName);
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
        await bleService.sendWiFiCredentials(
          deviceId,
          ssid,
          password,
          (status: string, isError?: boolean) => {
            if (isError) {
              setProvisioningState(ProvisioningState.ERROR);
              addLog(status, 'error');
              setError(status);
              cleanup();
              setIsLoading(false);
            } else {
              handleStatusUpdate(status, isError, ssid, password, rememberNetwork, deviceId, deviceName, onProvisioningComplete);
            }
          }
        );

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
