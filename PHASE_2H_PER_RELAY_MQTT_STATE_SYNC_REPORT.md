# Phase 2H Per-Relay MQTT Control + Firestore State Sync Report

## Goal
Connect cloud channel UI (from Phase 2G) to real MQTT relay control and implement Firestore channel state synchronization after MQTT commands succeed.

## Before Phase 2H

### Status
- ControllerScreen displayed multi-channel UI from Firestore
- Relay 1 was controllable but state did not update Firestore after toggle
- Relay 2-4 showed "Coming Soon" placeholder
- MQTT control was single-relay only (GPIO23 hardcoded)
- No per-channel MQTT control implementation
- No Firestore channel state sync after MQTT commands

### Limitations
- Relay 1 toggle used existing `updateRelayStatus()` which did not sync to Firestore
- No DeviceContext function exposed to update channels
- Multi-relay MQTT topics not supported by current firmware

## Audit Summary

| Component | Current Behavior | MQTT Topic | Payload Format | Channel Number Support | Firestore Sync | Phase 2H Action |
|-----------|-----------------|-----------|---------|------|---------|---------|
| `mqttService.sendRelayCommand()` | Single relay only (GPIO23) | `esp32/{deviceId}/relay/set` | `ON` or `OFF` | ❌ No | N/A | Preserved |
| `mqttService.sendRelayChannelCommand()` | NEW FUNCTION | `esp32/{deviceId}/relay/set` for ch1 | `ON` or `OFF` | ✅ Added support (ch1 only) | N/A | Added |
| `deviceDataService.updateRelayStatus()` | Single relay MQTT only | `esp32/{deviceId}/relay/set` | `ON` or `OFF` | ❌ No | ❌ No | Preserved |
| `deviceDataService.updateRelayChannelStatus()` | NEW FUNCTION | Per-channel support | `ON` or `OFF` | ✅ Yes | ✅ Yes | Added |
| `DeviceContext.updateExistingChannel()` | NEW FUNCTION | N/A | N/A | N/A | ✅ Yes | Added |
| `ControllerScreen.handleChannelToggle()` | NEW FUNCTION | Per-channel aware | Per-channel | ✅ Yes | ✅ Yes | Added |

## MQTT Protocol Findings

### Exact MQTT Topic(s) Used
- **Relay 1 (supported)**: `esp32/{deviceId}/relay/set`
- **Relay 2-4 (not yet supported)**: Firmware does not implement `esp32/{deviceId}/relay/{n}/set` format

### Exact Payload Format
- **Message**: Simple string `ON` or `OFF` (boolean encoded as text)
- **QoS**: 1 (at-least-once delivery)
- **Example**: 
  - Command: publish to `esp32/device-abc123/relay/set` with message `ON`
  - Response: firmware publishes to `esp32/device-abc123/relay/state` with message `ON`

### Channel Number Support
- ✅ **Relay 1**: Fully supported (maps to existing single-relay topic)
- ❌ **Relay 2-4**: Not supported by current ESP32 firmware MQTT protocol
  - Firmware only has `relay/set` (no channel number in topic)
  - Multi-relay support requires firmware extension to support numbered topics like `relay/{n}/set`
  - Currently deferred to Phase 2I (firmware-dependent)

### Backward Compatibility
- ✅ Relay 1 control still works via existing MQTT topic
- ✅ `sendRelayCommand()` preserved for legacy code
- ✅ `updateRelayStatus()` preserved for legacy code
- ✅ Existing single-relay local ProvisionedDevice fallback still works

## Code Changes

### Files Modified
1. **src/contexts/DeviceContext.tsx**
   - Added import: `updateDeviceChannel` from deviceService
   - Added import: `UpdateChannelInput` type
   - Added function: `updateExistingChannel()` - Updates Firestore channel document
   - Added to context value: `updateExistingChannel`
   - Updated useMemo dependencies

2. **src/services/mqttService.ts**
   - Added function: `sendRelayChannelCommand(deviceId, channelNumber, state)` - Sends per-channel MQTT command
   - Supports channelNumber parameter but currently only Relay 1 works
   - Relay 2+ returns false with clear log message about firmware limitation

