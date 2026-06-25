# SmartHomeApp - Tech Stack & Build System

## Tech Stack

### Core Framework
- **React Native** (v0.84.0) - Cross-platform mobile development
- **React** (v19.2.3) - UI library
- **TypeScript** (v5.8.3) - Type-safe JavaScript

### Navigation
- **@react-navigation/native** (v7.2.4) - Navigation framework
- **@react-navigation/native-stack** (v7.15.0) - Stack navigator
- **@react-navigation/bottom-tabs** (v7.16.0) - Tab navigation
- **@react-navigation/material-top-tabs** (v7.4.27) - Material-style tabs

### Communication & Connectivity
- **mqtt** (v5.15.1) - MQTT client for real-time metrics
- **react-native-ble-plx** (v3.5.1) - BLE device discovery and provisioning
- **react-native-wifi-reborn** (v4.13.6) - WiFi network scanning
- **react-native-geolocation-service** (v5.3.1) - Location services

### Storage & Security
- **@react-native-async-storage/async-storage** (v1.23.1) - Persistent storage
- **react-native-keychain** (v10.0.0) - Secure credential storage

### Styling & UI
- **tailwindcss** (v3.4.19) - Utility-first CSS framework
- **nativewind** (v4.2.5) - Tailwind CSS for React Native
- **react-native-safe-area-context** (v5.5.2) - Safe area handling
- **react-native-screens** (v4.25.0) - Native screen handling
- **react-native-tab-view** (v4.3.0) - Tab view component
- **react-native-pager-view** (v8.0.1) - Pager component
- **react-native-vector-icons** (v10.3.0) - Icon library

### Animation & Gesture
- **react-native-reanimated** (v4.0.0) - Powerful animation library
- **react-native-gesture-handler** (v2.16.1) - Native gesture handling
- **react-native-draggable-flatlist** (v4.0.1) - Draggable list component
- **react-native-worklets** (v0.2.0) - Worklets support

### Permissions & Config
- **react-native-permissions** (v5.5.1) - Permission management
- **react-native-config** (v1.6.1) - Environment configuration

### Testing
- **jest** (v29.6.3) - Testing framework
- **@react-native/jest-preset** (v0.85.3) - Jest preset for React Native
- **react-test-renderer** (v19.2.3) - React testing utility

### Code Quality
- **eslint** (v8.19.0) - Linting
- **@react-native/eslint-config** (v0.85.3) - React Native ESLint config
- **prettier** (v2.8.8) - Code formatting

### Development
- **@react-native-community/cli** (v20.1.0) - React Native CLI
- **Babel** (v7.25.2) - JavaScript compiler
- **@react-native/metro-config** (v0.85.3) - Metro bundler config

## Node Version
- **Required:** Node.js >= 22.11.0

## External Services

### MQTT Broker
- **Provider:** HiveMQ Cloud
- **URL:** `wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt`
- **Authentication:** Username/Password (stored in .env)
- **Protocol:** WebSocket over TLS

### BLE Provisioning
- **Service UUIDs:**
  - Provisioning Service: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
  - Device ID Service: `12345678-1234-1234-1234-1234567890ab`

## Build & Development Commands

### Installation
```bash
# Install dependencies
npm install
```

### Development

```bash
# Start Metro bundler (required for both platforms)
npm start

# Run on Android (in another terminal)
npm run android

# Run on iOS (macOS only)
npm run ios
```

### Code Quality

```bash
# Lint code
npm run lint

# Run tests
npm run test

# Format code (using Prettier)
npx prettier --write .
```

### Environment Setup

1. **Create .env file** from .env.example:
   ```bash
   cp .env.example .env
   ```

2. **Configure MQTT credentials** in .env:
   ```
   MQTT_URL=wss://your-broker-url:port/mqtt
   MQTT_USERNAME=your-username
   MQTT_PASSWORD=your-password
   MQTT_CLIENT_ID_PREFIX=smartapp
   ```

3. **Android SDK** required for Android builds
4. **Xcode** required for iOS builds

## Project Structure

```
src/
├── screens/              # UI Screens (HomeScreen, DeviceDetails, etc.)
├── services/             # Business Logic (Singleton services)
├── context/              # Global State (ThemeContext, BleContext)
├── hooks/                # Custom React Hooks
├── components/           # Reusable UI Components
├── navigation/           # Navigation Stack & Configuration
├── constants/            # App Constants (colors, theme)
├── config/               # Configuration (MQTT, etc.)
├── theme/                # Theme definitions
└── utils/                # Utility functions
```

## Service Layer Architecture

### Singleton Services
All services are singletons for global state management:

```typescript
// Example usage
const mqttService = getMQTTService();
const deviceDataService = getDeviceDataService();
const storageService = getStorageService();
```

### Key Services
| Service | Purpose |
|---------|---------|
| **MqttService** | WebSocket connection to HiveMQ, pub/sub for device topics |
| **DeviceDataService** | Real-time metrics caching, listener pattern for UI updates |
| **BleService** | Device discovery, connection, credential transmission |
| **WiFiService** | Network scanning, current network detection |
| **StorageService** | AsyncStorage for device persistence |
| **KeychainService** | Secure password storage |
| **PermissionService** | Android permission management |

## Listener Pattern

Services notify UI components of changes:

```typescript
// Subscribe to device metrics
const unsubscribe = deviceDataService.subscribe(deviceId, (metrics) => {
  setMetrics(metrics);
});

// Clean up on unmount
return () => unsubscribe();
```

## Key Architectural Patterns

### No Optimistic Updates
- UI always reflects true device state from MQTT
- Commands sent, UI updates only after ESP32 responds
- Prevents inconsistent state between app and device

### State Machine Pattern
- Provisioning uses state machine for complex flow orchestration
- States: IDLE → CONNECTING_BLE → SENDING_CREDENTIALS → WAITING_WIFI → SUCCESS/ERROR

### Permission Bundling
- All permissions requested during onboarding (StartupScreen)
- Prevents permission prompts mid-flow
- Better user experience

## Common Development Tasks

### Adding a New Device Type
1. Add device detection logic to BleService
2. Update DeviceDataService metrics handling
3. Add UI component to display device-specific metrics
4. Test BLE provisioning and MQTT communication

### Adding a New Screen
1. Create screen component in `src/screens/`
2. Add route to RootNavigator in `src/navigation/`
3. Add navigation handler in parent screen
4. Apply theme with useTheme hook

### Adding a New Service
1. Create service as singleton with get function
2. Implement listener pattern if needed
3. Export from services index
4. Use in screens/components via get function

### Testing Setup
- Jest configured with @react-native/jest-preset
- Run tests: `npm test`
- Tests should verify service logic, not UI rendering
