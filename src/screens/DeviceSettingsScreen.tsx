import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { ProvisionedDevice, getStorageService } from '../services/storageService';
import { CloudDevice } from '../types/device';
import { deviceService } from '../services/firebase/deviceService';
import { useTheme } from '../context/ThemeContext';
import { useDevice } from '../contexts/DeviceContext';
import { useRoom } from '../contexts/RoomContext';

interface DeviceSettingsScreenProps {
  device: ProvisionedDevice | CloudDevice;
  onDeviceRemoved: () => void;
}

const DeviceSettingsScreen: React.FC<DeviceSettingsScreenProps> = ({ device, onDeviceRemoved }) => {
  const { theme, isDark } = useTheme();
  const { updateExistingDevice } = useDevice();
  const { rooms: firestoreRooms } = useRoom();
  
  // Support both ProvisionedDevice and CloudDevice
  const isCloudDevice = (dev: any): dev is CloudDevice => dev && 'mqttDeviceId' in dev;
  const cloudDevice = isCloudDevice(device) ? device : null;
  
  const [currentDevice, setCurrentDevice] = useState<ProvisionedDevice | CloudDevice>(device);
  const [rooms, setRooms] = useState<string[]>([]);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [updatingRoom, setUpdatingRoom] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState(false);

  // Rename state
  const [renamingDevice, setRenamingDevice] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState(
    isCloudDevice(device) ? (device as CloudDevice).name : (device as ProvisionedDevice).displayName || (device as ProvisionedDevice).name
  );

  const storageService = getStorageService();

  /**
   * Find Firestore room ID by room name (normalize and match)
   */
  const findRoomIdByName = useCallback(
    (roomName?: string): string | undefined => {
      if (!roomName || roomName === 'Unassigned') return undefined;
      const normalized = roomName.trim().toLowerCase();
      const matchedRoom = firestoreRooms.find(room => room.name.trim().toLowerCase() === normalized);
      return matchedRoom?.id;
    },
    [firestoreRooms],
  );

  const loadRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const savedRooms = await storageService.getRooms();
      // Add "Unassigned" to the list if not already present
      const allRooms = ['Unassigned', ...savedRooms];
      setRooms(allRooms);
    } catch (error) {
      console.error('[DeviceSettings] Error loading rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  }, [storageService]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleChangeRoom = async (selectedRoom: string) => {
    try {
      const trimmedRoom = selectedRoom.trim();

      // Validate room exists
      if (!rooms.includes(trimmedRoom)) {
        Alert.alert('Error', 'Selected room does not exist');
        return;
      }

      setUpdatingRoom(true);
      setShowRoomPicker(false);

      // Determine roomId for Firestore (null for Unassigned, found room ID otherwise)
      const roomId = trimmedRoom === 'Unassigned' ? null : findRoomIdByName(trimmedRoom);

      // Update Firestore if CloudDevice
      if (cloudDevice) {
        console.log('[DeviceSettings] Updating CloudDevice room:', { 
          deviceId: cloudDevice.id, 
          roomId, 
          roomName: trimmedRoom 
        });
        // Update Firestore with both roomId and roomName
        await updateExistingDevice(cloudDevice.id, { 
          roomId: roomId || undefined,
          roomName: trimmedRoom 
        });

        // Update local storage using cloudDevice.localDeviceId
        if (cloudDevice.localDeviceId) {
          try {
            await storageService.updateDeviceRoom(cloudDevice.localDeviceId, trimmedRoom);
            console.log('[DeviceSettings] Updated local storage room for CloudDevice:', cloudDevice.localDeviceId);
          } catch (err) {
            console.warn('[DeviceSettings] Failed to update local storage room (non-fatal):', err);
          }
        }
      } else {
        // Update device room in storage for ProvisionedDevice
        await storageService.updateDeviceRoom(currentDevice.id, trimmedRoom);
      }

      // Update local state
      const updatedDevice = { ...currentDevice, roomName: trimmedRoom };
      setCurrentDevice(updatedDevice);

      Alert.alert('Success', `Device moved to ${trimmedRoom}`);
    } catch (error) {
      console.error('[DeviceSettings] Error changing room:', error);
      Alert.alert('Error', 'Failed to change room');
    } finally {
      setUpdatingRoom(false);
    }
  };

  const handleRenameDevice = async () => {
    try {
      const trimmedName = newDeviceName.trim();

      // Validation
      if (!trimmedName) {
        Alert.alert('Error', 'Device name cannot be empty');
        return;
      }

      if (trimmedName.length > 40) {
        Alert.alert('Error', 'Device name must be 40 characters or less');
        return;
      }

      setRenamingDevice(true);
      setShowRenameModal(false);

      // Update Firestore if CloudDevice
      if (cloudDevice) {
        console.log('[DeviceSettings] Renaming CloudDevice:', { deviceId: cloudDevice.id, newName: trimmedName });
        await updateExistingDevice(cloudDevice.id, { name: trimmedName });

        // Also update local storage using cloudDevice.localDeviceId
        if (cloudDevice.localDeviceId) {
          try {
            await storageService.updateProvisionedDevice(cloudDevice.localDeviceId, { displayName: trimmedName });
            console.log('[DeviceSettings] Updated local storage name for CloudDevice:', cloudDevice.localDeviceId);
          } catch (err) {
            console.warn('[DeviceSettings] Failed to update local storage name (non-fatal):', err);
          }
        }
      }

      // Update local storage if ProvisionedDevice
      if (!isCloudDevice(currentDevice)) {
        const provDevice = currentDevice as ProvisionedDevice;
        console.log('[DeviceSettings] Renaming ProvisionedDevice:', { deviceId: provDevice.id, newName: trimmedName });
        await storageService.updateProvisionedDevice(provDevice.id, { displayName: trimmedName });
      }

      // Update local state
      const updatedDevice = {
        ...currentDevice,
        ...(isCloudDevice(currentDevice) ? { name: trimmedName } : { displayName: trimmedName }),
      };
      setCurrentDevice(updatedDevice);

      Alert.alert('Success', `Device renamed to "${trimmedName}"`);
    } catch (error) {
      console.error('[DeviceSettings] Error renaming device:', error);
      Alert.alert('Error', 'Failed to rename device');
    } finally {
      setRenamingDevice(false);
    }
  };

  const handleWiFiReconfiguration = () => {
    Alert.alert(
      'WiFi Reconfiguration',
      'WiFi reconfiguration will be available in a later provisioning update.\n\nTo change WiFi settings, use BLE provisioning again during device setup.'
    );
  };

  const handleFactoryReset = () => {
    Alert.alert(
      'Factory Reset',
      'Factory reset requires firmware support and will be added later.\n\nThis feature will allow you to restore the device to factory settings and re-provision it.'
    );
  };

  const handleRemoveDevice = async () => {
    const deviceName = isCloudDevice(currentDevice) 
      ? currentDevice.name 
      : (currentDevice as ProvisionedDevice).displayName || (currentDevice as ProvisionedDevice).name;

    Alert.alert('Delete Device', `Delete "${deviceName}"?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        onPress: async () => {
          setDeletingDevice(true);
          try {
            // Delete from Firestore if CloudDevice
            if (cloudDevice) {
              console.log('[DeviceSettings] Deleting CloudDevice from Firestore:', {
                homeId: cloudDevice.homeId,
                deviceId: cloudDevice.id,
              });
              await deviceService.archiveCloudDevice(cloudDevice.homeId, cloudDevice.id);
            }

            // Delete from local storage if ProvisionedDevice
            const localDeviceId = isCloudDevice(currentDevice) 
              ? (currentDevice as CloudDevice).localDeviceId 
              : (currentDevice as ProvisionedDevice).id;

            if (localDeviceId) {
              console.log('[DeviceSettings] Deleting ProvisionedDevice from storage:', localDeviceId);
              await storageService.removeProvisionedDevice(localDeviceId);
            }

            Alert.alert('Success', 'Device deleted');
            onDeviceRemoved();
          } catch (error) {
            console.error('[DeviceSettings] Error removing device:', error);
            Alert.alert('Error', 'Failed to delete device');
          } finally {
            setDeletingDevice(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Device Identity - Rename */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DEVICE IDENTITY</Text>

          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              setNewDeviceName(
                isCloudDevice(currentDevice)
                  ? (currentDevice as CloudDevice).name
                  : (currentDevice as ProvisionedDevice).displayName || (currentDevice as ProvisionedDevice).name
              );
              setShowRenameModal(true);
            }}
            disabled={renamingDevice}
          >
            <View style={styles.settingCardContent}>
              <View style={styles.settingCardLeft}>
                <Icon name="edit-3" size={20} color={theme.primary} />
                <View style={styles.settingCardInfo}>
                  <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Device Name</Text>
                  <Text style={[styles.settingValue, { color: theme.textPrimary }]} numberOfLines={1}>
                    {isCloudDevice(currentDevice)
                      ? (currentDevice as CloudDevice).name
                      : (currentDevice as ProvisionedDevice).displayName || (currentDevice as ProvisionedDevice).name}
                  </Text>
                </View>
              </View>
              <View style={styles.settingCardRight}>
                {renamingDevice ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Text style={[styles.changeText, { color: theme.primary }]}>Edit</Text>
                    <Icon name="chevron-right" size={16} color={theme.textMuted} />
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Room Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LOCATION</Text>

          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowRoomPicker(true)}
            disabled={loadingRooms || updatingRoom}
          >
            <View style={styles.settingCardContent}>
              <View style={styles.settingCardLeft}>
                <Icon name="home" size={20} color={theme.primary} />
                <View style={styles.settingCardInfo}>
                  <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Room</Text>
                  <Text style={[styles.settingValue, { color: theme.textPrimary }]}>
                    {currentDevice.roomName || 'Unassigned'}
                  </Text>
                </View>
              </View>
              <View style={styles.settingCardRight}>
                {updatingRoom ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Text style={[styles.changeText, { color: theme.primary }]}>Change</Text>
                    <Icon name="chevron-right" size={16} color={theme.textMuted} />
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Device Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DEVICE INFORMATION</Text>

          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Device Name</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]} numberOfLines={1}>
                {isCloudDevice(currentDevice) 
                  ? (currentDevice as CloudDevice).name 
                  : (currentDevice as ProvisionedDevice).displayName || (currentDevice as ProvisionedDevice).name}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Device ID</Text>
              <Text style={[styles.infoValue, { color: theme.textSecondary }]} numberOfLines={1}>
                {isCloudDevice(currentDevice) 
                  ? (currentDevice as CloudDevice).id 
                  : (currentDevice as ProvisionedDevice).id}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Status</Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        currentDevice.status === 'online'
                          ? theme.success
                          : currentDevice.status === 'offline'
                          ? theme.danger
                          : theme.warning,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        currentDevice.status === 'online'
                          ? theme.success
                          : currentDevice.status === 'offline'
                          ? theme.danger
                          : theme.warning,
                    },
                  ]}
                >
                  {currentDevice.status}
                </Text>
              </View>
            </View>

            {(isCloudDevice(currentDevice) 
              ? (currentDevice as CloudDevice).firmwareVersion 
              : (currentDevice as ProvisionedDevice).firmwareVersion) && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Firmware</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                  {isCloudDevice(currentDevice) 
                    ? (currentDevice as CloudDevice).firmwareVersion 
                    : (currentDevice as ProvisionedDevice).firmwareVersion}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* WiFi Reconfiguration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CONNECTIVITY</Text>

          <TouchableOpacity
            style={[styles.placeholderCard, { backgroundColor: theme.card, borderColor: theme.border, opacity: 0.6 }]}
            onPress={handleWiFiReconfiguration}
          >
            <View style={styles.settingCardContent}>
              <View style={styles.settingCardLeft}>
                <Icon name="wifi" size={20} color={theme.textMuted} />
                <View style={styles.settingCardInfo}>
                  <Text style={[styles.settingLabel, { color: theme.textMuted }]}>WiFi Reconfiguration</Text>
                  <Text style={[styles.placeholderText, { color: theme.textMuted }]}>Coming soon</Text>
                </View>
              </View>
              <Icon name="lock" size={14} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Factory Reset */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DEVICE MAINTENANCE</Text>

          <TouchableOpacity
            style={[styles.placeholderCard, { backgroundColor: theme.card, borderColor: theme.border, opacity: 0.6 }]}
            onPress={handleFactoryReset}
          >
            <View style={styles.settingCardContent}>
              <View style={styles.settingCardLeft}>
                <Icon name="rotate-ccw" size={20} color={theme.textMuted} />
                <View style={styles.settingCardInfo}>
                  <Text style={[styles.settingLabel, { color: theme.textMuted }]}>Factory Reset</Text>
                  <Text style={[styles.placeholderText, { color: theme.textMuted }]}>Coming soon</Text>
                </View>
              </View>
              <Icon name="lock" size={14} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DANGER ZONE</Text>

          <TouchableOpacity
            style={[styles.dangerCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: theme.danger, opacity: deletingDevice ? 0.6 : 1 }]}
            onPress={handleRemoveDevice}
            disabled={deletingDevice}
          >
            {deletingDevice ? (
              <ActivityIndicator size="small" color={theme.danger} />
            ) : (
              <Icon name="trash-2" size={20} color={theme.danger} />
            )}
            <Text style={[styles.dangerCardText, { color: theme.danger }]}>
              {deletingDevice ? 'Deleting...' : 'Delete Device'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rename Device Modal */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Rename device</Text>
            </View>

            <View style={styles.renameModalBody}>
              <TextInput
                style={[styles.renameInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="Enter device name"
                placeholderTextColor={theme.textMuted}
                value={newDeviceName}
                onChangeText={setNewDeviceName}
                maxLength={40}
                editable={!renamingDevice}
              />
              <Text style={[styles.charCount, { color: theme.textMuted }]}>
                {newDeviceName.length}/40
              </Text>
            </View>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.background }]}
                onPress={() => setShowRenameModal(false)}
                disabled={renamingDevice}
              >
                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary, opacity: renamingDevice ? 0.6 : 1 }]}
                onPress={handleRenameDevice}
                disabled={renamingDevice}
              >
                {renamingDevice ? (
                  <ActivityIndicator size="small" color={theme.background} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: theme.background, fontWeight: '600' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Room Picker Modal */}
      <Modal visible={showRoomPicker} transparent animationType="fade" onRequestClose={() => setShowRoomPicker(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Move device to room</Text>
            </View>

            {loadingRooms ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <FlatList
                data={rooms}
                keyExtractor={item => item}
                scrollEnabled={false}
                renderItem={({ item: room }) => {
                  const isSelected = (currentDevice.roomName || 'Unassigned') === room;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.roomOption,
                        isSelected && { backgroundColor: theme.primarySoft },
                      ]}
                      onPress={() => handleChangeRoom(room)}
                    >
                      <View style={styles.roomOptionContent}>
                        <Icon
                          name={room === 'Unassigned' ? 'inbox' : 'home'}
                          size={18}
                          color={isSelected ? theme.primary : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.roomOptionText,
                            { color: isSelected ? theme.primary : theme.textPrimary },
                          ]}
                        >
                          {room}
                        </Text>
                      </View>
                      {isSelected && <Icon name="check" size={18} color={theme.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.background }]}
              onPress={() => setShowRoomPicker(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (_theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingTop: 12,
    },
    section: {
      paddingHorizontal: 16,
      marginVertical: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    settingCard: {
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
    },
    settingCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    settingCardInfo: {
      gap: 2,
      flex: 1,
    },
    settingLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    settingValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    settingCardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    changeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    infoCard: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '500',
      maxWidth: '60%',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dangerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
    },
    dangerCardText: {
      fontSize: 14,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 12,
      maxHeight: '80%',
    },
    modalHeader: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    loadingContainer: {
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
    },
    roomOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 10,
      marginVertical: 4,
    },
    roomOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    roomOptionText: {
      fontSize: 14,
      fontWeight: '500',
    },
    modalCloseButton: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginVertical: 12,
      marginBottom: 24,
    },
    modalCloseText: {
      fontSize: 14,
      fontWeight: '600',
    },
    // Phase 2L: New styles for rename and placeholders
    placeholderCard: {
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
    },
    placeholderText: {
      fontSize: 11,
      fontWeight: '500',
    },
    renameModalBody: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 6,
    },
    renameInput: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '500',
    },
    charCount: {
      fontSize: 11,
      textAlign: 'right',
      fontWeight: '500',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
  });

export default DeviceSettingsScreen;
