import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

// Firmware UUIDs - must match ESP32 firmware exactly
export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const DEVID_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
export const DEVID_CHAR_UUID = '12345678-1234-1234-1234-1234567890cd';

class BleService {
  private bleManager: BleManager | null = null;
  private scanSubscription: Subscription | null = null;
  private discoveredDevices: Map<string, Device> = new Map();
  private bluetoothStateSubscription: Subscription | null = null;
  private notificationSubscription: Subscription | null = null;
  private connectedDeviceId: string | null = null;
  private notificationBuffer: string = ''; // Add buffer as class property

  constructor() {
    this.bleManager = new BleManager();
  }

  /**
   * Check if Bluetooth is enabled
   */
  async checkBluetoothState(): Promise<boolean> {
    try {
      if (!this.bleManager) {
        console.error('[BLE] BleManager not initialized');
        return false;
      }

      const state = await this.bleManager.state();
      const isEnabled = state === 'PoweredOn';

      console.log('[BLE] Bluetooth state:', state, 'Enabled:', isEnabled);

      return isEnabled;
    } catch (error) {
      console.error('[BLE] Error checking Bluetooth state:', error);
      return false;
    }
  }

  /**
   * Listen to Bluetooth state changes
   */
  onBluetoothStateChange(callback: (enabled: boolean) => void): Subscription | null {
    try {
      if (!this.bleManager) {
        console.error('[BLE] BleManager not initialized');
        return null;
      }

      this.bluetoothStateSubscription = this.bleManager.onStateChange(state => {
        const isEnabled = state === 'PoweredOn';
        console.log('[BLE] Bluetooth state changed:', state, 'Enabled:', isEnabled);
        callback(isEnabled);
      }, true);

      return this.bluetoothStateSubscription;
    } catch (error) {
      console.error('[BLE] Error setting up Bluetooth state listener:', error);
      return null;
    }
  }

  /**
   * Start BLE scan for provisioning devices
   */
  startScan(
    onDeviceDiscovered: (device: Device) => void,
    onScanError?: (error: Error) => void
  ): void {
    try {
      if (!this.bleManager) {
        console.error('[BLE] BleManager not initialized');
        const error = new Error('BleManager not initialized');
        if (onScanError) onScanError(error);
        return;
      }

      console.log('[BLE] Preparing to start scan...');

      // First, ensure any existing scan is stopped
      this.bleManager.stopDeviceScan()
        .then(() => {
          console.log('[BLE] Previous scan stopped');
          // Now start the new scan
          this.startScanInternal(onDeviceDiscovered, onScanError);
        })
        .catch((_err) => {
          console.log('[BLE] No previous scan to stop, starting new scan');
          // No previous scan, just start the new one
          this.startScanInternal(onDeviceDiscovered, onScanError);
        });
    } catch (error) {
      console.error('[BLE] Error preparing scan:', error);
      if (onScanError) {
        onScanError(error as Error);
      }
    }
  }

  /**
   * Internal method to actually start the scan
   */
  private startScanInternal(
    onDeviceDiscovered: (device: Device) => void,
    onScanError?: (error: Error) => void
  ): void {
    try {
      if (!this.bleManager) {
        console.error('[BLE] BleManager not initialized');
        const error = new Error('BleManager not initialized');
        if (onScanError) onScanError(error);
        return;
      }

      // Clear previous scan results
      this.discoveredDevices.clear();
      console.log('[BLE] Starting BLE scan...');

      // Start new scan with no filters - scan ALL devices
      this.bleManager.startDeviceScan(
        null, // serviceUUIDs - null means scan all
        {
          allowDuplicates: true, // Allow duplicates to get updated RSSI
        },
        (error, device) => {
          if (error) {
            console.error('[BLE] Scan error:', error);
            console.error('[BLE] Error reason:', (error as any).reason);
            console.error('[BLE] Error message:', error.message);
            if (onScanError) onScanError(error);
            return;
          }

          if (device) {
            const deviceName = device.name || device.localName || 'Unknown';
            const rssi = device.rssi || 0;

            // Log ALL devices discovered
            console.log(
              `[BLE] Device found: "${deviceName}" (ID: ${device.id}, RSSI: ${rssi})`
            );

            // Filter for provisioning devices (name starts with "PROV_")
            const isProvisioningDevice = deviceName.startsWith('PROV_');

            if (isProvisioningDevice) {
              console.log(`[BLE] ✓ PROVISIONING DEVICE FOUND: ${deviceName}`);
              // Deduplicate by device ID and update with latest RSSI
              this.discoveredDevices.set(device.id, device);
              onDeviceDiscovered(device);
            }
          }
        }
      );

      console.log('[BLE] Scan started successfully');
    } catch (error) {
      console.error('[BLE] Error starting scan:', error);
      if (onScanError) {
        onScanError(error as Error);
      }
    }
  }

