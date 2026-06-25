# Custom Room Order Bug Analysis

## Issues Found

### **Issue 1: ID Generation Problem (CRITICAL)**
**Location:** `RoomManagementScreen.tsx`, line 79
```typescript
const roomsWithDevices: RoomItem[] = realRooms.map((name, index) => {
  return {
    id: `${name}_${index}`,  // ❌ PROBLEM: Index changes when rooms are dragged/reordered
    name,
    deviceCount: devicesInRoom.length,
    devices: devicesInRoom,
  };
});
```

**Why it breaks:**
- When you drag rooms to reorder, React Native's `DraggableFlatList` expects stable `id` values
- Using `index` in the ID causes the ID to change when the list is reordered
- This confuses the draggable list about which room is which
- IDs should be stable and unique, not dependent on position

**Example:**
```
Before drag:
- Kitchen (id: "Kitchen_0")
- Bedroom (id: "Bedroom_1")
- Living Room (id: "Living Room_2")

After drag (moved Bedroom to top):
- Bedroom (id: "Bedroom_0")  ❌ ID CHANGED! Was "Bedroom_1"
- Kitchen (id: "Kitchen_1")  ❌ ID CHANGED! Was "Kitchen_0"
- Living Room (id: "Living Room_2")
```

---

### **Issue 2: No ID Persistence**
**Location:** `RoomManagementScreen.tsx`, lines 75-88

**Problem:**
- Rooms are created fresh every time `loadData()` runs
- The storage system (`storageService`) only stores room **names**, not IDs
- When the component reloads, rooms get new IDs with new indices
- Custom order is saved as room names list, but the IDs don't match the saved order

---

### **Issue 3: Draft Rooms Not Updated on Rename/Delete**
**Location:** `RoomManagementScreen.tsx`, lines 185-246

**Problem:**
- When user renames or deletes a room, `loadData()` is called to refresh
- `loadData()` recreates all rooms with new IDs and resets `draftRooms`
- If user was in reorder mode, exiting and re-entering loses their drag progress

---

### **Issue 4: Missing Drag Feedback**
**Location:** `RoomManagementScreen.tsx`, line 374

**Problem:**
```typescript
<DraggableFlatList
  data={draftRooms}
  onDragEnd={({ data }) => setDraftRooms(data)}
  keyExtractor={item => item.id}  // ← Uses unstable IDs
  renderItem={({ item, drag, isActive }) => (
    <TouchableOpacity
      onLongPress={drag}
      delayLongPress={2000}  // ← 2 seconds is too long
```

- `delayLongPress={2000}` is 2 seconds - users expect drag to work faster (typically 300-500ms)
- The drag handle animation may not work correctly with unstable IDs

---

## Root Cause Summary

The entire custom order system fails because:

1. **IDs are not stable** - They're generated based on index position, not the room itself
2. **Storage only persists room names** - Not the ID mapping
3. **No room UUID** - Rooms lack a permanent, stable identifier
4. **Draggable list needs stable keys** - react-native-draggable-flatlist requires consistent IDs across renders

---

## Solution Strategy

### **Approach 1: Use Room Name as Stable ID (Recommended)**
```typescript
// Instead of:
id: `${name}_${index}`

// Use:
id: name  // Room names are unique and stable
```

**Pros:**
- Simple
- Room names are already unique (validated)
- No extra storage needed

**Cons:**
- If user renames a room, the ID changes (but this is intentional)

### **Approach 2: Add Timestamp-Based UUID**
```typescript
// Store rooms with UUIDs
const rooms = [
  { id: 'uuid-1', name: 'Kitchen', createdAt: 1234567890 },
  { id: 'uuid-2', name: 'Bedroom', createdAt: 1234567891 }
]
```

**Pros:**
- Truly stable IDs
- Survives room renames

**Cons:**
- Requires schema change in storage
- More complex migration needed
- Overkill for this use case

---

## Recommended Fix

**Use room name as the ID** since:
- Room names are already unique (validated in `storageService`)
- When a room is renamed, getting a new ID is the correct behavior
- No schema changes needed
- Simplest implementation

### Implementation Changes:

1. **Change ID generation** (line 79):
```typescript
const roomsWithDevices: RoomItem[] = realRooms.map((name) => ({
  id: name,  // Use room name as stable ID
  name,
  deviceCount: devicesInRoom.length,
  devices: devicesInRoom,
}));
```

2. **Reduce drag delay** (line 385):
```typescript
delayLongPress={300}  // Faster feedback for user
```

3. **Add console logging** to verify custom order is being saved:
```typescript
const handleSaveOrder = async () => {
  try {
    setIsLoading(true);
    const roomNames = draftRooms.map(r => r.name);
    console.log('[RoomManagement] Saving custom order:', roomNames);
    await storageService.saveRooms(roomNames);
    await storageService.saveRoomSortMode('custom');
    console.log('[RoomManagement] Custom order saved successfully');
    setRooms(draftRooms);
    setIsReorderMode(false);
  } catch (error) {
    // ...
  }
};
```

---

## Testing Steps

1. **Create 3+ rooms**: Kitchen, Bedroom, Living Room
2. **Open Room Management**
3. **Tap Sort button → Select "Custom"**
4. **Try to drag Bedroom above Kitchen** (long press, then drag)
5. **Tap "Save Order"**
6. **Close app and reopen**
7. **Verify order is preserved** (Bedroom should still be first)

---

## Additional Issues to Fix

- [ ] Remove unused `FlatList` import (line 10)
- [ ] Remove unused `devices` state (line 56) - it's loaded but never used
- [ ] Replace deprecated `StyleSheet.absoluteFillObject` with direct style object
- [ ] Consider reducing `delayLongPress` from 2000ms to 300-500ms

