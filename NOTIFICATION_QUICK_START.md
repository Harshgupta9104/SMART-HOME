# Notification Center - Quick Start Guide

## For Developers

### How to Create a Notification

```typescript
import { getNotificationService } from '../services/notificationService';

const notificationService = getNotificationService();

// Create a device offline notification
await notificationService.addNotification(
  'device_offline',                     // type
  '🔴 Device Offline',                  // title
  'Living Room Light went offline',     // message
  'warning',                            // severity: info|success|warning|critical
  {
    deviceId: 'device123',
    deviceName: 'Living Room Light',
    source: 'mqtt'
  }
);
```

### How to Subscribe to Changes

```typescript
import { getNotificationService } from '../services/notificationService';

const notificationService = getNotificationService();

// In your component:
useEffect(() => {
  const unsubscribe = notificationService.subscribe((unreadCount, notifications) => {
    console.log(`${unreadCount} unread notifications`);
    setUnreadCount(unreadCount);
    setNotifications(notifications);
  });

  return () => {
    unsubscribe(); // Cleanup on unmount
  };
}, []);
```

### How to Toggle a Setting

```typescript
await notificationService.updateSettings('relayChangeEvents', false);
```

---

## For Users

### Notification Types

| Icon | Type | Meaning |
|------|------|---------|
| 🔴 | Device Offline | Device lost connection |
| 🟢 | Device Online | Device reconnected |
| 🔌 | Relay ON/OFF | Relay state changed |
| 👆 | Physical Switch | Physical button pressed |
| 📡 | WiFi Changed | WiFi network changed |
| 📥 | Firmware Update | New firmware available |
| 🛡️ | Security Alert | Security event |
| ⚡ | Automation | Automation triggered |

### How to Manage Notifications

1. **Open Notifications** - Tap bell icon → "Notifications" screen
2. **Mark as Read** - Tap ✓ button on notification
3. **Delete** - Tap 🗑️ button
4. **Clear All** - Scroll to bottom → "Clear all notifications"
5. **Toggle Alerts** - Switch tab to "Settings" → Toggle any category

### Which Notifications to Disable

- **Off** if you don't care about relay changes
- **Off** if you don't want physical switch alerts
- **Off** if you don't want device offline warnings
- **Off** if you only use app-based control

---

## Behind the Scenes

### How Notifications Are Created from MQTT

When your ESP32 device sends MQTT data:

```
Device sends: { "relay": "ON" }
    ↓
DeviceDataService parses it
    ↓
Checks if relayChangeEvents setting is ON
    ↓
Creates: "🔌 Relay ON" notification
    ↓
Saves to AsyncStorage
    ↓
All subscribers notified
    ↓
UI updates in real-time
```

### Supported MQTT Payloads

Your device can send any of these and notifications will be created:

**Single Relay:**
```javascript
{ "relay": "ON" }
{ "relay": false }
{ "relay": true }
```

**Device Status:**
```javascript
{ "status": "online" }
{ "status": "offline" }
```

**Physical Switch:**
```javascript
{ "event": "physical_switch", "relay": 1, "state": "ON" }
{ "event": "physical_switch", "relay": 2, "state": "OFF" }
```

**Multi-Relay:**
```javascript
{ "relay1": "ON", "relay2": "OFF", "relay3": "ON", "relay4": "OFF" }
```

---

## Files Changed Summary

```
src/
├── services/
│   ├── notificationService.ts    ← Enhanced with listener pattern
│   ├── deviceDataService.ts      ← Added MQTT → notification logic
│   └── mqttService.ts            ← Cleaned up
├── screens/
│   ├── NotificationScreen.tsx    ← Completely redesigned
│   └── HomeScreen.tsx            ← Added bell badge
└── utils/
    └── notificationHelpers.ts    ← NEW: Helper functions
```

---

## Testing Checklist

Quick way to test each feature:

### Notifications Display ✅
- [ ] Open NotificationScreen → Activity tab
- [ ] See "No Notifications" if empty
- [ ] If notifications exist, see them sorted newest first

### Badge Count ✅
- [ ] Check HomeScreen bell icon
- [ ] Should show number (1-9) or "9+"
- [ ] Count updates when you mark as read

### Mark as Read ✅
- [ ] Tap notification checkmark button
- [ ] Notification becomes less bold
- [ ] Badge count decreases

### Clear All ✅
- [ ] Scroll to bottom of Activity tab
- [ ] Tap "Clear all notifications"
- [ ] Confirm dialog appears
- [ ] After confirming, activity list is empty

### Settings Persist ✅
- [ ] Go to Settings tab
- [ ] Turn OFF "Relay Change Events"
- [ ] Close app completely
- [ ] Reopen app
- [ ] Go back to Settings
- [ ] "Relay Change Events" should still be OFF

### MQTT Notifications ✅
- [ ] Subscribe to device via MQTT
- [ ] Send offline status: `{ "status": "offline" }`
- [ ] Should see "🔴 Device Offline" notification immediately
- [ ] Send online status: `{ "status": "online" }`
- [ ] Should see "🟢 Device Online" notification

### Real-Time Badge ✅
- [ ] Keep HomeScreen visible
- [ ] In another app, trigger device event via MQTT
- [ ] Come back to SmartHomeApp
- [ ] Bell badge should show the count
- [ ] Or if app stays open, watch badge update live

---

## Common Issues

### "Notification not appearing"
**Check:**
1. Is that notification type enabled in Settings?
2. Did the MQTT message get sent correctly?
3. Is DeviceDataService subscribed to MQTT?

### "Badge not updating"
**Check:**
1. Did you initialize NotificationService?
2. Are you subscribed to changes?
3. Did you wrap in useEffect with cleanup?

### "Settings not persisting"
**Check:**
1. Are you calling `await notificationService.updateSettings()`?
2. Is AsyncStorage available?
3. Check device storage permissions

---

## Performance Notes

- Stores max 100 notifications (auto-trims oldest)
- All operations are async (won't block UI)
- Listener pattern means updates are instant
- AsyncStorage is fast for small datasets
- No memory leaks if you unsubscribe

---

## Future Enhancements

Phase 2:
- Push notifications (Firebase)
- Notification sounds
- Vibration patterns

Phase 3:
- Scheduled quiet hours
- Smart notification grouping
- Notification history export

Phase 4:
- Voice alerts
- Tap notification to control device
- Geofence-based notifications

---

## Support

For issues:
1. Check app console logs (look for `[Notifications]` prefix)
2. Verify AsyncStorage has read/write permissions
3. Ensure MQTT topics match expected format
4. Check notification settings (might be disabled)

