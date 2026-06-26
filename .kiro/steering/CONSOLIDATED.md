---
inclusion: always
---

# SmartHomeApp - Complete Architecture & Design Document

This consolidated document combines all architecture, tech stack, data model, and workflow documentation into a single comprehensive reference.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Data Model & Structure](#data-model--structure)
4. [App Workflows](#app-workflows)
5. [Implementation Guide](#implementation-guide)

---

## Architecture Overview

### System Architecture Layers

```
┌─────────────────────────────────────────┐
│         UI Layer (React Native)         │
│  Screens, Components, Navigation        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│    Context & Global State (React)       │
│  ThemeContext, BleContext, AuthContext  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Service Layer (Singletons)         │
│ MQTT, BLE, Storage, Permissions, Auth   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│    External Services & APIs             │
│ Firebase, HiveMQ, ESP32, Local Storage  │
└─────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **Screens** | UI user interactions | `src/screens/` |
| **Services** | Business logic (singletons) | `src/services/` |
| **Context** | Global state management | `src/context/` |
| **Hooks** | Custom React hooks | `src/hooks/` |
| **Components** | Reusable UI elements | `src/components/` |
| **Navigation** | Screen routing | `src/navigation/` |
| **Constants** | App-wide constants | `src/constants/` |
| **Config** | Configuration files | `src/config/` |
| **Theme** | Design system & colors | `src/theme/` |
| **Utils** | Helper functions | `src/utils/` |

### Core Architectural Patterns

#### 1. Singleton Service Pattern
All services are single global instances:
```typescript
const mqttService = getMQTTService();
const bleService = getBleService();
const storageService = getStorageService();
const deviceDataService = getDeviceDataService();
```

#### 2. Listener/Observer Pattern
Services notify UI of changes via subscriptions:
```typescript
// Subscribe to device metrics
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  setMetrics(metrics);  // UI updates when metrics change
});

// Cleanup on unmount
return () => unsubscribe();
```

#### 3. No Optimistic Updates (Critical Rule)
UI always reflects true device state from MQTT:
- User sends command → App waits for ESP32 response → UI updates
- Show "Sending..." state during transmission
- Show error if timeout (5-10 seconds)
- Prevents inconsistency between app and physical device

#### 4. Firebase First
All persistent data in Firebase Firestore:
- Users, Homes, Rooms, Devices, Channels, Scenes
- Real-time subscriptions via Firestore listeners
- Security rules for multi-user access
- Offline caching in AsyncStorage

#### 5. Real-Time MQTT Communication
Device state via HiveMQ Cloud MQTT broker:
- Subscribe to device status topics for live updates
- Receive relay state changes instantly
- Send commands via MQTT publish
- Last-will topic for offline detection

---

## Technology Stack

### Mobile Application (React Native v0.84.0)

#### Core Framework
- **React Native** (0.84.0) - Cross-platform mobile development
- **React** (19.2.3) - UI library
- **TypeScript** (5.8.3) - Type-safe JavaScript

#### Navigation & UI
- **@react-navigation/native** (7.2.4) - Navigation framework
- **@react-navigation/native-stack** (7.15.0) - Stack navigator
- **@react-navigation/bottom-tabs** (7.16.0) - Tab navigation
- **react-native-safe-area-context** (5.5.2) - Safe area handling
- **react-native-screens** (4.25.0) - Native screen handling
- **react-native-vector-icons** (10.3.0) - Icon library

#### Styling & UI Components
- **tailwindcss** (3.4.19) - Utility-first CSS framework
- **nativewind** (4.2.5) - Tailwind CSS for React Native
- **react-native-reanimated** (4.0.0) - Animations & transitions
- **react-native-gesture-handler** (2.16.1) - Native gesture support
- **react-native-tab-view** (4.3.0) - Tab view component
- **react-native-pager-view** (8.0.1) - Pager component

#### Communication & Connectivity
- **mqtt** (5.15.1) - MQTT client for real-time device communication
- **react-native-ble-plx** (3.5.1) - BLE device discovery & provisioning
- **react-native-wifi-reborn** (4.13.6) - WiFi network scanning
- **react-native-geolocation-service** (5.3.1) - Location services

#### Storage & Security
- **@react-native-async-storage/async-storage** (1.23.1) - Local cache
- **react-native-keychain** (10.0.0) - Secure credential storage
- **react-native-config** (1.6.1) - Environment configuration
- **react-native-permissions** (5.5.1) - Permission management

#### Development & Testing
- **jest** (29.6.3) - Testing framework
- **eslint** (8.19.0) - Code linting
- **prettier** (2.8.8) - Code formatting

### Cloud Services

#### Firebase Services
- **Firebase Authentication** - Email, phone OTP, Google sign-in
- **Firebase Firestore** - Cloud database for users, homes, devices, rooms, scenes
- **Firebase Storage** - Profile images, device images, firmware files
- **Firebase Cloud Messaging (FCM)** - Push notifications
- **Firebase Crashlytics** - Crash and error reporting

#### External Services
- **HiveMQ Cloud** - MQTT broker for real-time device communication
  - URL: `wss://[broker-url]:8884/mqtt`
  - Protocol: WebSocket over TLS
  - Authentication: Username/password
- **Sentry** - Production error monitoring and alerting

#### Device Firmware
- **ESP32 Arduino / ESP-IDF** - Smart switch firmware

### Future Technologies (Phase 2+)
- **NestJS** - Backend API for authentication, subscriptions, automation engine
- **PostgreSQL** - Backend database
- **Docker** - Containerization for backend services

### Node & Build Requirements
- **Node.js** >= 22.11.0 (required)
- **npm** or **yarn** for package management
- **React Native CLI** for project management
- **Android SDK** for Android builds
- **Xcode** for iOS builds (macOS only)

### Build Commands

```bash
# Installation
npm install

# Development
npm start                    # Start Metro bundler
npm run android            # Build and run Android
npm run ios               # Build and run iOS (macOS only)

# Code Quality
npm run lint              # Run ESLint
npm run test              # Run Jest tests
npm run format            # Format with Prettier (npx prettier --write .)

# Production
npm run build:android     # Production Android build
npm run build:ios         # Production iOS build
```

### Environment Configuration

Required `.env` variables:

```env
# Firebase
REACT_APP_FIREBASE_API_KEY=your-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project
REACT_APP_FIREBASE_STORAGE_BUCKET=your-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# MQTT (HiveMQ Cloud)
MQTT_URL=wss://broker-url:8884/mqtt
MQTT_USERNAME=username
MQTT_PASSWORD=password
MQTT_CLIENT_ID_PREFIX=smartapp

# Monitoring
SENTRY_DSN=https://your-sentry-dsn

# App Config
API_BASE_URL=https://api.example.com
ENVIRONMENT=development
```

---

## Data Model & Structure

### Data Hierarchy

```
User
  └── Home (primary + secondary homes)
      └── Rooms (organize devices by location)
          └── Devices (physical IoT devices)
              └── Channels / Relays (control outputs)
                  └── State (ON/OFF, power consumption)
```

### Firebase Firestore Collections

#### Users Collection
**Path:** `users/{userId}`

```typescript
interface User {
  // Basic Info
  email: string;                      // Unique email
  phone?: string;                     // Phone number
  displayName: string;                // User's display name
  profileImage?: string;              // Firebase Storage URL
  
  // Account Status
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  
  // Preferences
  preferredTheme: 'light' | 'dark' | 'system';
  language: string;                   // 'en', 'es', 'fr', etc.
  
  // MQTT Settings
  mqttClientId: string;               // Unique MQTT client ID
  
  // Notification Settings
  pushNotificationsEnabled: boolean;
  fcmToken?: string;                  // Firebase Cloud Messaging token
}
```

#### Homes Collection
**Path:** `homes/{homeId}`

```typescript
interface Home {
  // Basic Info
  name: string;                       // e.g., "My House"
  address?: string;
  icon?: string;                      // Home icon/emoji
  
  // Ownership & Access
  owner: string;                      // Owner userId
  members: string[];                  // Array of member userIds
  roles: {
    [userId: string]: 'owner' | 'admin' | 'user'
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Settings
  timeZone: string;                   // 'UTC', 'EST', 'PST'
  temperatureUnit: 'C' | 'F';
  
  // Statistics (cached for UI)
  totalDevices: number;
  onlineDevices: number;
  lastActivity: Timestamp;
}
```

#### Rooms Subcollection
**Path:** `homes/{homeId}/rooms/{roomId}`

```typescript
interface Room {
  name: string;                       // "Living Room", "Bedroom"
  icon: string;                       // Icon/emoji
  color?: string;                     // Color code
  order: number;                      // Sort order
  homeId: string;                     // Reference to parent home
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Statistics
  deviceCount: number;
  onlineCount: number;
}
```

#### Devices Subcollection
**Path:** `homes/{homeId}/devices/{deviceId}`

```typescript
interface ProvisionedDevice {
  // Basic Info
  name: string;                       // User-friendly name
  type: string;                       // 'relay_board', 'smart_plug'
  model?: string;
  manufacturer?: string;
  
  // Identification
  id: string;                         // Unique device ID (primary key)
  bleId: string;                      // BLE MAC address
  mqttDeviceId: string;               // MQTT topic identifier
  serialNumber?: string;
  
  // Location
  roomId: string;
  homeId: string;
  
  // Firmware & Hardware
  firmwareVersion: string;            // e.g., "1.2.3"
  hwVersion?: string;
  relayCount: number;                 // Number of relays (2, 4, etc.)
  
  // Connection Status
  isOnline: boolean;
  lastSeen: Timestamp;
  signalStrength?: number;            // WiFi RSSI (dBm)
  
  // Channels
  channels: Channel[];                // Array of relay configs
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  pairedAt: Timestamp;                // When first provisioned
  
  // Statistics
  totalOperations: number;            // Lifetime toggles
  lastOperation: Timestamp;
  
  // Configuration
  mqttUsername?: string;              // Device-specific MQTT user
  wifiSSID: string;                   // Connected WiFi network
  uptimeSeconds?: number;
}

interface Channel {
  id: number;                         // 1-4 typically
  name: string;                       // "Light", "Fan"
  relayPin: number;                   // GPIO pin
  state: 'ON' | 'OFF';
  lastUpdate: number;                 // Timestamp
  currentPower?: number;              // Watts (if available)
}
```

#### Scenes Collection (Future)
**Path:** `scenes/{sceneId}`

```typescript
interface Scene {
  name: string;                       // e.g., "Movie Time"
  icon: string;
  description?: string;
  homeId: string;
  
  actions: SceneAction[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

interface SceneAction {
  deviceId: string;
  channelId: number;
  targetState: 'ON' | 'OFF';
  delay?: number;                     // ms
}
```

### MQTT Communication Structure

#### Device Status Message
**Topic:** `esp32/{deviceId}/status`
```json
{
  "deviceId": "esp32-abc123",
  "online": true,
  "timestamp": 1704067200,
  "firmwareVersion": "1.2.3",
  "signalStrength": -45
}
```

#### Channels State Message
**Topic:** `esp32/{deviceId}/channels`
```json
{
  "deviceId": "esp32-abc123",
  "timestamp": 1704067200,
  "channels": [
    { "id": 1, "name": "Light", "state": "ON", "power": 12.5 },
    { "id": 2, "name": "Fan", "state": "OFF", "power": 0 }
  ]
}
```

#### Relay Control Command
**Topic:** `esp32/{deviceId}/relay/{n}/set`
```json
{
  "state": "ON",
  "requestId": "req-uuid-12345"
}
```

#### Relay State Feedback
**Topic:** `esp32/{deviceId}/relay/{n}/state`
```json
{
  "state": "ON",
  "requestId": "req-uuid-12345",
  "timestamp": 1704067200,
  "power": 12.5
}
```

### Local Storage & Caching

#### AsyncStorage (Non-Sensitive Data)
```
@user_id                            # Current user ID
@current_home_id                    # Active home
@homes_cache                        # [Home]
@home_{homeId}_devices              # [ProvisionedDevice]
@home_{homeId}_rooms                # [Room]
@theme_mode                         # 'light' | 'dark' | 'system'
@app_language                       # 'en', 'es', etc.
@last_sync                          # Timestamp
```

#### React Native Keychain (Encrypted)
```
firebase_auth_token                 # Firebase session token
firebase_refresh_token              # Refresh token
mqtt_password                       # MQTT broker password
mqtt_pwd_{deviceId}                 # Device-specific MQTT password
```

#### In-Memory Caches (DeviceDataService)
```typescript
// Device metrics cache
interface DeviceMetricsCache {
  [deviceId: string]: {
    soilMoisture?: number;
    wifiRSSI?: number;
    temperature?: number;
    humidity?: number;
    lastUpdate: number;
  }
}

// MQTT listener registry
interface MQTTListenerRegistry {
  [deviceId: string]: Set<(metrics: DeviceMetrics) => void>
}
```

### Data Consistency Rules

1. **Never Optimistic Updates** - Wait for MQTT response before updating UI
2. **Device State Authoritative** - ESP32 is source of truth
3. **Firestore Transactional** - Use transactions for multi-document updates
4. **Atomic Operations** - All-or-nothing for critical operations
5. **Last-Write-Wins** - Latest timestamp wins for conflicts
6. **User Action Priority** - Recent user command overrides cached data

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, create, update: if request.auth != null
        && request.auth.uid == userId;
      allow delete: if false;
    }
    
    // Homes and subcollections
    match /homes/{homeId} {
      function isSignedIn() {
        return request.auth != null;
      }

      function memberDocPath() {
        return /databases/$(database)/documents/homes/$(homeId)/members/$(request.auth.uid);
      }

      function isHomeMember() {
        return isSignedIn()
          && exists(memberDocPath())
          && get(memberDocPath()).data.status == 'active';
      }

      function isHomeOwnerOrAdmin() {
        return isHomeMember()
          && get(memberDocPath()).data.role in ['owner', 'admin'];
      }

      allow read: if isHomeMember();

      allow create: if isSignedIn()
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.status == 'active';

      allow update: if isHomeOwnerOrAdmin();
      allow delete: if false;

      // Members subcollection
      match /members/{memberId} {
        allow read: if isHomeMember();

        allow create: if isSignedIn()
          && memberId == request.auth.uid
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.role == 'owner'
          && request.resource.data.status == 'active';

        allow update: if isHomeOwnerOrAdmin();
        allow delete: if false;
      }

      // Rooms subcollection
      match /rooms/{roomId} {
        allow read: if isHomeMember();

        allow create: if isHomeOwnerOrAdmin()
          && request.resource.data.homeId == homeId
          && request.resource.data.status == 'active';

        allow update: if isHomeOwnerOrAdmin()
          && request.resource.data.homeId == homeId;

        allow delete: if false;
      }

      // Devices subcollection (reserved for Phase 2D)
      match /devices/{deviceId} {
        allow read: if isHomeMember();

        allow create: if isHomeOwnerOrAdmin()
          && request.resource.data.homeId == homeId
          && request.resource.data.status == 'active';

        allow update: if isHomeOwnerOrAdmin()
          && request.resource.data.homeId == homeId;

        allow delete: if false;
      }
    }
  }
}
```

### Firestore Rules Correction (Phase 2C-RULES-FIX)

The Firestore security rules were corrected to match the actual database model:

**Wrong model (previously documented):**
- `homes/{homeId}.members` array field on home document
- Check: `request.auth.uid in resource.data.members`

**Actual model (implemented in Phase 2B):**
- `homes/{homeId}/members/{uid}` subcollection with individual member documents
- Each member document has: `uid`, `role` ('owner', 'admin', 'user'), `status` ('active', 'inactive')
- Check: `exists(/databases/$(database)/documents/homes/$(homeId)/members/$(request.auth.uid))`

**Key points:**
- Do NOT add a members array field to `homes/{homeId}` documents
- The subcollection `homes/{homeId}/members/{uid}` is the authoritative source of membership
- Rules use helper functions (`isHomeMember()`, `isHomeOwnerOrAdmin()`) for clarity and security
- Membership is checked by member document existence and active status
- Owner/admin privileges are checked via the `role` field in the member document

---

## App Workflows

### 1. First App Open - Authentication Flow

```
App Launches
  ↓
