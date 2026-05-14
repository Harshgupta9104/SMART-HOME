/**
 * MQTT Service for React Native
 * Connects to HiveMQ broker and manages real-time device communication
 * Using @taoqf/react-native-mqtt library with proper configuration
 */

import { connect, MqttClient } from '@taoqf/react-native-mqtt';

export interface MQTTConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  clientId: string;
}

export interface DeviceDataCallback {
  (data: any): void;
}

class MQTTService {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private listeners: Map<string, Set<DeviceDataCallback>> = new Map();
  private reconnectAttempts: number = 0;
  private connectionPromise: Promise<boolean> | null = null;

  /**
   * Initialize MQTT connection
   */
  async connect(config: MQTTConfig): Promise<boolean> {
    try {
      console.log('[MQTT] Starting connection to:', config.host);

      return new Promise((resolve) => {
        try {
          // Create MQTT client with correct TLS configuration for @taoqf/react-native-mqtt
          this.client = connect(
            `mqtt://${config.host}:${config.port}`,
            {
              username: config.username,
              password: config.password,
              clientId: config.clientId,
              ssl: true,  // ✅ CORRECT: Use ssl: true for TLS
              clean: true,
              reconnectPeriod: 3000,
              connectTimeout: 10000,
              keepalive: 60,
              protocolVersion: 4,
            }
          );

          // Handle connection
          this.client.on('connect', () => {
            console.log('[MQTT] ✅ Connected to HiveMQ successfully');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            resolve(true);
          });

          // Handle incoming messages
          this.client.on('message', (topic: string, message: Buffer) => {
            this.handleMessage(topic, message);
          });

          // Handle errors
          this.client.on('error', (error: any) => {
            console.error('[MQTT] ❌ Connection error:', error);
            this.isConnected = false;
          });

          // Handle disconnect
          this.client.on('disconnect', () => {
            console.log('[MQTT] Disconnected from broker');
            this.isConnected = false;
          });

          // Handle reconnect
          this.client.on('reconnect', () => {
            this.reconnectAttempts++;
            console.log('[MQTT] 🔄 Reconnecting... Attempt:', this.reconnectAttempts);
          });

          // Handle offline
          this.client.on('offline', () => {
            console.log('[MQTT] ⚠️ Client went offline');
            this.isConnected = false;
          });

          // Timeout after 20 seconds
          const timeoutId = setTimeout(() => {
            if (!this.isConnected) {
              console.warn('[MQTT] ⏱️ Connection timeout after 20 seconds');
              resolve(false);
            }
          }, 20000);

          // Clear timeout if connected
          if (this.client) {
            this.client.once('connect', () => {
              clearTimeout(timeoutId);
            });
          }
        } catch (error) {
          console.error('[MQTT] ❌ Error creating client:', error);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('[MQTT] ❌ Connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Subscribe to device data
   */
  subscribe(deviceId: string, callback: DeviceDataCallback): () => void {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] ⚠️ Not connected, cannot subscribe to device:', deviceId);
      return () => {};
    }

    try {
      // Add listener
      if (!this.listeners.has(deviceId)) {
        this.listeners.set(deviceId, new Set());

        // Subscribe to device topics using SHORT device ID (e.g., "26B7B3F8")
        const dataTopic = `esp32/${deviceId}/data`;
        const statusTopic = `esp32/${deviceId}/status`;
        const ledStateTopic = `esp32/${deviceId}/led/state`;

        console.log('[MQTT] 📡 Subscribing to topics for device:', deviceId);
        console.log('[MQTT] 📡 Topics:', { dataTopic, statusTopic, ledStateTopic });
        
        this.client.subscribe(dataTopic, { qos: 1 }, (err: any) => {
          if (err) {
            console.error('[MQTT] ❌ Subscribe error for', dataTopic, ':', err);
          } else {
            console.log('[MQTT] ✅ Subscribed to:', dataTopic);
          }
        });

        this.client.subscribe(statusTopic, { qos: 1 }, (err: any) => {
          if (err) {
            console.error('[MQTT] ❌ Subscribe error for', statusTopic, ':', err);
          } else {
            console.log('[MQTT] ✅ Subscribed to:', statusTopic);
          }
        });

        this.client.subscribe(ledStateTopic, { qos: 1 }, (err: any) => {
          if (err) {
            console.error('[MQTT] ❌ Subscribe error for', ledStateTopic, ':', err);
          } else {
            console.log('[MQTT] ✅ Subscribed to:', ledStateTopic);
          }
        });
      }

      this.listeners.get(deviceId)!.add(callback);

      // Return unsubscribe function
      return () => {
        this.listeners.get(deviceId)?.delete(callback);
        if (this.listeners.get(deviceId)?.size === 0) {
          this.listeners.delete(deviceId);
          const dataTopic = `esp32/${deviceId}/data`;
          const statusTopic = `esp32/${deviceId}/status`;
          const ledStateTopic = `esp32/${deviceId}/led/state`;
          
          console.log('[MQTT] 🔕 Unsubscribing from topics for device:', deviceId);
          this.client?.unsubscribe(dataTopic);
          this.client?.unsubscribe(statusTopic);
          this.client?.unsubscribe(ledStateTopic);
        }
      };
    } catch (error) {
      console.error('[MQTT] ❌ Subscribe error:', error);
      return () => {};
    }
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = message.toString();
      console.log('[MQTT] 📨 Received message on', topic, ':', payload);

      // Parse device ID from topic: esp32/{deviceId}/...
      const parts = topic.split('/');
      if (parts.length < 3) {
        console.warn('[MQTT] ⚠️ Invalid topic format:', topic);
        return;
      }

      const deviceId = parts[1];
      let data: any = {};

      // Parse message based on topic type
      if (topic.includes('/data')) {
        // Sensor data topic
        try {
          data = JSON.parse(payload);
          console.log('[MQTT] 📊 Parsed sensor data:', data);
        } catch {
          console.warn('[MQTT] ⚠️ Could not parse data JSON:', payload);
          data = { raw: payload };
        }
      } else if (topic.includes('/status')) {
        // Status topic
        data = { status: payload };
        console.log('[MQTT] 🔄 Device status:', payload);
      } else if (topic.includes('/led/state')) {
        // LED state topic
        data = { ledState: payload };
        console.log('[MQTT] 💡 LED state:', payload);
      }

      // Notify all listeners for this device
      const listeners = this.listeners.get(deviceId);
      if (listeners) {
        console.log('[MQTT] 📢 Notifying', listeners.size, 'listener(s) for device:', deviceId);
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('[MQTT] ❌ Listener error:', error);
          }
        });
      } else {
        console.warn('[MQTT] ⚠️ No listeners for device:', deviceId);
      }
    } catch (error) {
      console.error('[MQTT] ❌ Message handling error:', error);
    }
  }

