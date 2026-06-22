import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType = 
  | 'device_offline'
  | 'device_online'
  | 'relay_changed'
  | 'physical_switch'
  | 'wifi_changed'
  | 'firmware_update'
  | 'security'
  | 'automation';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';
export type NotificationSource = 'app' | 'mqtt' | 'device' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  deviceId?: string;
  deviceName?: string;
  relayNumber?: number;
  severity: NotificationSeverity;
  createdAt: number;
  read: boolean;
  source: NotificationSource;
}

export interface NotificationSettings {
  deviceAlerts: boolean;
  firmwareUpdates: boolean;
  homeActivity: boolean;
  securityAlerts: boolean;
  offlineDevices: boolean;
  automationTriggered: boolean;
  physicalSwitchEvents: boolean;
  relayChangeEvents: boolean;
}

export interface NotificationListener {
  (unreadCount: number, notifications: Notification[]): void;
}

const NOTIFICATIONS_KEY = '@SmartHome:notifications';
const NOTIFICATION_SETTINGS_KEY = '@SmartHome:notificationSettings';

class NotificationService {
  private notifications: Notification[] = [];
  private settings: NotificationSettings = {
    deviceAlerts: true,
    firmwareUpdates: true,
    homeActivity: true,
    securityAlerts: true,
    offlineDevices: true,
    automationTriggered: true,
    physicalSwitchEvents: true,
    relayChangeEvents: true,
  };
  private listeners: Set<NotificationListener> = new Set();
  private initialized = false;

  /**
   * Initialize notification service and load from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load notifications
      const storedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (storedNotifications) {
        this.notifications = JSON.parse(storedNotifications);
      }

      // Load settings
      const storedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (storedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(storedSettings) };
      }

      this.initialized = true;
      console.log('[Notifications] ✅ Service initialized with', this.notifications.length, 'notifications');
    } catch (error) {
      console.error('[Notifications] ❌ Error initializing service:', error);
    }
  }

  /**
   * Subscribe to notification updates
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.getUnreadCount(), this.getNotifications());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const unreadCount = this.getUnreadCount();
    const notifications = this.getNotifications();
    this.listeners.forEach(listener => {
      try {
        listener(unreadCount, notifications);
      } catch (error) {
        console.error('[Notifications] Error in listener:', error);
      }
    });
  }

  /**
   * Get all notifications sorted by creation time (newest first)
   */
  getNotifications(): Notification[] {
    return [...this.notifications].sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Add a new notification
   */
  async addNotification(
    type: NotificationType,
    title: string,
    message: string,
    severity: NotificationSeverity = 'info',
    options?: {
      deviceId?: string;
      deviceName?: string;
      relayNumber?: number;
      source?: NotificationSource;
    }
  ): Promise<Notification | null> {
    // Check if this notification type is enabled
    const settingKey = this.getSettingKeyForType(type);
    if (!this.settings[settingKey as keyof NotificationSettings]) {
      console.log('[Notifications] ⏭️ Notification type disabled:', type);
      return null;
    }

    const notification: Notification = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      title,
      message,
      severity,
      createdAt: Date.now(),
      read: false,
      source: options?.source || 'app',
      deviceId: options?.deviceId,
      deviceName: options?.deviceName,
      relayNumber: options?.relayNumber,
    };

    this.notifications.unshift(notification);

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    await this.saveNotifications();
    this.notifyListeners();
    console.log('[Notifications] ✅ Added:', type, '-', title);
    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    let changed = false;
    this.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    this.notifications = [];
    await this.saveNotifications();
    this.notifyListeners();
  }

  /**
   * Get notification settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Update notification settings
   */
  async updateSettings(key: keyof NotificationSettings, value: boolean): Promise<void> {
    this.settings[key] = value;
    await this.saveSettings();
    console.log('[Notifications] ⚙️ Setting updated:', key, '=', value);
  }

  /**
   * Get setting key for notification type
   */
  private getSettingKeyForType(type: NotificationType): keyof NotificationSettings {
    switch (type) {
      case 'device_offline':
      case 'device_online':
        return 'offlineDevices';
      case 'firmware_update':
        return 'firmwareUpdates';
      case 'automation':
        return 'automationTriggered';
      case 'security':
        return 'securityAlerts';
      case 'physical_switch':
        return 'physicalSwitchEvents';
      case 'relay_changed':
        return 'relayChangeEvents';
      case 'wifi_changed':
        return 'homeActivity';
      default:
        return 'homeActivity';
    }
  }

  /**
   * Save notifications to storage
   */
  private async saveNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('[Notifications] Error saving notifications:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[Notifications] Error saving settings:', error);
    }
  }
}

let notificationServiceInstance: NotificationService | null = null;

export const getNotificationService = (): NotificationService => {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
};