3. **src/services/deviceDataService.ts**
   - Added import: `deviceService` from Firebase
   - Added function: `updateRelayChannelStatus()` - Per-channel MQTT + Firestore sync
   - Sends MQTT command first, then updates Firestore on success
   - Returns true even if Firestore update fails (MQTT command success is primary)

4. **src/screens/ControllerScreen.tsx**
   - Added prop: `homeId` - Optional Firestore home ID for channel updates
   - Added state: `updatingChannelId` - Track per-channel loading state
   - Added import: `updateExistingChannel` from DeviceContext
   - Added function: `handleChannelToggle(channel)` - Per-channel toggle handler
     - Determines next state (on→off, off→on, unknown→on)
     - Calls `updateRelayChannelStatus()` with MQTT + Firestore params
     - Updates local channels list on success
     - Shows per-channel loading state
   - Relay 1: Fully controllable with toggle button
   - Relay 2-4: Disabled with "MQTT support pending" message
   - Legacy fallback UI: Preserved for ProvisionedDevice

## ControllerScreen Behavior

### Multi-Channel UI (CloudDevice with Channels)
- **Display**:
  - Shows all channels as individual cards
  - Each card displays: channel name, channel number, state badge (On/Off/Unknown with color coding)
  - State badge colors: on=green (theme.success), off=red (theme.danger), unknown=yellow (theme.warning)

- **Relay 1**:
  - Toggle button: "Turn ON" or "Turn OFF"
  - Button text shows "Updating..." while MQTT command in progress
  - Disabled during update
  - On success: Firestore channel.state updates to "on" or "off"
  - On MQTT failure: No Firestore update, shows error in logs

- **Relay 2-4**:
  - Disabled button (low opacity)
  - Button text: "MQTT support pending"
  - Tooltip/message: Firmware does not yet support multi-relay MQTT topics
  - Cannot be toggled (disabled state enforced)

### Legacy Single Relay UI (ProvisionedDevice without CloudDevice)
- Still works as Phase 2G
- Relay control button (circular UI)
- No Firestore sync for legacy devices (local only)
- Backward compatible with existing provisioning

### Loading States
- Per-channel loading: `updatingChannelId` tracks which channel is updating
- Only the updating channel's button shows "Updating..."
- Other channels remain interactive
- Does not block entire screen

## Firestore State Sync

### Channel State Update Flow
1. User taps Relay 1 toggle in ControllerScreen
2. `handleChannelToggle(channel)` calculates next state: on/off
3. Calls `deviceDataService.updateRelayChannelStatus()` with:
   - `homeId`: Firestore home ID
   - `deviceId`: Firestore cloud device ID
   - `mqttDeviceId`: MQTT topic ID
   - `channelId`: Firestore channel doc ID (e.g., "relay_1")
   - `channelNumber`: Relay number (1-4)
   - `newState`: "on" or "off" (string literal)
4. Service sends MQTT command to device
5. If MQTT succeeds:
   - Updates Firestore: `homes/{homeId}/devices/{deviceId}/channels/{channelId}.state = "on"|"off"`
   - Sets `updatedAt` timestamp automatically
6. If MQTT fails:
   - Returns false, no Firestore update
   - Logs error in console
7. ControllerScreen receives result and updates local channels list immutably

### Firestore State Values
- ✅ **Valid**: `"on"`, `"off"`, `"unknown"`
- ❌ **Invalid**: `"ON"`, `"OFF"`, `true`, `false`, `undefined`, `null`, `1`, `0`
- Implementation ensures only lowercase string literals are written

### Firestore Collection Structure
```
homes/{homeId}/devices/{deviceId}/channels/relay_1
  {
    id: "relay_1",
    homeId: "...",
    deviceId: "...",
    channelNumber: 1,
    name: "Relay 1",
    type: "relay",
    state: "on",              ← Updated by Phase 2H
    sortOrder: 10,
    roomName: "Living Room",
    lastUpdate: "2026-06-27T...",
    createdAt: "2026-06-27T...",
    updatedAt: "2026-06-27T..."  ← Auto-updated by deviceService
  }
```

## Backward Compatibility

### Existing Relay 1 Control Still Works
- ✅ `sendRelayCommand()` unchanged
- ✅ `updateRelayStatus()` unchanged
- ✅ MQTT topic format unchanged: `esp32/{deviceId}/relay/set`
- ✅ Legacy code paths still functional
- ✅ HomeScreen device toggle (single relay) still works via updateRelayStatus()