  /**
   * Stop BLE scan
   */
  async stopScan(): Promise<void> {
    try {
      if (this.bleManager) {
        await this.bleManager.stopDeviceScan();
        console.log('[BLE] Scan stopped');
      }

      if (this.scanSubscription) {
        this.scanSubscription.remove();
        this.scanSubscription = null;
      }
    } catch (error) {
      console.error('[BLE] Error stopping scan:', error);
    }
  }

  /**
   * Get RSSI signal strength label
   */
  getSignalStrength(rssi: number): string {
    if (rssi > -55) return 'Strong';
    if (rssi > -75) return 'Medium';
    return 'Weak';
  }

  /**
   * Get all discovered devices sorted by RSSI (strongest first)
   */
  getDiscoveredDevices(): Device[] {
    return Array.from(this.discoveredDevices.values()).sort((a, b) => {
      const rssiA = a.rssi || -100;
      const rssiB = b.rssi || -100;
      return rssiB - rssiA; // Strongest first
    });
  }

  /**
   * Connect to a device
   */
  async connectToDevice(deviceId: string): Promise<Device | null> {
    try {
      if (!this.bleManager) {
        console.error('[BLE] BleManager not initialized');
        return null;
      }

      console.log('[BLE] Connecting to device:', deviceId);
      const device = await this.bleManager.connectToDevice(deviceId);
      this.connectedDeviceId = deviceId;

      // Discover all services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      console.log('[BLE] Connected and discovered services:', deviceId);

      // Request larger MTU for better throughput (up to 512 bytes)
      try {
        const mtu = await this.bleManager.requestMTUForDevice(deviceId, 512);
        console.log('[BLE] MTU negotiated:', mtu);
      } catch (mtuError) {
        console.warn('[BLE] Could not negotiate MTU, using default:', mtuError);
        // Continue anyway - will use default MTU
      }

      return device;
    } catch (error) {
      console.error('[BLE] Error connecting to device:', error);
      throw error;
    }
  }

