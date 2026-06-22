import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

// Device type enumeration
export type DeviceType = 'smart_switch_1_relay' | 'smart_switch_4_relay' | 'smart_plug' | 'sensor' | 'unknown';

// Normalized, backward-compatible device model
export interface ProvisionedDevice {
  // Core identifiers
  id: string; // Primary unique identifier (local)
  bleId?: string; // BLE native identifier (e.g., MAC address from BLE)
  mqttDeviceId: string; // MQTT topic device ID (required for MQTT communication)

  // User-facing names
  name: string; // Internal/fallback name (e.g., "PROV_26B7B3F8")
  displayName: string; // User-friendly name (e.g., "Living Room Hub")
  roomName: string; // Room/location name (defaults to "Unassigned")

  // Device configuration
  deviceType: DeviceType; // Device type classification
  relayCount: number; // Number of relays (1, 4, or 0 for non-switches)
  relayNames?: {
    relay1?: string;
    relay2?: string;
    relay3?: string;
    relay4?: string;
  }; // Optional relay names for multi-relay devices

  // Connection information
  macAddress?: string; // MAC address (optional)
  ssid?: string; // WiFi SSID (optional)
  status: 'connecting' | 'online' | 'offline'; // Current connection status
  firmwareVersion?: string; // Device firmware version

  // Timestamps
  lastSeen: string; // ISO timestamp of last activity
  provisionedAt: string; // ISO timestamp of provisioning

  // UI state
  justProvisioned?: boolean; // Flag for recent provisioning
}

export interface SavedNetwork {
  ssid: string;
  password: string;
  savedAt: string;
}

const PROVISIONED_DEVICES_KEY = '@SmartHome_ProvisionedDevices';
const SAVED_NETWORKS_KEY = '@SmartHome_SavedNetworks';
const KEYCHAIN_SERVICE = 'SmartHomeApp_WiFiCredentials';

/**
 * Normalize a device from old or partial format to the clean ProvisionedDevice model
 * Handles backward compatibility with old saved devices
 */
