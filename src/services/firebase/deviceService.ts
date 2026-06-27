import firestore from '@react-native-firebase/firestore';
import { ProvisionedDevice } from '../storageService';
import {
  CloudDevice,
  CreateCloudDeviceInput,
  UpdateCloudDeviceInput,
  DeviceChannel,
  CreateChannelInput,
  UpdateChannelInput,
} from '../../types/device';

/**
 * Create or update a cloud device (idempotent)
 * If device already exists by localDeviceId, updates it
 */
export const createOrUpdateCloudDevice = async (input: CreateCloudDeviceInput): Promise<CloudDevice> => {
  try {
    const db = firestore();
    const now = new Date().toISOString();

    // Check if device already exists by localDeviceId
    const existingDeviceSnapshot = await db
      .collection('homes')
      .doc(input.homeId)
      .collection('devices')
      .where('localDeviceId', '==', input.localDeviceId)
      .get();

    if (!existingDeviceSnapshot.empty) {
      // Device exists, update it
      const existingDoc = existingDeviceSnapshot.docs[0];
      const existingDevice = existingDoc.data() as CloudDevice;

      const updates: Partial<CloudDevice> = {
        mqttDeviceId: input.mqttDeviceId,
        name: input.name,
        type: input.type,
        channelCount: input.channelCount,
        updatedAt: now,
      };

      if (input.firmwareVersion) {
        updates.firmwareVersion = input.firmwareVersion;
      }
      if (input.roomId) {
        updates.roomId = input.roomId;
      }

      await existingDoc.ref.update(updates);
      console.log('[DeviceService] Cloud device updated (existing):', existingDevice.id);

      return {
        ...existingDevice,
        ...updates,
      };
    }

    // Device doesn't exist, create it
    const deviceRef = db
      .collection('homes')
      .doc(input.homeId)
      .collection('devices')
      .doc();

    const deviceId = deviceRef.id;

    const newDevice: CloudDevice = {
      id: deviceId,
      homeId: input.homeId,
      localDeviceId: input.localDeviceId,
      bleId: input.bleId,
      mqttDeviceId: input.mqttDeviceId,
      name: input.name,
      type: input.type,
      roomId: input.roomId,
      channelCount: input.channelCount,
      firmwareVersion: input.firmwareVersion,
      status: 'online',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    await deviceRef.set(newDevice);
    console.log('[DeviceService] Cloud device created:', deviceId);

    return newDevice;
  } catch (error) {
    console.error('[DeviceService] Failed to create/update cloud device:', error);
    throw error;
  }
};

/**
 * Get all devices for a home
 */
export const getDevicesForHome = async (homeId: string): Promise<CloudDevice[]> => {
  try {
    const devicesSnapshot = await firestore()
      .collection('homes')
      .doc(homeId)
      .collection('devices')
      .get();

    if (devicesSnapshot.empty) {
      console.log('[DeviceService] No cloud devices found for home:', homeId);
      return [];
    }

    const devices = devicesSnapshot.docs
      .map(doc => doc.data() as CloudDevice)
      .filter(device => device.status !== 'archived');

    console.log('[DeviceService] Cloud devices loaded:', { homeId, count: devices.length });
    return devices;
  } catch (error) {
    console.error('[DeviceService] Failed to load cloud devices:', error);
    throw error;
  }
};

/**
 * Get a specific cloud device
 */
export const getCloudDevice = async (homeId: string, deviceId: string): Promise<CloudDevice | null> => {
  try {
    const deviceDoc = await firestore()
      .collection('homes')
      .doc(homeId)
      .collection('devices')
      .doc(deviceId)
      .get();

    if (!deviceDoc.exists) {
      console.log('[DeviceService] Cloud device not found:', deviceId);
      return null;
    }

    return deviceDoc.data() as CloudDevice;
  } catch (error) {
    console.error('[DeviceService] Failed to get cloud device:', error);
    throw error;
  }
};

/**
 * Update a cloud device
 */
export const updateCloudDevice = async (
  homeId: string,
  deviceId: string,
  updates: UpdateCloudDeviceInput,
): Promise<CloudDevice> => {
  try {
    const db = firestore();
    const deviceRef = db
      .collection('homes')
      .doc(homeId)
      .collection('devices')
      .doc(deviceId);

    const now = new Date().toISOString();

    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.type !== undefined) {
      updateData.type = updates.type;
    }
    if (updates.roomId !== undefined) {
      updateData.roomId = updates.roomId;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.firmwareVersion !== undefined) {
      updateData.firmwareVersion = updates.firmwareVersion;
    }
    if (updates.lastSeen !== undefined) {
      updateData.lastSeen = updates.lastSeen;
    }

    await deviceRef.update(updateData);
    console.log('[DeviceService] Cloud device updated:', deviceId);

    const updatedDoc = await deviceRef.get();
    return updatedDoc.data() as CloudDevice;
  } catch (error) {
    console.error('[DeviceService] Failed to update cloud device:', error);
    throw error;
  }
};

