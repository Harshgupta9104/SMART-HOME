# Smart Home Notification Center - Implementation Guide

## Overview
Complete in-app notification center for SmartHomeApp with persistent storage, real-time updates, and MQTT event integration.

## Files Created/Modified

### 1. **src/services/notificationService.ts** ✅ (Enhanced)
**What it does:**
- Manages all notifications with persistent AsyncStorage
- Supports 8 notification types: device_offline, device_online, relay_changed, physical_switch, wifi_changed, firmware_update, security, automation
- Supports 4 severity levels: info, success, warning, critical
- Implements subscriber/listener pattern for real-time UI updates
- Stores up to 100 notifications
- Settings persistence for 8 notification categories

**Key Methods:**
- `initialize()` - Load from storage on app start
- `subscribe(listener)` - Real-time updates via listener pattern
- `addNotification(type, title, message, severity, options)` - Create notification
- `markAsRead()`, `markAllAsRead()`, `deleteNotification()`, `clearAll()` - Notification actions
- `getSettings()`, `updateSettings()` - Manage notification preferences
- `getNotifications()`, `getUnreadCount()` - Query notifications

**Listener Pattern:**
```typescript
const unsubscribe = notificationService.subscribe((unreadCount, notifications) => {
  setUnreadCount(unreadCount);
  setNotifications(notifications);
});
```

---

### 2. **src/utils/notificationHelpers.ts** ✅ (New)
**What it does:**
- Helper functions for notification formatting and parsing
- Icon and color mapping for notification types
- MQTT payload parsing utilities

**Key Exports:**
- `formatTimeAgo(timestamp)` - Convert timestamp to "5m ago", "2h ago", etc
- `getNotificationIcon(type)` - Return Feather icon name for notification type
- `getNotificationTypeColor(type)` - Return hex color for notification type
- `getSeverityColor(severity)` - Return hex color for severity level
- `buildRelayMessage(deviceName, relayNumber, state, source)` - Build relay notification message
- `parseRelayState(data)` - Parse MQTT payload for relay state
- `parseDeviceStatus(data)` - Parse MQTT payload for device online/offline status

**Supported MQTT Payload Formats:**
```javascript
// Single relay
{ "relay": "ON" }
{ "relay": true }

// Device status
{ "status": "offline" }
{ "status": "online" }

// Physical switch event
{ "event": "physical_switch", "relay": 1, "state": "ON" }

// Multi-relay
{ "relay1": "ON", "relay2": "OFF", "relay3": "OFF", "relay4": "ON" }
```

---

### 3. **src/screens/NotificationScreen.tsx** ✅ (Enhanced)
**What it does:**
- Two-tab interface: Activity (Notifications) and Settings
- Real-time unread badge count
- Mark notifications as read/unread
- Delete individual notifications
- Clear all notifications with confirmation
- Toggle notification settings
- Live updates via listener pattern

**UI Features:**
- **Activity Tab:**
  - List of notifications sorted by newest first
  - Icon and color based on notification type
  - Severity-based visual styling
  - Unread notifications appear bolded and with blue dot
  - Device name badge
  - Time ago formatting
  - Mark as read button
  - Delete button
  - "Mark all as read" button when unread exist
  - "Clear all" button with confirmation

- **Settings Tab:**
  - 8 notification toggle switches:
    - Device Alerts (device_offline, device_online)
    - Offline Devices (same as above)
    - Firmware Updates
    - Home Activity (generic events)
    - Automation Triggered
    - Physical Switch Events
    - Relay Change Events
    - Security Alerts
  - All settings persist to AsyncStorage
  - Real-time toggle feedback

**New Settings Added:**
- `physicalSwitchEvents` - Toggle physical switch notifications
- `relayChangeEvents` - Toggle relay change notifications

---

