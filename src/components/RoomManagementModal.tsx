import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { getStorageService, ProvisionedDevice } from '../services/storageService';

interface RoomManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface RoomInfo {
  name: string;
  deviceCount: number;
  devices: ProvisionedDevice[];
}

const RoomManagementModal: React.FC<RoomManagementModalProps> = ({
  visible,
  onClose,
  onRefresh,
}) => {
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
  }, [storageService]);

  useEffect(() => {
    if (visible) {
      loadRooms();
    }
  }, [visible, loadRooms]);

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
      onRefresh();
    } catch (error) {
      console.error('[RoomManagement] Error renaming room:', error);
      Alert.alert('Error', 'Failed to rename room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = (_room: RoomInfo) => {
    // Since rooms are dynamically generated from devices, deletion is not applicable
    // Empty rooms automatically disappear when devices are removed
    Alert.alert(
      'About Empty Rooms',
      'Rooms are created automatically when devices are assigned to them. Empty rooms disappear automatically when their last device is removed.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Icon name="chevron-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Rooms</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {rooms.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={48} color="#D1D5DB" />
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
                          placeholderTextColor="#D1D5DB"
                          autoFocus
                          editable={!isLoading}
                        />
                        <TouchableOpacity
                          style={[styles.editButton, { backgroundColor: '#10B981' }]}
                          onPress={() => handleRenameRoom(room.name)}
                          disabled={isLoading}
                        >
                          <Icon name="check" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editButton, { backgroundColor: '#EF4444' }]}
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
                            <Icon name="edit-2" size={16} color="#3B82F6" />
                            <Text style={styles.actionButtonText}>Rename</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.infoButton]}
                            onPress={() => handleDeleteRoom(room)}
                            disabled={isLoading}
                          >
                            <Icon name="info" size={16} color="#3B82F6" />
                            <Text style={styles.actionButtonText}>About Rooms</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Device List */}
                        {room.devices.length > 0 && (
                          <View style={styles.deviceList}>
                            {room.devices.map(device => (
                              <View key={device.id} style={styles.deviceItem}>
                                <Icon name="smartphone" size={14} color="#9CA3AF" />
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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
    color: '#111827',
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  roomCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    color: '#111827',
  },

  deviceCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  roomBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  roomBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 6,
  },

  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },

  infoButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },

  actionButtonTextDisabled: {
    color: '#D1D5DB',
  },

  deviceList: {
    backgroundColor: '#F9FAFB',
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
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },

  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default RoomManagementModal;
