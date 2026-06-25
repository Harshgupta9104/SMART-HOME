# SmartHomeApp - Project Structure

## Directory Layout

```
SmartHomeApp/
├── .kiro/                          # Kiro configuration
│   ├── hooks/                      # Agent hooks
│   └── steering/                   # Steering documents (this file)
├── android/                        # Android native code
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── assets/fonts/       # Icon fonts (Material, Feather, etc.)
│   │   │   ├── java/com/smarthomeapp/
│   │   │   └── res/                # Android resources (drawable, mipmap, values)
│   │   └── build.gradle
│   ├── gradle/wrapper/
│   ├── build.gradle
│   └── settings.gradle
├── ios/                            # iOS native code (not expanded)
├── src/                            # Main source code
│   ├── screens/                    # UI Screens (React components)
│   ├── services/                   # Business logic (Singleton services)
│   ├── context/                    # Global state & Context API
│   ├── hooks/                      # Custom React hooks
│   ├── components/                 # Reusable UI components
│   ├── navigation/                 # Navigation stack & configuration
│   ├── constants/                  # App-wide constants
│   ├── config/                     # Configuration files (MQTT, etc.)
│   ├── theme/                      # Theme definitions & styling
│   └── utils/                      # Utility functions
├── app.json                        # React Native app config
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── .eslintrc.js                    # ESLint configuration
├── .prettierrc.js                  # Prettier configuration
├── .watchmanconfig                 # Watchman configuration
├── .env                            # Environment variables (local)
├── .env.example                    # Environment template
├── README.md                        # Main documentation
└── BUILD_FIX_GUIDE.md              # Build troubleshooting
```

## Source Code Organization (src/)

### screens/
**UI Screen components - one per screen in the navigation flow**

```
screens/
├── HomeScreen.tsx                  # Main home/hub screen with device grid
├── DeviceDetailsScreen.tsx         # Device detail view with tabs (metrics, control, settings)
├── SimpleBleProvisionScreen.tsx    # BLE device discovery & scanning
├── WiFiProvisioningScreen.tsx      # WiFi credential entry for provisioning
├── ProvisioningProgressScreen.tsx  # Progress indicator during provisioning
├── ProvisioningSuccessScreen.tsx   # Confirmation after successful provisioning
├── DeviceNamingScreen.tsx          # Friendly name setup for new device
├── AddDeviceScreen.tsx             # Landing page for device setup methods
├── NotificationScreen.tsx          # Device alerts & system notifications
├── SettingsScreen.tsx              # App preferences, theme, language
├── ProfileScreen.tsx               # User profile & home statistics
├── StartupScreen.tsx               # Onboarding & permission requests
└── SplashScreen.tsx                # Initial splash animation
```

### services/
**Singleton services implementing business logic and external integrations**

```
services/
├── mqttService.ts                  # MQTT connection & pub/sub
├── deviceDataService.ts            # Device metrics caching & listener pattern
├── bleService.ts                   # BLE device discovery & provisioning
├── wifiService.ts                  # WiFi network scanning & detection
├── storageService.ts               # AsyncStorage for device persistence
├── keychainService.ts              # Secure password storage
├── permissionService.ts            # Permission management & bundling
└── index.ts                        # Service exports
```

### context/
**Global state using React Context API**

```
context/
├── ThemeContext.tsx                # Theme (dark/light) & color palette
├── BleContext.tsx                  # BLE provisioning state machine
└── index.ts                        # Context exports
```

### hooks/
**Custom React hooks for reusable logic**

```
hooks/
├── useTheme.ts                     # Hook to access theme context
├── useBleProvisioning.ts           # Hook for BLE provisioning state
├── useMqttMetrics.ts               # Hook for subscribing to device metrics
└── index.ts                        # Hook exports
```

### components/
**Reusable UI components used across screens**

```
components/
├── DeviceCard.tsx                  # Device display card with status & controls
├── MetricsDisplay.tsx              # Metrics visualization component
├── PermissionRequest.tsx           # Permission request UI
├── LoadingSpinner.tsx              # Loading indicator
├── ErrorBoundary.tsx               # Error handling wrapper
├── SafeAreaView.tsx                # Safe area wrapper
└── index.ts                        # Component exports
```

### navigation/
**Navigation stack configuration and routing**

```
navigation/
├── RootNavigator.tsx               # Main navigation stack (screens, routes)
├── types.ts                        # Navigation type definitions & params
└── index.ts                        # Navigation exports
```

### constants/
**App-wide constant values**

```
constants/
├── colors.ts                       # Color palette (primary, success, error, etc.)
├── strings.ts                      # User-facing strings & messages
├── bleUUIDs.ts                     # BLE service & characteristic UUIDs
├── mqttTopics.ts                   # MQTT topic patterns
└── index.ts                        # Constant exports
```

### config/
**Configuration files for external services**

```
config/
├── mqttConfig.ts                   # MQTT broker configuration & validation
└── index.ts                        # Config exports
```

### theme/
**Design system & theme definitions**

```
theme/
├── lightTheme.ts                   # Light theme colors & styles
├── darkTheme.ts                    # Dark theme colors & styles
├── typography.ts                   # Font sizes, weights, line heights
├── spacing.ts                      # Margin & padding scale
└── index.ts                        # Theme exports
```

### utils/
**Utility functions used throughout the app**