Check Firebase Auth Session
  ├─ Session Valid → Load Home Dashboard
  └─ No Session → Show Login Screen
      ├─ Email Login
      ├─ Phone OTP
      ├─ Google Sign-In
      └─ Sign Up
```

**Flow Details:**
- Check `firebase.auth().currentUser` on startup
- If user exists and token valid → navigate to HomeScreen
- If no user → navigate to LoginScreen
- Store auth token in React Native Keychain

### 2. User Authentication - Login / Signup / OTP

```
User Enters Credentials
  ↓
Firebase Authentication Verifies
  ├─ Success: Create User in Firestore
  │   ├─ Store user profile
  │   ├─ Create default home
  │   └─ Navigate to Home Dashboard
  └─ Failure: Show Error, Retry
```

**Phone OTP Flow:**
1. User enters phone number
2. Firebase sends SMS with OTP
3. User enters OTP code
4. Firebase verifies and logs in
5. Navigate to dashboard

### 3. Home & Room Management

```
User Logged In
  ↓
Load User's Homes from Firestore
  ├─ Multiple Homes? → Show Selection
  ├─ One Home? → Load Directly
  └─ No Homes? → Create Home Dialog
      ├─ Enter Home Name
      ├─ Enter Address (Optional)
      └─ Create in Firestore
      
