import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getStorageService, ProvisionedDevice } from '../services/storageService';

interface DeviceNamingScreenProps {
  navigation: any;
  route: any;
}

const ROOM_SUGGESTIONS: { [key: string]: string[] } = {
  'Living room': ['Living room Light', 'Living room Plug', 'Living room Hub', 'Living room Speaker'],
  'Bedroom': ['Bedroom Light', 'Bedroom Plug', 'Bedroom Hub', 'Bedroom Fan'],
  'Kitchen': ['Kitchen Light', 'Kitchen Plug', 'Kitchen Hub', 'Kitchen Appliance'],
  'Bathroom': ['Bathroom Light', 'Bathroom Plug', 'Bathroom Hub', 'Bathroom Fan'],
  'Office': ['Office Light', 'Office Plug', 'Office Hub', 'Office Device'],
  'All rooms': ['Main Hub', 'Central Device', 'Smart Hub', 'Primary Device'],
};

const DeviceNamingScreen: React.FC<DeviceNamingScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { deviceId, deviceName, selectedRoom } = route.params || {
    deviceId: '',
    deviceName: 'Device',
    selectedRoom: 'All rooms',
  };

  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get suggestions based on selected room
  const suggestions = ROOM_SUGGESTIONS[selectedRoom] || ROOM_SUGGESTIONS['All rooms'];

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  const storageService = getStorageService();

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputFocus = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleInputBlur = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleSkip = () => {
    // Use the internal device name as display name
    navigateToDashboard(deviceName);
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      setError('Please enter a device name');
      return;
    }

    if (displayName.trim().length < 2) {
      setError('Device name must be at least 2 characters');
      return;
    }

    if (displayName.trim().length > 30) {
      setError('Device name must be less than 30 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get the device from storage
      const devices = await storageService.getProvisionedDevices();
      const device = devices.find(d => d.id === deviceId);

      if (!device) {
        throw new Error('Device not found');
      }

      // Update device with display name
      const updatedDevice: ProvisionedDevice = {
        ...device,
        displayName: displayName.trim(),
      };

      await storageService.addProvisionedDevice(updatedDevice);
      navigateToDashboard(displayName.trim());
    } catch (err) {
      console.error('[DeviceNamingScreen] Error saving device name:', err);
      setError('Failed to save device name. Please try again.');
      setIsLoading(false);
    }
  };

  const navigateToDashboard = (finalName: string) => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'HomeMain',
          params: {
            justProvisioned: true,
            deviceId: deviceId,
            deviceName: finalName,
          },
        },
      ],
    });
  };

  const inputBorderColor = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#3B82F6'],
  });

  const inputShadowOpacity = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.15],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Name Your Device</Text>
        <Text style={styles.headerSubtitle}>
          Give your device a friendly name to easily identify it
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Device Icon */}
        <View style={styles.deviceIconContainer}>
          <View style={styles.deviceIcon}>
            <Icon name="smartphone" size={48} color="#3B82F6" />
          </View>
        </View>

        {/* Device Info */}
        <View style={styles.deviceInfoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {deviceName}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Network</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              Connected
            </Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Device Name</Text>
          <Animated.View
            style={[
              styles.inputContainer,
              {
                borderColor: inputBorderColor,
                shadowOpacity: inputShadowOpacity,
              },
            ]}
          >
            <Icon name="edit-2" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Living Room Hub"
              placeholderTextColor="#D1D5DB"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                setError('');
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              maxLength={30}
              editable={!isLoading}
            />
            {displayName.length > 0 && (
              <Text style={styles.charCount}>{displayName.length}/30</Text>
            )}
          </Animated.View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Suggestions */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Suggestions:</Text>
            <View style={styles.suggestionChips}>
              {suggestions.map(
                (suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => setDisplayName(suggestion)}
                    disabled={isLoading}
                  >
                    <Text style={styles.suggestionChipText}>{suggestion}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={handleSkip}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            (!displayName.trim() || isLoading) && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveName}
          disabled={!displayName.trim() || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save & Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 32,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  // Device Icon
  deviceIconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  deviceIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  // Device Info Box
  deviceInfoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },

  // Input Section
  inputSection: {
    marginBottom: 24,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    paddingVertical: 0,
  },

  charCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 8,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },

  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    flex: 1,
  },

  // Suggestions
  suggestionsContainer: {
    marginTop: 16,
  },

  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  suggestionChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },

  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  skipButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  skipButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },

  saveButton: {
    backgroundColor: '#3B82F6',
  },

  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default DeviceNamingScreen;
