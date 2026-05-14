# Quick Fixes Guide

## Issue 1: Settings Navigation (CRITICAL)

### Problem
HomeScreen tries to navigate to 'Settings' screen which doesn't exist.

### Solution: Remove Settings Button
Edit `src/screens/HomeScreen.tsx`:

**Remove this function:**
```typescript
const handleSettingsPress = () => {
  console.log('[HomeScreen] Settings pressed');
  navigation.navigate('Settings');
};
```

**Remove this button from header:**
```typescript
<TouchableOpacity
  style={styles.settingsButton}
  onPress={handleSettingsPress}
  activeOpacity={0.7}
>
  <View style={styles.settingsButtonBg}>
    <Text style={styles.settingsIcon}>⚙️</Text>
  </View>
</TouchableOpacity>
```

**Remove these styles:**
```typescript
settingsButton: {
  padding: 8,
},
settingsButtonBg: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: '#FFFFFF',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
},
settingsIcon: {
  fontSize: 20,
},
```

---

## Issue 2: Clean Up Unused Imports

### StartupScreen.tsx
**Remove:**
```typescript
import { ScrollView } from 'react-native';  // ❌ Unused
const { width, height } = Dimensions.get('window');  // ❌ Unused
const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);  // ❌ Unused
const slideUpAnim = new Animated.Value(100);  // ❌ Unused
const fadeInAnim = new Animated.Value(0);  // ❌ Unused
```

### HomeScreen.tsx
**Remove:**
```typescript
import { Animated } from 'react-native';  // ❌ Unused
const { width } = Dimensions.get('window');  // ❌ Unused
const [deviceMetrics, setDeviceMetrics] = useState<Record<string, DeviceMetrics>>({});  // ❌ Unused
```

### ProvisioningProgressScreen.tsx
**Remove:**
```typescript
const { width, height } = Dimensions.get('window');  // ❌ Unused
const waveAnim = useRef(new Animated.Value(0)).current;  // ❌ Unused
const [totalSteps] = useState(3);  // ❌ Unused
```

---

## Issue 3: Implement Missing Features (Optional)

### WiFi Reconfiguration
In `src/screens/HomeScreen.tsx`, update:
```typescript
const handleReconfigureWiFi = () => {
  if (!selectedDevice) return;
  setShowDeviceMenu(false);
  // TODO: Navigate to WiFi reconfiguration screen
  Alert.alert('WiFi Reconfiguration', 'Coming soon');
};
```

**To:**
```typescript
const handleReconfigureWiFi = async () => {
  if (!selectedDevice) return;
  setShowDeviceMenu(false);
  
  // Use deviceDataService to send WiFi update via MQTT
  const success = await getDeviceDataService().reconfigureWiFi(
    selectedDevice.id,
    'NewSSID',  // Get from user input
    'NewPassword'  // Get from user input
  );
  
  if (success) {
    Alert.alert('Success', 'WiFi reconfiguration sent');
  } else {
    Alert.alert('Error', 'Failed to reconfigure WiFi');
  }
};
```

### Device Restart
In `src/screens/HomeScreen.tsx`, update:
```typescript
const handleRestartDevice = () => {
  if (!selectedDevice) return;
  setShowDeviceMenu(false);
  // TODO: Send restart command via BLE/MQTT
  Alert.alert('Restart Device', 'Device restart command sent');
};
```

**To:**
```typescript
const handleRestartDevice = async () => {
  if (!selectedDevice) return;
  setShowDeviceMenu(false);
  
  Alert.alert(
    'Restart Device',
    'Are you sure you want to restart this device?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        onPress: async () => {
          // Send restart command via MQTT
          const success = await getDeviceDataService().factoryReset(selectedDevice.id);
          if (success) {
            Alert.alert('Success', 'Restart command sent');
          } else {
            Alert.alert('Error', 'Failed to send restart command');
          }
        },
      },
    ]
  );
};
```

---

## Testing Checklist

After applying fixes:

- [ ] App builds without errors
- [ ] No TypeScript errors
- [ ] HomeScreen loads without crashing
- [ ] Settings button is removed
- [ ] Device cards display correctly
- [ ] Add Device button works
- [ ] Device Details screen opens
- [ ] LED toggle works
- [ ] MQTT data updates in real-time
- [ ] Device provisioning flow works end-to-end

---

## Verification Commands

```bash
# Check for TypeScript errors
npm run tsc

# Check for ESLint errors
npm run lint

# Build the app
npm run android

# Run on device
npm run android
```

---

## Summary

**Time to fix**: ~10 minutes
**Difficulty**: Easy
**Impact**: High (removes crashes and improves code quality)

All fixes are optional except for the Settings navigation issue, which will cause a crash if the settings button is clicked.
