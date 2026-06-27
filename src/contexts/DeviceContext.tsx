import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createOrUpdateCloudDevice,
  getDevicesForHome,
  updateCloudDevice,
  archiveCloudDevice,
  mapProvisionedDeviceToCloudDevice,
} from '../services/firebase/deviceService';
import { CloudDevice, UpdateCloudDeviceInput } from '../types/device';
import { useAuth } from './AuthContext';
import { useHome } from './HomeContext';
import { getStorageService, ProvisionedDevice } from '../services/storageService';

export type DeviceLoadingState = 'idle' | 'loading' | 'ready' | 'error';

type DeviceContextValue = {
  devices: CloudDevice[];
  loadingState: DeviceLoadingState;
  error: string | null;
  refreshDevices: () => Promise<void>;
  syncLocalDevicesToCloud: () => Promise<void>;
  registerCloudDevice: (localDevice: ProvisionedDevice) => Promise<CloudDevice | null>;
  updateExistingDevice: (deviceId: string, updates: UpdateCloudDeviceInput) => Promise<CloudDevice | null>;
  archiveExistingDevice: (deviceId: string) => Promise<boolean>;
};

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

type DeviceProviderProps = {
  children: ReactNode;
};

export const DeviceProvider = ({ children }: DeviceProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const { activeHome, loadingState: homeLoadingState } = useHome();
  const [devices, setDevices] = useState<CloudDevice[]>([]);
  const [loadingState, setLoadingState] = useState<DeviceLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const storageService = getStorageService();

  /**
   * Load cloud devices from Firestore for the active home
   */
  const loadDevices = React.useCallback(async () => {
    if (!isAuthenticated || !user?.uid) {
      console.log('[DeviceContext] Not authenticated, skipping device load');
      setDevices([]);
      setLoadingState('idle');
      setError(null);
      return;
    }

    if (!activeHome || homeLoadingState !== 'ready') {
      console.log('[DeviceContext] Home not ready yet', {
        activeHomeId: activeHome?.id,
        homeLoadingState,
      });
      setDevices([]);
      setLoadingState('idle');
      setError(null);
      return;
    }

    try {
      console.log('[DeviceContext] Loading cloud devices', {
        homeId: activeHome.id,
        userId: user.uid,
      });
      setLoadingState('loading');
      setError(null);

      const loadedDevices = await getDevicesForHome(activeHome.id);
      console.log('[DeviceContext] Cloud devices loaded successfully', {
        count: loadedDevices.length,
      });
      setDevices(loadedDevices);
      setLoadingState('ready');
    } catch (err: any) {
      console.error('[DeviceContext] Failed to load cloud devices', {
        error: err.message,
        code: err.code,
        homeId: activeHome?.id,
        userId: user?.uid,
      });
      setError('Failed to load devices');
      setLoadingState('error');
    }
  }, [user?.uid, isAuthenticated, activeHome, homeLoadingState]);

  /**
   * Load devices when user/home changes
   */
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  /**
   * Refresh devices list
   */
  const refreshDevices = React.useCallback(async () => {
    await loadDevices();
  }, [loadDevices]);

  /**
   * Sync local provisioned devices to cloud (idempotent)
   * Called on app startup or when local devices change
   */
  const syncLocalDevicesToCloud = React.useCallback(async () => {
    if (!activeHome || !user?.uid) {
      console.log('[DeviceContext] Cannot sync: no home or user');
      return;
    }

    try {
      console.log('[DeviceContext] Starting local-to-cloud device sync');

      // Get all local provisioned devices
      const localDevices = await storageService.getProvisionedDevices();
      console.log('[DeviceContext] Local devices found:', { count: localDevices.length });

      // Sync each local device to cloud (idempotent)
      for (const localDevice of localDevices) {
        try {
          const cloudInput = mapProvisionedDeviceToCloudDevice(localDevice, activeHome.id, user.uid);
          await createOrUpdateCloudDevice(cloudInput);
        } catch (syncError) {
          console.error('[DeviceContext] Failed to sync device:', {
            deviceId: localDevice.id,
            error: (syncError as any).message,
          });
          // Continue syncing other devices even if one fails
        }
      }

      // Refresh devices list after sync
      await loadDevices();
      console.log('[DeviceContext] Local-to-cloud sync completed');
    } catch (err) {
      console.error('[DeviceContext] Failed to sync local devices to cloud:', err);
    }
  }, [activeHome, user?.uid, storageService, loadDevices]);

  /**
   * Register a local device to cloud after provisioning
   * Non-blocking: if cloud registration fails, don't fail provisioning
   */
  const registerCloudDevice = React.useCallback(
    async (localDevice: ProvisionedDevice): Promise<CloudDevice | null> => {
      if (!activeHome || !user?.uid) {
        console.log('[DeviceContext] Cannot register device: no home or user');
        return null;
      }

      try {
        const cloudInput = mapProvisionedDeviceToCloudDevice(localDevice, activeHome.id, user.uid);
        const cloudDevice = await createOrUpdateCloudDevice(cloudInput);
        console.log('[DeviceContext] Device registered to cloud:', cloudDevice.id);

        // Refresh devices list
        await loadDevices();
        return cloudDevice;
      } catch (err) {
        console.error('[DeviceContext] Failed to register device to cloud:', err);
        // Return null instead of throwing to allow provisioning to continue
        return null;
      }
    },
    [activeHome, user?.uid, loadDevices],
  );

  /**
   * Update a cloud device
   */
  const updateExistingDevice = React.useCallback(
    async (deviceId: string, updates: UpdateCloudDeviceInput): Promise<CloudDevice | null> => {
      if (!activeHome) {
        console.error('[DeviceContext] No active home');
        return null;
      }

      try {
        const updatedDevice = await updateCloudDevice(activeHome.id, deviceId, updates);
        // Refresh devices list
        await loadDevices();
        return updatedDevice;
      } catch {
        console.error('[DeviceContext] Failed to update device');
        return null;
      }
    },
    [activeHome, loadDevices],
  );

  /**
   * Archive a cloud device
   */
  const archiveExistingDevice = React.useCallback(
    async (deviceId: string): Promise<boolean> => {
      if (!activeHome) {
        console.error('[DeviceContext] No active home');
        return false;
      }

      try {
        await archiveCloudDevice(activeHome.id, deviceId);
        // Refresh devices list
        await loadDevices();
        return true;
      } catch {
        console.error('[DeviceContext] Failed to archive device');
        return false;
      }
    },
    [activeHome, loadDevices],
  );

  const value = useMemo<DeviceContextValue>(
    () => ({
      devices,
      loadingState,
      error,
      refreshDevices,
      syncLocalDevicesToCloud,
      registerCloudDevice,
      updateExistingDevice,
      archiveExistingDevice,
    }),
    [
      devices,
      loadingState,
      error,
      refreshDevices,
      syncLocalDevicesToCloud,
      registerCloudDevice,
      updateExistingDevice,
      archiveExistingDevice,
    ],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDevice = (): DeviceContextValue => {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error('useDevice must be used inside DeviceProvider');
  }

  return context;
};