  /**
   * Disconnect from device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      if (!this.bleManager) {
        console.error('[BLE] BleManager not initialized');
        return;
      }

      // Remove notification subscription
      if (this.notificationSubscription) {
        this.notificationSubscription.remove();
        this.notificationSubscription = null;
      }

      await this.bleManager.cancelDeviceConnection(deviceId);
      this.connectedDeviceId = null;
      console.log('[BLE] Disconnected from device:', deviceId);
    } catch (error) {
      console.error('[BLE] Error disconnecting device:', error);
    }
  }

  /**
   * Send WiFi credentials to ESP32 device
   * Returns the MQTT device ID read from the ESP32
   */
  async sendWiFiCredentials(
    deviceId: string,
    ssid: string,
    password: string,
    onStatusUpdate: (status: string, isError?: boolean, mqttDeviceId?: string) => void
  ): Promise<string | null> {
    try {
      if (!this.bleManager) {
        throw new Error('BleManager not initialized');
      }

      console.log('[BLE] Starting WiFi provisioning for device:', deviceId);

      // Step 1: Connect to device
      onStatusUpdate('Connecting to device...');
      const device = await this.connectToDevice(deviceId);
      if (!device) {
        throw new Error('Failed to connect to device');
      }
      console.log('[BLE] ✅ Connected to device');

      // Step 2: Discover services
      onStatusUpdate('Discovering services...');
      const services = await device.services();
      console.log('[BLE] Found services:', services.length);

      // Find provisioning service
      const provisioningService = services.find(
        s => s.uuid.toLowerCase() === SERVICE_UUID.toLowerCase()
      );
      if (!provisioningService) {
        throw new Error('Provisioning service not found on device');
      }

      console.log('[BLE] Found provisioning service');

      // Get characteristics
      const characteristics = await provisioningService.characteristics();
      const provisioningChar = characteristics.find(
        c => c.uuid.toLowerCase() === CHARACTERISTIC_UUID.toLowerCase()
      );

      if (!provisioningChar) {
        throw new Error('Provisioning characteristic not found');
      }

      console.log('[BLE] Found provisioning characteristic');

      // ✨ NEW: Read Device ID from ESP32 BEFORE sending credentials
      console.log('[BLE] Reading device ID from ESP32...');
      onStatusUpdate('Reading device ID...');
      
      let mqttDeviceId: string | null = null;
      
      try {
        // Get all characteristics from the device ID service
        const devIdService = services.find(
          s => s.uuid.toLowerCase() === DEVID_SERVICE_UUID.toLowerCase()
        );

        if (devIdService) {
          const devIdCharacteristics = await devIdService.characteristics();
          const devIdChar = devIdCharacteristics.find(
            c => c.uuid.toLowerCase() === DEVID_CHAR_UUID.toLowerCase()
          );

          if (devIdChar) {
            // Read the characteristic value
            const readChar = await devIdChar.read();
            
            if (readChar && readChar.value) {
              const fullDeviceId = Buffer.from(readChar.value, 'base64').toString('utf-8');
              let shortId = fullDeviceId;

              if (fullDeviceId.startsWith('ESP32_')) {
                shortId = fullDeviceId.replace('ESP32_', '');
              }
              if (fullDeviceId.startsWith('PROV_')) {
                shortId = fullDeviceId.replace('PROV_', '');
              }

              mqttDeviceId = shortId; // ✅ SAVE THE MQTT DEVICE ID

              console.log('[BLE] ✅ Device ID read:', shortId);
              console.log('[BLE] 📊 Device ID mapping:');
              console.log('[BLE]   BLE MAC:', deviceId);
              console.log('[BLE]   Full ID:', fullDeviceId);
              console.log('[BLE]   MQTT ID:', shortId);
              
              onStatusUpdate(`Device ID: ${shortId}`, false, shortId);
            } else {
              console.warn('[BLE] ⚠️ Could not read device ID characteristic value, continuing...');
            }
          } else {
            console.warn('[BLE] ⚠️ Device ID characteristic not found, continuing...');
          }
        } else {
          console.warn('[BLE] ⚠️ Device ID service not found, continuing...');
        }
      } catch (idReadError) {
        console.warn('[BLE] ⚠️ Error reading device ID:', idReadError);
        console.log('[BLE] Continuing with provisioning...');
      }

      // Create a promise that resolves when we get acknowledgment from ESP32
      let ackResolve: (() => void) | null = null;
      let ackReject: ((error: Error) => void) | null = null;
      
      const ackPromise = new Promise<void>((resolve, reject) => {
        ackResolve = resolve;
        ackReject = reject;
      });

      const timeout = setTimeout(() => {
        if (ackReject) {
          ackReject(new Error('No acknowledgment from device (timeout after 10s)'));
        }
      }, 10000); // 10 second timeout

      // Register notification listener BEFORE writing data
      onStatusUpdate('Setting up notifications...', false, mqttDeviceId || undefined);
      this.notificationBuffer = ''; // Reset buffer

      this.notificationSubscription = provisioningChar.monitor(
        (error, characteristic) => {
          if (error) {
            // Ignore "Operation was cancelled" errors - these are normal when disconnecting
            if (error.message && error.message.includes('Operation was cancelled')) {
              console.log('[BLE] Notification monitor cancelled (normal)');
              return;
            }
            console.error('[BLE] Notification error:', error);
            onStatusUpdate(`Notification error: ${error.message}`, true);
            clearTimeout(timeout);
            if (ackReject) ackReject(error);
            return;
          }

          if (characteristic && characteristic.value) {
            try {
              // Decode base64 notification
              const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf8');
              console.log('[BLE] Received notification:', decodedValue);

              // Buffer chunked responses
              this.notificationBuffer += decodedValue;

              // Try to parse as JSON
              try {
                const response = JSON.parse(this.notificationBuffer);
                console.log('[BLE] Parsed firmware response:', response);

                // Route status to callback - ALWAYS pass mqttDeviceId
                if (response.status) {
                  onStatusUpdate(response.status, false, mqttDeviceId || undefined);
                } else if (response.msg) {
                  // Handle error messages from firmware
                  onStatusUpdate(response.msg, true, mqttDeviceId || undefined);
                }

                // Check if this is an acknowledgment (device received and processing)
                // ESP32 sends: {"status":"ok","msg":"wifi_saved"} or {"status":"info","msg":"connecting_wifi"}
                const statusMsg = response.msg || response.status;
                if (statusMsg === 'testing_wifi' || 
                    statusMsg === 'wifi_saved' || 
                    statusMsg === 'connecting_wifi' ||
                    response.status === 'ok' || 
                    response.status === 'info' ||
                    response.status === 'error') {
                  console.log('[BLE] ✅ Received acknowledgment from device - provisioning in progress');
                  clearTimeout(timeout);
                  if (ackResolve) ackResolve();
                }

                // Clear buffer after successful parse
                this.notificationBuffer = '';
              } catch (_parseError) {
                // Not a complete JSON yet, keep buffering
                console.log('[BLE] Buffering incomplete JSON...');
              }
            } catch (decodeError) {
              console.error('[BLE] Error decoding notification:', decodeError);
            }
          }
        }
      );

      // Prepare WiFi credentials JSON
      const credentialsPayload = {
        ssid: ssid.trim(),
        password: password,
      };

      const jsonString = JSON.stringify(credentialsPayload);
      console.log('[BLE] Credentials payload:', jsonString);
      console.log('[BLE] Payload length:', jsonString.length, 'bytes');

      // Encode to base64 for BLE transmission
      const encodedPayload = Buffer.from(jsonString, 'utf8').toString('base64');
      console.log('[BLE] Encoded payload length:', encodedPayload.length);
      console.log('[BLE] Encoded payload:', encodedPayload);

      // Send credentials directly (BLE library handles chunking internally)
      onStatusUpdate('Sending credentials...');
      
      try {
        console.log('[BLE] Sending credentials via BLE...');
        await this.bleManager.writeCharacteristicWithResponseForDevice(
          deviceId,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          encodedPayload
        );
        console.log('[BLE] Credentials sent successfully');
      } catch (writeError) {
        // Check if this is a "device not connected" error that happened AFTER we sent credentials
        // This is expected behavior - the ESP32 reboots after receiving credentials
        const errorMsg = String(writeError);
        if (errorMsg.includes('not connected') || errorMsg.includes('Device is not connected')) {
          console.log('[BLE] ⚠️ Device disconnected after sending credentials (expected - device is rebooting)');
          // Don't throw - the device will reconnect via MQTT after WiFi setup
          // Continue waiting for acknowledgment from notifications
        } else {
          console.error('[BLE] Error sending credentials:', writeError);
          clearTimeout(timeout);
          throw new Error(`Failed to send credentials: ${writeError}`);
        }
      }

      // Wait for acknowledgment from ESP32
      console.log('[BLE] ⏳ Waiting for acknowledgment from device...');
      await ackPromise;
      console.log('[BLE] ✅ Acknowledgment received - device is provisioning');
      
      // Return the MQTT device ID
      return mqttDeviceId;
    } catch (error) {
      console.error('[BLE] Error sending WiFi credentials:', error);
      throw error;
    }
  }