  /**
   * Send LED control command
   * Publishes to esp32/{deviceId}/led/set
   */
  async sendLEDCommand(deviceId: string, state: boolean): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] ⚠️ Not connected, cannot send LED command');
      return false;
    }

    try {
      const topic = `esp32/${deviceId}/led/set`;
      const message = state ? 'ON' : 'OFF';

      console.log('[MQTT] 💡 Publishing LED command to:', topic, 'Message:', message);

      return new Promise((resolve) => {
        this.client.publish(topic, message, { qos: 1 }, (err: any) => {
          if (err) {
            console.error('[MQTT] ❌ Publish error:', err);
            resolve(false);
          } else {
            console.log('[MQTT] ✅ Published to', topic, ':', message);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('[MQTT] ❌ Send LED command error:', error);
      return false;
    }
  }

  /**
   * Send WiFi update command
   * Publishes to esp32/{deviceId}/config
   */
  async sendWiFiUpdate(deviceId: string, ssid: string, password: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] ⚠️ Not connected, cannot send WiFi update');
      return false;
    }

    try {
      const topic = `esp32/${deviceId}/config`;
      const payload = JSON.stringify({
        type: 'wifi_update',
        ssid: ssid,
        password: password,
      });

      console.log('[MQTT] 📶 Publishing WiFi update to:', topic);

      return new Promise((resolve) => {
        this.client.publish(topic, payload, { qos: 1 }, (err: any) => {
          if (err) {
            console.error('[MQTT] ❌ Publish error:', err);
            resolve(false);
          } else {
            console.log('[MQTT] ✅ Published to', topic, ':', payload);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('[MQTT] ❌ Send WiFi update error:', error);
      return false;
    }
  }

  /**
   * Send factory reset command
   * Publishes to esp32/{deviceId}/config
   */
  async sendFactoryReset(deviceId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('[MQTT] ⚠️ Not connected, cannot send factory reset');
      return false;
    }

    try {
      const topic = `esp32/${deviceId}/config`;
      const payload = JSON.stringify({
        type: 'factory_reset',
      });

      console.log('[MQTT] 🔄 Publishing factory reset to:', topic);

      return new Promise((resolve) => {
        this.client.publish(topic, payload, { qos: 1 }, (err: any) => {
          if (err) {
            console.error('[MQTT] ❌ Publish error:', err);
            resolve(false);
          } else {
            console.log('[MQTT] ✅ Published to', topic, ':', payload);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('[MQTT] ❌ Send factory reset error:', error);
      return false;
    }
  }

  /**
   * Check if connected to MQTT
   */
  isConnectedToMQTT(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from MQTT
   */
  disconnect(): void {
    if (this.client) {
      try {
        console.log('[MQTT] 🔌 Disconnecting from broker...');
        this.client.end();
        this.client = null;
        this.isConnected = false;
        this.listeners.clear();
        console.log('[MQTT] ✅ Disconnected');
      } catch (error) {
        console.error('[MQTT] ❌ Disconnect error:', error);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.disconnect();
  }
}

// Singleton instance
let mqttServiceInstance: MQTTService | null = null;

export const getMQTTService = (): MQTTService => {
  if (!mqttServiceInstance) {
    mqttServiceInstance = new MQTTService();
  }
  return mqttServiceInstance;
};

export default MQTTService;