User Opens Home Dashboard
  ↓
Load Rooms from Firestore
  ├─ Rooms Exist? → Display Room Tabs
  └─ No Rooms? → Tap "Manage Rooms"
      ├─ Add Room
      ├─ Enter Name
      └─ Save to Firestore
```

### 4. Add New Device - BLE Provisioning (MOST CRITICAL)

```
User Taps "Add Device"
  ↓
Choose Provisioning Method
  └─ BLE Scan (recommended)
  
Request Bluetooth Permissions
  ├─ Granted? → Proceed
  └─ Denied? → Show Settings Prompt
  
Start BLE Scan
  ├─ Display "Scanning..."
  ├─ Show "PROV_*" devices
  └─ User Selects Device
  
Connect to ESP32 over BLE
  ├─ Read Device ID
  └─ Success? → Proceed
  
Request WiFi Setup
  ├─ Scan Available Networks
  ├─ User Selects Network
  ├─ User Enters Password
  └─ Validate Credentials
  
Send Provisioning Data (BLE)
  ├─ WiFi SSID
  ├─ WiFi Password
  ├─ MQTT Broker URL
  ├─ MQTT Credentials
  ├─ Home ID
  └─ Room ID
  
Show Provisioning Progress
  ├─ "Connecting to WiFi..."
  ├─ "Connecting to MQTT..."
  └─ Timeout: 60 seconds
  
