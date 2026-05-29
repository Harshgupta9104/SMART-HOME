import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

// Custom Device + Plus Icon Component (Gradient style)
const DevicePlusIcon = ({ size = 32, color = '#3B82F6' }) => {
  const deviceSize = size * 0.75;
  const plusSize = size * 0.4;
  
  return (
    <View style={{ position: 'relative', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Device with gradient background */}
      <View
        style={{
          width: deviceSize,
          height: deviceSize * 1.3,
          borderRadius: deviceSize * 0.25,
          backgroundColor: color,
          opacity: 0.9,
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: deviceSize * 0.15,
          shadowColor: color,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        {/* Device screen area */}
        <View
          style={{
            width: deviceSize * 0.85,
            height: deviceSize * 0.8,
            borderRadius: deviceSize * 0.12,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          }}
        />
        
        {/* Device home button */}
        <View
          style={{
            width: deviceSize * 0.25,
            height: deviceSize * 0.12,
            borderRadius: deviceSize * 0.06,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          }}
        />
      </View>
      
      {/* Plus badge on top-right */}
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: plusSize,
          height: plusSize,
          borderRadius: plusSize / 2,
          backgroundColor: '#5B5FFF',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 3,
          borderColor: '#F4F7FB',
          shadowColor: '#5B5FFF',
          shadowOpacity: 0.4,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 6,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: plusSize * 0.45, fontWeight: '700', lineHeight: plusSize * 0.45 }}>+</Text>
      </View>
    </View>
  );
};

// Animated Hero Icon Component
const AnimatedHeroIcon = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
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

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: pulseAnim },
            { translateY: floatAnim },
          ],
        },
      ]}
    >
      <DevicePlusIcon size={32} color="#3B82F6" />
    </Animated.View>
  );
};

interface SetupMethod {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  isActive: boolean;
  onPress?: () => void;
  iconColor?: string;
}

const AddDeviceScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [selectedSetupId, setSelectedSetupId] = useState<string>('nearby');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.8)).current;

  // Entry animations
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
      Animated.timing(heroScaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNearbySetup = () => {
    setSelectedSetupId('nearby');
    navigation.navigate('SimpleBleProvision');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleQRSetup = () => {
    setSelectedSetupId('qr');
    console.log('QR Code setup - Coming soon');
  };

  const handleManualSetup = () => {
    setSelectedSetupId('manual');
    console.log('Manual setup - Coming soon');
  };

  const setupMethods: SetupMethod[] = [
    {
      id: 'nearby',
      title: 'Nearby setup',
      subtitle: 'Find devices using Bluetooth',
      icon: 'bluetooth',
      badge: 'Ready',
      isActive: true,
      onPress: handleNearbySetup,
      iconColor: '#3B82F6',
    },
    {
      id: 'qr',
      title: 'Scan QR code',
      subtitle: 'Quick setup with a QR code',
      icon: 'grid',
      badge: 'Coming soon',
      isActive: false,
      iconColor: '#10B981',
    },
    {
      id: 'manual',
      title: 'Add manually',
      subtitle: 'Enter device details yourself',
      icon: 'sliders',
      badge: 'Coming soon',
      isActive: false,
      iconColor: '#8B5CF6',
    },
  ];

  const renderSetupCard = (method: SetupMethod) => {
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.setupCard,
          method.isActive ? styles.setupCardActive : styles.setupCardDisabled,
        ]}
        onPress={method.onPress}
        activeOpacity={0.7}
      >
        {/* Icon Container */}
        <View
          style={[
            styles.iconContainer,
            selectedSetupId === method.id ? styles.iconContainerActive : styles.iconContainerDisabled,
            { backgroundColor: method.iconColor ? `${method.iconColor}20` : 'rgba(156, 163, 175, 0.1)' },
          ]}
        >
          <Icon
            name={method.icon}
            size={20}
            color={method.iconColor || '#3B82F6'}
          />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text
            style={[
              styles.cardTitle,
              selectedSetupId === method.id ? styles.cardTitleActive : styles.cardTitleDisabled,
            ]}
          >
            {method.title}
          </Text>
          <Text
            style={[
              styles.cardSubtitle,
              selectedSetupId === method.id ? styles.cardSubtitleActive : styles.cardSubtitleDisabled,
            ]}
          >
            {method.subtitle}
          </Text>
        </View>

        {/* Badge and Indicator */}
        <View style={styles.cardRight}>
          <View
            style={[
              styles.badge,
              selectedSetupId === method.id ? styles.badgeActive : styles.badgeDisabled,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                selectedSetupId === method.id ? styles.badgeTextActive : styles.badgeTextDisabled,
              ]}
            >
              {method.badge}
            </Text>
          </View>
          {selectedSetupId === method.id && (
            <Icon name="chevron-right" size={16} color="#3B82F6" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              transform: [{ scale: heroScaleAnim }],
            },
          ]}
        >
          <View style={styles.heroIconContainer}>
            <AnimatedHeroIcon />
          </View>
          <Text style={styles.heroTitle}>Add Device</Text>
          <Text style={styles.heroSubtitle}>
            Connect a nearby device and make it part of your home.
          </Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepIndicatorText}>Step 1 of 3</Text>
          </View>
        </Animated.View>

        {/* Setup Methods Section */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionLabel}>Setup method</Text>

          <View style={styles.setupCardsContainer}>
            {setupMethods.map(method => renderSetupCard(method))}
          </View>
        </View>

        {/* Helper Text */}
        <View style={styles.helperContainer}>
          <Icon name="info" size={14} color="#9CA3AF" />
          <Text style={styles.helperText}>
            Make sure your device is powered on and nearby.
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F4F7FB',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },

  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },

  heroSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },

  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: 0.2,
  },

  // Setup Section
  setupSection: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  setupCardsContainer: {
    gap: 12,
  },

  // Setup Cards
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    gap: 14,
    minHeight: 88,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  setupCardActive: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: '#FFFFFF',
  },

  setupCardDisabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  // Icon Container
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  iconContainerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },

  iconContainerDisabled: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },

  // Card Content
  cardContent: {
    flex: 1,
    gap: 2,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  cardTitleActive: {
    color: '#111827',
  },

  cardTitleDisabled: {
    color: '#111827',
  },

  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 17,
  },

  cardSubtitleActive: {
    color: '#6B7280',
  },

  cardSubtitleDisabled: {
    color: '#6B7280',
  },

  // Card Right (Badge + Chevron)
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  // Badge
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },

  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },

  badgeDisabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },

  badgeTextActive: {
    color: '#10B981',
  },

  badgeTextDisabled: {
    color: '#10B981',
  },

  // Helper Container
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(156, 163, 175, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.06)',
  },

  helperText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 18,
  },
});

export default AddDeviceScreen;
