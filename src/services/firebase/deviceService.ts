import firestore from '@react-native-firebase/firestore';
import { ProvisionedDevice } from '../storageService';
import {
  CloudDevice,
  CreateCloudDeviceInput,
  UpdateCloudDeviceInput,
  DeviceChannel,
  CreateChannelInput,
  CreateOrUpdateChannelInput,
  UpdateChannelInput,
} from '../../types/device';

/**
 * Remove undefined values from an object before Firestore write
 * Firestore rejects undefined but accepts missing fields
 */
const removeUndefinedFields = <T extends Record<string, any>>(data: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
};

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
      if (input.roomName) {
        updates.roomName = input.roomName;
      }

      await existingDoc.ref.update(removeUndefinedFields(updates));
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
      roomName: input.roomName,
      channelCount: input.channelCount,
      firmwareVersion: input.firmwareVersion,
      status: 'online',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    await deviceRef.set(removeUndefinedFields(newDevice));
    console.log('[DeviceService] Cloud device created:', deviceId);

    return newDevice;
  } catch (error) {
    console.error('[DeviceService] Failed to create/update cloud device', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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
    console.error('[DeviceService] Failed to load cloud devices', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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
    console.error('[DeviceService] Failed to get cloud device', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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
      updateData.roomId = updates.roomId; // Supports null to clear roomId
    }
    if (updates.roomName !== undefined) {
      updateData.roomName = updates.roomName; // Supports null to clear roomName
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
    if (updates.lastSeenAt !== undefined) {
      updateData.lastSeenAt = updates.lastSeenAt;
    }
    if (updates.lastMqttMessageAt !== undefined) {
      updateData.lastMqttMessageAt = updates.lastMqttMessageAt;
    }
    if (updates.lastSeen !== undefined) {
      updateData.lastSeen = updates.lastSeen;
    }

    await deviceRef.update(removeUndefinedFields(updateData));
    console.log('[DeviceService] Cloud device updated:', deviceId);

    const updatedDoc = await deviceRef.get();
    return updatedDoc.data() as CloudDevice;
  } catch (error) {
    console.error('[DeviceService] Failed to update cloud device', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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
      .update(removeUndefinedFields({
        status: 'archived',
        updatedAt: now,
      }));

    console.log('[DeviceService] Cloud device archived:', deviceId);
  } catch (error) {
    console.error('[DeviceService] Failed to archive cloud device', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
    throw error;
  }
};

/**
 * Create or update a device channel with stable ID (idempotent)
 * Stable channel ID: relay_1, relay_2, relay_3, relay_4
 */
export const createOrUpdateDeviceChannel = async (
  input: CreateOrUpdateChannelInput,
): Promise<DeviceChannel> => {
  try {
    const db = firestore();
    const now = new Date().toISOString();

    // Generate stable channel ID
    const channelId = `relay_${input.channelNumber}`;

    const channelRef = db
      .collection('homes')
      .doc(input.homeId)
      .collection('devices')
      .doc(input.deviceId)
      .collection('channels')
      .doc(channelId);

    // Check if channel already exists
    const existingSnapshot = await channelRef.get();

    const snapshotExists =
      typeof (existingSnapshot as any).exists === 'function'
        ? (existingSnapshot as any).exists()
        : Boolean((existingSnapshot as any).exists);

    if (snapshotExists) {
      // Channel exists, update it
      const existingChannel = existingSnapshot.data() as DeviceChannel;

      const updates: Partial<DeviceChannel> = {
        updatedAt: now,
      };

      if (input.name !== undefined) {
        updates.name = input.name;
      }
      if (input.type !== undefined) {
        updates.type = input.type;
      }
      if (input.state !== undefined) {
        updates.state = input.state;
      }
      if (input.roomId !== undefined) {
        updates.roomId = input.roomId;
      }
      if (input.roomName !== undefined) {
        updates.roomName = input.roomName;
      }
      if (input.icon !== undefined) {
        updates.icon = input.icon;
      }
      if (input.pin !== undefined) {
        updates.pin = input.pin;
      }
      if (input.sortOrder !== undefined) {
        updates.sortOrder = input.sortOrder;
      }
      if (input.metadata !== undefined) {
        updates.metadata = input.metadata;
      }

      await channelRef.update(removeUndefinedFields(updates));
      console.log('[DeviceService] Channel updated (existing):', channelId);

      return {
        ...existingChannel,
        ...updates,
      };
    }

    // Channel doesn't exist, create it
    const newChannel: DeviceChannel = {
      id: channelId,
      homeId: input.homeId,
      deviceId: input.deviceId,
      channelNumber: input.channelNumber,
      name: input.name || `Relay ${input.channelNumber}`,
      type: input.type || 'relay',
      state: input.state || 'unknown',
      roomId: input.roomId,
      roomName: input.roomName,
      icon: input.icon,
      sortOrder: input.sortOrder || input.channelNumber * 10,
      pin: input.pin,
      lastUpdate: now,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    await channelRef.set(removeUndefinedFields(newChannel));
    console.log('[DeviceService] Channel created:', channelId);

    return newChannel;
  } catch (error) {
    console.error('[DeviceService] Failed to create/update channel', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
    throw error;
  }
};

/**
 * Create a device channel (legacy - kept for backward compatibility)
 * Prefer createOrUpdateDeviceChannel for idempotent channel creation
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
      channelNumber: 1, // Default to 1 for legacy calls
      name: input.name,
      type: input.type,
      state: 'unknown',
      pin: input.pin,
      sortOrder: 10,
      lastUpdate: now,
      createdAt: now,
      updatedAt: now,
    };

    await channelRef.set(removeUndefinedFields(newChannel));
    console.log('[DeviceService] Channel created:', channelId);

    return newChannel;
  } catch (error) {
    console.error('[DeviceService] Failed to create channel', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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

    const channels = channelsSnapshot.docs.map(doc => doc.data() as DeviceChannel);
    // Sort by sortOrder or channelNumber
    return channels.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    console.error('[DeviceService] Failed to get channels', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
    throw error;
  }
};

/**
 * Ensure channels exist for a device (create if missing)
 * Idempotent: safe to call multiple times
 * Normalizes channelCount and creates channels 1 to channelCount
 */
export const ensureChannelsForDevice = async (
  homeId: string,
  deviceId: string,
  channelCount: number,
  options?: {
    roomId?: string;
    roomName?: string;
  },
): Promise<DeviceChannel[]> => {
  try {
    // Normalize channelCount
    let normalizedCount = channelCount;
    if (!Number.isInteger(normalizedCount) || normalizedCount < 1) {
      normalizedCount = 1;
    }
    if (normalizedCount > 16) {
      normalizedCount = 16; // Cap at 16 for safety
    }

    console.log('[DeviceService] Ensuring channels for device:', {
      deviceId,
      channelCount: normalizedCount,
    });

    // Create or update each channel
    const channelPromises: Promise<DeviceChannel>[] = [];
    for (let i = 1; i <= normalizedCount; i++) {
      channelPromises.push(
        createOrUpdateDeviceChannel({
          homeId,
          deviceId,
          channelNumber: i,
          name: `Relay ${i}`,
          type: 'relay',
          state: 'unknown',
          sortOrder: i * 10,
          roomId: options?.roomId,
          roomName: options?.roomName,
        }),
      );
    }

    const channels = await Promise.all(channelPromises);
    console.log('[DeviceService] Channels ensured for device:', {
      deviceId,
      count: channels.length,
    });

    return channels.sort((a, b) => a.channelNumber - b.channelNumber);
  } catch (error) {
    console.error('[DeviceService] Failed to ensure channels', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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
    // Support optional fields: icon, roomId, roomName
    if (updates.icon !== undefined) {
      updateData.icon = updates.icon;
    }
    if (updates.roomId !== undefined) {
      updateData.roomId = updates.roomId;
    }
    if (updates.roomName !== undefined) {
      updateData.roomName = updates.roomName;
    }

    await channelRef.update(removeUndefinedFields(updateData));
    console.log('[DeviceService] Channel updated:', channelId);

    const updatedDoc = await channelRef.get();
    return updatedDoc.data() as DeviceChannel;
  } catch (error) {
    console.error('[DeviceService] Failed to update channel', {
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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
    mqttDeviceId: device.mqttDeviceId || device.id,
    name: device.displayName || device.name || 'Smart Device',
    type: 'smart_switch',
    // roomId intentionally omitted (not assigned until user moves to room)
    roomName: device.roomName || 'Unassigned',
    channelCount:
      typeof device.relayCount === 'number' && device.relayCount > 0
        ? device.relayCount
        : 1,
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
  createOrUpdateDeviceChannel,
  createDeviceChannel,
  getChannelsForDevice,
  ensureChannelsForDevice,
  updateDeviceChannel,
  mapProvisionedDeviceToCloudDevice,
};
