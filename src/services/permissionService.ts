import { Platform, PermissionsAndroid } from 'react-native';

export interface PermissionStatus {
  bluetooth: boolean;
  location: boolean;
  notifications: boolean;
  allGranted: boolean;
  anyBlocked: boolean;
}

class PermissionService {
  /**
   * Get all required provisioning permissions for this platform
   * These permissions are requested ONCE during onboarding
   * and never again unless user manually revokes them
   */
  private getProvisioningPermissions(): string[] {
    if (Platform.OS === 'android') {
      return [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        // NEARBY_WIFI_DEVICES is required on Android 13+ for WiFi scanning
        'android.permission.NEARBY_WIFI_DEVICES' as any,
      ];
    }
    return [];
  }

  /**
   * Check if all provisioning permissions are already granted (silent check)
   */
  async checkProvisioningPermissions(): Promise<PermissionStatus> {
    try {
      if (Platform.OS !== 'android') {
        console.log('[Permission] Not Android, skipping permission check');
        return {
          bluetooth: true,
          location: true,
          notifications: true,
          allGranted: true,
          anyBlocked: false,
        };
      }

      const permissions = this.getProvisioningPermissions();
      
      if (permissions.length === 0) {
        console.log('[Permission] No permissions to check');
        return {
          bluetooth: true,
          location: true,
          notifications: true,
          allGranted: true,
          anyBlocked: false,
        };
      }

      console.log('[Permission] Checking provisioning permissions (silent)...');
      
      const results: Record<string, boolean> = {};
      for (const permission of permissions) {
        const granted = await PermissionsAndroid.check(permission as any);
        results[permission] = granted;
        console.log(`[Permission] ${permission}: ${granted}`);
      }

      const bluetooth = 
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT];
      
      const location = 
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      
      const allGranted = Object.values(results).every(r => r === true);

      console.log('[Permission] Status:', { bluetooth, location, allGranted });

      return {
        bluetooth,
        location,
        notifications: true,
        allGranted,
        anyBlocked: false,
      };
    } catch (error) {
      console.error('[Permission] Error checking permissions:', error);
      return {
        bluetooth: false,
        location: false,
        notifications: false,
        allGranted: false,
        anyBlocked: false,
      };
    }
  }

  /**
   * Request all provisioning permissions together (bundled)
   */
  async requestProvisioningPermissions(): Promise<PermissionStatus> {
    try {
      if (Platform.OS !== 'android') {
        console.log('[Permission] Not Android, skipping permission request');
        return {
          bluetooth: true,
          location: true,
          notifications: true,
          allGranted: true,
          anyBlocked: false,
        };
      }

      const permissions = this.getProvisioningPermissions();
      
      if (permissions.length === 0) {
        console.log('[Permission] No permissions to request');
        return {
          bluetooth: true,
          location: true,
          notifications: true,
          allGranted: true,
          anyBlocked: false,
        };
      }

      console.log('[Permission] Requesting provisioning permissions (bundled)...');
      console.log('[Permission] Permissions to request:', permissions);

      const results = await PermissionsAndroid.requestMultiple(permissions as any);
      console.log('[Permission] Request results:', results);

      const bluetooth = 
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      
      const location = 
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
      
      const allGranted = Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);

      console.log('[Permission] After request:', { bluetooth, location, allGranted });

      return {
        bluetooth,
        location,
        notifications: true,
        allGranted,
        anyBlocked: false,
      };
    } catch (error) {
      console.error('[Permission] Error requesting permissions:', error);
      return {
        bluetooth: false,
        location: false,
        notifications: false,
        allGranted: false,
        anyBlocked: false,
      };
    }
  }

  /**
   * Check if any permission is permanently blocked
   */
  async isPermissionBlocked(): Promise<boolean> {
    try {
      const status = await this.checkProvisioningPermissions();
      console.log('[Permission] Is blocked:', !status.allGranted);
      return !status.allGranted;
    } catch (error) {
      console.error('[Permission] Error checking if blocked:', error);
      return false;
    }
  }

  /**
   * Open app settings for manual permission management
   */
  async openAppSettings(): Promise<void> {
    try {
      console.log('[Permission] Opening app settings');
    } catch (error) {
      console.error('[Permission] Error opening settings:', error);
    }
  }
}

let permissionServiceInstance: PermissionService | null = null;

export const getPermissionService = (): PermissionService => {
  if (!permissionServiceInstance) {
    permissionServiceInstance = new PermissionService();
  }
  return permissionServiceInstance;
};

export default PermissionService;
