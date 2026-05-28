import React, { useEffect, useRef } from 'react';
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

interface SetupMethod {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  isActive: boolean;
  onPress?: () => void;
}

const AddDeviceScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  
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
    navigation.navigate('SimpleBleProvision');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const setupMethods: SetupMethod[] = [
    {
      id: 'nearby',
      title: 'Nearby Setup',
      subtitle: 'Find devices using Bluetooth',
      icon: 'bluetooth',
      badge: 'Ready',
      isActive: true,
      onPress: handleNearbySetup,
    },
    {
      id: 'qr',
      title: 'Scan QR Code',
      subtitle: 'Quick setup with a QR code',
      icon: 'square',
      badge: 'Coming soon',
      isActive: false,
    },
    {
      id: 'manual',
      title: 'Add Manually',
      subtitle: 'Enter device details yourself',
      icon: 'edit-3',
      badge: 'Coming soon',
      isActive: false,
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
        disabled={!method.isActive}
        activeOpacity={method.isActive ? 0.8 : 1}
      >
        {/* Icon Container */}
        <View
          style={[
            styles.iconContainer,
            method.isActive ? styles.iconContainerActive : styles.iconContainerDisabled,
          ]}
        >
          <Icon
            name={method.icon}
            size={20}
            color="#3B82F6"
          />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text
            style={[
              styles.cardTitle,
              method.isActive ? styles.cardTitleActive : styles.cardTitleDisabled,
            ]}
          >
            {method.title}
          </Text>
          <Text
            style={[
              styles.cardSubtitle,
              method.isActive ? styles.cardSubtitleActive : styles.cardSubtitleDisabled,
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
              method.isActive ? styles.badgeActive : styles.badgeDisabled,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                method.isActive ? styles.badgeTextActive : styles.badgeTextDisabled,
              ]}
            >
              {method.badge}
            </Text>
          </View>
          {method.isActive && (
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
            <Icon name="home" size={32} color="#3B82F6" />
          </View>
          <Text style={styles.heroTitle}>Add Device</Text>
          <Text style={styles.heroSubtitle}>
            Set up a new smart device in your home.
          </Text>
        </Animated.View>

        {/* Setup Methods Section */}
        <View style={styles.setupSection}>
          <Text style={styles.sectionLabel}>Choose setup method</Text>

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
    gap: 4,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignSelf: 'flex-start',
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },

  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },

  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
  },

  // Setup Section
  setupSection: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B4B8C1',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },

  setupCardsContainer: {
    gap: 10,
  },

  // Setup Cards
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    gap: 12,
    minHeight: 86,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  setupCardActive: {
    borderColor: 'rgba(59, 130, 246, 0.2)',
    backgroundColor: '#FFFFFF',
  },

  setupCardDisabled: {
    borderColor: 'rgba(59, 130, 246, 0.2)',
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },

  // Icon Container
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  iconContainerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },

  iconContainerDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
