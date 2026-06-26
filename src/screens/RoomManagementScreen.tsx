import React, { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { getStorageService, ProvisionedDevice } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import { useRoom } from '../contexts/RoomContext';
import { Room } from '../types/room';

// Constants
const ROOM_ALL = 'All rooms';
const ROOM_UNASSIGNED = 'Unassigned';

// Helpers
const normalizeRoomName = (name?: string): string =>
  (name || ROOM_UNASSIGNED).trim().toLowerCase();

const getDevicesForRoom = (
  roomName: string,
  deviceList: ProvisionedDevice[]
): ProvisionedDevice[] =>
  deviceList.filter(device => normalizeRoomName(device.roomName) === normalizeRoomName(roomName));

interface RoomItem {
  id: string;
  name: string;
  icon: string;
  deviceCount: number;
  devices: ProvisionedDevice[];
}

const RoomManagementScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { rooms: firestoreRooms, loadingState: roomLoadingState, createNewRoom, updateExistingRoom, archiveExistingRoom } = useRoom();
  const [roomItems, setRoomItems] = useState<RoomItem[]>([]);
  const [draftRooms, setDraftRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [sortMode, setSortMode] = useState<'name_asc' | 'name_desc' | 'device_count_asc' | 'device_count_desc' | 'custom'>('custom');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showAddRoomSheet, setShowAddRoomSheet] = useState(false);
  const [addRoomName, setAddRoomName] = useState('');

  const storageService = getStorageService();

  // Helper function for sorting (stable, no dependencies)
  const applySort = useCallback((
    roomList: RoomItem[],
    mode: typeof sortMode
  ): RoomItem[] => {
    const copy = [...roomList];

    switch (mode) {
      case 'name_asc':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return copy.sort((a, b) => b.name.localeCompare(a.name));
      case 'device_count_desc':
        return copy.sort((a, b) => {
          if (b.deviceCount !== a.deviceCount) {
            return b.deviceCount - a.deviceCount;
          }
          return a.name.localeCompare(b.name);
        });
      case 'device_count_asc':
        return copy.sort((a, b) => {
          if (a.deviceCount !== b.deviceCount) {
            return a.deviceCount - b.deviceCount;
          }
          return a.name.localeCompare(b.name);
        });
      case 'custom':
      default:
        return copy;
    }
  }, []);

  // Load room items from Firestore rooms and local devices
  const loadData = useCallback(async () => {
    try {
      // Get local devices for counts (read-only, Phase 2D will migrate to cloud)
      const savedDevices = await storageService.getProvisionedDevices();

      // Convert Firestore rooms to RoomItem for display
      const roomsWithDevices: RoomItem[] = firestoreRooms.map((room: Room) => {
        const devicesInRoom = getDevicesForRoom(room.name, savedDevices);
        return {
          id: room.id,
          name: room.name,
          icon: room.icon,
          deviceCount: devicesInRoom.length,
          devices: devicesInRoom,
        };
      });

      // Apply in-memory sort
      const sortedRooms = applySort(roomsWithDevices, sortMode);
      setRoomItems(sortedRooms);
      setDraftRooms(sortedRooms);
    } catch {
      console.error('[RoomManagement] Failed to load data');
      Alert.alert('Error', 'Failed to load rooms');
    }
  }, [firestoreRooms, sortMode, storageService, applySort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Trigger load when room loading state changes
    if (roomLoadingState === 'ready' || roomLoadingState === 'error') {
      loadData();
    }
  }, [roomLoadingState, loadData]);

  const handleSort = (mode: typeof sortMode) => {
    try {
      setShowSortSheet(false);

      if (mode === 'custom') {
        // Enter reorder mode
        setSortMode(mode);
        setDraftRooms([...roomItems]);
        setIsReorderMode(true);
      } else {
        // Apply sort immediately (in-memory only, no cloud persistence)
        setSortMode(mode);
        const sorted = applySort([...roomItems], mode);
        setRoomItems(sorted);
        setDraftRooms(sorted);
      }
    } catch {
      console.error('[RoomManagement] Failed to apply sort');
      Alert.alert('Error', 'Failed to sort rooms');
    }
  };

  const handleSaveOrder = () => {
    try {
      setIsLoading(true);
      // Option A: Sort modes are in-memory only for display
      // No cloud persistence for sort order yet
      setRoomItems(draftRooms);
      setIsReorderMode(false);
      setShowSortSheet(false);
      Alert.alert('Success', 'Room order updated (local display only)', [{ text: 'OK' }]);
    } catch {
      console.error('[RoomManagement] Failed to save order');
      Alert.alert('Error', 'Failed to save room order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReorder = () => {
    // Restore from roomItems without saving changes
    setDraftRooms([...roomItems]);
    setIsReorderMode(false);
  };

  const handleRenameRoom = async (roomId: string, oldName: string) => {
    const trimmedName = newRoomName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Room name cannot be empty');
      return;
    }

    if (trimmedName === ROOM_ALL || trimmedName === ROOM_UNASSIGNED) {
      Alert.alert('Error', `Cannot use reserved name "${trimmedName}"`);
      return;
    }

    if (trimmedName === oldName) {
      setEditingRoomId(null);
      return;
    }

    // Check for duplicate room names (case-insensitive)
    const nameExists = roomItems.some(
      r => normalizeRoomName(r.name) === normalizeRoomName(trimmedName) &&
           normalizeRoomName(r.name) !== normalizeRoomName(oldName)
    );

    if (nameExists) {
      Alert.alert('Error', 'A room with this name already exists');
      return;
    }

    try {
      setIsLoading(true);
      // Call Firestore room update through RoomContext
      await updateExistingRoom(roomId, { name: trimmedName });
      setEditingRoomId(null);
      setNewRoomName('');
      // loadData will be triggered by Firestore subscription
    } catch {
      console.error('[RoomManagement] Failed to rename room');
      Alert.alert('Error', 'Failed to rename room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async (room: RoomItem) => {
    Alert.alert(
      'Delete Room',
      `Delete "${room.name}"? Devices will remain but lose this room assignment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              // Archive room through Firestore RoomContext
              await archiveExistingRoom(room.id);
              // loadData will be triggered by Firestore subscription
            } catch {
              console.error('[RoomManagement] Failed to delete room');
              Alert.alert('Error', 'Failed to delete room');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddRoom = async () => {
    const trimmedName = addRoomName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Room name cannot be empty');
      return;
    }

    if (trimmedName === ROOM_ALL || trimmedName === ROOM_UNASSIGNED) {
      Alert.alert('Error', `Cannot use reserved name "${trimmedName}"`);
      return;
    }

    // Check for duplicate room names (case-insensitive)
    const nameExists = roomItems.some(
      r => normalizeRoomName(r.name) === normalizeRoomName(trimmedName)
    );

    if (nameExists) {
      Alert.alert('Error', 'A room with this name already exists');
      return;
    }

    try {
      setIsLoading(true);
      // Create room through Firestore RoomContext
      await createNewRoom(trimmedName);
      setAddRoomName('');
      setShowAddRoomSheet(false);
      // loadData will be triggered by Firestore subscription
    } catch {
      console.error('[RoomManagement] Failed to add room');
      Alert.alert('Error', 'Failed to add room');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: theme.inputBackground }]}
          onPress={() => {
            if (isReorderMode) {
              handleCancelReorder();
            } else {
              navigation.goBack();
            }
          }}
        >
          <Icon name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {isReorderMode ? 'Custom Order' : 'Manage Rooms'}
        </Text>
        <View style={styles.headerIconsRow}>
          {!isReorderMode && (
            <>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: theme.inputBackground }]}
                onPress={() => setShowSortSheet(true)}
              >
                <Icon name="sliders" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: theme.inputBackground }]}
                onPress={() => {
                  setAddRoomName('');
                  setShowAddRoomSheet(true);
                }}
              >
                <Icon name="plus" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Reorder Mode Banner */}
      {isReorderMode && (
        <View style={[styles.banner, { backgroundColor: theme.primarySoft, marginHorizontal: 16, marginVertical: 12, borderRadius: 14 }]}>
          <View style={styles.bannerContent}>
            <Icon name="move" size={16} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: theme.primary }]}>Custom order mode</Text>
              <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
                Long press a room for 2 seconds, drag it into position, then save.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading && !isReorderMode ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : roomItems.length === 0 ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        >
          <Icon name="inbox" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Rooms Yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Create your first room to get started
          </Text>
        </ScrollView>
      ) : isReorderMode ? (
        <View style={styles.content}>
          <DraggableFlatList
            data={draftRooms.length > 0 ? draftRooms : roomItems}
            onDragEnd={({ data }) => setDraftRooms(data)}
            keyExtractor={(item) => item.id}
            renderItem={({ item, drag, isActive }) => (
              <TouchableOpacity
                onLongPress={drag}
                delayLongPress={2000}
                style={[
                  styles.roomCard,
                  {
                    marginHorizontal: 16,
                    marginVertical: 7,
                    backgroundColor: isActive ? theme.primarySoft : theme.card,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={styles.dragHandle}>
                  <Icon name="menu" size={20} color={theme.primary} />
                </View>
                <View style={styles.roomInfo}>
                  <View>
                    <Text style={[styles.roomName, { color: theme.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.deviceCount, { color: theme.textMuted }]}>
                      {item.deviceCount} device{item.deviceCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.badgeText, { color: theme.primary }]}>{item.deviceCount}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Rooms</Text>
              </View>
            }
          />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          scrollEventThrottle={16}
          bounces={true}
        >
          {roomItems.map((room) => (
            <View
              key={room.id}
              style={[styles.roomCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              {editingRoomId === room.id ? (
                // Edit Mode
                <View style={styles.editContainer}>
                  <TextInput
                    style={[
                      styles.editInput,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      },
                    ]}
                    value={newRoomName}
                    onChangeText={setNewRoomName}
                    placeholder="Room name"
                    placeholderTextColor={theme.textMuted}
                    autoFocus
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.success }]}
                    onPress={() => handleRenameRoom(room.id, room.name)}
                    disabled={isLoading}
                  >
                    <Icon name="check" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.danger }]}
                    onPress={() => {
                      setEditingRoomId(null);
                      setNewRoomName('');
                    }}
                    disabled={isLoading}
                  >
                    <Icon name="x" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                // View Mode
                <>
                  <View style={styles.roomInfo}>
                    <View style={styles.roomDetails}>
                      <Text style={[styles.roomName, { color: theme.textPrimary }]}>{room.name}</Text>
                      <Text style={[styles.deviceCount, { color: theme.textMuted }]}>
                        {room.deviceCount} device{room.deviceCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.badgeText, { color: theme.primary }]}>{room.deviceCount}</Text>
                    </View>
                  </View>

                  {/* Room Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.primarySoft, borderColor: theme.border },
                      ]}
                      onPress={() => {
                        setEditingRoomId(room.id);
                        setNewRoomName(room.name);
                      }}
                      disabled={isLoading}
                    >
                      <Icon name="edit-2" size={16} color={theme.primary} />
                      <Text style={[styles.actionButtonText, { color: theme.primary }]}>Rename</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.primarySoft, borderColor: theme.border },
                      ]}
                      onPress={() => handleDeleteRoom(room)}
                      disabled={isLoading}
                    >
                      <Icon name="trash-2" size={16} color={theme.danger} />
                      <Text style={[styles.actionButtonText, { color: theme.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Device List */}
                  {room.devices.length > 0 && (
                    <View style={[styles.deviceList, { backgroundColor: theme.inputBackground }]}>
                      {room.devices.slice(0, 3).map(device => (
                        <View key={device.id} style={styles.deviceItem}>
                          <Icon name="smartphone" size={14} color={theme.textMuted} />
                          <Text style={[styles.deviceItemText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {device.displayName || device.name}
                          </Text>
                        </View>
                      ))}
                      {room.devices.length > 3 && (
                        <Text style={[styles.deviceItemText, { color: theme.textMuted }]}>
                          +{room.devices.length - 3} more
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Bottom Actions - Visible only in reorder mode */}
      {isReorderMode && (
        <View style={[styles.bottomActions, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.bottomButton, styles.bottomButtonCancel, { borderColor: theme.border, borderWidth: 1, backgroundColor: 'transparent' }]}
            onPress={handleCancelReorder}
            disabled={isLoading}
          >
            <Text style={[styles.bottomButtonText, { color: theme.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomButton, styles.bottomButtonSave, { backgroundColor: theme.success }]}
            onPress={handleSaveOrder}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.bottomButtonText, { color: '#FFFFFF' }]}>Save Order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Bottom Sheet */}
      {showSortSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowSortSheet(false)}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.surface, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <View style={styles.sheetTitleRow}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Sort Rooms</Text>
              <TouchableOpacity onPress={() => setShowSortSheet(false)}>
                <Icon name="x" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.sortOption,
                {
                  backgroundColor: sortMode === 'name_asc' ? theme.primarySoft : theme.inputBackground,
                  borderColor: sortMode === 'name_asc' ? theme.primary : theme.border,
                }
              ]}
              onPress={() => handleSort('name_asc')}
            >
              <Icon name="arrow-up" size={18} color={theme.primary} />
              <View style={styles.sortOptionContent}>
                <Text style={[styles.sortOptionText, { color: theme.textPrimary }]}>Name A–Z</Text>
                <Text style={[styles.sortOptionSubtext, { color: theme.textMuted }]}>
                  Alphabetical order
                </Text>
              </View>
              {sortMode === 'name_asc' && <Icon name="check-circle" size={18} color={theme.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                {
                  backgroundColor: sortMode === 'name_desc' ? theme.primarySoft : theme.inputBackground,
                  borderColor: sortMode === 'name_desc' ? theme.primary : theme.border,
                }
              ]}
              onPress={() => handleSort('name_desc')}
            >
              <Icon name="arrow-down" size={18} color={theme.primary} />
              <View style={styles.sortOptionContent}>
                <Text style={[styles.sortOptionText, { color: theme.textPrimary }]}>Name Z–A</Text>
                <Text style={[styles.sortOptionSubtext, { color: theme.textMuted }]}>
                  Reverse alphabetical order
                </Text>
              </View>
              {sortMode === 'name_desc' && <Icon name="check-circle" size={18} color={theme.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                {
                  backgroundColor: sortMode === 'device_count_desc' ? theme.primarySoft : theme.inputBackground,
                  borderColor: sortMode === 'device_count_desc' ? theme.primary : theme.border,
                }
              ]}
              onPress={() => handleSort('device_count_desc')}
            >
              <Icon name="bar-chart-2" size={18} color={theme.primary} />
              <View style={styles.sortOptionContent}>
                <Text style={[styles.sortOptionText, { color: theme.textPrimary }]}>Most devices first</Text>
                <Text style={[styles.sortOptionSubtext, { color: theme.textMuted }]}>
                  Rooms with more devices first
                </Text>
              </View>
              {sortMode === 'device_count_desc' && <Icon name="check-circle" size={18} color={theme.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                {
                  backgroundColor: sortMode === 'device_count_asc' ? theme.primarySoft : theme.inputBackground,
                  borderColor: sortMode === 'device_count_asc' ? theme.primary : theme.border,
                }
              ]}
              onPress={() => handleSort('device_count_asc')}
            >
              <Icon name="bar-chart" size={18} color={theme.primary} />
              <View style={styles.sortOptionContent}>
                <Text style={[styles.sortOptionText, { color: theme.textPrimary }]}>Fewest devices first</Text>
                <Text style={[styles.sortOptionSubtext, { color: theme.textMuted }]}>
                  Rooms with fewer devices first
                </Text>
              </View>
              {sortMode === 'device_count_asc' && <Icon name="check-circle" size={18} color={theme.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                {
                  backgroundColor: sortMode === 'custom' ? theme.primarySoft : theme.inputBackground,
                  borderColor: sortMode === 'custom' ? theme.primary : theme.border,
                }
              ]}
              onPress={() => handleSort('custom')}
            >
              <Icon name="move" size={18} color={theme.primary} />
              <View style={styles.sortOptionContent}>
                <Text style={[styles.sortOptionText, { color: theme.textPrimary }]}>Custom order</Text>
                <Text style={[styles.sortOptionSubtext, { color: theme.textMuted }]}>
                  Drag rooms into your own order
                </Text>
              </View>
              {sortMode === 'custom' && <Icon name="check-circle" size={18} color={theme.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Room Sheet */}
      {showAddRoomSheet && (
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.sheetOverlay}
        >
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowAddRoomSheet(false)}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.surface, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <View style={styles.sheetTitleRow}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Add Room</Text>
              <TouchableOpacity onPress={() => setShowAddRoomSheet(false)}>
                <Icon name="x" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.addRoomHelper, { color: theme.textMuted }]}>
              Create a room to organize your devices.
            </Text>

            <TextInput
              style={[
                styles.addRoomInput,
                { backgroundColor: theme.inputBackground, color: theme.textPrimary, borderColor: theme.border },
              ]}
              placeholder="Room name"
              placeholderTextColor={theme.textMuted}
              value={addRoomName}
              onChangeText={setAddRoomName}
              autoFocus
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={handleAddRoom}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Room</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerIconsRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
    },

    content: {
      flex: 1,
    },

    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
      paddingBottom: 100,
    },

    banner: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: 14,
    },

    bannerContent: {
      flex: 1,
      gap: 4,
    },

    bannerTitle: {
      fontSize: 13,
      fontWeight: '700',
    },

    bannerText: {
      fontSize: 12,
      fontWeight: '500',
    },

    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
    },

    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
    },

    roomCard: {
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      gap: 12,
      minHeight: 100,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },

    dragHandle: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    editContainer: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },

    editInput: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '600',
    },

    editButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },

    roomInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    roomDetails: {
      flex: 1,
      gap: 4,
    },

    roomName: {
      fontSize: 16,
      fontWeight: '700',
    },

    deviceCount: {
      fontSize: 12,
      fontWeight: '500',
    },

    badge: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    badgeText: {
      fontSize: 13,
      fontWeight: '700',
    },

    actions: {
      flexDirection: 'row',
      gap: 10,
    },

    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 6,
      minHeight: 40,
    },

    actionButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },

    deviceList: {
      borderRadius: 10,
      padding: 12,
      gap: 8,
    },

    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },

    deviceItemText: {
      fontSize: 12,
      fontWeight: '500',
      flex: 1,
    },

    bottomActions: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 14,
      gap: 12,
      borderTopWidth: 1,
    },

    bottomButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },

    bottomButtonCancel: {
      backgroundColor: 'transparent',
    },

    bottomButtonSave: {
      backgroundColor: '#FFFFFF',
    },

    bottomButtonText: {
      fontSize: 14,
      fontWeight: '700',
    },

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
      backgroundColor: 'rgba(0,0,0,0.25)',
    },

    sheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 12,
      maxHeight: '90%',
    },

    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 2.5,
      alignSelf: 'center',
      marginBottom: 16,
    },

    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
    },

    sheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },

    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      gap: 12,
      marginBottom: 10,
      borderWidth: 1,
    },

    sortOptionContent: {
      flex: 1,
      gap: 3,
      marginLeft: 12,
    },

    sortOptionText: {
      fontSize: 14,
      fontWeight: '600',
    },

    sortOptionSubtext: {
      fontSize: 12,
      fontWeight: '400',
    },

    addRoomInput: {
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 20,
    },

    addRoomHelper: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 14,
    },

    addButton: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },

    addButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });

export default RoomManagementScreen;
