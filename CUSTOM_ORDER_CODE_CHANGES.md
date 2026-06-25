# Custom Order - Code Changes Reference

## File: src/screens/RoomManagementScreen.tsx

### Change 1: Fix Room ID Generation (Line 71-79)

**BEFORE (❌ BROKEN - IDs based on index position):**
```typescript
const roomsWithDevices: RoomItem[] = realRooms.map((name, index) => {
  const devicesInRoom = getDevicesForRoom(name, savedDevices);
  return {
    id: `${name}_${index}`,  // ❌ Problem: Index changes when reordering
    name,
    deviceCount: devicesInRoom.length,
    devices: devicesInRoom,
  };
});
```

**AFTER (✅ FIXED - IDs based on room name):**
```typescript
const roomsWithDevices: RoomItem[] = realRooms.map((name) => {
  const devicesInRoom = getDevicesForRoom(name, savedDevices);
  return {
    id: name,  // ✅ Use room name as stable ID (names are unique and don't change on reorder)
    name,
    deviceCount: devicesInRoom.length,
    devices: devicesInRoom,
  };
});
```

**Why:** Room names are unique and stable. When you drag rooms, the IDs stay the same, so React's list tracking works correctly.

---

### Change 2: Reduce Drag Delay (Line 349)

**BEFORE (❌ SLOW - 2 second delay):**
```typescript
<TouchableOpacity
  onLongPress={drag}
  delayLongPress={2000}  // ❌ Too long, poor UX
  style={[
    styles.roomCard,
    {
      backgroundColor: isActive ? theme.primarySoft : theme.card,
      borderColor: isActive ? theme.primary : theme.border,
    },
  ]}
>
```

**AFTER (✅ RESPONSIVE - 300ms delay):**
```typescript
<TouchableOpacity
  onLongPress={drag}
  delayLongPress={300}  // ✅ Standard mobile interaction timing
  style={[
    styles.roomCard,
    {
      backgroundColor: isActive ? theme.primarySoft : theme.card,
      borderColor: isActive ? theme.primary : theme.border,
    },
  ]}
>
```

**Why:** 300ms is the standard for mobile gesture recognition. Users expect immediate feedback.

---

### Change 3: Improve Logging (Line 154-168)

**BEFORE (❌ Silent - hard to debug):**
```typescript
const handleSaveOrder = async () => {
  try {
    setIsLoading(true);
    await storageService.saveRooms(draftRooms.map(r => r.name));
    await storageService.saveRoomSortMode('custom');
    setRooms(draftRooms);
    setIsReorderMode(false);
  } catch (error) {
    console.error('[RoomManagement] Error saving order:', error);
    Alert.alert('Error', 'Failed to save room order');
  } finally {
    setIsLoading(false);
  }
};
```

**AFTER (✅ VERBOSE - easy to trace):**
```typescript
const handleSaveOrder = async () => {
  try {
    setIsLoading(true);
    const roomNames = draftRooms.map(r => r.name);
    console.log('[RoomManagement] Saving custom order:', roomNames);  // ← New
    
    await storageService.saveRooms(roomNames);
    await storageService.saveRoomSortMode('custom');
    
    console.log('[RoomManagement] Custom order saved successfully');  // ← New
    setRooms(draftRooms);
    setIsReorderMode(false);
  } catch (error) {
    console.error('[RoomManagement] Error saving order:', error);
    Alert.alert('Error', 'Failed to save room order');
  } finally {
    setIsLoading(false);
  }
};
```

**Why:** Better logging helps trace issues when custom order doesn't work as expected.

---

### Change 4: Remove Unused Imports (Line 10)

**BEFORE (❌ UNUSED):**
```typescript
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  StatusBar,
  FlatList,  // ❌ Imported but never used
} from 'react-native';
```

**AFTER (✅ CLEAN):**
```typescript
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
```

**Why:** Cleaner imports, smaller bundle, no linting warnings.

---

### Change 5: Remove Unused State (Line 52 & 63)