ESP32 Connects
  ├─ Connects to WiFi
  ├─ Connects to MQTT Broker
  └─ Publishes Online Status
  
Provisioning Success
  ├─ Show Success Screen
  ├─ User Names Device
  └─ User Names Relay Channels
  
Save Device
  ├─ Create Device Document in Firestore
  ├─ Set channels array
  ├─ Set isOnline=true
  └─ Update Local Cache
  
Return to Dashboard
  ├─ New Device Appears
  ├─ Device Online Status Shows
  ├─ Subscribe to MQTT Topics
  └─ Real-Time Updates Begin
```

**Critical Points:**
- BLE provisioning is ONE-TIME only
- After provisioning, all communication via MQTT
- Device stores WiFi credentials in flash memory
- Device auto-connects on power up
- No need to repeat BLE unless factory reset

### 5. Real-Time Device Control

```
User Opens Home Dashboard
  ↓
App Loads Devices from Firestore
  ├─ Device Name, Status, Relays
  ├─ Online/Offline Badge
  └─ Group by Room
  
Subscribe to MQTT Topics
  ├─ For Each Device:
  │  ├─ esp32/{deviceId}/status
  │  ├─ esp32/{deviceId}/channels
  │  └─ esp32/{deviceId}/metrics
  └─ Listener Updates Cache
  
