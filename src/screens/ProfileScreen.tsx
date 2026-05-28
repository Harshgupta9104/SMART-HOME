import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {
        // Handle logout logic here
      }},
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatarContainer}>
            <Text style={styles.userAvatar}>U</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>User</Text>
            <Text style={styles.userEmail}>user@example.com</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Home Owner</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Icon name="edit-2" size={16} color="#3B82F6" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* My Home Section */}
        <View style={styles.homeCard}>
          <View style={styles.homeHeader}>
            <Icon name="home" size={20} color="#3B82F6" />
            <Text style={styles.homeTitle}>My Home</Text>
          </View>
          <View style={styles.homeStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Device</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Rooms</Text>
            </View>
          </View>
        </View>

        {/* Home Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOME SETTINGS</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="home" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Manage Home</Text>
              <Text style={styles.menuSubtitle}>Edit home name and details</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="grid" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Rooms</Text>
              <Text style={styles.menuSubtitle}>Organize devices by room</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="users" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Family Members</Text>
              <Text style={styles.menuSubtitle}>Manage home access</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="smartphone" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Device Management</Text>
              <Text style={styles.menuSubtitle}>View and control all devices</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* App Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP PREFERENCES</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="bell" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Manage alerts and device updates</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="moon" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Theme</Text>
              <Text style={styles.menuSubtitle}>Light, Dark or System</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="globe" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuSubtitle}>English (Default)</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="eye" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Appearance</Text>
              <Text style={styles.menuSubtitle}>Font size and display settings</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Device & System Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEVICE & SYSTEM</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="file-text" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Device Logs</Text>
              <Text style={styles.menuSubtitle}>Activity and event history</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="refresh-cw" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Firmware Updates</Text>
              <Text style={styles.menuSubtitle}>Keep devices up to date</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="wifi" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Network Settings</Text>
              <Text style={styles.menuSubtitle}>Wi-Fi and connectivity</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="help-circle" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSubtitle}>FAQs and contact us</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="shield" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Privacy & Security</Text>
              <Text style={styles.menuSubtitle}>Password and data settings</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="file" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Terms & Policies</Text>
              <Text style={styles.menuSubtitle}>Legal and privacy documents</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
              <Icon name="log-out" size={20} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, styles.logoutText]}>Logout</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // User Card
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },

  userAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  userAvatar: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  userInfo: {
    flex: 1,
    gap: 4,
  },

  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  userEmail: {
    fontSize: 13,
    color: '#6B7280',
  },

  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },

  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },

  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Home Card
  homeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },

  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  homeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  homeStats: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },

  statItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Menu Items
  menuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },

  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuContent: {
    flex: 1,
    gap: 2,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Logout Item
  logoutItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },

  logoutIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  logoutText: {
    color: '#EF4444',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 100,
  },
});

export default ProfileScreen;
