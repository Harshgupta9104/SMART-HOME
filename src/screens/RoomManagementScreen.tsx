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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { getStorageService } from '../services/storageService';

const RoomManagementScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [rooms, setRooms] = useState<string[]>([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [loading, setLoading] = useState(true);

  const storageService = getStorageService();

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [])
  );

  const loadRooms = async () => {
    try {
      setLoading(true);
      const savedRooms = await storageService.getRooms();
      setRooms(savedRooms);
    } catch (error) {
      console.error('[RoomManagement] Error loading rooms:', error);
      Alert.alert('Error', 'Failed to load rooms');
    } finally {
      setLoading(false);
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
      await loadRooms();
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
      await loadRooms();
      Alert.alert('Success', `Room renamed to "${trimmedNewName}"`);
    } catch (error) {
      console.error('[RoomManagement] Error renaming room:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to rename room');
    }
  };

  const handleDeleteRoom = async (roomName: string) => {
    try {
      // Check device count
      const devicesInRoom = await storageService.getDevicesByRoom(roomName);

      if (devicesInRoom.length > 0) {
        Alert.alert(
          'Devices in Room',
          `This room has ${devicesInRoom.length} device(s). Move them to "Unassigned"?`,
          [
            {
              text: 'Cancel',
              onPress: () => {},
              style: 'cancel',
            },
            {
              text: 'Delete & Move',
              onPress: async () => {
                await storageService.deleteRoom(roomName);
                await loadRooms();
                Alert.alert('Success', `Room "${roomName}" deleted. Devices moved to Unassigned`);
              },
              style: 'destructive',
            },
          ]
        );
      } else {
        Alert.alert('Confirm Delete', `Delete room "${roomName}"?`, [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: async () => {
              await storageService.deleteRoom(roomName);
              await loadRooms();
              Alert.alert('Success', `Room "${roomName}" deleted`);
            },
            style: 'destructive',
          },
        ]);
      }
    } catch (error) {
      console.error('[RoomManagement] Error deleting room:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to delete room');
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Manage Rooms</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
          <Icon name="info" size={18} color={theme.primary} />
          <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
            Create rooms to organize and filter your devices
          </Text>
        </View>

        {/* Rooms List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CUSTOM ROOMS</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading rooms...</Text>
            </View>
          ) : rooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="inbox" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No rooms yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Add your first room below</Text>
            </View>
          ) : (
            <View>
              {rooms.map(room => (
                <View key={room} style={[styles.roomItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.roomItemContent}>
                    <Icon name="home" size={18} color={theme.primary} />
                    <Text style={[styles.roomItemName, { color: theme.textPrimary }]}>{room}</Text>
                  </View>
                  <View style={styles.roomItemActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.primarySoft }]}
                      onPress={() => {
                        setEditingRoom(room);
                        setEditingRoomName(room);
                      }}
                    >
                      <Icon name="edit-2" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                      onPress={() => handleDeleteRoom(room)}
                    >
                      <Icon name="trash-2" size={16} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Add Room Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 12 }]}>
        {!showAddInput ? (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowAddInput(true)}
          >
            <Icon name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Room</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Enter room name"
              placeholderTextColor={theme.textMuted}
              value={newRoomName}
              onChangeText={setNewRoomName}
              autoFocus
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={[styles.inputButton, { backgroundColor: theme.background }]}
                onPress={() => {
                  setShowAddInput(false);
                  setNewRoomName('');
                }}
              >
                <Text style={[styles.inputButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.inputButton, { backgroundColor: theme.primary }]} onPress={handleAddRoom}>
                <Text style={[styles.inputButtonText, { color: 'white' }]}>Save</Text>
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    scrollView: {
      flex: 1,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      margin: 16,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    infoBannerText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500',
    },
    section: {
      paddingHorizontal: 16,
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 13,
      fontWeight: '500',
    },
    emptyContainer: {
      paddingVertical: 40,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 8,
    },
    emptySubtext: {
      fontSize: 12,
    },
    roomItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      marginBottom: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    roomItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    roomItemName: {
      fontSize: 14,
      fontWeight: '600',
    },
    roomItemActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
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
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
    },
    inputContainer: {
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      gap: 10,
    },
    input: {
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '500',
    },
    inputActions: {
      flexDirection: 'row',
      gap: 8,
    },
    inputButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    editModal: {
      width: '80%',
      borderRadius: 14,
      padding: 20,
      gap: 14,
    },
    editModalTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    editInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '500',
    },
    editModalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    editModalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    editModalButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });

export default RoomManagementScreen;
