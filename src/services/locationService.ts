import { Platform, NativeModules } from 'react-native';

/**
 * Location Service Utility
 * 
 * Detects whether Android Location Services (GPS) are enabled.
 * This is CRITICAL for WiFi scanning on Android because:
 * - WifiManager.loadWifiList() requires Location Services to be enabled
 * - Even with ACCESS_FINE_LOCATION permission granted, WiFi scanning fails if GPS is off
 * - This is an Android OS-level restriction, not a permission issue
 */

class LocationService {
  /**
   * Check if Location Services are enabled on the device
   * This checks the actual GPS/Location toggle in Android settings
   */
  async isLocationServicesEnabled(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('[Location] Not Android, assuming location services enabled');
        return true;
      }

      console.log('[Location] Checking if Location Services are enabled...');

      // Try to use native module if available
      try {
        const { LocationManager } = NativeModules;
        
        if (LocationManager && typeof LocationManager.isLocationEnabled === 'function') {
          try {
            const enabled = await LocationManager.isLocationEnabled();
            console.log('[Location] ✅ Location Services enabled (native check):', enabled);
            return enabled === true;
          } catch (nativeError) {
            console.warn('[Location] Native location check failed:', nativeError);
            // Fall through to alternative method
          }
        } else {
          console.log('[Location] LocationManager not available, using fallback');
        }
      } catch (err) {
        console.warn('[Location] Error accessing native module:', err);
      }

      // Fallback: Try using RNLocation if available
      try {
        const { RNLocation } = NativeModules;
        
        if (RNLocation && typeof RNLocation.isLocationEnabled === 'function') {
          try {
            const enabled = await RNLocation.isLocationEnabled();
            console.log('[Location] ✅ Location Services enabled (RNLocation):', enabled);
            return enabled === true;
          } catch (err) {
            console.warn('[Location] RNLocation check failed:', err);
          }
        }
      } catch (err) {
        console.warn('[Location] RNLocation not available:', err);
      }

      // Final fallback: Assume Location Services are enabled
      // This is safer than assuming disabled, as it allows provisioning to continue
      // The WiFi scan will fail anyway if Location Services are actually disabled
      console.warn('[Location] Could not determine location services state, assuming enabled');
      console.warn('[Location] If WiFi scan fails, Location Services may be disabled');
      return true;
    } catch (error) {
      console.error('[Location] Error checking location services:', error);
      // Assume enabled to avoid blocking provisioning
      return true;
    }
  }


  /**
   * Get a user-friendly message about location services
   */
  getLocationServicesMessage(): string {
    return 'Enable Location Services in your device settings to discover nearby WiFi networks. You can still use your currently connected network or enter a network manually.';
  }

  /**
   * Get instructions for enabling location services
   */
  getLocationServicesInstructions(): string {
    return 'Go to Settings → Location → Toggle ON';
  }
}

let locationServiceInstance: LocationService | null = null;

export const getLocationService = (): LocationService => {
  if (!locationServiceInstance) {
    locationServiceInstance = new LocationService();
  }
  return locationServiceInstance;
};

export default LocationService;
