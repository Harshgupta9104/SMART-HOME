import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ProvisionedDevice } from '../services/storageService';
import { CloudDevice, DeviceChannel } from '../types/device';
import { getDeviceDataService, DeviceMetrics } from '../services/deviceDataService';
import { useTheme } from '../context/ThemeContext';
import { useDevice } from '../contexts/DeviceContext';

interface ControllerScreenProps {
  device: ProvisionedDevice | CloudDevice;
  homeId?: string; // Needed for Firestore updates
}

const ControllerScreen: React.FC<ControllerScreenProps> = ({ device, homeId }) => {
  const { theme } = useTheme();
  const { getChannelsForDeviceFromContext, refreshChannelsForDevice, updateExistingChannel } = useDevice();
  const [relayStatus, setRelayStatus] = useState(false);
  const [isUpdatingRelay, setIsUpdatingRelay] = useState(false);
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [channels, setChannels] = useState<DeviceChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [updatingChannelId, setUpdatingChannelId] = useState<string | null>(null);

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
});

export default ControllerScreen;