### 4. **src/services/deviceDataService.ts** ✅ (Enhanced)
**What it does:**
- Tracks device status changes (online/offline)
- Detects relay state changes
- Automatically creates notifications for:
  - Device went offline → device_offline notification
  - Device came online → device_online notification
  - Relay state changed → relay_changed notification
  - Physical switch pressed → physical_switch notification

**New Methods:**
- `setDeviceName(deviceId, deviceName)` - Store device name for notification messages
- `handleDeviceStatusChange(deviceId, data)` - Detect online/offline transitions
- `handleRelayStateChange(deviceId, data)` - Detect relay changes and create notifications

**Integration Points:**
- Listens to MQTT data in `handleMQTTData()`
- Parses multiple relay formats
- Supports single-relay and multi-relay devices
- Creates appropriate notifications based on settings

**Example Flow:**
```
MQTT Message: { "status": "offline" }
    ↓
deviceDataService.handleMQTTData()
    ↓
handleDeviceStatusChange() detects change
    ↓
notificationService.addNotification('device_offline', ...)
    ↓
NotificationScreen updates with new notification
```

---

### 5. **src/screens/HomeScreen.tsx** ✅ (Enhanced)
**What it does:**
- Subscribes to notification updates on mount
- Shows unread badge count on bell icon
- Badge displays "1", "2", ... "9+" for 9+ unread
- Real-time updates as notifications arrive
- Device names tracked for notification messages

**New Features:**
- Notification badge with red background
- Badge hides when count is 0
- Updates live without screen navigation
- `subscribeToNotifications()` method initializes service
- `notificationUnsubscribeRef` cleanup on unmount

**UI Changes:**
- Replaced static dot with dynamic badge
- Badge shows actual unread count
- White border around badge for contrast
- Updates in real-time from listener

---

## Data Model

### Notification Interface
```typescript
interface Notification {
  id: string;                    // Unique ID
  type: NotificationType;        // 8 types
  title: string;                 // Display title
  message: string;               // Message body
  deviceId?: string;             // Associated device
  deviceName?: string;           // Device friendly name
  relayNumber?: number;          // Relay 1-4 (optional)
  severity: NotificationSeverity; // info|success|warning|critical
  createdAt: number;             // Timestamp
  read: boolean;                 // Read status
  source: NotificationSource;    // app|mqtt|device|system
}
```

### NotificationSettings Interface
```typescript
interface NotificationSettings {
  deviceAlerts: boolean;          // Device on/off changes
  firmwareUpdates: boolean;       // Firmware notifications
  homeActivity: boolean;          // Generic home events
  securityAlerts: boolean;        // Security events
  offlineDevices: boolean;        // Device offline alerts
  automationTriggered: boolean;   // Automation run notifications
  physicalSwitchEvents: boolean;  // Physical switch press
  relayChangeEvents: boolean;     // Relay state changes
}
```

---

## Notification Types & Mapping

| Type | Setting | Icon | Color | Severity |
|------|---------|------|-------|----------|
| device_offline | offlineDevices | wifi-off | Amber | warning |
| device_online | offlineDevices | wifi | Emerald | success |
| relay_changed | relayChangeEvents | toggle-right | Blue | info |
| physical_switch | physicalSwitchEvents | hand-gesture | Violet | info |
| wifi_changed | homeActivity | wifi | Cyan | info |
| firmware_update | firmwareUpdates | download-cloud | Indigo | warning |
| security | securityAlerts | shield-alert | Red | critical |
| automation | automationTriggered | zap | Emerald | info |

---

## Storage Keys

- **Notifications:** `@SmartHome:notifications` - Array of last 100 notifications
- **Settings:** `@SmartHome:notificationSettings` - User notification preferences

---

## Usage Examples

### 1. Create a Device Offline Notification
```typescript
const notificationService = getNotificationService();
await notificationService.addNotification(
  'device_offline',
  '🔴 Device Offline',
  'Living Room Light went offline',
  'warning',
  {
    deviceId: 'device123',
    deviceName: 'Living Room Light',
    source: 'mqtt'
  }
);
```

