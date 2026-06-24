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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getStorageService, ProvisionedDevice } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';

interface RoomInfo {
  name: string;
  deviceCount: number;
  devices: ProvisionedDevice[];
}

const RoomManagementScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');

  const storageService = getStorageService();

  const loadRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      const grouped = await storageService.getDevicesGroupedByRoom();
      const roomList: RoomInfo[] = Object.entries(grouped).map(([name, devices]) => ({
        name,
        deviceCount: devices.length,
        devices,
      }));
      setRooms(roomList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('[RoomManagement] Error loading rooms:', error);
      Alert.alert('Error', 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleRenameRoom = async (oldName: string) => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'Room name cannot be empty');
      return;
    }

    if (newRoomName === oldName) {
      setEditingRoom(null);
      return;
    }

    if (rooms.some(r => r.name === newRoomName)) {
      Alert.alert('Error', 'A room with this name already exists');
      return;
    }

    try {
      setIsLoading(true);
      await storageService.renameRoom(oldName, newRoomName.trim());
      setEditingRoom(null);
      setNewRoomName('');
      await loadRooms();
    } catch (error) {
      console.error('[RoomManagement] Error renaming room:', error);
      Alert.alert('Error', 'Failed to rename room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = (room: RoomInfo) => {
    // Since rooms are dynamically generated from devices, deletion is not applicable
    // Empty rooms automatically disappear when devices are removed
    Alert.alert(
      'About Empty Rooms',
      'Rooms are created automatically when devices are assigned to them. Empty rooms disappear automatically when their last device is removed.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Icon name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Rooms</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {rooms.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No Rooms</Text>
              <Text style={styles.emptySubtitle}>Create a room when you add a device</Text>
            </View>
          ) : (
            <>
              {rooms.map(room => (
                <View key={room.name} style={styles.roomCard}>
                  {editingRoom === room.name ? (
                    // Edit Mode
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={newRoomName}
                        onChangeText={setNewRoomName}
                        placeholder="Room name"
                        placeholderTextColor={theme.textMuted}
                        autoFocus
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: theme.success }]}
                        onPress={() => handleRenameRoom(room.name)}
                        disabled={isLoading}
                      >
                        <Icon name="check" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: theme.danger }]}
                        onPress={() => {
                          setEditingRoom(null);
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
                          <Text style={styles.roomName}>{room.name}</Text>
                          <Text style={styles.deviceCount}>
                            {room.deviceCount} device{room.deviceCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View style={styles.roomBadge}>
                          <Text style={styles.roomBadgeText}>{room.deviceCount}</Text>
                        </View>
                      </View>

                      {/* Room Actions */}
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            setEditingRoom(room.name);
                            setNewRoomName(room.name);
                          }}
                          disabled={isLoading}
                        >
                          <Icon name="edit-2" size={16} color={theme.primary} />
                          <Text style={[styles.actionButtonText, { color: theme.primary }]}>Rename</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.infoButton]}
                          onPress={() => handleDeleteRoom(room)}
                          disabled={isLoading}
                        >
                          <Icon name="info" size={16} color={theme.primary} />
                          <Text style={[styles.actionButtonText, { color: theme.primary }]}>About Rooms</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Device List */}
                      {room.devices.length > 0 && (
                        <View style={styles.deviceList}>
                          {room.devices.map(device => (
                            <View key={device.id} style={styles.deviceItem}>
                              <Icon name="smartphone" size={14} color={theme.textMuted} />
                              <Text style={styles.deviceItemText} numberOfLines={1}>
                                {device.displayName || device.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Rename or delete rooms. You cannot delete rooms with devices.
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
    },

    content: {
      flex: 1,
    },

    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
      gap: 12,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
    },

    emptySubtitle: {
      fontSize: 14,
      color: theme.textMuted,
    },

    roomCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },

    editContainer: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },

    editInput: {
      flex: 1,
      backgroundColor: theme.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
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
      marginBottom: 12,
    },

    roomDetails: {
      flex: 1,
      gap: 4,
    },

    roomName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
    },

    deviceCount: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
    },

    roomBadge: {
      backgroundColor: theme.primarySoft,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },

    roomBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },

    actions: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },

    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.primarySoft,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 6,
    },

    infoButton: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.border,
    },

    actionButtonText: {
      fontSize: 12,
      fontWeight: '700',
    },

    deviceList: {
      backgroundColor: theme.inputBackground,
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
      color: theme.textSecondary,
      fontWeight: '500',
      flex: 1,
    },

    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: theme.surface,
    },

    footerText: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 16,
    },
  });

export default RoomManagementScreen;
