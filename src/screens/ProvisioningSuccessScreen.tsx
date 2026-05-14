import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface ProvisioningSuccessScreenProps {
  navigation: any;
  route: any;
}

const ProvisioningSuccessScreen: React.FC<ProvisioningSuccessScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { deviceName } = route.params || { deviceName: 'Device' };

  // Animations
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);
  const checkmarkScale = new Animated.Value(0);
  const slideUpAnim = new Animated.Value(50);
  const textOpacity = new Animated.Value(0);

  useEffect(() => {
    // Success icon animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(checkmarkScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Text animation
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleGoToDashboard = () => {
    navigation.navigate('HomeMain');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <Animated.View
          style={[
            styles.successCircle,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.successIcon,
              {
                transform: [{ scale: checkmarkScale }],
              },
            ]}
          >
            ✓
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateY: slideUpAnim }],
            opacity: textOpacity,
          },
        ]}
      >
        <Text style={styles.title}>Device Connected Successfully</Text>
        <Text style={styles.subtitle}>
          {deviceName} is now ready to use. You can control it from your dashboard.
        </Text>

        {/* Device Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustration}>📱</Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What's Next?</Text>
          <Text style={styles.infoText}>
            • Your device is connected to WiFi{'\n'}
            • It will appear on your dashboard{'\n'}
            • You can now control it remotely
          </Text>
        </View>
      </Animated.View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={handleGoToDashboard}
          activeOpacity={0.8}
        >
          <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successIcon: {
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  illustrationContainer: {
    marginBottom: 32,
  },
  illustration: {
    fontSize: 80,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingBottom: 40,
  },
  dashboardButton: {
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
  dashboardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProvisioningSuccessScreen;