User Taps Relay Toggle
  ├─ Prepare Command
  ├─ Send MQTT Publish:
  │  ├─ Topic: esp32/{deviceId}/relay/1/set
  │  └─ Payload: {"state":"ON","requestId":"req-123"}
  └─ Show "Sending..." State
  
⚠️ DO NOT Update UI Yet (No Optimistic Update)
  
ESP32 Receives Command
  ├─ Toggle Relay GPIO
  └─ Publish State Change
  
App Receives State Change
  ├─ MQTT: esp32/{deviceId}/relay/1/state
  ├─ Update In-Memory Cache
  ├─ Update Firestore (non-blocking)
  └─ UI Re-renders
  
User Sees Updated State
  ├─ Light: ON (with timestamp)
  ├─ Immediate Visual Feedback
  └─ If offline → "Last seen: X min ago"
```

**Critical Rule: NO OPTIMISTIC UPDATES**
- Don't update UI until device confirms
- Wait for MQTT response (5-10 second timeout)
- Show error if device doesn't respond
- Prevents UI/device state mismatch

### 6. Device Offline / Online Detection

```
ESP32 Loses WiFi
  ↓
MQTT Broker Detects Disconnect
  ├─ Publish Last-Will Topic
  ├─ App Receives: "Device Offline"
  └─ Update Firestore: isOnline=false
  
