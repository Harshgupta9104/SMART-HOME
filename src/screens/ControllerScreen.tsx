import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { ProvisionedDevice } from '../services/storageService';
import { CloudDevice, DeviceChannel, UpdateChannelInput } from '../types/device';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';
import { useTheme } from '../context/ThemeContext';
import { useDevice } from '../contexts/DeviceContext';
import { useRoom } from '../contexts/RoomContext';
import { formatLastSeen } from '../utils/notificationHelpers';

interface ControllerScreenProps {
  device: ProvisionedDevice | CloudDevice;
  homeId?: string; // Needed for Firestore updates
}

const ControllerScreen: React.FC<ControllerScreenProps> = ({ device, homeId }) => {
  const { theme } = useTheme();
  const { getChannelsForDeviceFromContext, refreshChannelsForDevice, updateExistingChannel } = useDevice();
  const { rooms: firestoreRooms } = useRoom();
  const [relayStatus, setRelayStatus] = useState(false);
  const [isUpdatingRelay, setIsUpdatingRelay] = useState(false);
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [channels, setChannels] = useState<DeviceChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [updatingChannelId, setUpdatingChannelId] = useState<string | null>(null);

  // Channel edit modal state
  const [editingChannel, setEditingChannel] = useState<DeviceChannel | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState<string>('');
  const [editingRoomId, setEditingRoomId] = useState<string | undefined>('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // Animations
  const glowAnim = useRef(new Animated.Value(0)).current;       // pulsing glow radius
  const scaleAnim = useRef(new Animated.Value(1)).current;      // press scale
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const deviceDataService = getDeviceDataService();

  // Get device ID for both ProvisionedDevice and CloudDevice
  const getDeviceId = () => {
    if ((device as CloudDevice).mqttDeviceId) {
      return (device as CloudDevice).mqttDeviceId || (device as CloudDevice).localDeviceId;
    }
    return device.id;
  };

  // Get cloud device ID (Firestore ID) if available
  const getCloudDeviceId = () => {
    const cloudDevice = device as CloudDevice;
    return cloudDevice.id || null;
  };

  // Get home ID from cloud device or prop
  const getHomeId = () => {
    const cloudDevice = device as CloudDevice;
    return cloudDevice.homeId || homeId;
  };

  // Subscribe to real MQTT state — UI always reflects device truth
  useEffect(() => {
    if (!device) return;
    const mqttDeviceId = getDeviceId();
    const unsubscribe = deviceDataService.subscribe(mqttDeviceId, (newMetrics: DeviceMetrics) => {
      setMetrics(newMetrics);
      setRelayStatus(newMetrics.relayStatus || false);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device, deviceDataService]);

  // Load cloud channels if this is a CloudDevice
  useEffect(() => {
    const loadChannels = async () => {
      // Check if device is CloudDevice and has channels
      const cloudDevice = device as CloudDevice;
      if (cloudDevice.id && cloudDevice.channelCount) {
        setLoadingChannels(true);
        try {
          // Try to get cached channels from context
          let cachedChannels = getChannelsForDeviceFromContext(cloudDevice.id);
          if (!cachedChannels || cachedChannels.length === 0) {
            // Refresh from Firestore if not cached
            cachedChannels = await refreshChannelsForDevice(cloudDevice.id);
          }
          setChannels(cachedChannels);
        } catch (err) {
          console.error('[ControllerScreen] Failed to load channels:', err);
          setChannels([]);
        } finally {
          setLoadingChannels(false);
        }
      }
    };
    loadChannels();
  }, [device, getChannelsForDeviceFromContext, refreshChannelsForDevice]);

  // Pulsing glow when relay is OFF (inverted logic)
  useEffect(() => {
    if (!relayStatus) {  // ← Changed from "if (relayStatus)" to "if (!relayStatus)"
      glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1400, useNativeDriver: false }),
        ])
      );
      glowLoop.current.start();
    } else {
      glowLoop.current?.stop();
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start();
    }
  }, [relayStatus, glowAnim]);

  // Handle per-channel toggle with Firestore sync
  const handleChannelToggle = async (channel: DeviceChannel) => {
    if (updatingChannelId === channel.id) {
      // Already updating this channel
      return;
    }

    const cloudDeviceId = getCloudDeviceId();
    const currentHomeId = getHomeId();
    const mqttDeviceId = getDeviceId();

    if (!cloudDeviceId || !currentHomeId) {
      console.warn('[ControllerScreen] Cannot toggle channel: missing device or home ID');
      return;
    }

    setUpdatingChannelId(channel.id);

    try {
      // Determine next state
      let nextState: 'on' | 'off';
      if (channel.state === 'on') {
        nextState = 'off';
      } else if (channel.state === 'off') {
        nextState = 'on';
      } else {
        // unknown state → turn on
        nextState = 'on';
      }

      console.log('[ControllerScreen] Toggling channel:', {
        channelId: channel.id,
        channelNumber: channel.channelNumber,
        currentState: channel.state,
        nextState,
      });

      // Send MQTT command and update Firestore
      const success = await deviceDataService.updateRelayChannelStatus(
        currentHomeId,
        cloudDeviceId,
        mqttDeviceId,
        channel.id,
        channel.channelNumber,
        nextState,
      );

      if (!success) {
        console.warn('[ControllerScreen] Failed to toggle channel:', channel.id);
        setUpdatingChannelId(null);
        return;
      }

      // Update local channel state immediately for UI responsiveness
      const updatedChannel = await updateExistingChannel(cloudDeviceId, channel.id, {
        state: nextState,
      });

      if (updatedChannel) {
        // Update local channels list
        setChannels(prevChannels =>
          prevChannels.map(ch => (ch.id === channel.id ? updatedChannel : ch))
        );
      }

      console.log('[ControllerScreen] Channel toggled successfully:', channel.id);
    } catch (error) {
      console.error('[ControllerScreen] Error toggling channel:', {
        channelId: channel.id,
        error,
      });
    } finally {
      setUpdatingChannelId(null);
    }
  };

  // Legacy single relay handler (for backward compatibility)
  const handleRelayPress = async () => {
    if (isUpdatingRelay) return;

    // Press scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setIsUpdatingRelay(true);
    try {
      const mqttDeviceId = getDeviceId();
      const newState = !relayStatus;
      console.log('[Controller] Sending relay command:', newState ? 'ON' : 'OFF');

      // Send command and wait for MQTT response
      const success = await deviceDataService.updateRelayStatus(mqttDeviceId, newState);
      if (!success) {
        console.warn('[Controller] Relay command failed');
        setIsUpdatingRelay(false);
        return;
      }

      // Wait max 2 seconds for response, then unlock button
      setTimeout(() => {
        setIsUpdatingRelay(false);
      }, 2000);
    } catch (error) {
      console.error('[Controller] Error updating relay:', error);
      setIsUpdatingRelay(false);
    }
  };

  // Handle edit channel button tap
  const handleEditChannel = (channel: DeviceChannel) => {
    setEditingChannel(channel);
    setEditingName(channel.name || `Relay ${channel.channelNumber}`);
    setEditingIcon(channel.icon || '');
    setEditingRoomId(channel.roomId || '');
  };

  // Handle save channel configuration
  const handleSaveChannelConfig = async () => {
    if (!editingChannel) return;

    const trimmedName = editingName.trim();
    if (!trimmedName) {
      console.warn('[ControllerScreen] Channel name cannot be empty');
      return;
    }

    const cloudDeviceId = getCloudDeviceId();
    const currentHomeId = getHomeId();

    if (!cloudDeviceId || !currentHomeId) {
      console.warn('[ControllerScreen] Cannot save channel: missing device or home ID');
      return;
    }

    setIsEditingSaving(true);

    try {
      // Build updates object with proper handling of optional fields
      // Always save name
      // For optional fields: save if selected, set to null if cleared
      const updates: Record<string, string | null | undefined> = {
        name: trimmedName,
      };

      // Icon: save if selected, set to null if empty (cleared)
      if (editingIcon) {
        updates.icon = editingIcon;
      } else {
        // Explicitly set to null to clear the field
        updates.icon = null;
      }

      // Room assignment: save both roomId and roomName if selected, clear both if empty
      if (editingRoomId) {
        updates.roomId = editingRoomId;
        // Find room name from firestoreRooms
        const selectedRoom = firestoreRooms.find(r => r.id === editingRoomId);
        if (selectedRoom) {
          updates.roomName = selectedRoom.name;
        }
      } else {
        // Explicitly set to null to clear both fields
        updates.roomId = null;
        updates.roomName = null;
      }

      const updated = await updateExistingChannel(cloudDeviceId, editingChannel.id, updates as UpdateChannelInput);

      if (updated) {
        // Update local channels list
        setChannels(prevChannels =>
          prevChannels.map(ch => (ch.id === editingChannel.id ? updated : ch))
        );

        console.log('[ControllerScreen] Channel saved:', {
          channelId: editingChannel.id,
          name: trimmedName,
          icon: editingIcon || 'cleared',
          roomId: editingRoomId || 'cleared',
        });

        setEditingChannel(null);
      }
    } catch (error) {
      console.error('[ControllerScreen] Error saving channel:', {
        channelId: editingChannel.id,
        error,
      });
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingChannel(null);
    setEditingName('');
    setEditingIcon('');
    setEditingRoomId('');
  };

  // Interpolated glow values (not useNativeDriver — shadow props)
  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.85],
  });
  const ringOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Determine if this is a CloudDevice with channels
  const isCloudDevice = (device as CloudDevice).id && channels.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Phase 2K-FIX1: Device health status section */}
      {(device as CloudDevice).status && (
        <View style={[styles.healthStatusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.healthStatusRow}>
            <View
              style={[
                styles.healthStatusDot,
                {
                  backgroundColor:
                    (device as CloudDevice).status === 'online'
                      ? theme.success
                      : (device as CloudDevice).status === 'offline'
                      ? theme.danger
                      : theme.warning,
                },
              ]}
            />
            <Text style={[styles.healthStatusText, { color: theme.textPrimary }]}>
              {(device as CloudDevice).status === 'online'
                ? 'Device Online'
                : (device as CloudDevice).status === 'offline'
                ? 'Device Offline'
                : 'Status Unknown'}
            </Text>
          </View>
          {(device as CloudDevice).lastSeenAt && (
            <Text style={[styles.healthLastSeenText, { color: theme.textMuted }]}>
              Last seen: {formatLastSeen((device as CloudDevice).lastSeenAt!)}
            </Text>
          )}
        </View>
      )}

      {/* Show channel list for CloudDevice, or single relay for ProvisionedDevice */}
      {isCloudDevice ? (
        // Multi-relay UI from cloud channels
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>RELAYS ({channels.length})</Text>
          {channels.map((channel) => {
            const isUpdating = updatingChannelId === channel.id;

            return (
              <View
                key={channel.id}
                style={[styles.channelCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.channelHeader}>
                  <View style={styles.channelInfo}>
                    <Text style={[styles.channelName, { color: theme.textPrimary }]}>
                      {channel.name || `Relay ${channel.channelNumber}`}
                    </Text>
                    <Text style={[styles.channelNumber, { color: theme.textSecondary }]}>
                      Channel {channel.channelNumber}
                    </Text>
                  </View>
                  <View style={styles.channelHeaderRight}>
                    <View
                      style={[
                        styles.stateBadge,
                        {
                          backgroundColor:
                            channel.state === 'on'
                              ? theme.success
                              : channel.state === 'off'
                                ? theme.danger
                                : theme.warning,
                        },
                      ]}
                    >
                      <Text style={[styles.stateBadgeText, { color: theme.background }]}>
                        {channel.state === 'unknown' ? 'Unknown' : channel.state?.toUpperCase() || 'OFF'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditChannel(channel)}
                    >
                      <Icon name="edit-2" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {channel.channelNumber === 1 ? (
                  // Relay 1 is controllable
                  <TouchableOpacity
                    style={[styles.channelToggleButton, { backgroundColor: theme.primarySoft }]}
                    onPress={() => handleChannelToggle(channel)}
                    disabled={isUpdating}
                  >
                    <Text style={[styles.channelToggleText, { color: theme.primary }]}>
                      {isUpdating
                        ? 'Updating...'
                        : `Turn ${channel.state === 'on' ? 'OFF' : 'ON'}`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  // Other relays show MQTT support pending
                  <View style={[styles.channelToggleButton, { backgroundColor: theme.background, opacity: 0.5 }]}>
                    <Text style={[styles.channelToggleText, { color: theme.textMuted }]}>
                      MQTT support pending
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : loadingChannels ? (
        // Loading indicator
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading channels...</Text>
        </View>
      ) : (
        // Fallback to single relay UI (legacy ProvisionedDevice)
        <View>
          {/* Relay Control Card */}
          <View style={styles.controlCard}>
            {/* Card background glow when ON */}
            <Animated.View
              style={[
                styles.cardGlow,
                {
                  opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
                  backgroundColor: theme.danger,
                },
              ]}
              pointerEvents="none"
            />
            {/* Label */}
            <Text style={styles.controlName}>Relay Control (GPIO23)</Text>
            {/* Tappable Relay Button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
              <TouchableOpacity
                onPress={handleRelayPress}
                activeOpacity={0.85}
                disabled={isUpdatingRelay}
                style={styles.relayTouchable}
              >
                {/* Outer glow ring */}
                <Animated.View
                  style={[
                    styles.glowRing,
                    {
                      opacity: ringOpacity,
                      shadowRadius: glowRadius,
                      shadowOpacity: glowOpacity,
                      shadowColor: theme.danger,
                      borderColor: relayStatus ? theme.danger : 'transparent',
                    },
                  ]}
                />
                {/* Relay circle */}
                <View style={[styles.relayCircle, relayStatus && styles.relayCircleOn]}>
                  <Text style={[styles.relayIcon, relayStatus && styles.relayIconOn]}>
                    {isUpdatingRelay ? 'Updating...' : 'Relay'}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            {/* Status text */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, relayStatus ? styles.statusDotOn : styles.statusDotOff]} />
              <Text style={[styles.statusLabel, { color: relayStatus ? theme.danger : theme.textMuted }]}>
                {isUpdatingRelay
                  ? 'Updating...'
                  : relayStatus
                    ? 'OFF  —  Relay is off'
                    : 'ON  —  Relay is active'}
              </Text>
            </View>
            {/* Tap hint */}
            <Text style={styles.tapHint}>Tap the relay to toggle</Text>
          </View>
          {/* Quick Stats */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Quick Stats</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Uptime</Text>
              <Text style={styles.statValue}>
                {metrics?.uptime !== undefined ? `${Math.floor(metrics.uptime / 3600)}h` : 'N/A'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Free Heap</Text>
              <Text style={styles.statValue}>
                {metrics?.freeHeap !== undefined ? `${Math.floor(metrics.freeHeap / 1024)} KB` : 'N/A'}
              </Text>
            </View>
            <View style={[styles.statRow, styles.statRowLast]}>
              <Text style={styles.statLabel}>WiFi RSSI</Text>
              <Text style={styles.statValue}>
                {metrics?.wifiRSSI !== undefined ? `${metrics.wifiRSSI} dBm` : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Channel Edit Modal */}
      <Modal
        visible={editingChannel !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Edit Channel Configuration
              </Text>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Channel Name Input */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Channel Name</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="Enter channel name"
                  placeholderTextColor={theme.textMuted}
                  value={editingName}
                  onChangeText={setEditingName}
                  editable={!isEditingSaving}
                  maxLength={40}
                />
                <Text style={[styles.modalHint, { color: theme.textMuted }]}>
                  Max 40 characters
                </Text>
              </View>

              {/* Icon Selector */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Icon (Optional)</Text>
                <View style={styles.iconGrid}>
                  {['light', 'fan', 'socket', 'ac', 'switch', 'default'].map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        editingIcon === icon && styles.iconOptionSelected,
                        { borderColor: editingIcon === icon ? theme.primary : theme.border, backgroundColor: theme.background },
                      ]}
                      onPress={() => setEditingIcon(icon)}
                      disabled={isEditingSaving}
                    >
                      <Text style={[styles.iconText, { color: editingIcon === icon ? theme.primary : theme.textPrimary }]}>
                        {icon.charAt(0).toUpperCase() + icon.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Room Assignment */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Room (Optional)</Text>
                <ScrollView
                  style={styles.roomList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {firestoreRooms.map((room) => (
                    <TouchableOpacity
                      key={room.id}
                      style={[
                        styles.roomOption,
                        editingRoomId === room.id && styles.roomOptionSelected,
                        { borderColor: editingRoomId === room.id ? theme.primary : theme.border, backgroundColor: theme.background },
                      ]}
                      onPress={() => setEditingRoomId(room.id)}
                      disabled={isEditingSaving}
                    >
                      <Text style={[styles.roomOptionText, { color: editingRoomId === room.id ? theme.primary : theme.textPrimary }]}>
                        {room.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* None/Unassigned option */}
                  <TouchableOpacity
                    style={[
                      styles.roomOption,
                      !editingRoomId && styles.roomOptionSelected,
                      { borderColor: !editingRoomId ? theme.primary : theme.border, backgroundColor: theme.background },
                    ]}
                    onPress={() => setEditingRoomId('')}
                    disabled={isEditingSaving}
                  >
                    <Text style={[styles.roomOptionText, { color: !editingRoomId ? theme.primary : theme.textPrimary }]}>
                      None / Unassigned
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.background }]}
                onPress={handleCancelEdit}
                disabled={isEditingSaving}
              >
                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveChannelConfig}
                disabled={isEditingSaving}
              >
                <Text style={[styles.modalButtonText, { color: theme.background }]}>
                  {isEditingSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  // Control Card
  controlCard: {
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  controlName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  // Relay
  relayTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  relayCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  relayCircleOn: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  relayIcon: {
    fontSize: 72,
    opacity: 0.35,
  },
  relayIconOn: {
    opacity: 1,
  },
  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusDotOn: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDotOff: {},
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tapHint: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // Stats Card
  statsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Channel UI styles
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  channelCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 6,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  channelNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  stateBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  channelToggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  channelToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 0,
  },
  modalHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 12,
    marginTop: 6,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    flex: 0.48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    borderWidth: 2,
  },
  iconText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roomList: {
    maxHeight: 150,
    borderRadius: 10,
  },
  roomOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  roomOptionSelected: {
    borderWidth: 2,
  },
  roomOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Phase 2K-FIX1: Device health status styles
  healthStatusCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  healthStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  healthLastSeenText: {
    fontSize: 10,
    fontWeight: '400',
    marginLeft: 14,
  },
});

export default ControllerScreen;
