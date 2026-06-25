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
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { ProvisionedDevice, getStorageService } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';

interface DeviceSettingsScreenProps {
  device: ProvisionedDevice;
  onDeviceRemoved: () => void;
}

const DeviceSettingsScreen: React.FC<DeviceSettingsScreenProps> = ({ device, onDeviceRemoved }) => {
  const { theme, isDark } = useTheme();
  const [currentDevice, setCurrentDevice] = useState<ProvisionedDevice>(device);
  const [rooms, setRooms] = useState<string[]>([]);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [updatingRoom, setUpdatingRoom] = useState(false);

  const storageService = getStorageService();

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

      // Update device room in storage
      await storageService.updateDeviceRoom(currentDevice.id, trimmedRoom);

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

  const handleRemoveDevice = async () => {
    Alert.alert('Delete Device', `Delete "${currentDevice.displayName || currentDevice.name}"?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await storageService.removeProvisionedDevice(currentDevice.id);
            Alert.alert('Success', 'Device deleted');
            onDeviceRemoved();
          } catch (error) {
            console.error('[DeviceSettings] Error removing device:', error);
            Alert.alert('Error', 'Failed to delete device');
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
                {currentDevice.displayName || currentDevice.name}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Device ID</Text>
              <Text style={[styles.infoValue, { color: theme.textSecondary }]} numberOfLines={1}>
                {currentDevice.id}
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

            {currentDevice.firmwareVersion && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Firmware</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                  {currentDevice.firmwareVersion}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DANGER ZONE</Text>

          <TouchableOpacity
            style={[styles.dangerCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: theme.danger }]}
            onPress={handleRemoveDevice}
          >
            <Icon name="trash-2" size={20} color={theme.danger} />
            <Text style={[styles.dangerCardText, { color: theme.danger }]}>Delete Device</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
  });

export default DeviceSettingsScreen;
