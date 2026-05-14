/**
 * Provisioning State Machine Constants
 * Defines all states and status messages for the WiFi provisioning flow
 */

export enum ProvisioningState {
  IDLE = 'idle',
  CONNECTING_BLE = 'connecting_ble',
  DISCOVERING_SERVICES = 'discovering_services',
  SENDING_CREDENTIALS = 'sending_credentials',
  WAITING_WIFI = 'waiting_wifi',
  SUCCESS = 'success',
  WAITING_ONLINE = 'waiting_online',
  DEVICE_ONLINE = 'device_online',
  TIMEOUT = 'timeout',
  ERROR = 'error',
}

export enum FirmwareStatus {
  TESTING_WIFI = 'testing_wifi',
  WIFI_SAVED = 'wifi_saved',
  CONNECTING_WIFI = 'connecting_wifi',
  WIFI_CONNECTED = 'wifi_connected',
  WIFI_FAILED = 'wifi_failed',
  JSON_PARSE = 'json_parse',
  MISSING_KEYS = 'missing_keys',
  EMPTY_SSID = 'empty_ssid',
  SSID_TOO_LONG = 'ssid_too_long',
}

export const STATUS_LABELS: { [key: string]: string } = {
  [ProvisioningState.IDLE]: 'Ready',
  [ProvisioningState.CONNECTING_BLE]: 'Connecting to device...',
  [ProvisioningState.DISCOVERING_SERVICES]: 'Discovering services...',
  [ProvisioningState.SENDING_CREDENTIALS]: 'Sending credentials...',
  [ProvisioningState.WAITING_WIFI]: 'Testing WiFi connection...',
  [ProvisioningState.SUCCESS]: 'WiFi credentials verified',
  [ProvisioningState.WAITING_ONLINE]: 'Connecting to WiFi...',
  [ProvisioningState.DEVICE_ONLINE]: 'Device online',
  [ProvisioningState.TIMEOUT]: 'Connection timeout',
  [ProvisioningState.ERROR]: 'Error occurred',
};

export const FIRMWARE_STATUS_LABELS: { [key: string]: string } = {
  [FirmwareStatus.TESTING_WIFI]: 'Testing WiFi connection...',
  [FirmwareStatus.WIFI_SAVED]: 'WiFi credentials saved',
  [FirmwareStatus.CONNECTING_WIFI]: 'Connecting to WiFi...',
  [FirmwareStatus.WIFI_CONNECTED]: 'WiFi connected',
  [FirmwareStatus.WIFI_FAILED]: 'WiFi connection failed',
  [FirmwareStatus.JSON_PARSE]: 'Invalid JSON format',
  [FirmwareStatus.MISSING_KEYS]: 'Missing SSID or password',
  [FirmwareStatus.EMPTY_SSID]: 'SSID cannot be empty',
  [FirmwareStatus.SSID_TOO_LONG]: 'SSID too long (max 32 characters)',
};

export const FIRMWARE_ERROR_MESSAGES: { [key: string]: string } = {
  [FirmwareStatus.JSON_PARSE]: 'Failed to parse WiFi credentials. Please try again.',
  [FirmwareStatus.MISSING_KEYS]: 'WiFi credentials incomplete. Please provide both SSID and password.',
  [FirmwareStatus.EMPTY_SSID]: 'Network name (SSID) cannot be empty.',
  [FirmwareStatus.SSID_TOO_LONG]: 'Network name is too long. Maximum 32 characters allowed.',
  [FirmwareStatus.WIFI_FAILED]: 'Failed to connect to WiFi. Please check your credentials.',
};

export const PROVISIONING_TIMEOUT = 30000; // 30 seconds
export const WAITING_ONLINE_DURATION = 15000; // 15 seconds for device to come online
export const BLE_NOTIFICATION_TIMEOUT = 5000; // 5 seconds to wait for BLE responses
