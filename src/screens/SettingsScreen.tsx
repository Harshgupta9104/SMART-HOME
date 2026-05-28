import React, { useState } from 'react';
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

const SettingsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [theme, setTheme] = useState('System');
  const [language, setLanguage] = useState('English');

  const handleThemeChange = () => {
    Alert.alert('Theme', 'Select theme', [
      { text: 'Light', onPress: () => setTheme('Light') },
      { text: 'Dark', onPress: () => setTheme('Dark') },
      { text: 'System', onPress: () => setTheme('System') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLanguageChange = () => {
    Alert.alert('Language', 'Select language', [
      { text: 'English', onPress: () => setLanguage('English') },
      { text: 'Spanish', onPress: () => setLanguage('Spanish') },
      { text: 'French', onPress: () => setLanguage('French') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP PREFERENCES</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleThemeChange}>
            <View style={styles.menuIconContainer}>
              <Icon name="moon" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Theme</Text>
              <Text style={styles.menuSubtitle}>{theme}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLanguageChange}>
            <View style={styles.menuIconContainer}>
              <Icon name="globe" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuSubtitle}>{language}</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="eye" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Appearance</Text>
              <Text style={styles.menuSubtitle}>Font size and display</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Device Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEVICE SETTINGS</Text>
          
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
              <Icon name="file-text" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Device Logs</Text>
              <Text style={styles.menuSubtitle}>Activity and event history</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="info" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Version</Text>
              <Text style={styles.menuSubtitle}>1.0.0</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

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

  bottomSpacing: {
    height: 40,
  },
});

export default SettingsScreen;
