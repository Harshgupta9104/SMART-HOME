# Screen Documentation - SmartHomeApp

## 📱 Screen Overview

This document provides detailed information about each screen in the SmartHomeApp.

---

## 🏠 HomeScreen

**File:** `src/screens/HomeScreen.tsx`  
**Route:** `HomeMain`  
**Purpose:** Main hub for device control and home management

### Layout

```
┌─────────────────────────────────┐
│ Good afternoon                  │
│ Smart Home          [🔔] [⚙️]   │
├─────────────────────────────────┤
│ • 0 On  • 1 Online  • 1 Off     │
├─────────────────────────────────┤
│ [All rooms] [Living room] ...   │
├─────────────────────────────────┤
│ DEVICES                 Manage  │
│ ┌──────────┐ ┌──────────┐      │
│ │ Device 1 │ │ Device 2 │      │
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ Live Activity          See all  │
│ • Device turned ON     Just now │
│ • Device turned OFF    2m ago   │
├─────────────────────────────────┤
│ [Home] [+Add] [Profile]         │
└─────────────────────────────────┘
```

### Key Features

- **Greeting System** - Dynamic greeting based on time of day
  - Morning (5am-12pm): Sun icon, yellow
  - Afternoon (12pm-5pm): Cloud icon, grey
  - Evening (5pm-10pm): Moon icon, indigo
  - Night (10pm-5am): Cloud-rain icon, blue

- **Status Chips** - Real-time device status
  - On: Devices that are online and powered ON
  - Online: All devices currently connected
  - Off: Devices that are online but powered OFF

- **Device Grid** - 2-column layout showing:
  - Device icon in soft blue container
  - Friendly device name
  - Room/location
  - ON/OFF/Offline state
  - Toggle switch

- **Live Activity** - Real-time event tracking
  - Shows last 5 device events
  - Premium empty state when no activity
  - Dynamic monitoring indicator

- **Navigation**
  - Bell icon → NotificationScreen
  - Settings icon → SettingsScreen
  - Profile button → ProfileScreen
  - Add button → SimpleBleProvision

### State Management

```typescript
const [devices, setDevices] = useState<ProvisionedDevice[]>([]);
const [deviceMetrics, setDeviceMetrics] = useState<Map<string, DeviceMetrics>>(new Map());
const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
const [selectedRoom, setSelectedRoom] = useState<string>('All rooms');
```

### Key Functions

- `loadProvisionedDevices()` - Load devices from storage and subscribe to MQTT
- `handleToggleDevice()` - Toggle device ON/OFF via MQTT
- `addActivityLog()` - Add event to activity log
- `getDeviceDisplayName()` - Get friendly device name
- `getDeviceRoom()` - Get device room/location
- `getActiveCount()` - Count devices that are ON
- `getOnlineCount()` - Count devices that are online
- `getIdleCount()` - Count devices that are OFF

---

## 🔔 NotificationScreen

**File:** `src/screens/NotificationScreen.tsx`  
**Route:** `Notifications`  
**Purpose:** Manage device alerts and notification preferences

### Layout

```
┌─────────────────────────────────┐
│ [<] Notifications               │
├─────────────────────────────────┤
│ DEVICE ALERTS                   │
│ Device Alerts              [ON] │
│ Get notified when devices...    │
│ Offline Devices            [ON] │
│ Alert when devices go offline   │
├─────────────────────────────────┤
│ SYSTEM UPDATES                  │
│ Firmware Updates           [ON] │
│ Notify about available updates  │
├─────────────────────────────────┤
│ HOME ACTIVITY                   │
│ Home Activity              [ON] │
│ Get updates on home events      │
│ Automation Triggered       [ON] │
│ Notify when automations run     │
├─────────────────────────────────┤
│ SECURITY                        │
│ Security Alerts            [ON] │
│ Critical security notifications │
└─────────────────────────────────┘
```

### Key Features

- **Notification Categories**
  - Device Alerts
  - System Updates
  - Home Activity
  - Security

- **Toggle Switches** - Enable/disable each notification type
  - Real-time state management
  - Green when enabled, grey when disabled

- **Back Navigation** - Return to HomeScreen

### State Management

```typescript
const [notifications, setNotifications] = useState({
  deviceAlerts: true,
  firmwareUpdates: true,
  homeActivity: true,
  securityAlerts: true,
  offlineDevices: true,
  automationTriggered: true,
});
```

---

## ⚙️ SettingsScreen

**File:** `src/screens/SettingsScreen.tsx`  
**Route:** `Settings`  
**Purpose:** App preferences and device settings

### Layout

```
┌─────────────────────────────────┐
│ [<] Settings                    │
├─────────────────────────────────┤
│ APP PREFERENCES                 │
│ [🌙] Theme              System  │
│ [🌍] Language           English │
│ [👁️] App Appearance     ...     │
├─────────────────────────────────┤
│ DEVICE SETTINGS                 │
│ [📡] Network Settings   ...     │
│ [🔄] Firmware Updates   ...     │
│ [📄] Device Logs        ...     │
├─────────────────────────────────┤
│ ABOUT                           │
│ [ℹ️] App Version        1.0.0   │
│ [❓] Help & Support     ...     │
│ [📋] Terms & Policies   ...     │
└─────────────────────────────────┘
```

### Key Features

- **App Preferences**
  - Theme selection (Light, Dark, System)
  - Language selection
  - App appearance settings

- **Device Settings**
  - Network configuration
  - Firmware update management
  - Device logs access

- **About Section**
  - App version display
  - Help and support
  - Terms and policies

- **Interactive Selections** - Alert dialogs for theme and language

### State Management

```typescript
const [theme, setTheme] = useState('System');
const [language, setLanguage] = useState('English');
```

