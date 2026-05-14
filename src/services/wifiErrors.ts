/**
 * WiFi Service Error Types
 * Structured errors that explain exactly what went wrong
 */

export enum WiFiErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_DISABLED = 'LOCATION_DISABLED',
  WIFI_DISABLED = 'WIFI_DISABLED',
  SCAN_FAILED = 'SCAN_FAILED',
  NO_NETWORKS_FOUND = 'NO_NETWORKS_FOUND',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class WiFiError extends Error {
  constructor(
    public type: WiFiErrorType,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WiFiError';
  }

  getUserMessage(): string {
    switch (this.type) {
      case WiFiErrorType.PERMISSION_DENIED:
        return 'WiFi scanning requires Bluetooth and Location permissions. Please grant them to continue.';
      case WiFiErrorType.LOCATION_DISABLED:
        return 'Enable Location Services in your device settings to discover nearby WiFi networks.';
      case WiFiErrorType.WIFI_DISABLED:
        return 'WiFi is disabled. Please enable WiFi to scan for networks.';
      case WiFiErrorType.SCAN_FAILED:
        return 'WiFi scan failed. Please try again.';
      case WiFiErrorType.NO_NETWORKS_FOUND:
        return 'No WiFi networks found. You can enter a network manually.';
      default:
        return 'An error occurred while scanning for WiFi networks.';
    }
  }

  getActionLabel(): string {
    switch (this.type) {
      case WiFiErrorType.PERMISSION_DENIED:
        return 'Grant Permission';
      case WiFiErrorType.LOCATION_DISABLED:
        return 'Open Settings';
      case WiFiErrorType.WIFI_DISABLED:
        return 'Open Settings';
      default:
        return 'Try Again';
    }
  }
}
