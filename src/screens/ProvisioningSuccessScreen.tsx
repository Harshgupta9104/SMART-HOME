import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

interface ProvisioningSuccessScreenProps {
  navigation: any;
  route: any;
}

const ProvisioningSuccessScreen: React.FC<ProvisioningSuccessScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { deviceName, displayName } = route.params || { 
    deviceName: 'Device',
    displayName: 'Device'
  };

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Scale in the circle
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Fade in text
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Scale in checkmark
      Animated.timing(checkScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Slide up subtitle
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      // Wait before transitioning
      Animated.delay(1500),
    ]).start(() => {
      // Navigate to HomeScreen
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'HomeMain',
            params: {
              justProvisioned: true,
              deviceName: displayName || deviceName,
            },
          },
        ],
      });
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Success Circle with Checkmark */}
      <View style={styles.centerContent}>
        {/* Animated Circle Background */}
        <Animated.View
          style={[
            styles.successCircle,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Checkmark Icon */}
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{ scale: checkScaleAnim }],
              },
            ]}
          >
            <Icon name="check" size={56} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.successTitle}>Device Added!</Text>
          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.successSubtitle}>
              {displayName || deviceName} is ready to use
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingIndicator,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.loadingText}>Taking you to home...</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    marginBottom: 32,
  },

  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  messageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  subtitleContainer: {
    alignItems: 'center',
  },

  successSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  loadingIndicator: {
    marginTop: 24,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default ProvisioningSuccessScreen;