  /**
   * Get BLE Manager instance
   */
  getBleManager(): BleManager | null {
    return this.bleManager;
  }

  /**
   * Get connected device ID
   */
  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  /**
   * Cleanup and destroy BLE manager
   */
  async destroy(): Promise<void> {
    try {
      await this.stopScan();

      // Remove notification subscription
      if (this.notificationSubscription) {
        this.notificationSubscription.remove();
        this.notificationSubscription = null;
      }

      // Disconnect from any connected device
      if (this.connectedDeviceId) {
        try {
          await this.disconnectDevice(this.connectedDeviceId);
        } catch (error) {
          console.error('[BLE] Error disconnecting during destroy:', error);
        }
      }

      if (this.bluetoothStateSubscription) {
        this.bluetoothStateSubscription.remove();
        this.bluetoothStateSubscription = null;
      }

      if (this.bleManager) {
        this.bleManager.destroy();
        this.bleManager = null;
      }

      this.discoveredDevices.clear();
      console.log('[BLE] BLE service destroyed');
    } catch (error) {
      console.error('[BLE] Error destroying BLE service:', error);
    }
  }


}

// Singleton instance
let bleServiceInstance: BleService | null = null;

export const getBleService = (): BleService => {
  if (!bleServiceInstance) {
    bleServiceInstance = new BleService();
  }
  return bleServiceInstance;
};

export default BleService;
