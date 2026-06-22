import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { getStorageService } from '../services/storageService';

interface RoomSelectorProps {
  selectedRoom: string;
  onSelectRoom: (room: string) => void;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({ selectedRoom, onSelectRoom }) => {
  const [rooms, setRooms] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const storageService = getStorageService();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const existingRooms = await storageService.getRooms();
      setRooms(existingRooms);
    } catch (error) {
      console.error('[RoomSelector] Error loading rooms:', error);
    }
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'Room name cannot be empty');
      return;
    }

    if (newRoomName.length < 2) {
      Alert.alert('Error', 'Room name must be at least 2 characters');
      return;
    }

    if (rooms.includes(newRoomName)) {
      Alert.alert('Error', 'This room already exists');
      return;
    }

    setIsCreating(true);
    setNewRoomName('');
    onSelectRoom(newRoomName.trim());
    setShowModal(false);
    
    // Reload rooms to show the new one
    setTimeout(() => {
      loadRooms();
      setIsCreating(false);
    }, 300);
  };

  return (
    <View>
      {/* Selected Room Display */}
      <View style={styles.container}>
        <Text style={styles.label}>Room</Text>
        <TouchableOpacity
          style={styles.roomButton}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="home" size={16} color="#3B82F6" style={styles.roomIcon} />
          <Text style={styles.roomButtonText}>{selectedRoom}</Text>
          <Icon name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Room Selection Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Room</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="x" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Room List */}
            <ScrollView
              style={styles.roomList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.roomListContent}
            >
              {rooms.map(room => (
                <TouchableOpacity
                  key={room}
                  style={[
                    styles.roomOption,
                    selectedRoom === room && styles.roomOptionSelected,
                  ]}
                  onPress={() => {
                    onSelectRoom(room);
                    setShowModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="home"
                    size={16}
                    color={selectedRoom === room ? '#3B82F6' : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.roomOptionText,
                      selectedRoom === room && styles.roomOptionTextSelected,
                    ]}
                  >
                    {room}
                  </Text>
                  {selectedRoom === room && (
                    <Icon name="check" size={16} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Create New Room */}
              <TouchableOpacity
                style={styles.createRoomButton}
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <View style={styles.createRoomContent}>
                  <Icon name="plus" size={16} color="#3B82F6" />
                  <Text style={styles.createRoomText}>Create New Room</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Create Room Input Section */}
            <View style={styles.createInputSection}>
              <TextInput
                style={styles.createInput}
                placeholder="Room name (e.g., Master Bedroom)"
                placeholderTextColor="#D1D5DB"
                value={newRoomName}
                onChangeText={setNewRoomName}
                maxLength={30}
                editable={!isCreating}
              />
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!newRoomName.trim() || isCreating) && styles.createButtonDisabled,
                ]}
                onPress={handleCreateRoom}
                disabled={!newRoomName.trim() || isCreating}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>
                  {isCreating ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  roomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  roomIcon: {
    marginRight: 4,
  },

  roomButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  roomList: {
    maxHeight: 300,
  },

  roomListContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  roomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },

  roomOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  roomOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },

  roomOptionTextSelected: {
    fontWeight: '600',
    color: '#3B82F6',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  createRoomButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 8,
  },

  createRoomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  createRoomText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Create Input Section
  createInputSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  createInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },

  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },

  createButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default RoomSelector;
