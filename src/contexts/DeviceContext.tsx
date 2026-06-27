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
  ensureChannelsForDevice,
  getChannelsForDevice,
} from '../services/firebase/deviceService';
import { CloudDevice, UpdateCloudDeviceInput, DeviceChannel } from '../types/device';
import { useAuth } from './AuthContext';
import { useHome } from './HomeContext';
import { useRoom } from './RoomContext';
import { getStorageService, ProvisionedDevice } from '../services/storageService';

export type DeviceLoadingState = 'idle' | 'loading' | 'ready' | 'error';

type DeviceContextValue = {
  devices: CloudDevice[];
  channelsByDeviceId: Record<string, DeviceChannel[]>;
  loadingState: DeviceLoadingState;
  error: string | null;
  refreshDevices: () => Promise<void>;
  syncLocalDevicesToCloud: () => Promise<void>;
  registerCloudDevice: (localDevice: ProvisionedDevice) => Promise<CloudDevice | null>;
  updateExistingDevice: (deviceId: string, updates: UpdateCloudDeviceInput) => Promise<CloudDevice | null>;
  archiveExistingDevice: (deviceId: string) => Promise<boolean>;
  refreshChannelsForDevice: (deviceId: string) => Promise<DeviceChannel[]>;
  getChannelsForDeviceFromContext: (deviceId: string) => DeviceChannel[];
};

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

type DeviceProviderProps = {
  children: ReactNode;
};

export const DeviceProvider = ({ children }: DeviceProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const { activeHome, loadingState: homeLoadingState } = useHome();
  const { rooms: firestoreRooms } = useRoom();
  const [devices, setDevices] = useState<CloudDevice[]>([]);
  const [channelsByDeviceId, setChannelsByDeviceId] = useState<Record<string, DeviceChannel[]>>({});
  const [loadingState, setLoadingState] = useState<DeviceLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const syncAttemptedRef = React.useRef(false);

  const storageService = getStorageService();

  /**
   * Normalize room name for safe comparison
   */
  const normalizeRoomName = (name?: string): string => {
    return (name || 'Unassigned').trim().toLowerCase();
  };

  /**
   * Find Firestore room ID by room name
   */
  const findRoomIdByName = React.useCallback(
    (roomName?: string): string | undefined => {
      if (!roomName) return undefined;
      const normalized = normalizeRoomName(roomName);
      const matchedRoom = firestoreRooms.find(room => normalizeRoomName(room.name) === normalized);
      return matchedRoom?.id;
    },
    [firestoreRooms],
  );

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
   * Reset sync flag when home/user changes
   */
  useEffect(() => {
    syncAttemptedRef.current = false;
  }, [activeHome?.id, user?.uid]);

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
          const baseInput = mapProvisionedDeviceToCloudDevice(localDevice, activeHome.id, user.uid);

          // Enrich with roomId if a matching Firestore room exists
          const roomId = findRoomIdByName(baseInput.roomName);
          const cloudInput = {
            ...baseInput,
            roomId: roomId || baseInput.roomId,
          };

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
  }, [activeHome, user?.uid, storageService, loadDevices, findRoomIdByName]);

  /**
   * After devices load successfully, auto-sync local devices once per session
   */
  useEffect(() => {
    if (loadingState === 'ready' && activeHome && user?.uid && !syncAttemptedRef.current) {
      syncAttemptedRef.current = true;
      syncLocalDevicesToCloud();
    }
  }, [loadingState, activeHome, user?.uid, syncLocalDevicesToCloud]);

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
        const baseInput = mapProvisionedDeviceToCloudDevice(localDevice, activeHome.id, user.uid);

        // Enrich with roomId if a matching Firestore room exists
        const roomId = findRoomIdByName(baseInput.roomName);
        const cloudInput = {
          ...baseInput,
          roomId: roomId || baseInput.roomId,
        };

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
    [activeHome, user?.uid, loadDevices, findRoomIdByName],
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

  /**
   * Get channels for a specific device from context
   */
  const getChannelsForDeviceFromContext = React.useCallback(
    (deviceId: string): DeviceChannel[] => {
      return channelsByDeviceId[deviceId] || [];
    },
    [channelsByDeviceId],
  );

  /**
   * Refresh channels for a specific device
   */
  const refreshChannelsForDevice = React.useCallback(
    async (deviceId: string): Promise<DeviceChannel[]> => {
      if (!activeHome) {
        console.log('[DeviceContext] Cannot refresh channels: no active home');
        return [];
      }

      try {
        const channels = await getChannelsForDevice(activeHome.id, deviceId);
        setChannelsByDeviceId(prev => ({
          ...prev,
          [deviceId]: channels,
        }));
        return channels;
      } catch (err) {
        console.error('[DeviceContext] Failed to refresh channels for device:', {
          deviceId,
          error: (err as any).message,
        });
        return [];
      }
    },
    [activeHome],
  );

  /**
   * Ensure channels for all loaded devices
   */
  const ensureAllDeviceChannels = React.useCallback(async () => {
    if (!activeHome) return;

    try {
      for (const device of devices) {
        try {
          await ensureChannelsForDevice(
            activeHome.id,
            device.id,
            device.channelCount || 1,
            {
              roomId: device.roomId,
              roomName: device.roomName,
            },
          );

          // Load channels after ensuring they exist
          await refreshChannelsForDevice(device.id);
        } catch (err) {
          console.warn('[DeviceContext] Failed to ensure channels for device:', {
            deviceId: device.id,
            error: (err as any).message,
          });
          // Continue with other devices
        }
      }

      console.log('[DeviceContext] Device channels ensured for all devices');
    } catch (err) {
      console.error('[DeviceContext] Failed to ensure all device channels:', err);
    }
  }, [activeHome, devices, refreshChannelsForDevice]);

  /**
   * Auto-ensure channels after devices load
   */
  useEffect(() => {
    if (loadingState === 'ready' && activeHome && devices.length > 0) {
      ensureAllDeviceChannels();
    }
  }, [loadingState, activeHome, devices, ensureAllDeviceChannels]);

  const value = useMemo<DeviceContextValue>(
    () => ({
      devices,
      channelsByDeviceId,
      loadingState,
      error,
      refreshDevices,
      syncLocalDevicesToCloud,
      registerCloudDevice,
      updateExistingDevice,
      archiveExistingDevice,
      refreshChannelsForDevice,
      getChannelsForDeviceFromContext,
    }),
    [
      devices,
      channelsByDeviceId,
      loadingState,
      error,
      refreshDevices,
      syncLocalDevicesToCloud,
      registerCloudDevice,
      updateExistingDevice,
      archiveExistingDevice,
      refreshChannelsForDevice,
      getChannelsForDeviceFromContext,
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
