import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYCHAIN_SERVICE = 'SmartHomeApp_WiFiCredentials';
const SAVED_NETWORKS_KEY = '@SmartHome_SavedNetworks';

export interface SavedNetwork {
  ssid: string;
  savedAt: string;
}

/**
 * Get per-SSID Keychain service identifier for isolated password storage
 */
const getNetworkKeychainService = (ssid: string): string =>
  `${KEYCHAIN_SERVICE}:${encodeURIComponent(ssid)}`;

class KeychainService {
  /**
   * Save WiFi credentials securely (password in per-SSID Keychain, metadata in AsyncStorage)
   */
  async saveCredentials(ssid: string, password: string): Promise<void> {
    try {
      // Save password to per-SSID Keychain service (isolated encryption)
      await Keychain.setGenericPassword(ssid, password, {
        service: getNetworkKeychainService(ssid),
      });

      // Save metadata only to AsyncStorage (no password)
      const networks = await this.getSavedNetworks();
      const existingIndex = networks.findIndex(n => n.ssid === ssid);

      if (existingIndex >= 0) {
        networks[existingIndex].savedAt = new Date().toISOString();
      } else {
        networks.push({
          ssid,
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
   * Get all saved networks (migrates old AsyncStorage records if needed)
   */
  async getSavedNetworks(): Promise<SavedNetwork[]> {
    try {
      const data = await AsyncStorage.getItem(SAVED_NETWORKS_KEY);
      if (!data) {
        console.log('[Keychain] No saved networks found');
        return [];
      }

      // Parse raw data
      const rawNetworks = JSON.parse(data) as unknown[];
      let needsMigration = false;

      // Clean up any old records that still have passwords
      const cleanedNetworks: SavedNetwork[] = rawNetworks.map(network => {
        const net = network as Record<string, unknown>;
        if ('password' in net) {
          needsMigration = true;
          // Remove password field, preserve ssid and savedAt
          return {
            ssid: String(net.ssid),
            savedAt: String(net.savedAt),
          } as SavedNetwork;
        }
        return network as unknown as SavedNetwork;
      });

      // If migration occurred, save cleaned records back
      if (needsMigration) {
        console.log('[Keychain] Migrating saved networks: removing plaintext passwords from AsyncStorage');
        await AsyncStorage.setItem(SAVED_NETWORKS_KEY, JSON.stringify(cleanedNetworks));
      }

      console.log('[Keychain] Retrieved saved networks:', cleanedNetworks.length);
      return cleanedNetworks;
    } catch (error) {
      console.error('[Keychain] Error getting saved networks:', error);
      return [];
    }
  }

  /**
   * Get password for a saved network (reads from per-SSID Keychain only)
   */
  async getPassword(ssid: string): Promise<string | null> {
    try {
      // Read password from per-SSID Keychain service only
      const credentials = await Keychain.getGenericPassword({
        service: getNetworkKeychainService(ssid),
      });

      if (credentials && credentials.username === ssid) {
        console.log('[Keychain] Retrieved password for:', ssid);
        return credentials.password;
      }

      return null;
    } catch (error) {
      console.error('[Keychain] Error getting password:', error);
      return null;
    }
  }

  /**
   * Remove saved credentials for a specific network
   */
  async removeCredentials(ssid: string): Promise<void> {
    try {
      // Remove per-SSID Keychain entry
      await Keychain.resetGenericPassword({
        service: getNetworkKeychainService(ssid),
      });

      // Remove from AsyncStorage metadata
      const networks = await this.getSavedNetworks();
      const filteredNetworks = networks.filter(n => n.ssid !== ssid);
      await AsyncStorage.setItem(SAVED_NETWORKS_KEY, JSON.stringify(filteredNetworks));

      console.log('[Keychain] Credentials removed for:', ssid);
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
      // Load all saved networks first
      const networks = await this.getSavedNetworks();

      // Remove each per-SSID Keychain service
      for (const network of networks) {
        await Keychain.resetGenericPassword({
          service: getNetworkKeychainService(network.ssid),
        });
      }

      // Remove AsyncStorage saved networks key
      await AsyncStorage.removeItem(SAVED_NETWORKS_KEY);

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