/**
 * Archive a cloud device (soft delete)
 */
export const archiveCloudDevice = async (homeId: string, deviceId: string): Promise<void> => {
  try {
    const now = new Date().toISOString();

    await firestore()
      .collection('homes')
      .doc(homeId)
      .collection('devices')
      .doc(deviceId)
      .update({
        status: 'archived',
        updatedAt: now,
      });

    console.log('[DeviceService] Cloud device archived:', deviceId);
  } catch (error) {
    console.error('[DeviceService] Failed to archive cloud device:', error);
    throw error;
  }
};

/**
 * Create a device channel
 */
export const createDeviceChannel = async (input: CreateChannelInput): Promise<DeviceChannel> => {
  try {
    const db = firestore();
    const now = new Date().toISOString();

    const channelRef = db
      .collection('homes')
      .doc(input.homeId)
      .collection('devices')
      .doc(input.deviceId)
      .collection('channels')
      .doc();

    const channelId = channelRef.id;

    const newChannel: DeviceChannel = {
      id: channelId,
      deviceId: input.deviceId,
      homeId: input.homeId,
      name: input.name,
      type: input.type,
      pin: input.pin,
      state: 'unknown',
      lastUpdate: now,
      updatedAt: now,
    };

    await channelRef.set(newChannel);
    console.log('[DeviceService] Channel created:', channelId);

    return newChannel;
  } catch (error) {
    console.error('[DeviceService] Failed to create channel:', error);
    throw error;
  }
};

/**
 * Get channels for a device
 */
export const getChannelsForDevice = async (homeId: string, deviceId: string): Promise<DeviceChannel[]> => {
  try {
    const channelsSnapshot = await firestore()
      .collection('homes')
      .doc(homeId)
      .collection('devices')
      .doc(deviceId)
      .collection('channels')
      .get();

    if (channelsSnapshot.empty) {
      console.log('[DeviceService] No channels found for device:', deviceId);
      return [];
    }

    return channelsSnapshot.docs.map(doc => doc.data() as DeviceChannel);
  } catch (error) {
    console.error('[DeviceService] Failed to get channels:', error);
    throw error;
  }
};

/**
 * Update a device channel
 */
export const updateDeviceChannel = async (
  homeId: string,
  deviceId: string,
  channelId: string,
  updates: UpdateChannelInput,
): Promise<DeviceChannel> => {
  try {
    const db = firestore();
    const channelRef = db
      .collection('homes')
      .doc(homeId)
      .collection('devices')
      .doc(deviceId)
      .collection('channels')
      .doc(channelId);

    const now = new Date().toISOString();

    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.type !== undefined) {
      updateData.type = updates.type;
    }
    if (updates.pin !== undefined) {
      updateData.pin = updates.pin;
    }
    if (updates.state !== undefined) {
      updateData.state = updates.state;
      updateData.lastUpdate = now;
    }

    await channelRef.update(updateData);
    console.log('[DeviceService] Channel updated:', channelId);

    const updatedDoc = await channelRef.get();
    return updatedDoc.data() as DeviceChannel;
  } catch (error) {
    console.error('[DeviceService] Failed to update channel:', error);
    throw error;
  }
};

/**
 * Convert local ProvisionedDevice to cloud device input
 */
export const mapProvisionedDeviceToCloudDevice = (
  device: ProvisionedDevice,
  homeId: string,
  userId: string,
): CreateCloudDeviceInput => {
  return {
    homeId,
    localDeviceId: device.id,
    bleId: device.bleId,
    mqttDeviceId: device.mqttDeviceId,
    name: device.displayName || device.name,
    type: 'smart_switch',
    roomId: undefined,
    channelCount: device.relayCount,
    firmwareVersion: device.firmwareVersion,
    createdBy: userId,
  };
};

export const deviceService = {
  createOrUpdateCloudDevice,
  getDevicesForHome,
  getCloudDevice,
  updateCloudDevice,
  archiveCloudDevice,
  createDeviceChannel,
  getChannelsForDevice,
  updateDeviceChannel,
  mapProvisionedDeviceToCloudDevice,
};
