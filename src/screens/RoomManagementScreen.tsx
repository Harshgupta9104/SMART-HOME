import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { getStorageService, RoomSortMode, ProvisionedDevice } from '../services/storageService';

const RoomManagementScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [rooms, setRooms] = useState<string[]>([]);
  const [devices, setDevices] = useState<ProvisionedDevice[]>([]);
  const [sortMode, setSortMode] = useState<RoomSortMode>('custom');
  const [showAddInput, setShowAddInput] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [loading, setLoading] = useState(true);

  const storageService = getStorageService();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [savedRooms, sortModeValue, provisionedDevices] = await Promise.all([
        storageService.getRooms(),
        storageService.getRoomSortMode(),
        storageService.getProvisionedDevices(),
      ]);
      setRooms(savedRooms);
      setSortMode(sortModeValue);
      setDevices(provisionedDevices);
    } catch (error) {
      console.error('[RoomManagement] Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getRoomDeviceCount = (roomName: string): number => {
    return devices.filter(device => (device.roomName || 'Unassigned').toLowerCase() === roomName.toLowerCase()).length;
  };

  const getSortedPreviewRooms = (): string[] => {
    const roomsCopy = [...rooms];
    switch (sortMode) {
      case 'name_asc':
        return roomsCopy.sort((a, b) => a.localeCompare(b));
      case 'name_desc':
        return roomsCopy.sort((a, b) => b.localeCompare(a));
      case 'device_count_desc':
        return roomsCopy.sort((a, b) => {
          const countDiff = getRoomDeviceCount(b) - getRoomDeviceCount(a);
          return countDiff !== 0 ? countDiff : a.localeCompare(b);
        });
      case 'device_count_asc':
        return roomsCopy.sort((a, b) => {
          const countDiff = getRoomDeviceCount(a) - getRoomDeviceCount(b);
          return countDiff !== 0 ? countDiff : a.localeCompare(b);
        });
      case 'custom':
      default:
        return roomsCopy;
    }
  };

  const getSortLabel = (mode: RoomSortMode): string => {
    switch (mode) {
      case 'name_asc': return 'A-Z';
      case 'name_desc': return 'Z-A';
      case 'device_count_desc': return 'Most used';
      case 'device_count_asc': return 'Least used';
      case 'custom':
      default:
        return 'Custom';
    }
  };

  const getSortIcon = (mode: RoomSortMode): string => {
    switch (mode) {
      case 'name_asc': return 'arrow-up';
      case 'name_desc': return 'arrow-down';
      case 'device_count_desc': return 'trending-up';
      case 'device_count_asc': return 'trending-down';
      case 'custom':
      default:
        return 'sliders';
    }
  };

  const renderSortOption = (mode: RoomSortMode) => (
    <TouchableOpacity
      key={mode}
      style={[
        styles.sortCard,
        { backgroundColor: theme.card, borderColor: theme.border },
        sortMode === mode && { backgroundColor: theme.primarySoft, borderColor: theme.primary },
      ]}
      onPress={() => handleSortModeChange(mode)}
    >
      <Icon
        name={getSortIcon(mode)}
        size={22}
        color={sortMode === mode ? theme.primary : theme.textSecondary}
      />
      <Text
        style={[
          styles.sortCardLabel,
          { color: sortMode === mode ? theme.primary : theme.textPrimary },
        ]}
      >
        {getSortLabel(mode)}
      </Text>
    </TouchableOpacity>
  );

  const renderRoomCard = (room: string) => {
    const count = getRoomDeviceCount(room);
    return (
      <View key={room} style={[styles.roomCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.roomCardLeft}>
          <View style={[styles.roomIconBox, { backgroundColor: theme.primarySoft }]}>
            <Icon name="home" size={20} color={theme.primary} />
          </View>
          <View style={styles.roomCardInfo}>
            <Text style={[styles.roomName, { color: theme.textPrimary }]}>{room}</Text>
            <Text
              style={[
                styles.roomDeviceCount,
                { color: count > 0 ? theme.primary : theme.textMuted },
              ]}
            >
              {count > 0 ? `${count} device${count !== 1 ? 's' : ''}` : 'No devices'}
            </Text>
          </View>
          {count > 0 && (
            <View style={[styles.activeBadge, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.activeBadgeText, { color: theme.primary }]}>Active</Text>
            </View>
          )}
        </View>
        <View style={styles.roomCardActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primarySoft }]}
            onPress={() => {
              setEditingRoom(room);
              setEditingRoomName(room);
            }}
          >
            <Icon name="edit-2" size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
            onPress={() => handleDeleteRoom(room)}
          >
            <Icon name="trash-2" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleSortModeChange = async (newMode: RoomSortMode) => {
    try {
      setSortMode(newMode);
      await storageService.saveRoomSortMode(newMode);
    } catch (error) {
      console.error('[RoomManagement] Error saving sort mode:', error);
      Alert.alert('Error', 'Failed to save sort mode');
    }
  };

  const getSortModeLabel = (mode: RoomSortMode): string => {
    switch (mode) {
      case 'name_asc': return 'Name A-Z';
      case 'name_desc': return 'Name Z-A';
      case 'device_count_desc': return 'Most devices first';
      case 'device_count_asc': return 'Least devices first';
      case 'custom':
      default:
        return 'Custom order';
    }
  };

  const handleAddRoom = async () => {
    try {
      const trimmedName = newRoomName.trim();
      if (!trimmedName) {
        Alert.alert('Error', 'Room name cannot be empty');
        return;
      }
      await storageService.addRoom(trimmedName);
      setNewRoomName('');
      setShowAddInput(false);
      await loadData();
      Alert.alert('Success', `Room "${trimmedName}" added`);
    } catch (error) {
      console.error('[RoomManagement] Error adding room:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to add room');
    }
  };

  const handleRenameRoom = async () => {
    try {
      if (!editingRoom) return;
      const trimmedNewName = editingRoomName.trim();
      if (!trimmedNewName) {
        Alert.alert('Error', 'Room name cannot be empty');
        return;
      }
      await storageService.renameRoom(editingRoom, trimmedNewName);
      setEditingRoom(null);
      setEditingRoomName('');
      await loadData();
      Alert.alert('Success', `Room renamed to "${trimmedNewName}"`);
    } catch (error) {
      console.error('[RoomManagement] Error renaming room:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to rename room');
    }
  };

  const handleDeleteRoom = async (roomName: string) => {
    try {
      const devicesInRoom = await storageService.getDevicesByRoom(roomName);
      if (devicesInRoom.length > 0) {
        Alert.alert(
          'Move devices before deleting?',
          `"${roomName}" has ${devicesInRoom.length} device(s). Deleting it will move them to Unassigned.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Move & Delete',
              onPress: async () => {
                await storageService.deleteRoom(roomName);
                await loadData();
                Alert.alert('Success', `Room deleted. Devices moved to Unassigned`);
              },
              style: 'destructive',
            },
          ]
        );
      } else {
        Alert.alert(
          'Delete Room?',
          `"${roomName}" will be removed from your room list.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              onPress: async () => {
                await storageService.deleteRoom(roomName);
                await loadData();
                Alert.alert('Success', `Room deleted`);
              },
              style: 'destructive',
            },
          ]
        );
      }
    } catch (error) {
      console.error('[RoomManagement] Error deleting room:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to delete room');
    }
  };

  const styles = createStyles(theme);
  const sortedPreviewRooms = getSortedPreviewRooms();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Manage Rooms</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Organize your smart home</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
          <Icon name="home" size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: theme.textPrimary }]}>Create rooms to organize</Text>
            <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
              Group and filter devices by location
            </Text>
          </View>
        </View>

        {/* HomeScreen Preview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>HOMESCREEN PREVIEW</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            This is how room chips will appear on your dashboard
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewScroll}
            contentContainerStyle={styles.previewContent}
          >
            <View style={[styles.previewChip, { backgroundColor: theme.primary }]}>
              <Text style={styles.previewChipTextSelected}>All rooms</Text>
            </View>
            {sortedPreviewRooms.map(room => {
              const count = getRoomDeviceCount(room);
              return (
                <View key={room} style={[styles.previewChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.previewChipText, { color: theme.textPrimary }]}>
                    {room}{count > 0 ? ` (${count})` : ''}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Room Chip Order Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ROOM CHIP ORDER</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Choose how room chips are ordered
          </Text>

          <View style={styles.sortGrid}>
            {(['custom', 'name_asc', 'name_desc', 'device_count_desc', 'device_count_asc'] as RoomSortMode[]).map(
              mode => renderSortOption(mode)
            )}
          </View>
        </View>

        {/* Custom Rooms Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CUSTOM ROOMS</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Tap edit to rename or delete unused rooms
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading rooms...</Text>
            </View>
          ) : rooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="inbox" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>No rooms yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Add your first room to get started</Text>
            </View>
          ) : (
            <View>{rooms.map(room => renderRoomCard(room))}</View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Add Room Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background }]}>
        {!showAddInput ? (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowAddInput(true)}
          >
            <Icon name="plus" size={22} color="white" />
            <Text style={styles.addButtonText}>Add Room</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputTitle, { color: theme.textPrimary }]}>Add Room</Text>
            <Text style={[styles.inputHelper, { color: theme.textSecondary }]}>
              Room names appear as filters on HomeScreen
            </Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="Example: Study Room"
              placeholderTextColor={theme.textMuted}
              value={newRoomName}
              onChangeText={setNewRoomName}
              autoFocus
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={[styles.inputButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  setShowAddInput(false);
                  setNewRoomName('');
                }}
              >
                <Text style={[styles.inputButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.inputButton, { backgroundColor: theme.primary }]} onPress={handleAddRoom}>
                <Text style={[styles.inputButtonText, { color: 'white' }]}>Save Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Edit Room Modal */}
      {editingRoom && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.editModal, { backgroundColor: theme.surface }]}>
            <Text style={[styles.editModalTitle, { color: theme.textPrimary }]}>Rename Room</Text>
            <Text style={[styles.editModalHelper, { color: theme.textSecondary }]}>
              Room names appear as filters on HomeScreen
            </Text>

            <TextInput
              style={[styles.editInput, { color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="New room name"
              placeholderTextColor={theme.textMuted}
              value={editingRoomName}
              onChangeText={setEditingRoomName}
              autoFocus
            />

            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  setEditingRoom(null);
                  setEditingRoomName('');
                }}
              >
                <Text style={[styles.editModalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, { backgroundColor: theme.primary }]}
                onPress={handleRenameRoom}
              >
                <Text style={[styles.editModalButtonText, { color: 'white' }]}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      gap: 12,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: -8,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 11,
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 20,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
    },
    infoBannerTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    infoBannerText: {
      fontSize: 11,
      fontWeight: '500',
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 6,
      paddingHorizontal: 2,
    },
    sectionSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    previewScroll: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
    },
    previewContent: {
      gap: 8,
      paddingRight: 16,
    },
    previewChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    previewChipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    previewChipTextSelected: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
    },
    sortGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 4,
    },
    sortCard: {
      width: '48%',
      height: 72,
      borderRadius: 16,
      borderWidth: 1,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    sortCardLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    roomCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
      borderRadius: 16,
      borderWidth: 1,
    },
    roomCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    roomIconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    roomCardInfo: {
      flex: 1,
      gap: 2,
    },
    roomName: {
      fontSize: 14,
      fontWeight: '700',
    },
    roomDeviceCount: {
      fontSize: 11,
      fontWeight: '500',
    },
    activeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    activeBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    roomCardActions: {
      flexDirection: 'row',
      gap: 8,
      marginLeft: 10,
    },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 13,
      fontWeight: '500',
    },
    emptyContainer: {
      paddingVertical: 48,
      alignItems: 'center',
      gap: 10,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginTop: 8,
    },
    emptySubtext: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    bottomContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0, 0, 0, 0.08)',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      borderRadius: 16,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: 'white',
    },
    inputContainer: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      gap: 12,
    },
    inputTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    inputHelper: {
      fontSize: 12,
      fontWeight: '500',
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontWeight: '500',
    },
    inputActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    inputButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    inputButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    editModal: {
      width: '85%',
      borderRadius: 18,
      padding: 20,
      gap: 14,
    },
    editModalTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    editModalHelper: {
      fontSize: 12,
      fontWeight: '500',
    },
    editInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 4,
    },
    editModalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    editModalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    editModalButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
  });

export default RoomManagementScreen;
