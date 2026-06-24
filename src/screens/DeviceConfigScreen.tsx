import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const DeviceConfigScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { deviceId, deviceName, macAddress } = route.params;

  const [customName, setCustomName] = useState(deviceName || '');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Device types with correct IDs and relay counts
  const deviceTypes = [
    { id: 'smart_switch_1_relay', label: '1 Relay Switch', icon: 'toggle-left', color: '#3B82F6', relayCount: 1 },
    { id: 'smart_switch_4_relay', label: '4 Relay Switch', icon: 'grid', color: '#8B5CF6', relayCount: 4 },
    { id: 'smart_plug', label: 'Smart Plug', icon: 'power', color: '#EC4899', relayCount: 1 },
    { id: 'sensor', label: 'Sensor', icon: 'activity', color: '#F59E0B', relayCount: 0 },
    { id: 'unknown', label: 'Generic Device', icon: 'device', color: '#6B7280', relayCount: 0 },
  ];

  // Room types
  const roomTypes = [
    { id: 'living-room', label: 'Living Room', icon: 'home', color: '#F59E0B' },
    { id: 'bedroom', label: 'Bedroom', icon: 'moon', color: '#6366F1' },
    { id: 'kitchen', label: 'Kitchen', icon: 'coffee', color: '#EF4444' },
    { id: 'bathroom', label: 'Bathroom', icon: 'droplet', color: '#06B6D4' },
    { id: 'office', label: 'Office', icon: 'briefcase', color: '#8B5CF6' },
    { id: 'garage', label: 'Garage', icon: 'box', color: '#6B7280' },
    { id: 'other', label: 'Other', icon: 'more-horizontal', color: '#9CA3AF' },
  ];

  const handleContinue = () => {
    if (!customName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }
    if (!selectedType) {
      Alert.alert('Error', 'Please select a device type');
      return;
    }
    if (!selectedRoom) {
      Alert.alert('Error', 'Please select a room');
      return;
    }

    // Get room label
    const roomLabel = roomTypes.find(r => r.id === selectedRoom)?.label || selectedRoom;

    // Get device type info
    const selectedDeviceType = deviceTypes.find(d => d.id === selectedType);
    const relayCount = selectedDeviceType?.relayCount || 0;

    // Navigate to WiFi Provisioning with device config data
    navigation.navigate('WiFiProvisioning', {
      deviceId,
      macAddress,
      deviceName: customName,
      displayName: customName,
      deviceType: selectedType,
      relayCount: relayCount,
      roomType: selectedRoom,
      roomName: roomLabel,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Configure device</Text>
          <Text style={styles.headerSubtitle}>{deviceName}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: '100%' }]} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Device Name Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="edit-2" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>Device Name</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Enter device name"
            placeholderTextColor="#9CA3AF"
            value={customName}
            onChangeText={setCustomName}
            maxLength={30}
          />
          <Text style={styles.charCount}>{customName.length}/30 characters</Text>
        </View>

        {/* Device Type Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="layers" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>Device Type</Text>
          </View>
          <View style={styles.typeGrid}>
            {deviceTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View
                  style={[
                    styles.typeIcon,
                    selectedType === type.id && { backgroundColor: type.color },
                  ]}
                >
                  <Icon
                    name={type.icon}
                    size={24}
                    color={selectedType === type.id ? '#FFFFFF' : type.color}
                  />
                </View>
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.id && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Room Type Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="map-pin" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>Room Location</Text>
          </View>
          <View style={styles.roomGrid}>
            {roomTypes.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.roomCard,
                  selectedRoom === room.id && styles.roomCardSelected,
                ]}
                onPress={() => setSelectedRoom(room.id)}
              >
                <View
                  style={[
                    styles.roomIcon,
                    selectedRoom === room.id && { backgroundColor: room.color },
                  ]}
                >
                  <Icon
                    name={room.icon}
                    size={20}
                    color={selectedRoom === room.id ? '#FFFFFF' : room.color}
                  />
                </View>
                <Text
                  style={[
                    styles.roomLabel,
                    selectedRoom === room.id && styles.roomLabelSelected,
                  ]}
                >
                  {room.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings Card */}
        {/* <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Icon name="bookmark" size={20} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Remember settings</Text>
                <Text style={styles.settingSubtitle}>Auto-apply for future devices</Text>
              </View>
            </View>
            <Switch
              value={rememberSettings}
              onValueChange={setRememberSettings}
              trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View> */}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!customName.trim() || !selectedType || !selectedRoom) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!customName.trim() || !selectedType || !selectedRoom}
        >
          <Icon name="arrow-right" size={18} color="#FFFFFF" />
          <Text style={styles.continueButtonText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Progress Bar
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },

  progressBar: {
    height: 4,
    backgroundColor: '#3B82F6',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 32,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  // Text Input
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },

  charCount: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'right',
  },

  // Device Type Grid
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },

  typeCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },

  typeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },

  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },

  typeLabelSelected: {
    color: '#3B82F6',
  },

  // Room Grid
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  roomCard: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },

  roomCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },

  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roomLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },

  roomLabelSelected: {
    color: '#3B82F6',
  },

  // Settings Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  settingText: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  settingSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Continue Button
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },

  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DeviceConfigScreen;
