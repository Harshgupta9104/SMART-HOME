import mqtt, { MqttClient } from 'mqtt';

export interface MQTTConfig {
  url: string;
  username: string;
  password: string;
  clientId: string;
}

export interface DeviceDataCallback {
  (data: any): void;
}

class MqttService {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private listeners: Map<string, Set<DeviceDataCallback>> = new Map();
  private messageCallbacks: Array<(topic: string, payload: string) => void> = [];
  private connectCallbacks: Array<() => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];
  private disconnectCallbacks: Array<() => void> = [];

  /**
   * Initialize MQTT client
   */
  async initialize(): Promise<void> {
    try {
      console.log('[MQTT] 🔧 Initializing MQTT client...');
      console.log('[MQTT] ✅ Client initialized successfully');
    } catch (error) {
      console.error('[MQTT] ❌ Error initializing client:', error);
      throw error;
    }
  }

  /**
   * Connect to MQTT broker via WebSocket
   */
  async connect(config: MQTTConfig): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('[MQTT] 🔌 Starting connection to HiveMQ...');
      // Do not log URL, username or any other credentials

      const mqttOptions = {
        clientId: config.clientId,
        username: config.username,
        password: config.password,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
      };

      try {
        this.client = mqtt.connect(config.url, mqttOptions);

        this.client.on('connect', () => {
          console.log('[MQTT] ✅ Connected to HiveMQ successfully!');
          console.log('[MQTT] URL:', config.url);
          this.isConnected = true;
          this.connectCallbacks.forEach(cb => cb());
          resolve(true);
        });

        this.client.on('message', (topic: string, message: Buffer) => {
          const payload = message.toString();
          console.log(`[MQTT] 📨 Received message on ${topic}: ${payload}`);
          this.handleMessage(topic, payload);
          this.messageCallbacks.forEach(cb => cb(topic, payload));
        });

        this.client.on('error', (error: Error) => {
          console.error('[MQTT] ❌ Connection error:', error.message);
          this.isConnected = false;
          this.errorCallbacks.forEach(cb => cb(error));
        });

        this.client.on('offline', () => {
          console.log('[MQTT] 🔌 Connection lost (offline)');
          this.isConnected = false;
          this.disconnectCallbacks.forEach(cb => cb());
        });

        this.client.on('reconnect', () => {
          console.log('[MQTT] 🔄 Reconnecting...');
        });

        // Set timeout for connection attempt
        const timeoutId = setTimeout(() => {
          if (!this.isConnected) {
            console.error('[MQTT] ⏱️ Connection timeout after 30 seconds');
            console.error('[MQTT] Possible causes:');
            console.error('[MQTT]   - Network connectivity issue');
            console.error('[MQTT]   - Firewall blocking WebSocket');
            console.error('[MQTT]   - Invalid credentials (username/password)');
            console.error('[MQTT]   - HiveMQ broker unreachable');
            this.client?.end();
            resolve(false);
          }
        }, 30000);

        // Clear timeout if connected
        const originalResolve = resolve;
        resolve = ((value: boolean) => {
          clearTimeout(timeoutId);
          originalResolve(value);
        }) as any;
      } catch (error) {
        console.error('[MQTT] ❌ Error during connection:', error);
        resolve(false);
      }
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleMessage(topic: string, message: string): void {
    try {
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
        // Sensor data topic - contains all metrics including LED state
        try {
          data = JSON.parse(message);
          console.log('[MQTT] 📊 Parsed sensor data:', data);
        } catch {
          console.warn('[MQTT] ⚠️ Could not parse data JSON:', message);
          data = { raw: message };
        }
      } else if (topic.includes('/status')) {
        // Status topic - handle device online/offline notifications
        this.handleDeviceStatus(deviceId, message);
        data = { status: message };
        console.log('[MQTT] 🔄 Device status:', message);
      } else if (topic.includes('/led/state')) {
        // LED state topic - convert to 'led' field for consistency with data topic
        // Message is typically "ON" or "OFF"
        data = { led: message };
        console.log('[MQTT] 💡 LED state received:', message);
      } else if (topic.includes('/relay/state')) {
        // Relay state topic - convert to 'relay' field
        // Message is typically "ON" or "OFF"
        data = { relay: message };
        console.log('[MQTT] 🔌 Relay state received:', message);
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
   * Handle device online/offline status changes and trigger notifications
   */
  private handleDeviceStatus(deviceId: string, message: string): void {
    try {
      // Device status notifications are now handled by DeviceDataService
      // This method is kept for compatibility but notifications are fired from there
      console.log('[MQTT] Device status received:', deviceId, message);
    } catch (error) {
      console.error('[MQTT] Error handling device status:', error);
    }
  }

  /**
   * Subscribe to device data
   */
  subscribe(deviceId: string, callback: DeviceDataCallback): () => void {
    if (!this.isConnectedToMQTT()) {
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
        const relayStateTopic = `esp32/${deviceId}/relay/state`;

        console.log('[MQTT] 📡 Subscribing to topics for device:', deviceId);
        console.log('[MQTT] 📡 Topics:', { dataTopic, statusTopic, ledStateTopic, relayStateTopic });

        // Subscribe to all topics
        if (this.client?.subscribe) {
          this.client.subscribe([dataTopic, statusTopic, ledStateTopic, relayStateTopic], { qos: 1 }, (err) => {
            if (err) {
              console.error('[MQTT] ❌ Subscription error:', err);
            } else {
              console.log('[MQTT] ✅ Subscribed to:', dataTopic);
              console.log('[MQTT] ✅ Subscribed to:', statusTopic);
              console.log('[MQTT] ✅ Subscribed to:', ledStateTopic);
              console.log('[MQTT] ✅ Subscribed to:', relayStateTopic);
            }
          });
        }
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
          const relayStateTopic = `esp32/${deviceId}/relay/state`;

          console.log('[MQTT] 🔕 Unsubscribing from topics for device:', deviceId);
          if (this.client?.unsubscribe) {
            this.client.unsubscribe([dataTopic, statusTopic, ledStateTopic, relayStateTopic]);
          }
        }
      };
    } catch (error) {
      console.error('[MQTT] ❌ Subscribe error:', error);
      return () => {};
    }
  }

  /**
   * Send LED control command
   */
  async sendLEDCommand(deviceId: string, state: boolean): Promise<boolean> {
    if (!this.isConnectedToMQTT()) {
      console.warn('[MQTT] ⚠️ Not connected, cannot send LED command');
      return false;
    }

    try {
      const topic = `esp32/${deviceId}/led/set`;
      const message = state ? 'ON' : 'OFF';

      console.log('[MQTT] 💡 Publishing LED command to:', topic, 'Message:', message);

      return new Promise((resolve) => {
        if (this.client?.publish) {
          this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
              console.error('[MQTT] ❌ Publish error:', err);
              resolve(false);
            } else {
              console.log('[MQTT] ✅ Published to', topic, ':', message);
              resolve(true);
            }
          });
        } else {
          console.error('[MQTT] ❌ Client not ready');
          resolve(false);
        }
      });
    } catch (error) {
      console.error('[MQTT] ❌ Send LED command error:', error);
      return false;
    }
  }

  /**
   * Send relay control command (GPIO23)
   */
  async sendRelayCommand(deviceId: string, state: boolean): Promise<boolean> {
    if (!this.isConnectedToMQTT()) {
      console.warn('[MQTT] ⚠️ Not connected, cannot send relay command');
      return false;
    }

    try {
      const topic = `esp32/${deviceId}/relay/set`;
      const message = state ? 'ON' : 'OFF';

      console.log('[MQTT] 🔌 Publishing relay command to:', topic, 'Message:', message);

      return new Promise((resolve) => {
        if (this.client?.publish) {
          this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
              console.error('[MQTT] ❌ Publish error:', err);
              resolve(false);
            } else {
              console.log('[MQTT] ✅ Published to', topic, ':', message);
              resolve(true);
            }
          });
        } else {
          console.error('[MQTT] ❌ Client not ready');
          resolve(false);
        }
      });
    } catch (error) {
      console.error('[MQTT] ❌ Send relay command error:', error);
      return false;
    }
  }

  /**
   * Send WiFi update command
   */
  async sendWiFiUpdate(deviceId: string, ssid: string, password: string): Promise<boolean> {
    if (!this.isConnectedToMQTT()) {
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

      console.log('[MQTT] 📶 Publishing WiFi update command to:', topic);

      return new Promise((resolve) => {
        if (this.client?.publish) {
          this.client.publish(topic, payload, { qos: 1 }, (err) => {
            if (err) {
              console.error('[MQTT] ❌ Publish error:', err);
              resolve(false);
            } else {
              console.log('[MQTT] ✅ WiFi update command published');
              resolve(true);
            }
          });
        } else {
          console.error('[MQTT] ❌ Client not ready');
          resolve(false);
        }
      });
    } catch (error) {
      console.error('[MQTT] ❌ Send WiFi update error:', error);
      return false;
    }
  }

  /**
   * Send factory reset command
   */
  async sendFactoryReset(deviceId: string): Promise<boolean> {
    if (!this.isConnectedToMQTT()) {
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
        if (this.client?.publish) {
          this.client.publish(topic, payload, { qos: 1 }, (err) => {
            if (err) {
              console.error('[MQTT] ❌ Publish error:', err);
              resolve(false);
            } else {
              console.log('[MQTT] ✅ Factory reset command published');
              resolve(true);
            }
          });
        } else {
          console.error('[MQTT] ❌ Client not ready');
          resolve(false);
        }
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
    return this.isConnected && this.client?.connected === true;
  }

  /**
   * Disconnect from MQTT
   */
  disconnect(): void {
    console.log('[MQTT] 🔌 Disconnecting from broker...');
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    this.isConnected = false;
    this.listeners.clear();
    console.log('[MQTT] ✅ Disconnected');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.disconnect();
  }

  /**
   * Set callbacks
   */
  setOnConnectCallback(callback: () => void) {
    this.connectCallbacks.push(callback);
  }

  setOnMessageCallback(callback: (topic: string, payload: string) => void) {
    this.messageCallbacks.push(callback);
  }

  setOnErrorCallback(callback: (error: Error) => void) {
    this.errorCallbacks.push(callback);
  }

  setOnDisconnectCallback(callback: () => void) {
    this.disconnectCallbacks.push(callback);
  }
}

// Singleton instance
let mqttServiceInstance: MqttService | null = null;

export const getMQTTService = (): MqttService => {
  if (!mqttServiceInstance) {
    mqttServiceInstance = new MqttService();
  }
  return mqttServiceInstance;
};

export default MqttService;
