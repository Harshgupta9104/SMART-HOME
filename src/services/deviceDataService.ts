/**
 * Device Data Service
 * Manages real-time device metrics from MQTT
 */

import { getMQTTService } from './mqttService';

export interface DeviceMetrics {
  deviceId: string;
  soilMoisture?: number; // 0-100 %
  wifiRSSI?: number; // dBm
  ledStatus?: boolean; // ON/OFF
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
        uptime: data.uptime,
        freeHeap: data.free_heap ?? data.freeHeap,
        temperature: data.temperature ?? data.temp,
        humidity: data.humidity,
        lastUpdate: Date.now(),
      };

      // Update cache
      this.metricsCache.set(deviceId, metrics);

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
