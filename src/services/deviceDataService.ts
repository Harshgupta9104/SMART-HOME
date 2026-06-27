/**
 * Device Data Service
 * Manages real-time device metrics from MQTT
 */

import { getMQTTService } from './mqttService';
import { getNotificationService } from './notificationService';
import { deviceService } from './firebase/deviceService';
import { parseRelayState, parseDeviceStatus } from '../utils/notificationHelpers';
import { UpdateCloudDeviceInput } from '../types/device';

export interface DeviceMetrics {
  deviceId: string;
  soilMoisture?: number; // 0-100 %
  wifiRSSI?: number; // dBm
  ledStatus?: boolean; // ON/OFF
  relayStatus?: boolean; // ON/OFF (GPIO23)
  uptime?: number; // seconds
  freeHeap?: number; // bytes
  temperature?: number; // °C
  humidity?: number; // %
  lastUpdate: number; // timestamp
}

export interface DeviceDataListener {
  (metrics: DeviceMetrics): void;
}

/**
 * Maps MQTT device ID to cloud device metadata for Firestore sync
 * Phase 2J: Used to sync relay state from MQTT responses to Firestore
 */
interface CloudDeviceLink {
  homeId: string;
  cloudDeviceId: string;
  mqttDeviceId: string;
}

class DeviceDataService {
  private metricsCache: Map<string, DeviceMetrics> = new Map();
  private listeners: Map<string, Set<DeviceDataListener>> = new Map();
  private mqttUnsubscribers: Map<string, () => void> = new Map();
  private deviceStatusCache: Map<string, 'online' | 'offline'> = new Map();
  private deviceNameCache: Map<string, string> = new Map();

  // Phase 2J: Cloud device link registry for MQTT → Firestore mapping
  private cloudDeviceLinks: Map<string, CloudDeviceLink> = new Map();

  // Phase 2J: Duplicate write prevention cache (key: "${homeId}:${cloudDeviceId}:relay_1")
  private channelStateCache: Map<string, 'on' | 'off' | 'unknown'> = new Map();

  // Phase 2K: Device health cache for duplicate write prevention
  // Key: "${homeId}:${cloudDeviceId}", Value: { status, lastWriteAt }
  private deviceHealthCache: Map<string, { status: 'online' | 'offline' | 'unknown'; lastWriteAt: number }> = new Map();

  /**
   * Phase 2J: Register a cloud device link for MQTT → Firestore mapping
   * Called when a CloudDevice is loaded in DeviceContext
   *
   * @param link - Cloud device link with homeId, cloudDeviceId, mqttDeviceId
   */
  registerCloudDeviceLink(link: CloudDeviceLink): void {
    this.cloudDeviceLinks.set(link.mqttDeviceId, link);
    console.log('[DeviceData] ✅ Cloud device link registered:', {
      mqttDeviceId: link.mqttDeviceId,
      cloudDeviceId: link.cloudDeviceId,
      homeId: link.homeId,
    });
  }

  /**
   * Phase 2J: Unregister a cloud device link
   * Called when a device is no longer needed or app exits
   *
   * @param mqttDeviceId - MQTT device ID to unregister
   */
  unregisterCloudDeviceLink(mqttDeviceId: string): void {
    if (this.cloudDeviceLinks.delete(mqttDeviceId)) {
      console.log('[DeviceData] 🔕 Cloud device link unregistered:', mqttDeviceId);
    }
  }

  /**
   * Phase 2J: Get cloud device link by MQTT device ID
   * Returns null if no link registered (e.g., local-only device)
   */
  private getCloudDeviceLinkByMqttId(mqttDeviceId: string): CloudDeviceLink | null {
    return this.cloudDeviceLinks.get(mqttDeviceId) || null;
  }