### Legacy Local ProvisionedDevice Fallback Preserved
- ✅ ControllerScreen still renders legacy fallback UI for non-CloudDevice
- ✅ Falls back to single relay UI if channels not loaded
- ✅ Local devices still use existing MQTT flow
- ✅ Local storage not affected
- ✅ BLE provisioning unchanged

### Firebase Rules Unchanged
- ✅ Existing Firestore rules still apply
- ✅ Channel.state write allowed via existing rules
- ✅ No new permission requirements

### MQTT Topic Format Unchanged
- ✅ Still uses: `esp32/{deviceId}/relay/set`
- ✅ Still uses payload: `ON` or `OFF`
- ✅ No firmware changes required for Relay 1
- ✅ Relay 2+ requires firmware extension (deferred to Phase 2I)

## Manual Testing Steps

### Test Environment
- Device: CloudDevice with 4 channels provisioned in Firestore
- MQTT: Connected to HiveMQ Cloud
- Firebase: Connected to Firestore
- App: Logged in and home loaded

### Test Procedure

1. **App Launch & Load Channels**
   - Launch app
   - Login
   - Navigate to ControllerScreen
   - Verify channels load from Firestore
   - ✅ Expected: All 4 relay cards visible

2. **Relay 1 Initial State**
   - Note current state badge on Relay 1 (On/Off/Unknown)
   - ✅ Expected: State reflects Firestore channel.state value

3. **Relay 1 Toggle ON**
   - Current state must be Off or Unknown
   - Tap Relay 1 toggle button
   - ✅ Expected: Button shows "Updating..." immediately
   - ✅ Expected: MQTT command sent (check logs: "[MQTT] 🔌 Publishing relay command")
   - ✅ Expected: Firestore updated (check Firestore: channels/relay_1.state = "on")
   - ✅ Expected: Button shows "Turn OFF" after success
   - ✅ Expected: State badge becomes green (On)
   - ✅ Expected: No permission-denied errors in logs

4. **Relay 1 Toggle OFF**
   - Current state must be On
   - Tap Relay 1 toggle button
   - ✅ Expected: Button shows "Updating..."
   - ✅ Expected: MQTT command succeeds
   - ✅ Expected: Firestore channel.state = "off"
   - ✅ Expected: Button shows "Turn ON"
   - ✅ Expected: State badge becomes red (Off)

5. **Relay 2 Disabled**
   - ✅ Expected: Button visible but disabled (low opacity)
   - ✅ Expected: Text shows "MQTT support pending"
   - ✅ Expected: Button not tappable

6. **Relay 3 & 4 Disabled**
   - ✅ Expected: Both disabled with "MQTT support pending" message
   - ✅ Expected: Not tappable

7. **Rapid Relay 1 Toggles**
   - Toggle Relay 1 On → immediately toggle again to Off
   - ✅ Expected: Second tap ignored during first update (per-channel loading state)
   - ✅ Expected: Both commands sent and Firestore updated correctly

8. **Multiple Channels Interaction (if 4-relay device)**
   - If channels were provisioned:
     - ✅ Expected: Relay 1 button responsive
     - ✅ Expected: Relay 2-4 buttons present but disabled
     - ✅ Expected: No cross-channel interference

9. **App Restart State Persistence**
   - Restart app
   - Navigate to ControllerScreen
   - ✅ Expected: Channel state reflects last Firestore value
   - ✅ Expected: No stale UI state

10. **Error Scenarios**
    - Disconnect from WiFi during MQTT command
    - ✅ Expected: MQTT fails, no Firestore update
    - ✅ Expected: Button unlocks, error logged
    - ✅ Expected: App doesn't crash

11. **Firestore Verification**
    - Open Firestore console
    - Navigate to: `homes/{homeId}/devices/{deviceId}/channels/relay_1`
    - ✅ Expected: Document exists with:
      - `state: "on"` or `state: "off"` (lowercase string only)
      - `updatedAt: ISO_TIMESTAMP` (auto-set by service)
      - `lastUpdate: ISO_TIMESTAMP` (auto-set by service)
    - ✅ Expected: No `undefined` fields
    - ✅ Expected: No permission-denied errors in Firestore logs