App Updates UI
  ├─ Show Offline Badge
  ├─ Display Last Seen Time
  ├─ Disable/Gray Out Relay Controls
  └─ "Last Seen: 5 minutes ago"
  
Send FCM Notification
  └─ "Living Room Light went offline"
  
ESP32 Reconnects
  ├─ Reconnects to WiFi
  ├─ Reconnects to MQTT
  ├─ Publishes Online Status
  └─ App Receives Update
  
App Updates
  ├─ Firestore: isOnline=true
  ├─ Show Online Badge
  ├─ Enable Relay Controls
  └─ Send FCM: "Device Back Online"
```

### 7. Device Management - Rename / Move / Remove

```
User Long-Presses Device
  ├─ Context Menu:
  │  ├─ Rename Device
  │  ├─ Edit Channels
  │  ├─ Move to Room
  │  ├─ Device Settings
  │  ├─ Factory Reset
  │  └─ Remove Device
  └─ Or: Device → Details → Settings

Rename Device
  ├─ Show Text Input
  ├─ User Enters Name
  ├─ Save to Firestore
  └─ UI Updates Immediately

Edit Channels
  ├─ Show List of Relays
  ├─ User Renames Each
  ├─ Save Changes
  └─ Update Device Document

Move to Different Room
  ├─ Show Room Selection
  ├─ User Selects New Room
  ├─ Update Device: roomId=newRoomId
  └─ Firestore Updated

Factory Reset
  ├─ Show Confirmation Dialog
  ├─ Send MQTT: factory_reset
  ├─ Device Reboots to "PROV_*" Mode
  └─ Ready for Re-provisioning

Remove Device
  ├─ Show Confirmation
  ├─ If Online: Send MQTT Reset
  ├─ Remove from Firestore
  ├─ Unsubscribe from MQTT
  └─ Device Removed from Dashboard
```

### 8. Device Details Screen

```
User Taps Device Card
  ↓
Device Details Screen Opens
  ├─ Device Name & Status
  ├─ Online/Offline Badge
  ├─ Signal Strength
  ├─ Last Seen Time
  └─ Three Tabs:

Tab 1: METRICS
  ├─ Temperature (°C)
  ├─ Humidity (%)
  ├─ WiFi Signal (dBm)
  ├─ Device Uptime
  ├─ Free Heap Memory
  ├─ Power Consumption (if available)
  └─ Auto-Update via MQTT

Tab 2: CONTROL
  ├─ For Each Relay Channel:
  │  ├─ Channel Name
  │  ├─ Toggle Switch (ON/OFF)
  │  ├─ Current State
  │  ├─ Power Consumption
  │  └─ On/Off History (Future)
  └─ User Taps → Send MQTT Command

Tab 3: SETTINGS
  ├─ Device Information
  │  ├─ Device ID
  │  ├─ BLE ID (MAC)
  │  ├─ MQTT Device ID
  │  ├─ Firmware Version
  │  └─ Hardware Version
  │
  ├─ WiFi Information
  │  ├─ Connected SSID
  │  ├─ Signal Strength
  │  └─ Change WiFi (Re-provision)
  │
  ├─ Edit Options
  │  ├─ Rename Device
  │  ├─ Rename Channels
  │  ├─ Move to Room
  │  └─ Save
  │
  └─ Dangerous Zone
     ├─ Factory Reset
     └─ Remove Device