---

## 👤 ProfileScreen

**File:** `src/screens/ProfileScreen.tsx`  
**Route:** `Profile`  
**Purpose:** User profile, home statistics, and account management

### Layout

```
┌─────────────────────────────────┐
│ Profile                         │
├─────────────────────────────────┤
│ [U] User                [Edit]  │
│     user@example.com            │
│     Home Owner                  │
├─────────────────────────────────┤
│ 🏠 My Home                      │
│ ┌─────────┬─────────┬─────────┐ │
│ │    1    │    1    │    0    │ │
│ │ Device  │ Online  │ Rooms   │ │
│ └─────────┴─────────┴─────────┘ │
├─────────────────────────────────┤
│ HOME SETTINGS                   │
│ [🏠] Manage Home        ...     │
│ [📊] Rooms              ...     │
│ [👥] Family Members     ...     │
│ [📱] Device Management  ...     │
├─────────────────────────────────┤
│ APP PREFERENCES                 │
│ [🔔] Notifications      ...     │
│ [🌙] Theme              ...     │
│ [🌍] Language           ...     │
│ [👁️] App Appearance     ...     │
├─────────────────────────────────┤
│ DEVICE & SYSTEM                 │
│ [📄] Device Logs        ...     │
│ [🔄] Firmware Updates   ...     │
│ [📡] Network Settings   ...     │
│ [❓] Help & Support     ...     │
├─────────────────────────────────┤
│ ACCOUNT                         │
│ [🔒] Privacy & Security ...     │
│ [📋] Terms & Policies   ...     │
│ [🚪] Logout                     │
└─────────────────────────────────┘
```

### Key Features

- **User Profile Card**
  - Avatar with initials
  - User name and email
  - Role badge (Home Owner)
  - Edit button

- **My Home Statistics**
  - Device count
  - Online device count
  - Room count

- **Menu Sections**
  - Home Settings
  - App Preferences
  - Device & System
  - Account

- **Logout** - Destructive action with confirmation

### State Management

```typescript
// Static data for demo
const user = {
  name: 'User',
  email: 'user@example.com',
  role: 'Home Owner',
};
```

---

## 🔍 DeviceDetailsScreen

**File:** `src/screens/DeviceDetailsScreen.tsx`  
**Route:** `DeviceDetails`  
**Purpose:** Detailed device information and control

### Tabs

1. **Metrics Tab** - Real-time sensor data
   - Soil moisture percentage
   - WiFi signal strength
   - Temperature
   - Humidity
   - Uptime
   - Heap memory

2. **Controller Tab** - Device control
   - LED toggle
   - Relay control
   - Real-time feedback

3. **Settings Tab** - Device configuration
   - Device information
   - WiFi reconfiguration
   - Factory reset

---

## 🔐 Provisioning Flow

### SimpleBleProvisionScreen

**File:** `src/screens/SimpleBleProvisionScreen.tsx`  
**Route:** `SimpleBleProvision`  
**Purpose:** Discover and select ESP32 devices

- BLE device scanning
- Device list display
- Device selection
- Connection initiation

### WiFiProvisioningScreen

**File:** `src/screens/WiFiProvisioningScreen.tsx`  
**Route:** `WiFiProvisioning`  
**Purpose:** Configure WiFi credentials

- WiFi network scanning
- SSID and password input
- Credential validation
- Transmission to device

### ProvisioningProgressScreen

**File:** `src/screens/ProvisioningProgressScreen.tsx`  
**Route:** `ProvisioningProgress`  
**Purpose:** Show provisioning progress

- State machine visualization
- Progress indicators
- Error handling
- Retry options

### ProvisioningSuccessScreen

**File:** `src/screens/ProvisioningSuccessScreen.tsx`  
**Route:** `ProvisioningSuccess`  
**Purpose:** Confirm successful provisioning

- Success message
- Device information
- Next steps

### DeviceNamingScreen

**File:** `src/screens/DeviceNamingScreen.tsx`  
**Route:** `DeviceNaming`  
**Purpose:** Set friendly device name

- Device name input
- Room assignment
- Naming suggestions
- Confirmation

---

## 🎬 Screen Transitions

### Navigation Stack

```
HomeMain (initial)
├─ DeviceDetails
├─ SimpleBleProvision
│  ├─ WiFiProvisioning
│  │  ├─ ProvisioningProgress
│  │  │  ├─ ProvisioningSuccess
│  │  │  └─ DeviceNaming
│  │  └─ (back to WiFi)
│  └─ (back to BLE)
├─ Notifications
├─ Settings
└─ Profile
```

### Gesture Navigation

- **Back Button** - Available on all screens except HomeMain
- **Swipe Back** - Enabled on iOS
- **Android Back** - Handled by navigation stack

---

## 📊 Screen State Summary

| Screen | State Type | Persistence | Real-time |
|--------|-----------|-------------|-----------|
| HomeScreen | Local + Global | AsyncStorage | MQTT |
| NotificationScreen | Local | Memory | No |
| SettingsScreen | Local | Memory | No |
| ProfileScreen | Static | None | No |
| DeviceDetailsScreen | Global | AsyncStorage | MQTT |
| Provisioning | Local | Memory | BLE |

---

## 🎨 Styling Consistency

All screens follow the premium design system:

- **Background:** #F4F7FB
- **Cards:** Frosted glass with soft shadows
- **Text:** Dark grey headings, light grey subtitles
- **Icons:** Blue (#3B82F6) with light blue backgrounds
- **Spacing:** 16px horizontal padding, 12-20px vertical gaps

---

**Last Updated:** May 2026  
**Version:** 1.0.0  
**Status:** Complete
