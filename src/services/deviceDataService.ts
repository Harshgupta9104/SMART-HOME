/**
 * Device Data Service
 * Manages real-time device metrics from MQTT
 */

import { getMQTTService } from './mqttService';
import { getNotificationService } from './notificationService';
import { deviceService } from './firebase/deviceService';
import { parseRelayState, parseDeviceStatus } from '../utils/notificationHelpers';

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

class DeviceDataService {
  private metricsCache: Map<string, DeviceMetrics> = new Map();
  private listeners: Map<string, Set<DeviceDataListener>> = new Map();
  private mqttUnsubscribers: Map<string, () => void> = new Map();
  private deviceStatusCache: Map<string, 'online' | 'offline'> = new Map();
  private deviceNameCache: Map<string, string> = new Map();

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

      // Check for device status changes (online/offline)
      this.handleDeviceStatusChange(deviceId, data);

      // Check for relay state changes
      this.handleRelayStateChange(deviceId, data);

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
  }

  /**
   * Handle relay state changes
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