```

### 9. Notifications Screen

```
User Taps Bell Icon
  ↓
Notifications Screen
  ├─ List of Recent Alerts:
  │  ├─ Device Online/Offline
  │  ├─ Relay State Changes
  │  ├─ Automation Triggers
  │  ├─ System Alerts
  │  └─ Firmware Updates
  │
  ├─ Each Notification Shows:
  │  ├─ Icon
  │  ├─ Title & Description
  │  ├─ Timestamp ("5 min ago")
  │  └─ Tap for Details
  │
  └─ Notification Preferences
     ├─ Device Offline Alerts
     ├─ Relay State Changes
     ├─ Automation Alerts
     └─ System Updates

User Taps Notification
  ├─ Navigate to Device Details
  ├─ Or Show Full Event Info
  └─ Mark as Read
```

### 10. Profile Screen

```
User Taps Profile Tab
  ↓
User Profile
  ├─ Profile Picture (Tap to Upload)
  ├─ User Name & Email
  ├─ Phone Number
  ├─ Account Status
  └─ Join Date

My Homes
  ├─ List of User's Homes
  │  ├─ Home Name
  │  ├─ Role (Owner/Admin/User)
  │  ├─ Device Count
  │  ├─ Online Count
  │  └─ Tap to Switch
  │
  └─ Add New Home

Home Statistics
  ├─ Total Devices
  ├─ Total Relays
  ├─ Total Operations
  ├─ Most Used Device
  └─ Last 7 Days Activity

Settings & Preferences
  ├─ Account Settings
  ├─ Notification Settings
  ├─ Theme Selection
  ├─ Language
  └─ Privacy

Account Actions
  ├─ Change Password
  ├─ Change Email
  ├─ Delete Account
  ├─ Logout
  └─ Switch Account
```

### 11. Settings Screen

```
User Taps Settings Icon
  ↓
Display Settings

App Preferences
  ├─ Theme (Light / Dark / System)
  ├─ Language (EN, ES, FR, etc.)
  ├─ Temperature Unit (°C / °F)
  └─ Time Format (12h / 24h)

Notifications
  ├─ Push Notifications (On/Off)
  ├─ Device Offline Alerts
  ├─ Relay State Changes
  ├─ Sound & Vibration
  └─ Quiet Hours (Future)

Home Settings
  ├─ Current Home Selection
  ├─ Edit Home Name
  ├─ Edit Address
  ├─ Add/Remove Members
  ├─ Member Permissions
  └─ Delete Home

Device Settings
  ├─ Default Device Naming
  ├─ Auto-Sync Interval
  ├─ MQTT Status
  └─ WiFi & BLE Preferences

Security & Privacy
  ├─ Biometric Authentication (Future)
  ├─ Session Timeout
  ├─ Clear Local Cache
  └─ Privacy Policy

About & Help
  ├─ App Version
  ├─ Build Number
  ├─ Help & FAQ
  ├─ Report Bug
  ├─ Terms & Conditions
  └─ About SmartHomeApp
