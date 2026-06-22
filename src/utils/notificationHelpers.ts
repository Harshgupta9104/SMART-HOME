import { NotificationType, NotificationSeverity } from '../services/notificationService';

/**
 * Format timestamp to relative time string (e.g., "2m ago", "1h ago")
 */
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
};

/**
 * Get icon name for notification type
 */
export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'device_offline':
      return 'wifi-off';
    case 'device_online':
      return 'wifi';
    case 'relay_changed':
      return 'toggle-right';
    case 'physical_switch':
      return 'hand-gesture';
    case 'wifi_changed':
      return 'wifi';
    case 'firmware_update':
      return 'download-cloud';
    case 'security':
      return 'shield-alert';
    case 'automation':
      return 'zap';
    default:
      return 'bell';
  }
};

/**
 * Get color for notification type
 */
export const getNotificationTypeColor = (type: NotificationType): string => {
  switch (type) {
    case 'device_offline':
      return '#F59E0B'; // Amber
    case 'device_online':
      return '#10B981'; // Emerald
    case 'relay_changed':
      return '#3B82F6'; // Blue
    case 'physical_switch':
      return '#8B5CF6'; // Violet
    case 'wifi_changed':
      return '#06B6D4'; // Cyan
    case 'firmware_update':
      return '#6366F1'; // Indigo
    case 'security':
      return '#EF4444'; // Red
    case 'automation':
      return '#10B981'; // Emerald
    default:
      return '#6B7280'; // Gray
  }
};

/**
 * Get color for notification severity
 */
export const getSeverityColor = (severity: NotificationSeverity): string => {
  switch (severity) {
    case 'critical':
      return '#DC2626'; // Red-600
    case 'warning':
      return '#F59E0B'; // Amber-500
    case 'success':
      return '#10B981'; // Emerald-500
    case 'info':
    default:
      return '#3B82F6'; // Blue-500
  }
};

/**
 * Build relay change notification message
 */
export const buildRelayMessage = (
  deviceName: string,
  relayNumber: number | undefined,
  state: string,
  source: 'physical' | 'app' | 'automation'
): string => {
  const relayStr = relayNumber ? `Relay ${relayNumber}` : 'Relay';
  const sourceStr = source === 'physical' ? 'Physical switch' : source === 'automation' ? 'Automation' : 'App';
  return `${relayStr} turned ${state} via ${sourceStr}`;
};

/**
 * Parse relay state from MQTT payload
 */
export const parseRelayState = (data: any): { state?: string; relayNumber?: number; source?: string } => {
  const result: { state?: string; relayNumber?: number; source?: string } = {};

  // Check for simple relay field (single relay)
  if (data.relay !== undefined) {
    result.state = data.relay === 'ON' || data.relay === true ? 'ON' : 'OFF';
    result.source = data.source || data.event;
  }

  // Check for physical switch event
  if (data.event === 'physical_switch') {
    result.source = 'physical';
    result.relayNumber = data.relay;
    result.state = data.state || data.relay;
  }

  // Check for numbered relays (multi-relay support)
  if (data.relay1 !== undefined) {
    result.relayNumber = 1;
    result.state = data.relay1 === 'ON' || data.relay1 === true ? 'ON' : 'OFF';
  } else if (data.relay2 !== undefined) {
    result.relayNumber = 2;
    result.state = data.relay2 === 'ON' || data.relay2 === true ? 'ON' : 'OFF';
  } else if (data.relay3 !== undefined) {
    result.relayNumber = 3;
    result.state = data.relay3 === 'ON' || data.relay3 === true ? 'ON' : 'OFF';
  } else if (data.relay4 !== undefined) {
    result.relayNumber = 4;
    result.state = data.relay4 === 'ON' || data.relay4 === true ? 'ON' : 'OFF';
  }

  return result;
};

/**
 * Parse device status from MQTT payload
 */
export const parseDeviceStatus = (data: any): 'online' | 'offline' | null => {
  if (data.status === 'online') return 'online';
  if (data.status === 'offline') return 'offline';
  if (data.status === 'ON') return 'online';
  if (data.status === 'OFF') return 'offline';
  return null;
};
