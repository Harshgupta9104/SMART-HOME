import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useHome } from '../contexts/HomeContext';
import { getUserProfile } from '../services/firebase/userProfileService';
import { UserProfile } from '../types/userProfile';

const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const { activeHome, loadingState: homeLoadingState } = useHome();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
      } catch {
        console.error('[ProfileScreen] Failed to load profile');
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.uid]);

  const handleRetry = React.useCallback(() => {
    if (user?.uid) {
      setIsLoading(true);
      setError(null);
      const loadProfile = async () => {
        try {
          const userProfile = await getUserProfile(user.uid);
          setProfile(userProfile);
        } catch {
          console.error('[ProfileScreen] Failed to load profile');
          setError('Failed to load profile');
        } finally {
          setIsLoading(false);
        }
      };
      loadProfile();
    }
  }, [user?.uid]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            console.error('[ProfileScreen] Logout failed');
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const displayName = profile?.displayName || 'Smart Home User';
  const displayEmail = profile?.email || user?.email || 'Email unavailable';
  const userInitial = displayName.charAt(0).toUpperCase() || 'U';

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    handleRetry();
    setTimeout(() => setRefreshing(false), 1000);
  }, [handleRetry]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {isLoading ? (
        // Loading state with spinner
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted, marginTop: 16 }]}>Loading profile...</Text>
        </View>
      ) : error ? (
        // Error state with retry button
        <View style={styles.centerContainer}>
          <View style={[styles.errorIconBox, { backgroundColor: theme.danger + '20' }]}>
            <Icon name="alert-circle" size={32} color={theme.danger} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={handleRetry}
          >
            <Icon name="refresh-cw" size={16} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Profile content
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
              progressBackgroundColor={theme.surface}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Profile</Text>
          </View>
          {/* User Profile Card */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.profileCardWrapper}>
            <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.profileCardContent}>
                <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.avatarText, { color: theme.surface }]}>{userInitial}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={[styles.profileEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: theme.primarySoft }]}>
                    <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                    <Text style={[styles.statusText, { color: theme.primary }]}>
                      {profile?.status === 'active'
                        ? 'Active'
                        : profile?.status === 'disabled'
                        ? 'Disabled'
                        : 'Profile pending'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Home Statistics Card */}
          <Animated.View entering={FadeInDown.delay(200)} style={[styles.statsCardWrapper, { marginHorizontal: 16 }]}>
            <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.statsHeader}>
                <Icon name="home" size={20} color={theme.primary} />
                <Text style={[styles.statsTitle, { color: theme.textPrimary }]}>
                  {homeLoadingState === 'loading' ? 'Loading home...' : activeHome?.name || 'My Home'}
                </Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.statValue, { color: theme.textPrimary }]}>1</Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Device</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.statValue, { color: theme.textPrimary }]}>1</Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Online</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.statValue, { color: theme.textPrimary }]}>0</Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Rooms</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Home Settings Section */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>HOME SETTINGS</Text>
            </View>

            <MenuCard
              icon="home"
              title="Manage Home"
              subtitle="Edit home name and details"
              theme={theme}
              onPress={() => navigation.navigate('RoomManagement')}
            />
            <MenuCard
              icon="grid"
              title="Rooms"
              subtitle="Organize devices by room"
              theme={theme}
              onPress={() => navigation.navigate('RoomManagement')}
            />
            <MenuCard
              icon="users"
              title="Family Members"
              subtitle="Manage home access"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Family member management coming in next update')}
            />
            <MenuCard
              icon="smartphone"
              title="Device Management"
              subtitle="View and control all devices"
              theme={theme}
              onPress={() => navigation.navigate('HomeMain')}
            />
          </Animated.View>

          {/* App Preferences Section */}
          <Animated.View entering={FadeInDown.delay(400)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>APP PREFERENCES</Text>
            </View>

            <MenuCard
              icon="bell"
              title="Notifications"
              subtitle="Manage alerts and device updates"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon')}
            />
            <MenuCard
              icon="moon"
              title="Theme"
              subtitle="Light, Dark or System"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Theme selector coming soon')}
            />
            <MenuCard
              icon="globe"
              title="Language"
              subtitle="English (Default)"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Language settings coming soon')}
            />
            <MenuCard
              icon="eye"
              title="App Appearance"
              subtitle="Font size and display settings"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Appearance settings coming soon')}
            />
          </Animated.View>

          {/* Device & System Section */}
          <Animated.View entering={FadeInDown.delay(500)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>DEVICE & SYSTEM</Text>
            </View>

            <MenuCard
              icon="file-text"
              title="Device Logs"
              subtitle="Activity and event history"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Device logs coming soon')}
            />
            <MenuCard
              icon="refresh-cw"
              title="Firmware Updates"
              subtitle="Keep devices up to date"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Firmware updates coming soon')}
            />
            <MenuCard
              icon="wifi"
              title="Network Settings"
              subtitle="Wi-Fi and connectivity"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Network settings coming soon')}
            />
            <MenuCard
              icon="help-circle"
              title="Help & Support"
              subtitle="FAQs and contact us"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Help & support coming soon')}
            />
          </Animated.View>

          {/* Account Section */}
          <Animated.View entering={FadeInDown.delay(600)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ACCOUNT</Text>
            </View>

            <MenuCard
              icon="shield"
              title="Privacy & Security"
              subtitle="Password and data settings"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon')}
            />
            <MenuCard
              icon="file"
              title="Terms & Policies"
              subtitle="Legal and privacy documents"
              theme={theme}
              onPress={() => Alert.alert('Coming Soon', 'Terms & policies coming soon')}
            />
            <MenuCard
              icon="log-out"
              title="Logout"
              subtitle=""
              isDangerous
              theme={theme}
              onPress={handleLogout}
            />
          </Animated.View>

          {/* Bottom Spacing */}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: theme.bottomNav,
            paddingBottom: insets.bottom + 8,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HomeMain')}>
          <Icon name="home" size={20} color={theme.textSecondary} />
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('AddDevice')}>
          <View style={[styles.addButton, { backgroundColor: theme.primarySoft }]}>
            <Icon name="plus" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.navLabel, { color: theme.textSecondary }]}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Icon name="user" size={20} color={theme.primary} />
          <Text style={[styles.navLabel, { color: theme.primary }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


// Menu Card Component
interface MenuCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  isDangerous?: boolean;
  theme: any;
  onPress: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({
  icon,
  title,
  subtitle,
  isDangerous = false,
  theme,
  onPress,
}) => {
  const iconColor = isDangerous ? theme.danger : theme.primary;
  const iconBgColor = isDangerous ? theme.danger + '20' : theme.primarySoft;

  return (
    <Animated.View entering={FadeInUp}>
      <TouchableOpacity
        style={[
          styles.menuCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        onPress={onPress}
      >
        <View style={[styles.menuIconBox, { backgroundColor: iconBgColor }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.menuContent}>
          <Text
            style={[
              styles.menuTitle,
              { color: isDangerous ? theme.danger : theme.textPrimary },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.menuSubtitle, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={20} color={theme.border} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  profileCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  profileCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsCardWrapper: {
    marginBottom: 24,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 11,
    fontWeight: '400',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  addButton: {
    width: 38,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProfileScreen;