```
utils/
├── formatters.ts                   # Value formatting (temperature, moisture, etc.)
├── validators.ts                   # Input validation (WiFi SSID, password, etc.)
├── logger.ts                       # Logging with [prefix] tags
├── errorHandling.ts                # Error types & user-friendly messages
├── asyncHelpers.ts                 # Async/promise utilities
└── index.ts                        # Utility exports
```

## File Naming Conventions

### Screens
- Format: `[ScreenName]Screen.tsx`
- Examples: `HomeScreen.tsx`, `DeviceDetailsScreen.tsx`
- Always end with "Screen" suffix

### Services
- Format: `[serviceName]Service.ts`
- Examples: `mqttService.ts`, `deviceDataService.ts`
- Singleton pattern with `get[ServiceName]()` export
- All lowercase prefix

### Context
- Format: `[ContextName]Context.tsx`
- Examples: `ThemeContext.tsx`, `BleContext.tsx`

### Hooks
- Format: `use[HookName].ts`
- Examples: `useTheme.ts`, `useBleProvisioning.ts`
- Follow React hook naming convention

### Components
- Format: `[ComponentName].tsx`
- Examples: `DeviceCard.tsx`, `MetricsDisplay.tsx`
- Start with uppercase letter

### Types & Interfaces
- Store in same file as usage
- Export from `types.ts` if shared across files
- Interface names: `[EntityName]Interface` (rarely used, prefer type)
- Type names: `[EntityName]` (preferred)

## Code Style & Conventions

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- All functions and components typed
- Use `interface` for object shapes, `type` for unions/primitives
- No `any` type - use `unknown` if truly unknown

### React Components
- Functional components only (hooks)
- Use `useCallback`, `useEffect`, `useRef` appropriately
- Clean up subscriptions in useEffect return
- Use `useFocusEffect` from @react-navigation/native for screen-specific logic

### Styling
- Use `StyleSheet.create()` for style objects
- Apply theme colors via `useTheme()` hook
- Prefer theme colors over hardcoded values
- Use safe area insets via `useSafeAreaInsets()`

### Imports
- Organize: React imports → React Native → Third-party → Local
- Use absolute imports from `src/` (configured in TypeScript)
- Always import types with `type` keyword: `import type { TypeName }`

### Service Pattern
- All services are singletons: `const service = getServiceName()`
- Services export listener/subscription functions
- Listeners use unsubscribe pattern: `const unsubscribe = service.subscribe(...)`
- Clean up in useEffect: `return () => unsubscribe()`

### Error Handling
- Use structured error types (defined in `utils/errorHandling.ts`)
- Log with consistent `[prefix]` format: `console.log('[ServiceName]', message)`
- User-facing errors via Alert or error screens
- Silent failures logged to console only

### MQTT & BLE
- Device IDs: Use `mqttDeviceId` field from ProvisionedDevice
- Fallback to `id` (BLE MAC) if `mqttDeviceId` not available
- Topics: Follow `esp32/{deviceId}/...` pattern
- QoS: Use appropriate level per message type

## Key Dependencies & Their Roles

| Dependency | Purpose | Key Files |
|------------|---------|-----------|
| react-navigation | Screen navigation & routing | `src/navigation/` |
| react-native-ble-plx | BLE provisioning | `src/services/bleService.ts` |
| mqtt | MQTT real-time metrics | `src/services/mqttService.ts` |
| react-native-reanimated | Smooth animations | All screen components |
| nativewind | Tailwind styling | Applied via StyleSheet |
| react-native-async-storage | Device persistence | `src/services/storageService.ts` |
| react-native-keychain | Secure password storage | `src/services/keychainService.ts` |

## Navigation Flow

### Main Stack (RootNavigator)
```
Startup (onboarding)
├─ StartupScreen (permission bundling)
└─ SplashScreen (entry animation)

Home Stack (main app)
├─ HomeScreen (main hub - device grid, activity)
├─ AddDeviceScreen (setup method selection)
├─ SimpleBleProvisionScreen (BLE discovery)
├─ WiFiProvisioningScreen (WiFi setup)
├─ ProvisioningProgressScreen (progress)
├─ ProvisioningSuccessScreen (confirmation)
├─ DeviceNamingScreen (friendly name)
├─ DeviceDetailsScreen (metrics, control, settings)
├─ NotificationScreen (alerts)
├─ SettingsScreen (preferences)
└─ ProfileScreen (user profile)
```

## Asset Organization

### Fonts
- Location: `android/app/src/main/assets/fonts/`
- Accessed via react-native-vector-icons
- Icons: Material, Feather, FontAwesome, etc.

### Images
- Location: `src/assets/images/` (if used)
- Use vector icons instead of PNG when possible
- Store in theme context if themed

## Environment Configuration

### .env Variables
- `MQTT_URL` - MQTT broker WebSocket URL
- `MQTT_USERNAME` - MQTT broker username
- `MQTT_PASSWORD` - MQTT broker password
- `MQTT_CLIENT_ID_PREFIX` - Prefix for MQTT client ID

See `.env.example` for template.

## Testing Structure

### Jest Configuration
- Location: Inherits from `@react-native/jest-preset`
- Test files: `*.test.ts` or `*.test.tsx`
- Location: Colocated with source files

### Test Organization
```
services/
├── mqttService.ts
├── mqttService.test.ts             # Service tests
└── ...
```

## Documentation Files

- **README.md** - Project overview, features, quick start
- **BUILD_FIX_GUIDE.md** - Troubleshooting & common issues
- **.kiro/steering/product.md** - Product overview
- **.kiro/steering/tech.md** - Tech stack & build commands
- **.kiro/steering/structure.md** - This file
