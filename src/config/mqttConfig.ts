import Config from 'react-native-config';

/**
 * MQTT Configuration Interface
 * Represents the configuration needed to connect to an MQTT broker
 */
export interface MQTTAppConfig {
  url: string;
  username: string;
  password: string;
  clientIdPrefix: string;
}

/**
 * Validates that MQTT configuration has all required fields
 * @param config - The configuration object to validate
 * @throws Error if validation fails
 */
export function validateMQTTConfig(config: Partial<MQTTAppConfig>): void {
  const missingFields: string[] = [];

  if (!config.url) {
    missingFields.push('MQTT_URL');
  } else if (!config.url.startsWith('ws://') && !config.url.startsWith('wss://')) {
    throw new Error('MQTT_URL must start with ws:// or wss://');
  }

  if (!config.username) {
    missingFields.push('MQTT_USERNAME');
  }

  if (!config.password) {
    missingFields.push('MQTT_PASSWORD');
  }

  if (missingFields.length > 0) {
    const missing = missingFields.join(', ');
    const logMessage = `Missing required MQTT configuration: ${missing}. Please ensure .env file is set up with required values.`;
    console.warn('[MQTT Config] ⚠️ ' + logMessage);
  }
}

/**
 * Retrieves MQTT configuration from environment variables
 * Falls back to default clientIdPrefix if not provided
 * Logs warnings if config is incomplete but allows app to continue
 * @returns MQTTAppConfig object with broker connection details
 */
export function getMQTTConfig(): MQTTAppConfig {
  const url = Config.MQTT_URL || '';
  const username = Config.MQTT_USERNAME || '';
  const password = Config.MQTT_PASSWORD || '';
  const clientIdPrefix = Config.MQTT_CLIENT_ID_PREFIX || 'smartapp';

  // Validate configuration
  const config: Partial<MQTTAppConfig> = { url, username, password, clientIdPrefix };
  validateMQTTConfig(config);

  // Log sanitized config for debugging (no credentials shown)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const maskPassword = (pwd: string): string => {
    if (!pwd) return '';
    return pwd.charAt(0) + '*'.repeat(pwd.length - 1);
  };

  console.log('[MQTT Config] Configuration loaded:', {
    url: url ? url.substring(0, 50) + '...' : '[missing]',
    // Do not log username or password, even partially masked
    clientIdPrefix,
  });

  return {
    url,
    username,
    password,
    clientIdPrefix,
  };
}
