export type DeviceStatus = 'online' | 'offline' | 'unknown' | 'archived';

export type DeviceType = 'smart_switch' | 'smart_plug' | 'light' | 'fan' | 'sensor' | 'other';

export type ChannelType = 'relay' | 'switch' | 'dimmer' | 'sensor';

export type ChannelState = 'on' | 'off' | 'unknown';

/**
 * Cloud device channel stored at: homes/{homeId}/devices/{deviceId}/channels/{channelId}
 * Represents a physical relay, switch, or dimmer on the device
 * Stable ID format: relay_1, relay_2, relay_3, relay_4
 */
export interface DeviceChannel {
  id: string; // Stable ID: relay_1, relay_2, etc.
  homeId: string;
  deviceId: string;
  channelNumber: number; // 1-based channel number
  name: string; // User-friendly name or default "Relay 1"
  type: ChannelType;
  state: ChannelState;
  roomId?: string; // Optional room reference
  roomName?: string; // Optional room name
  icon?: string; // Optional icon name
  sortOrder: number; // Display order (usually channelNumber * 10)
  pin?: number; // Optional GPIO pin
  lastUpdate: string; // ISO timestamp of last state update
  createdAt: string; // ISO timestamp of creation
  updatedAt: string; // ISO timestamp of last update
  metadata?: Record<string, any>; // Additional metadata
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
  roomName?: string; // Fallback room name for migrated devices (when roomId not available)
  description?: string;

  // Device configuration
  channelCount: number;
  channelNames?: {
    [key: string]: string;
  };

  // Connection information
  status: DeviceStatus;
  firmwareVersion?: string;
  lastSeenAt?: string; // ISO timestamp of last MQTT activity
  lastMqttMessageAt?: string; // ISO timestamp of last MQTT message received
  lastSeen?: string; // Deprecated: use lastSeenAt instead

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
  roomName?: string; // Fallback room name for migrated devices
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
  roomName?: string; // Fallback room name for migrated devices
  description?: string;
  status?: DeviceStatus;
  firmwareVersion?: string;
  lastSeenAt?: string; // ISO timestamp of last MQTT activity
  lastMqttMessageAt?: string; // ISO timestamp of last MQTT message received
  lastSeen?: string; // Deprecated: use lastSeenAt instead
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
 * Input for creating or updating a device channel with stable ID
 */
export interface CreateOrUpdateChannelInput {
  homeId: string;
  deviceId: string;
  channelNumber: number;
  name?: string;
  type?: ChannelType;
  state?: ChannelState;
  roomId?: string;
  roomName?: string;
  icon?: string;
  pin?: number;
  sortOrder?: number;
  metadata?: Record<string, any>;
}

/**
 * Input for updating a device channel
 */
export interface UpdateChannelInput {
  name?: string;
  type?: ChannelType;
  pin?: number;
  state?: ChannelState;
  icon?: string | null;
  roomId?: string | null;
  roomName?: string | null;
}