export function normalizeProvisionedDevice(device: any): ProvisionedDevice {
  if (!device) {
    throw new Error('Cannot normalize null or undefined device');
  }

  // Generate a safe fallback value
  const generateFallbackId = () => `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Extract primary ID - try multiple sources
  const id = device.id || device.bleId || device.mqttDeviceId || device.name || generateFallbackId();

  // Extract BLE ID
  const bleId = device.bleId || (typeof device.id === 'string' && device.id.length > 10 ? device.id : undefined);

  // Extract MQTT Device ID - critical for MQTT communication
  const mqttDeviceId = device.mqttDeviceId || device.deviceId || extractMqttIdFromName(device.name) || id;

  // Extract names with fallbacks
  const name = device.name || device.displayName || mqttDeviceId || 'Smart Device';
  const displayName = device.displayName || device.name || mqttDeviceId || 'Smart Device';

  // Extract room - default to Unassigned
  const roomName = (device.roomName && typeof device.roomName === 'string' && device.roomName.trim())
    ? device.roomName.trim()
    : 'Unassigned';

  // Extract and validate device type
  const validDeviceTypes: DeviceType[] = ['smart_switch_1_relay', 'smart_switch_4_relay', 'smart_plug', 'sensor', 'unknown'];
  const deviceType: DeviceType = (device.deviceType && validDeviceTypes.includes(device.deviceType))
    ? device.deviceType
    : 'unknown';

  // Calculate relay count
  let relayCount = 0;
  if (typeof device.relayCount === 'number') {
    relayCount = device.relayCount;
  } else if (deviceType === 'smart_switch_4_relay') {
    relayCount = 4;
  } else if (deviceType === 'smart_switch_1_relay' || deviceType === 'smart_plug') {
    relayCount = 1;
  } else {
    relayCount = 0;
  }

  // Preserve relay names if valid
  const relayNames = (device.relayNames && typeof device.relayNames === 'object')
    ? device.relayNames
    : undefined;

  // Extract optional fields
  const macAddress = device.macAddress || undefined;
  const ssid = device.ssid || undefined;
  const firmwareVersion = device.firmwareVersion || device.fw || undefined;

  // Validate status
  const validStatuses = ['connecting', 'online', 'offline'];
  const status: 'connecting' | 'online' | 'offline' = (device.status && validStatuses.includes(device.status))
    ? device.status
    : 'offline';

  // Get timestamps - use current ISO string if missing
  const now = new Date().toISOString();
  const lastSeen = device.lastSeen || now;
  const provisionedAt = device.provisionedAt || now;

  // Preserve justProvisioned flag
  const justProvisioned = device.justProvisioned || false;

  const normalized: ProvisionedDevice = {
    id,
    bleId,
    mqttDeviceId,
    name,
    displayName,
    roomName,
    deviceType,
    relayCount,
    relayNames,
    macAddress,
    ssid,
    status,
    firmwareVersion,
    lastSeen,
    provisionedAt,
    justProvisioned,
  };

  return normalized;
}

/**
 * Extract MQTT device ID from device name if it follows pattern like "PROV_26B7B3F8"
 */
function extractMqttIdFromName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return null;
  }

  // Try to extract from patterns like "PROV_26B7B3F8" or "device_26B7B3F8"
  const match = name.match(/(?:PROV|device)_([A-F0-9]+)/i);
  return match ? match[1] : null;
}

class StorageService {
  /**
   * Get all provisioned devices from local storage
   * Automatically normalizes old/corrupted data for backward compatibility
   */
  async getProvisionedDevices(): Promise<ProvisionedDevice[]> {
    try {
      const data = await AsyncStorage.getItem(PROVISIONED_DEVICES_KEY);
      if (!data) {
        console.log('[Storage] No provisioned devices found');
        return [];
      }

      let devices: any[] = [];
      try {
        devices = JSON.parse(data);
      } catch (parseError) {
        console.error('[Storage] JSON parse error, returning empty list:', parseError);
        return [];
      }

      // Ensure data is an array
      if (!Array.isArray(devices)) {
        console.error('[Storage] Stored data is not an array, returning empty list');
        return [];
      }

      // Normalize all devices for backward compatibility
      let normalizedDevices: ProvisionedDevice[] = [];
      let hasMigrationChanges = false;

      for (const device of devices) {
        try {
          const normalized = normalizeProvisionedDevice(device);
          normalizedDevices.push(normalized);

          // Check if normalization changed the data
          if (JSON.stringify(device) !== JSON.stringify(normalized)) {
            hasMigrationChanges = true;
          }
        } catch (normalizeError) {
          console.error('[Storage] Failed to normalize device, skipping:', normalizeError, device);
          continue;
        }
      }

      // Write back normalized data if migration occurred
      if (hasMigrationChanges && normalizedDevices.length > 0) {
        console.log('[Storage] Device model migration detected, writing normalized data');
        try {
          await AsyncStorage.setItem(PROVISIONED_DEVICES_KEY, JSON.stringify(normalizedDevices));
        } catch (writeError) {
          console.error('[Storage] Failed to write migrated data:', writeError);
          // Still return normalized devices even if write fails
        }
      }

      console.log('[Storage] Retrieved provisioned devices:', normalizedDevices.length);
      return normalizedDevices;
    } catch (error) {
      console.error('[Storage] Error getting provisioned devices:', error);
      return [];
    }
  }

  /**
   * Add or update a provisioned device
   * Normalizes incoming device data for consistency
   */
  async addProvisionedDevice(device: any): Promise<void> {
    try {
      // Normalize the incoming device
      const normalizedDevice = normalizeProvisionedDevice(device);

      const devices = await this.getProvisionedDevices();

      // Check if device already exists by id
      const existingIndex = devices.findIndex(d => d.id === normalizedDevice.id);

      if (existingIndex >= 0) {
        // Update existing device - preserve old fields and merge with new
        devices[existingIndex] = { ...devices[existingIndex], ...normalizedDevice };
        console.log('[Storage] Updated existing device:', normalizedDevice.id);
      } else {
        // Add new device
        devices.push(normalizedDevice);
        console.log('[Storage] Added new device:', normalizedDevice.id);
      }

      await AsyncStorage.setItem(PROVISIONED_DEVICES_KEY, JSON.stringify(devices));
      console.log('[Storage] Provisioned devices saved');
    } catch (error) {
      console.error('[Storage] Error adding provisioned device:', error);
      throw error;
    }
  }

  /**
   * Remove a provisioned device
   */
  async removeProvisionedDevice(deviceId: string): Promise<void> {
    try {
      const devices = await this.getProvisionedDevices();
      const filtered = devices.filter(d => d.id !== deviceId);

      await AsyncStorage.setItem(PROVISIONED_DEVICES_KEY, JSON.stringify(filtered));
      console.log('[Storage] Device removed:', deviceId);
    } catch (error) {
      console.error('[Storage] Error removing provisioned device:', error);
      throw error;
    }
  }

  /**
   * Clear all provisioned devices
   */
  async clearAllProvisionedDevices(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROVISIONED_DEVICES_KEY);
      console.log('[Storage] All provisioned devices cleared');
    } catch (error) {
      console.error('[Storage] Error clearing provisioned devices:', error);
      throw error;
    }
  }

  /**
   * Get all saved WiFi networks
   */
  async getSavedNetworks(): Promise<SavedNetwork[]> {
    try {
      const data = await AsyncStorage.getItem(SAVED_NETWORKS_KEY);
      if (!data) {
        console.log('[Storage] No saved networks found');
        return [];
      }

      const networks = JSON.parse(data) as SavedNetwork[];
      console.log('[Storage] Retrieved saved networks:', networks.length);
      return networks;
    } catch (error) {
      console.error('[Storage] Error getting saved networks:', error);
      return [];
    }
  }

  /**
   * Save WiFi network credentials securely
   */
  async saveNetworkCredentials(ssid: string, password: string): Promise<void> {
    try {
      // Save to Keychain for secure storage
      await Keychain.setGenericPassword(ssid, password, {
        service: KEYCHAIN_SERVICE,
      });

      // Also save metadata to AsyncStorage
      const networks = await this.getSavedNetworks();
      const existingIndex = networks.findIndex(n => n.ssid === ssid);

      if (existingIndex >= 0) {
        networks[existingIndex].savedAt = new Date().toISOString();
      } else {
        networks.push({
          ssid,
          password,
          savedAt: new Date().toISOString(),
        });
      }

      await AsyncStorage.setItem(SAVED_NETWORKS_KEY, JSON.stringify(networks));
      console.log('[Storage] Network credentials saved:', ssid);
    } catch (error) {
      console.error('[Storage] Error saving network credentials:', error);
      throw error;
    }
  }

  /**
   * Get password for a saved network
   */
  async getNetworkPassword(ssid: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      });

      if (credentials && credentials.username === ssid) {
        console.log('[Storage] Retrieved password for network:', ssid);
        return credentials.password;
      }

      return null;
    } catch (error) {
      console.error('[Storage] Error getting network password:', error);
      return null;
    }
  }

  /**
   * Remove saved network credentials
   */
  async removeNetworkCredentials(ssid: string): Promise<void> {
    try {
      // Remove from Keychain
      await Keychain.resetGenericPassword({
        service: KEYCHAIN_SERVICE,
      });

      // Remove from AsyncStorage metadata
      const networks = await this.getSavedNetworks();
      const filtered = networks.filter(n => n.ssid !== ssid);

      await AsyncStorage.setItem(SAVED_NETWORKS_KEY, JSON.stringify(filtered));
      console.log('[Storage] Network credentials removed:', ssid);
    } catch (error) {
      console.error('[Storage] Error removing network credentials:', error);
      throw error;
    }
  }

  /**
   * Clear all saved networks
   */
  async clearAllSavedNetworks(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SAVED_NETWORKS_KEY);
      await Keychain.resetGenericPassword({
        service: KEYCHAIN_SERVICE,
      });
      console.log('[Storage] All saved networks cleared');
    } catch (error) {
      console.error('[Storage] Error clearing saved networks:', error);
      throw error;
    }
  }

  /**
   * Update a single device field (partial update)
   */
  async updateProvisionedDevice(deviceId: string, updates: Partial<ProvisionedDevice>): Promise<void> {
    try {
      const devices = await this.getProvisionedDevices();
      const deviceIndex = devices.findIndex(d => d.id === deviceId);

      if (deviceIndex === -1) {
        throw new Error('Device not found');
      }

      devices[deviceIndex] = { ...devices[deviceIndex], ...updates };
      await AsyncStorage.setItem(PROVISIONED_DEVICES_KEY, JSON.stringify(devices));
      console.log('[Storage] Device updated:', deviceId);
    } catch (error) {
      console.error('[Storage] Error updating device:', error);
      throw error;
    }
  }

  /**
   * Update device room assignment
   */
  async updateDeviceRoom(deviceId: string, roomName: string): Promise<void> {
    await this.updateProvisionedDevice(deviceId, { roomName });
  }

  /**
   * Get all unique rooms from provisioned devices
   */
  async getRooms(): Promise<string[]> {
    try {
      const devices = await this.getProvisionedDevices();
      const roomsSet = new Set<string>();

      devices.forEach(device => {
        const room = device.roomName || 'Unassigned';
        roomsSet.add(room);
      });

      const rooms = Array.from(roomsSet).sort();
      console.log('[Storage] Retrieved unique rooms:', rooms);
      return rooms;
    } catch (error) {
      console.error('[Storage] Error getting rooms:', error);
      return [];
    }
  }

  /**
   * Get devices by room name
   */
  async getDevicesByRoom(roomName: string): Promise<ProvisionedDevice[]> {
    try {
      const devices = await this.getProvisionedDevices();
      const filtered = devices.filter(d => (d.roomName || 'Unassigned') === roomName);
      console.log('[Storage] Retrieved devices for room:', roomName, 'Count:', filtered.length);
      return filtered;
    } catch (error) {
      console.error('[Storage] Error getting devices by room:', error);
      return [];
    }
  }

  /**
   * Rename a room (updates all devices in that room)
   */
  async renameRoom(oldName: string, newName: string): Promise<void> {
    try {
      // Normalize names for comparison
      const oldNameTrimmed = oldName.trim();
      const newNameTrimmed = newName.trim();
      
      // Validate new room name
      if (!newNameTrimmed) {
        throw new Error('New room name cannot be empty');
      }

      // If names are identical (case-insensitive), do nothing safely
      if (oldNameTrimmed.toLowerCase() === newNameTrimmed.toLowerCase()) {
        console.log('[Storage] Room rename skipped (same name):', oldNameTrimmed);
        return;
      }

      // Get all devices to check for existing room
      const devices = await this.getProvisionedDevices();
      
      // Check if a room with the new name already exists (case-insensitive)
      const newRoomExists = devices.some(
        device => (device.roomName || 'Unassigned').toLowerCase() === newNameTrimmed.toLowerCase()
      );

      if (newRoomExists) {
        throw new Error(`A room with the name "${newNameTrimmed}" already exists`);
      }

      // Rename: update all devices where roomName matches oldName
      const updated = devices.map(device => {
        if ((device.roomName || 'Unassigned').toLowerCase() === oldNameTrimmed.toLowerCase()) {
          return { ...device, roomName: newNameTrimmed };
        }
        return device;
      });

      await AsyncStorage.setItem(PROVISIONED_DEVICES_KEY, JSON.stringify(updated));
      console.log('[Storage] Room renamed:', oldNameTrimmed, '→', newNameTrimmed);
    } catch (error) {
      console.error('[Storage] Error renaming room:', error);
      throw error;
    }
  }

  /**
   * Get device count for a specific room
   */
  async getDeviceCountByRoom(roomName: string): Promise<number> {
    try {
      const devices = await this.getDevicesByRoom(roomName);
      return devices.length;
    } catch (error) {
      console.error('[Storage] Error getting device count:', error);
      return 0;
    }
  }

  /**
   * Get all devices grouped by room
   */
  async getDevicesGroupedByRoom(): Promise<{ [room: string]: ProvisionedDevice[] }> {
    try {
      const devices = await this.getProvisionedDevices();
      const grouped: { [room: string]: ProvisionedDevice[] } = {};

      devices.forEach(device => {
        const room = device.roomName || 'Unassigned';
        if (!grouped[room]) {
          grouped[room] = [];
        }
        grouped[room].push(device);
      });

      console.log('[Storage] Devices grouped by room:', Object.keys(grouped));
      return grouped;
    } catch (error) {
      console.error('[Storage] Error grouping devices:', error);
      return {};
    }
  }

  /**
   * Get device by ID
   */
  async getDeviceById(deviceId: string): Promise<ProvisionedDevice | null> {
    try {
      const devices = await this.getProvisionedDevices();
      const device = devices.find(d => d.id === deviceId);
      return device || null;
    } catch (error) {
      console.error('[Storage] Error getting device by ID:', error);
      return null;
    }
  }

  /**
   * Get device by MQTT device ID
   */
  async getDeviceByMqttId(mqttDeviceId: string): Promise<ProvisionedDevice | null> {
    try {
      const devices = await this.getProvisionedDevices();
      const device = devices.find(d => d.mqttDeviceId === mqttDeviceId);
      return device || null;
    } catch (error) {
      console.error('[Storage] Error getting device by MQTT ID:', error);
      return null;
    }
  }

  /**
   * Check if device exists by ID or MQTT Device ID
   */
  async deviceExists(deviceIdOrMqttId: string): Promise<boolean> {
    try {
      const devices = await this.getProvisionedDevices();
      const exists = devices.some(
        d => d.id === deviceIdOrMqttId || d.mqttDeviceId === deviceIdOrMqttId
      );
      return exists;
    } catch (error) {
      console.error('[Storage] Error checking device existence:', error);
      return false;
    }
  }
}

// Singleton instance
let storageServiceInstance: StorageService | null = null;

export const getStorageService = (): StorageService => {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
};

export default StorageService;
