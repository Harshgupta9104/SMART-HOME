export type DeviceStatus = 'online' | 'offline' | 'unknown' | 'archived';

export type DeviceType = 'smart_switch' | 'smart_plug' | 'light' | 'fan' | 'sensor' | 'other';

export type ChannelType = 'relay' | 'switch' | 'dimmer' | 'sensor';

export type ChannelState = 'on' | 'off' | 'unknown';

/**
 * Cloud device channel stored at: homes/{homeId}/devices/{deviceId}/channels/{channelId}
 * Represents a physical relay, switch, or dimmer on the device
 */
export interface DeviceChannel {
  id: string;
  deviceId: string;
  homeId: string;
  name: string;
  type: ChannelType;
  pin?: number;
  state: ChannelState;
  lastUpdate: string;
  updatedAt: string;
}

/**
 * Cloud device document stored at: homes/{homeId}/devices/{deviceId}
 * Mirrors ProvisionedDevice from local storage to Firestore
 */
export interface CloudDevice {
  // Core identifiers
  id: string; // Primary unique identifier (Firestore doc ID)
  homeId: string;
  localDeviceId: string; // Reference to local ProvisionedDevice.id
  bleId?: string; // BLE MAC address
  mqttDeviceId: string; // MQTT topic device ID (required for MQTT communication)

  // User-facing information
  name: string; // User-friendly name (e.g., "Living Room Hub")
  type: DeviceType;
  roomId?: string; // Reference to room document ID
  description?: string;

  // Device configuration
  channelCount: number;
  channelNames?: {
    [key: string]: string;
  };

  // Connection information
  status: DeviceStatus;
  firmwareVersion?: string;
  lastSeen?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Input for creating a cloud device
 */
export interface CreateCloudDeviceInput {
  homeId: string;
  localDeviceId: string;
  bleId?: string;
  mqttDeviceId: string;
  name: string;
  type: DeviceType;
  roomId?: string;
  channelCount: number;
  firmwareVersion?: string;
  createdBy: string;
}

/**
 * Input for updating a cloud device
 */
export interface UpdateCloudDeviceInput {
  name?: string;
  type?: DeviceType;
  roomId?: string;
  description?: string;
  status?: DeviceStatus;
  firmwareVersion?: string;
  lastSeen?: string;
}

/**
 * Input for creating/updating a device channel
 */
export interface CreateChannelInput {
  homeId: string;
  deviceId: string;
  name: string;
  type: ChannelType;
  pin?: number;
}

/**
 * Input for updating a device channel
 */
export interface UpdateChannelInput {
  name?: string;
  type?: ChannelType;
  pin?: number;
  state?: ChannelState;
}
