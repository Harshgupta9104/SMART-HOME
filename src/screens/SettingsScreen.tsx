import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { AppThemeMode, AVAILABLE_THEMES } from '../theme/theme';

const SettingsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [language, setLanguage] = useState('English');

  const handleThemeSelect = useCallback(async (selectedMode: AppThemeMode) => {
    await setMode(selectedMode);
    setShowThemeModal(false);
  }, [setMode]);

  const handleLanguageChange = () => {
    Alert.alert('Language', 'Select language', [
      { text: 'English', onPress: () => setLanguage('English') },
      { text: 'Spanish', onPress: () => setLanguage('Spanish') },
      { text: 'French', onPress: () => setLanguage('French') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getModeLabel = (m: AppThemeMode | string): string => {
    if (m === 'system') return 'System';
    const theme = AVAILABLE_THEMES.find((t) => t.mode === m);
    return theme ? theme.label : m.charAt(0).toUpperCase() + m.slice(1);
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={theme.textPrimary === '#F9FAFB' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP PREFERENCES</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowThemeModal(true)}>
            <View style={styles.menuIconContainer}>
              <Icon name="moon" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Theme</Text>
              <Text style={styles.menuSubtitle}>{getModeLabel(mode)}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLanguageChange}>
            <View style={styles.menuIconContainer}>
              <Icon name="globe" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuSubtitle}>{language}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="eye" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Appearance</Text>
              <Text style={styles.menuSubtitle}>Font size and display</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Device Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEVICE SETTINGS</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="wifi" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Network Settings</Text>
              <Text style={styles.menuSubtitle}>Wi-Fi and connectivity</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="refresh-cw" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Firmware Updates</Text>
              <Text style={styles.menuSubtitle}>Keep devices up to date</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="file-text" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Device Logs</Text>
              <Text style={styles.menuSubtitle}>Activity and event history</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="info" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Version</Text>
              <Text style={styles.menuSubtitle}>1.0.0</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Icon name="help-circle" size={20} color={theme.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSubtitle}>FAQs and contact us</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal visible={showThemeModal} transparent animationType="fade">
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Theme</Text>
            </View>

            <View style={styles.modalOptions}>
              {(['system', 'light', 'dark', 'ocean', 'emerald', 'purple'] as AppThemeMode[]).map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  style={[styles.modalOption, mode === themeOption && styles.modalOptionSelected]}
                  onPress={() => handleThemeSelect(themeOption)}
                >
                  <Text style={[styles.modalOptionText, mode === themeOption && styles.modalOptionTextSelected]}>
                    {getModeLabel(themeOption)}
                  </Text>
                  {mode === themeOption && (
                    <Icon name="check" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      paddingHorizontal: 12,
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 1,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuContent: {
      flex: 1,
      gap: 2,
    },
    menuTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    menuSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    bottomSpacing: {
      height: 40,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    modalHeader: {
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    modalOptions: {
      marginTop: 12,
      gap: 8,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: theme.border,
    },
    modalOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },
    modalOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    modalOptionTextSelected: {
      color: theme.primary,
    },
    modalCloseButton: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.background,
      alignItems: 'center',
    },
    modalCloseButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
    },
  });

export default SettingsScreen;