  /**
   * Subscribe to real-time metrics for a device
   */
  subscribe(deviceId: string, listener: DeviceDataListener): () => void {
    if (!this.listeners.has(deviceId)) {
      this.listeners.set(deviceId, new Set());
      this.subscribeMQTT(deviceId);
    }

    this.listeners.get(deviceId)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(deviceId)?.delete(listener);
      if (this.listeners.get(deviceId)?.size === 0) {
        this.unsubscribeMQTT(deviceId);
      }
    };
  }

  /**
   * Get cached metrics for a device
   */
  getMetrics(deviceId: string): DeviceMetrics | null {
    return this.metricsCache.get(deviceId) || null;
  }

  /**
   * Subscribe to MQTT topics for a device
   */
  private subscribeMQTT(deviceId: string): void {
    try {
      const mqttService = getMQTTService();

      // Add a small delay to ensure MQTT is fully connected
      setTimeout(() => {
        if (!mqttService.isConnectedToMQTT()) {
          console.warn('[DeviceData] MQTT not connected yet, retrying in 1 second...');
          // Retry after 1 second
          setTimeout(() => this.subscribeMQTT(deviceId), 1000);
          return;
        }

        // Subscribe to device data topic
        const unsubscribe = mqttService.subscribe(deviceId, (data: any) => {
          this.handleMQTTData(deviceId, data);
        });

        this.mqttUnsubscribers.set(deviceId, unsubscribe);
        console.log('[DeviceData] ✅ Subscribed to MQTT for device:', deviceId);
      }, 500);
    } catch (error) {
      console.error('[DeviceData] Error subscribing to MQTT:', error);
    }
  }

  /**
   * Unsubscribe from MQTT topics for a device
   */
  private unsubscribeMQTT(deviceId: string): void {
    const unsubscribe = this.mqttUnsubscribers.get(deviceId);
    if (unsubscribe) {
      unsubscribe();
      this.mqttUnsubscribers.delete(deviceId);
      console.log('[DeviceData] Unsubscribed from MQTT for device:', deviceId);
    }
  }

  /**
   * Handle incoming MQTT data
   */
  private handleMQTTData(deviceId: string, data: any): void {
    try {
      // Parse MQTT payload - handle different field name formats
      const metrics: DeviceMetrics = {
        deviceId,
        soilMoisture: data.soil_pct ?? data.soilMoisture ?? data.soil_moisture,
        wifiRSSI: data.rssi ?? data.wifiRSSI ?? data.wifi_rssi,
        ledStatus: data.led === 'ON' || data.led === true || data.ledStatus === true,
        relayStatus: data.relay === 'ON' || data.relay === true || data.relayStatus === true,
        uptime: data.uptime,
        freeHeap: data.free_heap ?? data.freeHeap,
        temperature: data.temperature ?? data.temp,
        humidity: data.humidity,
        lastUpdate: Date.now(),
      };

      // Update cache
      this.metricsCache.set(deviceId, metrics);

      // Check for device status changes first (online/offline)
      // This may mark device as offline if status message explicitly says so
      this.handleDeviceStatusChange(deviceId, data);

      // Check for relay state changes
      this.handleRelayStateChange(deviceId, data);

      // Phase 2K: Mark device online from general MQTT activity (only if not explicitly offline)
      // Skip if we just processed an explicit offline status
      const status = parseDeviceStatus(data);
      if (status !== 'offline') {
        // Only mark online if status wasn't explicitly offline
        this.markDeviceOnlineFromMQTT(deviceId);
      }

      // Notify all listeners
      this.notifyListeners(deviceId, metrics);

      console.log('[DeviceData] 📊 Updated from MQTT:', deviceId, metrics);
    } catch (error) {
      console.error('[DeviceData] Error handling MQTT data:', error);
    }
  }

  /**
   * Notify all listeners of metric updates
   */
  private notifyListeners(deviceId: string, metrics: DeviceMetrics): void {
    const listeners = this.listeners.get(deviceId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(metrics);
        } catch (error) {
          console.error('[DeviceData] Error in listener:', error);
        }
      });
    }
  }

  /**
   * Handle device status changes (online/offline)
   * Phase 2K: Now also syncs device health status to Firestore
   */
  private async handleDeviceStatusChange(deviceId: string, data: any): Promise<void> {
    const status = parseDeviceStatus(data);
    if (!status) return;

    const previousStatus = this.deviceStatusCache.get(deviceId);

    if (previousStatus === status) return; // No change

    this.deviceStatusCache.set(deviceId, status);

    const notificationService = getNotificationService();
    const deviceName = this.deviceNameCache.get(deviceId) || `Device ${deviceId.slice(0, 8)}`;

    if (status === 'online' && previousStatus === 'offline') {
      await notificationService.addNotification(
        'device_online',
        '🟢 Device Online',
        `${deviceName} is back online`,
        'success',
        { deviceId, deviceName, source: 'mqtt' }
      );
    } else if (status === 'offline') {
      await notificationService.addNotification(
        'device_offline',
        '🔴 Device Offline',
        `${deviceName} went offline`,
        'warning',
        { deviceId, deviceName, source: 'mqtt' }
      );
    }

    // Phase 2K: Sync device health to Firestore when status explicitly changes
    await this.syncDeviceHealthToFirestore(deviceId, status);
  }

  /**
   * Handle relay state changes
   * Phase 2J: Now syncs actual ESP32 relay state from MQTT responses to Firestore
   */
  private async handleRelayStateChange(deviceId: string, data: any): Promise<void> {
    const relayInfo = parseRelayState(data);
    if (!relayInfo.state) return;

    const notificationService = getNotificationService();
    const deviceName = this.deviceNameCache.get(deviceId) || `Device ${deviceId.slice(0, 8)}`;

    // Skip physical_switch events here, they're handled separately
    if (relayInfo.source === 'physical' && data.event === 'physical_switch') {
      await notificationService.addNotification(
        'physical_switch',
        '👆 Physical Switch Pressed',
        `Relay ${relayInfo.relayNumber || 1} activated by physical switch`,
        'info',
        { deviceId, deviceName, relayNumber: relayInfo.relayNumber || 1, source: 'mqtt' }
      );
    } else if (relayInfo.state === 'ON' || relayInfo.state === 'OFF') {
      await notificationService.addNotification(
        'relay_changed',
        `🔌 Relay ${relayInfo.state === 'ON' ? 'ON' : 'OFF'}`,
        `Relay ${relayInfo.relayNumber || 1} turned ${relayInfo.state}`,
        'info',
        { deviceId, deviceName, relayNumber: relayInfo.relayNumber || 1, source: 'mqtt' }
      );

      // Phase 2J: Sync relay state from MQTT response to Firestore
      await this.syncRelayStateToFirestore(deviceId, relayInfo.state);
    }
  }

  /**
   * Phase 2J: Sync relay state from MQTT response to Firestore
   * Called when ESP32 responds with actual relay state via esp32/{deviceId}/relay/state
   *
   * @param mqttDeviceId - MQTT device ID (e.g., "26B7B3F8")
   * @param relayState - Relay state from MQTT (e.g., "ON" or "OFF")
   */
  private async syncRelayStateToFirestore(mqttDeviceId: string, relayState: 'ON' | 'OFF'): Promise<void> {
    try {
      // Get cloud device link for this MQTT device
      const link = this.getCloudDeviceLinkByMqttId(mqttDeviceId);

      if (!link) {
        console.log('[DeviceData] No cloud device link found for MQTT device:', mqttDeviceId);
        return; // Local-only device, skip Firestore sync
      }

      // Convert ON/OFF to on/off for Firestore
      const nextState: 'on' | 'off' = relayState === 'ON' ? 'on' : 'off';      // Check duplicate write prevention cache
      const cacheKey = `${link.homeId}:${link.cloudDeviceId}:relay_1`;
      const cachedState = this.channelStateCache.get(cacheKey);

      if (cachedState === nextState) {
        console.log('[DeviceData] Skipping Firestore sync, relay_1 state unchanged:', nextState);
        return;
      }

      console.log('[DeviceData] 📡 Syncing relay_1 state to Firestore:', {
        homeId: link.homeId,
        cloudDeviceId: link.cloudDeviceId,
        state: nextState,
      });

      // Update Firestore channel state
      await deviceService.updateDeviceChannel(link.homeId, link.cloudDeviceId, 'relay_1', {
        state: nextState,
      });

      // Update cache to prevent duplicate writes
      this.channelStateCache.set(cacheKey, nextState);

      console.log('[DeviceData] ✅ Firestore relay_1 state synced:', nextState);
    } catch (error) {
      console.error('[DeviceData] ❌ Failed to sync relay state to Firestore:', {
        mqttDeviceId,
        relayState,
        error: (error as any)?.message,
      });
      // Don't throw — let MQTT listener continue
    }
  }

  /**
   * Phase 2K: Mark device as online when MQTT activity is detected
   * Called whenever any MQTT message is received from the device
   * Updates lastMqttMessageAt timestamp in Firestore
   */
  private async markDeviceOnlineFromMQTT(mqttDeviceId: string): Promise<void> {
    try {
      const link = this.getCloudDeviceLinkByMqttId(mqttDeviceId);
      if (!link) {
        // Local-only device, skip Firestore sync
        return;
      }

      // Sync device health: mark online and update lastMqttMessageAt
      await this.syncDeviceHealthToFirestore(mqttDeviceId, 'online');
    } catch (error) {
      console.error('[DeviceData] ❌ Failed to mark device online from MQTT:', {
        mqttDeviceId,
        error: (error as any)?.message,
      });
      // Don't throw — let MQTT listener continue
    }
  }

  /**
   * Phase 2K: Sync device health status to Firestore
   * Updates device.status and device.lastSeenAt/lastMqttMessageAt
   *
   * Implements duplicate write prevention:
   * - If status unchanged and last write < 30 seconds ago, skip
   * - Always allow write when status changes
   *
   * @param mqttDeviceId - MQTT device ID
   * @param status - Device status (online, offline, unknown)
   */
  private async syncDeviceHealthToFirestore(
    mqttDeviceId: string,
    status: 'online' | 'offline' | 'unknown'
  ): Promise<void> {
    try {
      const link = this.getCloudDeviceLinkByMqttId(mqttDeviceId);
      if (!link) {
        console.log('[DeviceData] No cloud device link found for MQTT device:', mqttDeviceId);
        return; // Local-only device, skip Firestore sync
      }

      // Check duplicate write prevention cache
      const cacheKey = `${link.homeId}:${link.cloudDeviceId}`;
      const cachedHealth = this.deviceHealthCache.get(cacheKey);
      const now = Date.now();

      if (cachedHealth && cachedHealth.status === status && (now - cachedHealth.lastWriteAt) < 30000) {
        console.log('[DeviceData] Device health unchanged, skipping write:', { status, device: link.cloudDeviceId });
        return;
      }

      console.log('[DeviceData] 📡 Syncing device health to Firestore:', {
        homeId: link.homeId,
        cloudDeviceId: link.cloudDeviceId,
        status,
      });

      // Build update object with current timestamp
      const now_iso = new Date().toISOString();
      const updates: UpdateCloudDeviceInput = {
        status,
        lastSeenAt: now_iso,
        lastMqttMessageAt: now_iso, // Phase 2M: Track MQTT message timestamp
      };

      // Update Firestore device document
      await deviceService.updateCloudDevice(link.homeId, link.cloudDeviceId, updates);

      // Update cache to prevent duplicate writes
      this.deviceHealthCache.set(cacheKey, { status, lastWriteAt: now });

      console.log('[DeviceData] ✅ Device health synced to Firestore:', status);
    } catch (error) {
      console.error('[DeviceData] ❌ Failed to sync device health to Firestore:', {
        mqttDeviceId,
        status,
        error: (error as any)?.message,
      });
      // Don't throw — let MQTT listener continue
    }
  }

  /**
   * Set device name for notifications (called by provisioning or home screen)
   */
  setDeviceName(deviceId: string, deviceName: string): void {
    this.deviceNameCache.set(deviceId, deviceName);
  }

  /**
   * Update relay status for a device (GPIO23)
   * Sends command via MQTT
   * 
   * NOTE: Does NOT update cache optimistically.
   * The UI will update when the ESP32 responds via MQTT with the actual state.
   * This ensures the UI always reflects the true device state.
   */
  async updateRelayStatus(deviceId: string, status: boolean): Promise<boolean> {
    try {
      console.log('[DeviceData] 🔌 Sending relay command for device:', deviceId, 'Status:', status ? 'ON' : 'OFF');

      const mqttService = getMQTTService();

      if (!mqttService.isConnectedToMQTT()) {
        console.warn('[DeviceData] MQTT not connected');
        return false;
      }

      // Send relay command via MQTT
      // The ESP32 will respond with the actual state via esp32/{id}/relay/state topic
      // which will trigger the MQTT subscription and update the UI
      const success = await mqttService.sendRelayCommand(deviceId, status);

      if (success) {
        console.log('[DeviceData] ✅ Relay command sent, waiting for ESP32 response...');
      } else {
        console.warn('[DeviceData] ❌ Relay command failed to send');
      }

      return success;
    } catch (error) {
      console.error('[DeviceData] Error updating relay status:', error);
      return false;
    }
  }

  /**
   * Update relay channel status via MQTT and sync to Firestore
   * This is the Phase 2H per-channel control function
   *
   * @param homeId - Firestore home ID
   * @param deviceId - Firestore device ID (cloud device ID)
   * @param mqttDeviceId - MQTT device ID for publishing commands
   * @param channelId - Firestore channel ID (e.g., relay_1, relay_2)
   * @param channelNumber - Relay channel number (1-based)
   * @param newState - Desired state (on/off)
   * @returns true if command succeeded and Firestore was updated
   */
  async updateRelayChannelStatus(
    homeId: string,
    deviceId: string,
    mqttDeviceId: string,
    channelId: string,
    channelNumber: number,
    newState: 'on' | 'off',
  ): Promise<boolean> {
    try {
      console.log('[DeviceData] 📡 Updating relay channel:', {
        channelId,
        channelNumber,
        state: newState,
      });

      const mqttService = getMQTTService();

      if (!mqttService.isConnectedToMQTT()) {
        console.warn('[DeviceData] MQTT not connected');
        return false;
      }

      // Convert state string to boolean for MQTT
      const mqttState = newState === 'on';

      // Send per-channel command via MQTT
      const mqttSuccess = await mqttService.sendRelayChannelCommand(
        mqttDeviceId,
        channelNumber,
        mqttState,
      );

      if (!mqttSuccess) {
        console.warn('[DeviceData] ❌ MQTT command failed for channel:', channelId);
        return false;
      }

      console.log('[DeviceData] ✅ MQTT command sent, updating Firestore...');

      // Update Firestore channel state after MQTT success
      try {
        await deviceService.updateDeviceChannel(homeId, deviceId, channelId, {
          state: newState,
        });
        console.log('[DeviceData] ✅ Firestore channel state updated:', {
          channelId,
          state: newState,
        });
        return true;
      } catch (firestoreError) {
        console.error('[DeviceData] ❌ Failed to update Firestore channel:', {
          channelId,
          error: (firestoreError as any)?.message,
        });
        // Return true anyway since MQTT command succeeded
        // UI will eventually sync via MQTT listeners
        return true;
      }
    } catch (error) {
      console.error('[DeviceData] Error updating relay channel status:', error);
      return false;
    }
  }

  /**
   * Update LED status for a device
   * Sends command via MQTT
   * 
   * NOTE: Does NOT update cache optimistically.
   * The UI will update when the ESP32 responds via MQTT with the actual state.
   * This ensures the UI always reflects the true device state.
   */
  async updateLEDStatus(deviceId: string, status: boolean): Promise<boolean> {
    try {
      console.log('[DeviceData] 💡 Sending LED command for device:', deviceId, 'Status:', status ? 'ON' : 'OFF');

      const mqttService = getMQTTService();

      if (!mqttService.isConnectedToMQTT()) {
        console.warn('[DeviceData] MQTT not connected');
        return false;
      }

      // Send LED command via MQTT
      // The ESP32 will respond with the actual state via esp32/{id}/led/state topic
      // which will trigger the MQTT subscription and update the UI
      const success = await mqttService.sendLEDCommand(deviceId, status);

      if (success) {
        console.log('[DeviceData] ✅ LED command sent, waiting for ESP32 response...');
      } else {
        console.warn('[DeviceData] ❌ LED command failed to send');
      }

      return success;
    } catch (error) {
      console.error('[DeviceData] Error updating LED status:', error);
      return false;
    }
  }

  /**
   * Send WiFi reconfiguration command
   */
  async reconfigureWiFi(deviceId: string, ssid: string, password: string): Promise<boolean> {
    try {
      console.log('[DeviceData] 📶 Reconfiguring WiFi for device:', deviceId);

      const mqttService = getMQTTService();

      if (!mqttService.isConnectedToMQTT()) {
        console.warn('[DeviceData] MQTT not connected');
        return false;
      }

      return await mqttService.sendWiFiUpdate(deviceId, ssid, password);
    } catch (error) {
      console.error('[DeviceData] Error reconfiguring WiFi:', error);
      return false;
    }
  }

  /**
   * Send factory reset command
   */
  async factoryReset(deviceId: string): Promise<boolean> {
    try {
      console.log('[DeviceData] 🔄 Factory resetting device:', deviceId);

      const mqttService = getMQTTService();

      if (!mqttService.isConnectedToMQTT()) {
        console.warn('[DeviceData] MQTT not connected');
        return false;
      }

      return await mqttService.sendFactoryReset(deviceId);
    } catch (error) {
      console.error('[DeviceData] Error factory resetting:', error);
      return false;
    }
  }

  /**
   * Clear all data and stop polling
   */
  destroy(): void {
    this.mqttUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.mqttUnsubscribers.clear();
    this.listeners.clear();
    this.metricsCache.clear();
  }
}

// Singleton instance
let deviceDataServiceInstance: DeviceDataService | null = null;

export const getDeviceDataService = (): DeviceDataService => {
  if (!deviceDataServiceInstance) {
    deviceDataServiceInstance = new DeviceDataService();
  }
  return deviceDataServiceInstance;
};

export default DeviceDataService;
