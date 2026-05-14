import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export interface ProvisionedDevice {
  id: string;
  name: string;
  macAddress: string;
  ssid: string;
  status: 'connecting' | 'online' | 'offline';
  lastSeen: string;
  provisionedAt: string;
  justProvisioned?: boolean;
}

export interface SavedNetwork {
  ssid: string;
  password: string;
  savedAt: string;
}

const PROVISIONED_DEVICES_KEY = '@SmartHome_ProvisionedDevices';
const SAVED_NETWORKS_KEY = '@SmartHome_SavedNetworks';
const KEYCHAIN_SERVICE = 'SmartHomeApp_WiFiCredentials';

class StorageService {
  /**
   * Get all provisioned devices from local storage
   */
  async getProvisionedDevices(): Promise<ProvisionedDevice[]> {
    try {
      const data = await AsyncStorage.getItem(PROVISIONED_DEVICES_KEY);
      if (!data) {
        console.log('[Storage] No provisioned devices found');
        return [];
      }

      const devices = JSON.parse(data) as ProvisionedDevice[];
      console.log('[Storage] Retrieved provisioned devices:', devices.length);
      return devices;
    } catch (error) {
      console.error('[Storage] Error getting provisioned devices:', error);
      return [];
    }
  }

  /**
   * Add or update a provisioned device
   */
  async addProvisionedDevice(device: ProvisionedDevice): Promise<void> {
    try {
      const devices = await this.getProvisionedDevices();

      // Check if device already exists and update it
      const existingIndex = devices.findIndex(d => d.id === device.id);
      if (existingIndex >= 0) {
        devices[existingIndex] = device;
        console.log('[Storage] Updated existing device:', device.id);
      } else {
        devices.push(device);
        console.log('[Storage] Added new device:', device.id);
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