```

---

## Screen Hierarchy Summary

### Phase 1 - Authentication Screens
- LoginScreen
- SignupScreen
- PhoneOTPScreen
- ForgotPasswordScreen

### Phase 1 - Main App Screens
- HomeScreen (dashboard with device grid, rooms)
- AddDeviceScreen (provisioning method selection)
- SimpleBleProvisionScreen (BLE device discovery)
- WiFiProvisioningScreen (WiFi credential entry)
- ProvisioningProgressScreen (progress indicator)
- ProvisioningSuccessScreen (success confirmation)
- DeviceNamingScreen (name device and channels)
- DeviceDetailsScreen (metrics, control, settings tabs)
- DeviceConfigScreen (reconfiguration options)
- NotificationScreen (alerts and events)
- ProfileScreen (user profile, home stats)
- SettingsScreen (app preferences)
- RoomManagementScreen (create/edit rooms)

### Phase 2+ - Future Screens
- ScenesScreen (create and manage scenes)
- AutomationScreen (time-based automations)
- FamilyMembersScreen (add/manage family)
- FirmwareUpdateScreen (OTA updates)
- EnergyMonitoringScreen (usage analytics)

---

## Implementation Guide

### Code Organization

```
src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   └── PhoneOTPScreen.tsx
│   ├── home/
│   │   ├── HomeScreen.tsx
│   │   └── RoomManagementScreen.tsx
│   ├── provisioning/
│   │   ├── AddDeviceScreen.tsx
│   │   ├── SimpleBleProvisionScreen.tsx
│   │   ├── WiFiProvisioningScreen.tsx
│   │   ├── ProvisioningProgressScreen.tsx
│   │   ├── ProvisioningSuccessScreen.tsx
│   │   └── DeviceNamingScreen.tsx
│   ├── device/
│   │   ├── DeviceDetailsScreen.tsx
│   │   └── DeviceConfigScreen.tsx
│   ├── notifications/
│   │   └── NotificationScreen.tsx
│   ├── profile/
│   │   └── ProfileScreen.tsx
│   └── settings/
│       └── SettingsScreen.tsx
│
├── services/
│   ├── mqttService.ts
│   ├── bleService.ts
│   ├── deviceDataService.ts
│   ├── storageService.ts
│   ├── keychainService.ts
│   ├── permissionService.ts
│   ├── notificationService.ts
│   └── authService.ts
│
├── context/
│   ├── ThemeContext.tsx
│   ├── BleContext.tsx
│   ├── AuthContext.tsx
│   └── HomeContext.tsx
│
├── hooks/
│   ├── useTheme.ts
│   ├── useBleProvisioning.ts
│   ├── useMqttMetrics.ts
│   └── useAuth.ts
│
├── components/
│   ├── DeviceCard.tsx
│   ├── MetricsDisplay.tsx
│   ├── RelayToggle.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── SafeAreaView.tsx
│
├── navigation/
│   ├── RootNavigator.tsx
│   └── types.ts
│
├── constants/
│   ├── colors.ts
│   ├── strings.ts
│   ├── bleUUIDs.ts
│   └── mqttTopics.ts
│
├── config/
│   ├── mqttConfig.ts
│   └── firebaseConfig.ts
│
├── theme/
│   ├── lightTheme.ts
│   ├── darkTheme.ts
│   ├── typography.ts
│   └── spacing.ts
│
└── utils/
    ├── formatters.ts
    ├── validators.ts
    ├── logger.ts
    ├── errorHandling.ts
    └── asyncHelpers.ts
```

### Development Workflow

1. **Setup**
   ```bash
   npm install
   cp .env.example .env
   # Configure Firebase and MQTT in .env
   npm start
   npm run android
   ```

2. **Development**
   - Code in TypeScript with strict mode
   - Use StyleSheet.create() for styles
   - Apply theme via useTheme() hook
   - Clean up subscriptions in useEffect

3. **Testing**
   - Unit tests for services
   - Component tests for screens
   - Integration tests for Firebase
   - E2E tests for critical flows

4. **Code Quality**
   - Run `npm run lint` before commit
   - Run `npm run test` for test suite
   - Use `npx prettier --write .` for formatting

### Performance Optimization

**Caching Strategy:**
- AsyncStorage for home/device list
- In-memory cache for MQTT metrics
- Lazy loading of device details
- Pagination for large lists

**Network Optimization:**
- Batch MQTT subscriptions
- Automatic reconnection
- Message debouncing
- Connection pooling

**UI Optimization:**
- React.memo for components
- useCallback for functions
- Efficient list rendering with keys
- Lazy navigation with params

### Security Best Practices

1. **Authentication**
   - Store tokens in React Native Keychain
   - Implement token refresh logic
   - Support phone OTP and email login

2. **Data Storage**
   - Firestore for cloud data
   - AsyncStorage for non-sensitive cache
   - Keychain for secrets

3. **Network**
   - HTTPS for all requests
   - TLS for MQTT (wss://)
   - Never log sensitive data
   - Input validation on all fields

4. **Permissions**
   - Request during onboarding
   - Bluetooth, Location, Camera
   - Handle denials gracefully

