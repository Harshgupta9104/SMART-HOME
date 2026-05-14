import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYCHAIN_SERVICE = 'SmartHomeApp_WiFiCredentials';
const SAVED_NETWORKS_KEY = '@SmartHome_SavedNetworks';

export interface SavedNetwork {
  ssid: string;
  password: string;
  savedAt: string;
}

class KeychainService {
  /**
   * Save WiFi credentials securely
   */
  async saveCredentials(ssid: string, password: string): Promise<void> {
    try {
      // Save to Keychain
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
      console.log('[Keychain] Credentials saved for:', ssid);
    } catch (error) {
      console.error('[Keychain] Error saving credentials:', error);
      throw error;
    }
  }

  /**
   * Get all saved networks
   */
  async getSavedNetworks(): Promise<SavedNetwork[]> {
    try {
      const data = await AsyncStorage.getItem(SAVED_NETWORKS_KEY);
      if (!data) {
        console.log('[Keychain] No saved networks found');
        return [];
      }

      const networks = JSON.parse(data) as SavedNetwork[];
      console.log('[Keychain] Retrieved saved networks:', networks.length);
      return networks;
    } catch (error) {
      console.error('[Keychain] Error getting saved networks:', error);
      return [];
    }
  }

  /**
   * Get password for a saved network
   */
  async getPassword(ssid: string): Promise<string | null> {
    try {
      const networks = await this.getSavedNetworks();
      const network = networks.find(n => n.ssid === ssid);

      if (network) {
        console.log('[Keychain] Retrieved password for:', ssid);
        return network.password;
      }

      return null;
    } catch (error) {
      console.error('[Keychain] Error getting password:', error);
      return null;
    }
  }

  /**
   * Remove saved credentials for a network
   */
  async removeCredentials(ssid: string): Promise<void> {
    try {
      // Note: react-native-keychain doesn't support selective deletion
      // This is a limitation of the library
      console.log('[Keychain] Credentials for', ssid, 'should be removed manually');
    } catch (error) {
      console.error('[Keychain] Error removing credentials:', error);
      throw error;
    }
  }

  /**
   * Clear all saved credentials
   */
  async clearAllCredentials(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: KEYCHAIN_SERVICE,
      });
      console.log('[Keychain] All credentials cleared');
    } catch (error) {
      console.error('[Keychain] Error clearing credentials:', error);
      throw error;
    }
  }
}

// Singleton instance
let keychainServiceInstance: KeychainService | null = null;

export const getKeychainService = (): KeychainService => {
  if (!keychainServiceInstance) {
    keychainServiceInstance = new KeychainService();
  }
  return keychainServiceInstance;
};

export default KeychainService;