12. **No Permission-Denied Errors**
    - Check browser console and app logs
    - ✅ Expected: No `[firestore/permission-denied]` errors
    - ✅ Expected: No `[firestore/unauthenticated]` errors
    - ✅ Expected: Firestore rules allow channel state writes

## Validation Results

### Type-Check
```
✅ PASS: 0 errors
```

### ESLint
```
✅ PASS: 0 errors (82 pre-existing warnings unrelated to Phase 2H)
```

### Git Diff Check
```
✅ PASS: No trailing whitespace or line ending issues
```

### Android Build
- Deferred by user decision
- Not run in Phase 2H
- Code changes are backward compatible

## Implementation Summary

### What Was Implemented

✅ **Per-Channel MQTT Wrapper**
- Added `sendRelayChannelCommand()` in mqttService
- Supports channelNumber parameter for future firmware
- Currently only Relay 1 works (maps to existing topic)
- Relay 2+ returns false with clear reason

✅ **Per-Channel Firestore Sync**
- Added `updateRelayChannelStatus()` in deviceDataService
- Sends MQTT command first, then updates Firestore
- Only updates Firestore on MQTT success
- Properly converts state to valid Firestore value

✅ **DeviceContext Channel Update Exposure**
- Added `updateExistingChannel()` function
- Exposes Firestore channel updates to components
- Updates local cache immutably
- Safe error handling

✅ **ControllerScreen Per-Channel Toggle**
- Added `handleChannelToggle()` handler
- Per-channel loading state (not global)
- Relay 1 fully controllable
- Relay 2-4 disabled with clear "MQTT support pending" message
- Local UI update immediately after Firestore sync

✅ **Backward Compatibility**
- Existing single-relay control preserved
- Legacy ProvisionedDevice fallback preserved
- MQTT topic format unchanged
- No breaking changes

### What Was NOT Implemented (Deferred)

❌ **Multi-Relay MQTT Support (Relay 2-4)**
- Requires firmware extension to support `esp32/{deviceId}/relay/{n}/set` topics
- Deferred to Phase 2I
- Current firmware does not support numbered relay topics

❌ **HomeScreen Multi-Relay Awareness**
- HomeScreen still uses single-relay toggle
- Deferred to Phase 2I with multi-relay MQTT support

❌ **Channel Renaming UI**
- Channel display name can be updated in Firestore
- But no UI to rename channels yet
- Deferred to future phase

## Known Limitations

1. **Firmware Dependency**: Relay 2-4 control requires ESP32 firmware changes
2. **Single Relay Command Format**: Current firmware only supports `esp32/{deviceId}/relay/set` without channel number
3. **No OTA Updates**: Firmware updates must be done manually (not in scope)
4. **Local Device Fallback**: Local ProvisionedDevice devices do not sync to Firestore (by design)

## Future Phases

### Phase 2I - Multi-Relay MQTT Implementation
- Requires firmware to support `esp32/{deviceId}/relay/{n}/set` topics
- Implement per-relay state feedback topics: `esp32/{deviceId}/relay/{n}/state`
- Enable Relay 2-4 control buttons in ControllerScreen
- Update HomeScreen to show relay count badges

### Phase 2J - Channel Management UI
- Add channel renaming screen
- Allow user to rename relays (e.g., "Relay 1" → "Living Room Light")
- Persist custom names in Firestore

### Phase 2K - Scenes & Automation
- Create scenes that control multiple relays at once
- Time-based automation for relay control
- Scheduling and recurring automation

## Commit Information

**Branch**: `settings-improvement`  
**Latest Commit**: (to be created after this report)  
**Commit Message**: `feat: add per-relay MQTT control and Firestore state sync`

**Files to Stage**:
- `src/contexts/DeviceContext.tsx`
- `src/services/mqttService.ts`
- `src/services/deviceDataService.ts`
- `src/screens/ControllerScreen.tsx`
- `PHASE_2H_PER_RELAY_MQTT_STATE_SYNC_REPORT.md`

## Conclusion

Phase 2H successfully implements per-relay MQTT control and Firestore state synchronization for the ControllerScreen. Relay 1 is now fully controllable with state updates persisted to Firestore. Relay 2-4 remain disabled pending firmware-level multi-relay MQTT support (Phase 2I). All code is backward compatible with existing single-relay control and legacy local device provisioning.
