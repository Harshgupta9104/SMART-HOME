import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPermissionService } from '../services/permissionService';

const { width, height } = Dimensions.get('window');

type StartupStage = 'splash' | 'permissions' | 'complete';

const StartupScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<StartupStage>('splash');
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  // Animations
  const logoScale = new Animated.Value(0.8);
  const logoOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);
  const pulseAnim = new Animated.Value(1);
  const floatAnim = new Animated.Value(0);
  const slideUpAnim = new Animated.Value(100);
  const fadeInAnim = new Animated.Value(0);

  // Logo animation on mount
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Float animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-transition to permissions after 3.5 seconds
    const timer = setTimeout(() => {
      setStage('permissions');
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = async () => {
    console.log('[StartupScreen] User tapped Continue, requesting provisioning permissions');
    setIsRequestingPermissions(true);
    
    try {
      // Request ALL provisioning permissions together during onboarding
      // This is the ONLY time permissions are requested
      // After this, Android remembers the granted state automatically
      const permissionService = getPermissionService();
      const status = await permissionService.requestProvisioningPermissions();
      console.log('[StartupScreen] Permission request result:', status);

      setStage('complete');
      
      // Call the onComplete callback to mark onboarding as done
      if (route?.params?.onComplete) {
        route.params.onComplete();
      }

      // Navigate to home using reset (not replace)
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }, 500);
    } catch (error) {
      console.error('[StartupScreen] Error requesting permissions:', error);
      setIsRequestingPermissions(false);
    }
  };

  // Stage 1: Splash/Intro
  if (stage === 'splash') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.splashContent}>
          {/* Logo with floating animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [
                  { scale: logoScale },
                  { scale: pulseAnim },
                  { translateY: floatAnim },
                ],
                opacity: logoOpacity,
              },
            ]}
          >
            <Text style={styles.logo}>🏠</Text>
          </Animated.View>

          {/* Title and Subtitle */}
          <Animated.View style={{ opacity: textOpacity }}>
            <Text style={styles.appTitle}>SmartHome</Text>
            <Text style={styles.appSubtitle}>
              Control and manage your smart devices effortlessly
            </Text>
          </Animated.View>
        </View>

        {/* Animated loading indicator */}
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingDot,
              {
                opacity: Animated.divide(
                  Animated.modulo(
                    Animated.multiply(
                      new Animated.Value(1),
                      new Animated.Value(1)
                    ),
                    1
                  ),
                  1
                ),
              },
            ]}
          />
          <View style={[styles.loadingDot, { marginLeft: 8 }]} />
          <View style={[styles.loadingDot, { marginLeft: 8 }]} />
        </View>
      </View>
    );
  }

  // Stage 2: Permissions Explanation
  if (stage === 'permissions') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.permissionsContent}>
          {/* Header */}
          <View style={styles.permissionsHeader}>
            <Text style={styles.permissionsTitle}>Let's Get Started</Text>
            <Text style={styles.permissionsSubtitle}>
              We need a few permissions to help you discover and manage your devices
            </Text>
          </View>

          {/* Permission Items */}
          <View style={styles.permissionsList}>
            {/* Bluetooth */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Text style={styles.permissionIconText}>📡</Text>
              </View>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionItemTitle}>Bluetooth Access</Text>
                <Text style={styles.permissionItemDescription}>
                  Discover nearby smart devices for setup
                </Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Text style={styles.permissionIconText}>📍</Text>
              </View>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionItemTitle}>Location Access</Text>
                <Text style={styles.permissionItemDescription}>
                  Required by Android for Bluetooth scanning
                </Text>
              </View>
            </View>

            {/* Notifications */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Text style={styles.permissionIconText}>🔔</Text>
              </View>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionItemTitle}>Notifications</Text>
                <Text style={styles.permissionItemDescription}>
                  Get alerts for device status and connection updates
                </Text>
              </View>
            </View>
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            You can change these permissions anytime in your device settings
          </Text>
        </View>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    fontSize: 64,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  permissionsContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  permissionsHeader: {
    marginBottom: 40,
  },
  permissionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  permissionsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  permissionsList: {
    gap: 16,
    marginBottom: 40,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionIconText: {
    fontSize: 24,
  },
  permissionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  permissionItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  permissionItemDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default StartupScreen;