**BEFORE (❌ UNUSED STATE):**
```typescript
const [showAddRoomSheet, setShowAddRoomSheet] = useState(false);
const [addRoomName, setAddRoomName] = useState('');
const [devices, setDevices] = useState<ProvisionedDevice[]>([]);  // ❌ Never used

const storageService = getStorageService();

const loadData = useCallback(async () => {
  try {
    setIsLoading(true);
    const savedRooms = await storageService.getRooms();
    const savedDevices = await storageService.getProvisionedDevices();
    const savedSortMode = await storageService.getRoomSortMode();

    setDevices(savedDevices);  // ❌ Set but never read
    setSortMode(savedSortMode);
```

**AFTER (✅ CLEAN):**
```typescript
const [showAddRoomSheet, setShowAddRoomSheet] = useState(false);
const [addRoomName, setAddRoomName] = useState('');

const storageService = getStorageService();

const loadData = useCallback(async () => {
  try {
    setIsLoading(true);
    const savedRooms = await storageService.getRooms();
    const savedDevices = await storageService.getProvisionedDevices();
    const savedSortMode = await storageService.getRoomSortMode();

    setSortMode(savedSortMode);
```

**Why:** State that's set but never read wastes memory and confuses maintainers. Devices are loaded but used only locally.

---

### Change 6: Use draftRooms in View Mode (Line 335)

**BEFORE (❌ INCONSISTENT):**
```typescript
) : (
  <ScrollView
    style={styles.content}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.contentContainer}
  >
    {rooms.map(room => (  // ❌ Shows sorted rooms, not draggable list
```

**AFTER (✅ CONSISTENT):**
```typescript
) : (
  <ScrollView
    style={styles.content}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.contentContainer}
  >
    {draftRooms.map((room, index) => (  // ✅ Shows current rooms state
```

**Why:** Ensures the normal view shows the same order that would be saved. Prevents confusion about what "Save Order" will actually save.

---

### Change 7: Fix Deprecated API (Line 626 & 633)

**BEFORE (❌ DEPRECATED):**
```typescript
sheetOverlay: {
  ...StyleSheet.absoluteFillObject,  // ❌ Deprecated in React Native 0.84
  justifyContent: 'flex-end',
  zIndex: 1000,
},

sheetBackdrop: {
  ...StyleSheet.absoluteFillObject,  // ❌ Deprecated in React Native 0.84
  backgroundColor: 'rgba(0,0,0,0.4)',
},
```

**AFTER (✅ MODERN):**
```typescript
sheetOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'flex-end',
  zIndex: 1000,
},

sheetBackdrop: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
},
```

**Why:** Use explicit styles instead of deprecated API spread operator. More compatible with future React Native versions.

---

## Summary of Changes

| Change | Type | Impact | Lines |
|--------|------|--------|-------|
| Room ID to name-based | Bug Fix | HIGH - Fixes custom order | 71-79 |
| Drag delay 2000→300ms | UX Improvement | HIGH - Better responsiveness | 349 |
| Better logging | Debugging | MEDIUM - Easier troubleshooting | 154-168 |
| Remove unused imports | Code Quality | LOW - Cleaner code | 10 |
| Remove unused state | Code Quality | LOW - Better performance | 52, 63 |
| Use draftRooms consistently | Logic Fix | MEDIUM - Consistency | 335 |
| Replace deprecated API | Compatibility | LOW - Future-proof | 626, 633 |

---

## Testing the Changes

After applying these changes:

1. **No TypeScript errors** - Run `npm run typecheck`
2. **No linting warnings** - Run `npm run lint`
3. **Drag works smoothly** - Test dragging rooms
4. **Order persists** - Save, close app, reopen, verify
5. **Console shows logs** - Check React Native debugger
6. **Other sorts still work** - Test A-Z, Most Devices, etc.

---

## Rollback Instructions

If something breaks, revert these changes:

```bash
git checkout src/screens/RoomManagementScreen.tsx
```

Then carefully re-apply one change at a time to isolate the issue.

