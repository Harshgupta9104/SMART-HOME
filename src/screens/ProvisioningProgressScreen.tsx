import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProvisioning } from '../hooks/useProvisioning';
import { ProvisioningState } from '../constants/provisioningStates';

interface ProvisioningProgressScreenProps {
  navigation: any;
  route: any;
}

// Custom Vector Icons (SVG-like components)
const ZapIcon = ({ size = 48, color = '#3B82F6' }) => (
  <Text style={{ fontSize: size, color }}>⚡</Text>
);

const AlertIcon = ({ size = 48, color = '#EF4444' }) => (
  <Text style={{ fontSize: size, color }}>⚠️</Text>
);

const CheckIcon = ({ size = 48, color = '#10B981' }) => (
  <Text style={{ fontSize: size, color }}>✓</Text>
);

const ProvisioningProgressScreen: React.FC<ProvisioningProgressScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { deviceName, deviceId, ssid } = route.params || { 
    deviceName: 'Device',
    deviceId: '',
    ssid: ''
  };
  
  const { 
    provisioningState, 
    error, 
    cancelProvisioning,
  } = useProvisioning();

  // Animations - use useRef to persist across renders
  const pulseRing1Ref = React.useRef(new Animated.Value(0)).current;
  const pulseRing2Ref = React.useRef(new Animated.Value(0)).current;
  const pulseRing3Ref = React.useRef(new Animated.Value(0)).current;
  const successScaleAnimRef = React.useRef(new Animated.Value(0)).current;
  const successFadeAnimRef = React.useRef(new Animated.Value(0)).current;
  const loadingDot1Ref = React.useRef(new Animated.Value(0)).current;
  const loadingDot2Ref = React.useRef(new Animated.Value(0)).current;
  const loadingDot3Ref = React.useRef(new Animated.Value(0)).current;

  // Message state
  const [displayMessage, setDisplayMessage] = useState('Connecting your device...');
  const [displaySubtitle, setDisplaySubtitle] = useState('Establishing BLE connection');
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    // Pulse ring animations - staggered for breathing effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing1Ref, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseRing1Ref, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(pulseRing2Ref, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseRing2Ref, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(pulseRing3Ref, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseRing3Ref, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Bouncing dots animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingDot1Ref, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(loadingDot1Ref, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(loadingDot2Ref, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(loadingDot2Ref, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(loadingDot3Ref, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(loadingDot3Ref, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseRing1Ref, pulseRing2Ref, pulseRing3Ref, loadingDot1Ref, loadingDot2Ref, loadingDot3Ref]);

  // Update message based on provisioning state from our state machine
  useEffect(() => {
    switch (provisioningState) {
      // Step 1: BLE Connection
      case ProvisioningState.CONNECTING_BLE:
        setDisplayMessage('Connecting your device...');
        setDisplaySubtitle('Establishing BLE connection');
        setCurrentStep(1);
        break;

      // Step 2: Sending credentials and testing WiFi
      case ProvisioningState.SENDING_CREDENTIALS:
        setDisplayMessage('Sending credentials...');
        setDisplaySubtitle(`Configuring ${ssid}`);
        setCurrentStep(2);
        break;

      // Step 2-3: Waiting for WiFi connection (firmware is testing)
      case ProvisioningState.WAITING_WIFI:
        setDisplayMessage('Testing WiFi connection...');
        setDisplaySubtitle(`Connecting to ${ssid}`);
        setCurrentStep(2);
        break;

      // Step 3: Success - device provisioned
      case ProvisioningState.SUCCESS:
        setDisplayMessage('Device ready');
        setDisplaySubtitle('WiFi connection established');
        setCurrentStep(3);
        
        // Trigger success animation
        Animated.parallel([
          Animated.timing(successScaleAnimRef, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(successFadeAnimRef, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();

        // Navigate to device naming screen after 1.5 seconds
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'DeviceNaming',
                params: {
                  deviceId: deviceId,
                  deviceName: deviceName,
                  selectedRoom: 'All rooms',
                },
              },
            ],
          });
        }, 1500);
        break;

      // Error states
      case ProvisioningState.TIMEOUT:
        setDisplayMessage('Connection timeout');
        setDisplaySubtitle('Device did not respond');
        break;

      case ProvisioningState.ERROR:
        setDisplayMessage('Connection failed');
        setDisplaySubtitle(error || 'Please try again');
        break;

      default:
        setDisplayMessage('Connecting your device...');
        setDisplaySubtitle('Setting up WiFi connection');
    }
  }, [provisioningState, error, ssid, deviceId, deviceName, navigation]);

  // Calculate progress percentage based on current step (gradual, not skipped)
  const getProgressPercentage = () => {
    if (isSuccess) return 100;
    if (isError) return currentStep * 33;
    return currentStep * 33;
  };

  const isError = provisioningState === ProvisioningState.ERROR || provisioningState === ProvisioningState.TIMEOUT;
  const isSuccess = provisioningState === ProvisioningState.SUCCESS;

  // Get human-readable status based on provisioning state
  const getStatusText = () => {
    switch (provisioningState) {
      case ProvisioningState.CONNECTING_BLE:
        return 'Connecting...';
      case ProvisioningState.SENDING_CREDENTIALS:
        return 'Sending...';
      case ProvisioningState.WAITING_WIFI:
        return 'Testing...';
      case ProvisioningState.SUCCESS:
        return 'Connected';
      case ProvisioningState.ERROR:
        return 'Failed';
      case ProvisioningState.TIMEOUT:
        return 'Timeout';
      default:
        return 'Connecting...';
    }
  };

  // Pulse ring interpolations
  const pulseRing1Scale = pulseRing1Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const pulseRing1Opacity = pulseRing1Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  const pulseRing2Scale = pulseRing2Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const pulseRing2Opacity = pulseRing2Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  const pulseRing3Scale = pulseRing3Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const pulseRing3Opacity = pulseRing3Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  // Loading dots interpolations
  const loadingDot1Y = loadingDot1Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const loadingDot2Y = loadingDot2Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const loadingDot3Y = loadingDot3Ref.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  // Visual step tracker
  const renderVisualSteps = () => {
    return (
      <View style={styles.visualStepContainer}>
        {/* Step 1 */}
        <View style={[styles.stepNode, currentStep >= 1 && styles.stepNodeActive]}>
          {currentStep > 1 && <Text style={styles.stepCheckmark}>✓</Text>}
        </View>
        <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

        {/* Step 2 */}
        <View style={[styles.stepNode, currentStep >= 2 && styles.stepNodeActive]}>
          {currentStep > 2 && <Text style={styles.stepCheckmark}>✓</Text>}
        </View>
        <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />

        {/* Step 3 */}
        <View style={[styles.stepNode, currentStep >= 3 && styles.stepNodeActive]}>
          {currentStep > 3 && <Text style={styles.stepCheckmark}>✓</Text>}
        </View>
      </View>
    );
  };

  // Step indicator dots
  const renderStepDots = () => {
    return (
      <View style={styles.stepDotsContainer}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              step < currentStep && styles.stepDotCompleted,
              step === currentStep && styles.stepDotActive,
              step > currentStep && styles.stepDotPending,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Gradient Background */}
      <View style={styles.gradientBg} />

      {/* Main Content */}
      <View style={styles.content}>
        {/* CENTRAL DEVICE VISUAL WITH GLOWING PULSE RINGS */}
        <View style={styles.deviceVisualContainer}>
          {/* Pulse Rings - only show during provisioning */}
          {!isError && !isSuccess && (
            <>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseRing1Scale }],
                    opacity: pulseRing1Opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseRing2Scale }],
                    opacity: pulseRing2Opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseRing3Scale }],
                    opacity: pulseRing3Opacity,
                  },
                ]}
              />
            </>
          )}

          {/* Device Icon Container with Gradient */}
          <View style={styles.deviceIconBox}>
            {!isError && !isSuccess && (
              <ZapIcon size={48} color="#3B82F6" />
            )}
            {isError && (
              <AlertIcon size={48} color="#EF4444" />
            )}
            {isSuccess && (
              <Animated.View
                style={[
                  styles.successIconContainer,
                  {
                    transform: [{ scale: successScaleAnimRef }],
                    opacity: successFadeAnimRef,
                  },
                ]}
              >
                <CheckIcon size={48} color="#10B981" />
              </Animated.View>
            )}
          </View>
        </View>

        {/* Message */}
        <Text style={styles.message}>{displayMessage}</Text>
        
        {/* Visual Step Tracker */}
        {!isError && !isSuccess && renderVisualSteps()}
        
        <Text style={styles.subtitle}>{displaySubtitle}</Text>

        {/* Device Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{deviceName}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Network</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">{ssid}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: isError ? '#EF4444' : isSuccess ? '#10B981' : '#3B82F6' }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Step Dots Indicator */}
        {!isError && !isSuccess && renderStepDots()}

        {/* Glowing Progress Bar */}
        {!isError && !isSuccess && (
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${getProgressPercentage()}%`,
                },
              ]}
            />
          </View>
        )}

        {/* Modern Loading Animation - Bouncing Dots */}
        {!isError && !isSuccess && (
          <View style={styles.modernLoaderContainer}>
            <Animated.View
              style={[
                styles.modernLoaderDot,
                {
                  transform: [{ translateY: loadingDot1Y }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.modernLoaderDot,
                {
                  transform: [{ translateY: loadingDot2Y }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.modernLoaderDot,
                {
                  transform: [{ translateY: loadingDot3Y }],
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {isError && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelProvisioning}
          >
            <Text style={styles.cancelButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {isSuccess && (
          <Animated.View
            style={[
              styles.successCard,
              {
                transform: [{ scale: successScaleAnimRef }],
                opacity: successFadeAnimRef,
              },
            ]}
          >
            <View style={styles.successIconCircle}>
              <CheckIcon size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Device Connected!</Text>
            <Text style={styles.successSubtitle}>Your device is now ready to use</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // CENTRAL DEVICE VISUAL
  deviceVisualContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
    position: 'relative',
  },

  // Pulse rings - breathing animation (thicker, more visible)
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.05)',
  },

  // Device icon box with gradient effect
  deviceIconBox: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },

  successIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Text
  message: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
  },

  // Visual step tracker (line + nodes)
  visualStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },

  stepNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepNodeActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },

  stepCheckmark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: '#CBD5E1',
  },

  stepLineActive: {
    backgroundColor: '#10B981',
  },

  // Info card
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  infoRowBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },

  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // Step dots
  stepDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },

  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  stepDotCompleted: {
    backgroundColor: '#10B981',
  },

  stepDotActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },

  stepDotPending: {
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },

  // Progress bar
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 30,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },

  // Modern loader - bouncing dots
  modernLoaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 40,
  },

  modernLoaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },

  // Success card
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },

  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },

  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },

  successSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default ProvisioningProgressScreen;
