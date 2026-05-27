import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

interface ModernProvisioningLoaderProps {
  deviceName: string;
  stage?: 'connecting' | 'configuring' | 'finalizing';
}

const ModernProvisioningLoader: React.FC<ModernProvisioningLoaderProps> = ({
  deviceName,
  stage = 'connecting',
}) => {
  const spinAnim = new Animated.Value(0);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStageMessage = () => {
    switch (stage) {
      case 'configuring':
        return 'Configuring your device...';
      case 'finalizing':
        return 'Finalizing setup...';
      default:
        return 'Connecting your device...';
    }
  };

  return (
    <View style={styles.container}>
      {/* Device Icon with Pulse */}
      <Animated.View
        style={[
          styles.deviceIconContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.deviceText}>Loading...</Text>
      </Animated.View>

      {/* Animated Loader Ring */}
      <Animated.View
        style={[
          styles.loaderRing,
          {
            transform: [{ rotate: spinInterpolate }],
          },
        ]}
      />

      {/* Device Name */}
      <Text style={styles.deviceName}>{deviceName}</Text>

      {/* Stage Message */}
      <Text style={styles.message}>{getStageMessage()}</Text>

      {/* Progress Indicator */}
      <View style={styles.progressIndicator}>
        <View style={styles.progressBar} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  deviceIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  deviceIcon: {
    fontSize: 56,
  },
  loaderRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#3B82F6',
    borderRightColor: '#3B82F6',
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressIndicator: {
    width: 200,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    width: '60%',
  },
});

export default ModernProvisioningLoader;
