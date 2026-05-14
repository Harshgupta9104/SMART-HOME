import WifiManager from 'react-native-wifi-reborn';
import { PermissionsAndroid, Platform } from 'react-native';
import { getLocationService } from './locationService';
import { WiFiError, WiFiErrorType } from './wifiErrors';

export interface WiFiNetwork {
  ssid: string;
  level: number;
  frequency?: number;
  bssid?: string;
  isCurrentNetwork?: boolean;
}

export interface WiFiScanResult {
  networks: WiFiNetwork[];
  currentNetworkDetected: boolean;
  nearbyNetworksDetected: boolean;
}

class WiFiService {
  /**
   * Scan WiFi networks with proper error handling
   * 
   * Priority 1: Currently connected network (most reliable)
   * Priority 2: Nearby networks from WifiManager (requires location services + permissions)
   * Priority 3: Manual entry fallback
   * 
   * IMPORTANT: This method throws structured errors instead of silently failing.
   * The UI layer should catch these errors and display appropriate messages.
   */
  async scanNetworks(): Promise<WiFiScanResult> {
    try {
      console.log('[WiFi] ========== STARTING WIFI SCAN ==========');
      
      const networks: WiFiNetwork[] = [];
      let currentNetworkDetected = false;
      let nearbyNetworksDetected = false;
      
      // PRIORITY 1: Get currently connected WiFi network
      console.log('[WiFi] Priority 1: Getting currently connected network...');
      try {
        const currentSSID = await WifiManager.getCurrentWifiSSID();
        console.log('[WiFi] Current SSID:', currentSSID);
        
        if (currentSSID && currentSSID !== '<unknown ssid>' && currentSSID.trim()) {
          const cleanSSID = currentSSID.replace(/^"(.*)"$/, '$1').trim();
          console.log('[WiFi] ✅ Current network found:', cleanSSID);
          
          networks.push({
            ssid: cleanSSID,
            level: -30, // Assume strong signal for current network
            isCurrentNetwork: true,
          });
          currentNetworkDetected = true;
        } else {
          console.warn('[WiFi] Device not connected to any WiFi network');
        }
      } catch (err) {
        console.warn('[WiFi] Could not get current SSID:', err);
      }
      
      // PRIORITY 2: Scan nearby networks (optional enhancement)
      console.log('[WiFi] Priority 2: Scanning nearby networks...');
      
      if (Platform.OS === 'android') {
        try {
          // Check if location permission is granted
          const fineLocationGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          console.log('[WiFi] ACCESS_FINE_LOCATION granted:', fineLocationGranted);
          
          // Check if nearby WiFi devices permission is granted (Android 13+)
          const nearbyWifiGranted = await PermissionsAndroid.check(
            'android.permission.NEARBY_WIFI_DEVICES' as any
          );
          console.log('[WiFi] NEARBY_WIFI_DEVICES granted:', nearbyWifiGranted);
          
          if (!fineLocationGranted || !nearbyWifiGranted) {
            console.warn('[WiFi] ⚠️ Required permissions not granted');
            throw new WiFiError(
              WiFiErrorType.PERMISSION_DENIED,
              'Location and nearby WiFi permissions required for WiFi scanning',
              { 
                fineLocation: fineLocationGranted,
                nearbyWifi: nearbyWifiGranted
              }
            );
          }
          
          // NOTE: We skip checking Location Services here because:
          // 1. The check itself can be unreliable
          // 2. WifiManager.loadWifiList() will return empty if Location Services are disabled
          // 3. We check Location Services when we get an empty array (see below)
          // This approach is more reliable and doesn't block the scan unnecessarily
          
          // Try to scan nearby networks
          try {
            console.log('[WiFi] Calling WifiManager.loadWifiList()...');
            console.log('[WiFi] About to call WifiManager.loadWifiList()');
            let nearbyNetworks: any = await WifiManager.loadWifiList();
            
            console.log('[WiFi] WifiManager.loadWifiList() returned:', nearbyNetworks);
            console.log('[WiFi] Type of response:', typeof nearbyNetworks);
            console.log('[WiFi] Is array?', Array.isArray(nearbyNetworks));
            
            if (!nearbyNetworks) {
              console.warn('[WiFi] ⚠️ WifiManager returned null/undefined');
              console.warn('[WiFi] This usually means Location Services are disabled');
              throw new WiFiError(
                WiFiErrorType.SCAN_FAILED,
                'WiFi scan returned no data - Location Services may be disabled',
                { reason: 'null_response' }
              );
            }
            
            // Parse response
            let parsed: any[];
            try {
              parsed = Array.isArray(nearbyNetworks) ? nearbyNetworks : JSON.parse(nearbyNetworks);
              console.log('[WiFi] Successfully parsed networks');
            } catch (parseError) {
              console.error('[WiFi] Error parsing networks:', parseError);
              console.error('[WiFi] Raw response was:', nearbyNetworks);
              throw new WiFiError(
                WiFiErrorType.SCAN_FAILED,
                'Failed to parse WiFi scan results',
                { error: parseError }
              );
            }
            
            console.log('[WiFi] Parsed networks count:', parsed.length);
            console.log('[WiFi] Parsed networks:', JSON.stringify(parsed, null, 2));
            
            if (parsed.length === 0) {
              console.warn('[WiFi] ⚠️ No nearby networks returned (empty array)');
              console.warn('[WiFi] DIAGNOSTIC: This usually means:');
              console.warn('[WiFi]   1. Location Services disabled (MOST COMMON)');
              console.warn('[WiFi]   2. No networks in range');
              console.warn('[WiFi]   3. WiFi disabled on device');
              console.warn('[WiFi]   4. Android restrictions');
              
              // Check if Location Services are disabled
              // We only do this check when we get an empty array to avoid unnecessary delays
              console.log('[WiFi] Checking if Location Services are disabled...');
              try {
                const locationService = getLocationService();
                const locationServicesEnabled = await locationService.isLocationServicesEnabled();
                console.log('[WiFi] Location Services enabled:', locationServicesEnabled);
                
                if (!locationServicesEnabled) {
                  console.warn('[WiFi] ⚠️ Location Services are disabled');
                  throw new WiFiError(
                    WiFiErrorType.LOCATION_DISABLED,
                    'Location Services must be enabled for WiFi scanning',
                    { service: 'LocationServices' }
                  );
                }
              } catch (locationCheckError) {
                // If location check itself fails, log it but don't block
                if (locationCheckError instanceof WiFiError) {
                  throw locationCheckError;
                }
                console.warn('[WiFi] Could not determine Location Services state:', locationCheckError);
                // Continue - assume Location Services might be enabled but no networks in range
              }
              
              // If Location Services are enabled but no networks found, continue with current network only
              console.log('[WiFi] Location Services enabled but no networks found, continuing with current network only');
            } else {
              // Filter and add nearby networks (excluding current network)
              const currentSSID = networks.length > 0 ? networks[0].ssid : null;
              console.log('[WiFi] Current SSID for duplicate check:', currentSSID);
              console.log('[WiFi] Processing', parsed.length, 'nearby networks...');
              
              const filteredNetworks = (parsed as any[])
                .filter((network, index) => {
                  // Handle both uppercase (SSID) and lowercase (ssid) property names
                  const ssid = network.SSID || network.ssid;
                  console.log(`[WiFi] Network ${index}: SSID="${ssid}", BSSID="${network.BSSID || network.bssid}"`);
                  
                  const hasSSID = ssid && 
                                 ssid.trim() && 
                                 ssid !== '<unknown ssid>' &&
                                 ssid !== 'Hidden Network';
                  
                  if (!hasSSID) {
                    console.log(`[WiFi]   ❌ Filtering out - no valid SSID`);
                    return false;
                  }
                  
                  // Don't add duplicate of current network
                  const cleanSSID = ssid.replace(/^"(.*)"$/, '$1').trim();
                  if (currentSSID && cleanSSID === currentSSID) {
                    console.log(`[WiFi]   ⏭️  Skipping duplicate current network: "${cleanSSID}"`);
                    return false;
                  }
                  
                  console.log(`[WiFi]   ✅ Including network: "${cleanSSID}"`);
                  return true;
                })
                .map(network => {
                  const ssid = network.SSID || network.ssid;
                  return {
                    ssid: ssid.replace(/^"(.*)"$/, '$1').trim(),
                    level: network.level || -100,
                    frequency: network.frequency,
                    bssid: network.BSSID || network.bssid,
                    isCurrentNetwork: false,
                  };
                });
              
              // Add nearby networks to list
              networks.push(...filteredNetworks);
              nearbyNetworksDetected = filteredNetworks.length > 0;
              
              // Sort by signal strength
              networks.sort((a, b) => {
                // Current network always first
                if (a.isCurrentNetwork) return -1;
                if (b.isCurrentNetwork) return 1;
                // Then by signal strength
                return (b.level || 0) - (a.level || 0);
              });
              
              console.log('[WiFi] ✅ Total networks:', networks.length);
              console.log('[WiFi] Networks:', networks.map(n => ({ 
                ssid: n.ssid, 
                level: n.level,
                current: n.isCurrentNetwork 
              })));
            }
            
          } catch (scanError) {
            // If it's already a WiFiError, re-throw it
            if (scanError instanceof WiFiError) {
              throw scanError;
            }
            
            console.warn('[WiFi] Error scanning nearby networks:', scanError);
            throw new WiFiError(
              WiFiErrorType.SCAN_FAILED,
              'Failed to scan nearby WiFi networks',
              { error: scanError }
            );
          }
        } catch (permError) {
          // If it's already a WiFiError, re-throw it
          if (permError instanceof WiFiError) {
            throw permError;
          }
          
          console.error('[WiFi] Permission/location check error:', permError);
          throw new WiFiError(
            WiFiErrorType.UNKNOWN_ERROR,
            'Error checking WiFi scan requirements',
            { error: permError }
          );
        }
      }
      
      console.log('[WiFi] ========== WIFI SCAN FINISHED ==========');
      console.log('[WiFi] Final result: ', networks.length, 'networks');
      
      return {
        networks,
        currentNetworkDetected,
        nearbyNetworksDetected,
      };
      
    } catch (error) {
      // If it's already a WiFiError, re-throw it
      if (error instanceof WiFiError) {
        console.error('[WiFi] ❌ WiFi Error:', error.type, error.message);
        throw error;
      }
      
      console.error('[WiFi] ❌ FATAL ERROR:', error);
      throw new WiFiError(
        WiFiErrorType.UNKNOWN_ERROR,
        'An unexpected error occurred during WiFi scanning',
        { error }
      );
    }
  }

  /**
   * Get currently connected WiFi SSID
   */
  async getCurrentSSID(): Promise<string | null> {
    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      console.log('[WiFi] getCurrentWifiSSID returned:', ssid);
      
      if (ssid && ssid !== '<unknown ssid>' && ssid.trim()) {
        console.log('[WiFi] Current SSID:', ssid);
        return ssid.trim();
      }
      return null;
    } catch (error) {
      console.error('[WiFi] Error getting current SSID:', error);
      return null;
    }
  }

  /**
   * Format network signal strength
   */
  getSignalStrength(level: number): string {
    if (level > -55) return 'Strong';
    if (level > -75) return 'Medium';
    return 'Weak';
  }

  /**
   * Get signal strength color
   */
  getSignalColor(level: number): string {
    if (level > -55) return '#10B981';
    if (level > -75) return '#F59E0B';
    return '#EF4444';
  }
}

// Singleton instance
let wifiServiceInstance: WiFiService | null = null;

export const getWiFiService = (): WiFiService => {
  if (!wifiServiceInstance) {
    wifiServiceInstance = new WiFiService();
  }
  return wifiServiceInstance;
};

export default WiFiService;