### 2. Create a Relay Change Notification
```typescript
await notificationService.addNotification(
  'relay_changed',
  '🔌 Relay ON',
  'Relay 2 turned ON',
  'info',
  {
    deviceId: 'device456',
    deviceName: 'Smart Switch',
    relayNumber: 2,
    source: 'mqtt'
  }
);
```

### 3. Subscribe to Notification Changes
```typescript
const unsubscribe = notificationService.subscribe((unreadCount, notifications) => {
  console.log(`${unreadCount} unread notifications`);
  console.log('Latest notifications:', notifications);
});

// Later, cleanup:
unsubscribe();
```

### 4. Update a Setting
```typescript
await notificationService.updateSettings('relayChangeEvents', false);
```

---

## Real-Time Updates Flow

```
Device sends MQTT message
    ↓
mqttService receives message
    ↓
deviceDataService.handleMQTTData()
    ↓
Parses relay/status from payload
    ↓
handleDeviceStatusChange() or handleRelayStateChange()
    ↓
Checks if notification enabled in settings
    ↓
notificationService.addNotification()
    ↓
Notification saved to AsyncStorage
    ↓
All listeners notified via subscribe()
    ↓
NotificationScreen updates
    ↓
HomeScreen updates bell badge
```

---

## Multi-Relay Support

The system automatically detects and supports:
- **Single Relay:** `{ "relay": "ON" }`
- **Multi-Relay:** `{ "relay1": "ON", "relay2": "OFF", "relay3": "OFF", "relay4": "ON" }`
- **Physical Switch:** `{ "event": "physical_switch", "relay": 1, "state": "ON" }`

No breaking changes to existing single-relay devices.

---

## Testing Checklist

- [ ] Notifications persist after app restart
- [ ] Unread count badge updates in real-time
- [ ] "Mark all as read" button works
- [ ] "Clear all" with confirmation works
- [ ] Individual notification delete works
- [ ] Notification settings toggle and persist
- [ ] Device offline/online creates notifications
- [ ] Relay state changes create notifications
- [ ] Physical switch events create notifications
- [ ] Filtering by setting works (disabled notifications don't appear)
- [ ] Time ago formatting shows correctly
- [ ] Empty state shows when no notifications
- [ ] Device name appears in notifications
- [ ] Severity colors display correctly
- [ ] NotificationScreen loads notifications on focus
- [ ] HomeScreen bell badge shows count
- [ ] Badge updates live without navigation

---

## Next Steps (Future Phases)

1. **Push Notifications** - Add Firebase Cloud Messaging
2. **Notification History Export** - Download as CSV/PDF
3. **Notification Scheduling** - Do Not Disturb, Quiet Hours
4. **Smart Filtering** - By device, type, date range
5. **Notification Actions** - Tap to control device
6. **Notification Sounds** - Audio alerts per type
7. **Smart Grouping** - Combine similar notifications
8. **Notification Analytics** - Most frequent events

---

## Files Summary

| File | Type | Status | Lines | Purpose |
|------|------|--------|-------|---------|
| notificationService.ts | Service | ✅ Created | ~250 | Core notification logic |
| notificationHelpers.ts | Utils | ✅ Created | ~150 | Formatting & parsing |
| NotificationScreen.tsx | Screen | ✅ Enhanced | ~450 | UI & settings |
| deviceDataService.ts | Service | ✅ Enhanced | +80 | MQTT integration |
| HomeScreen.tsx | Screen | ✅ Enhanced | +30 | Badge display |

---

## Architecture Notes

- **Listener Pattern:** Real-time updates without Redux/Context
- **Persistent Storage:** AsyncStorage for offline reliability
- **MQTT Integration:** Automatic notification creation from device events
- **Type-Safe:** Full TypeScript support
- **Scalable:** Supports up to 100 notifications, can extend
- **Modular:** Helpers separate from service logic
- **No Breaking Changes:** Existing code unaffected

