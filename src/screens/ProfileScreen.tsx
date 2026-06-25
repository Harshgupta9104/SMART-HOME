import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

const ProfileScreen = ({ _navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {
        // Handle logout logic here
      }},
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View className="px-5 py-4">
        <Text className="text-4xl font-extrabold" style={{ color: theme.textPrimary, letterSpacing: -1 }}>
          Profile
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View className="rounded-3xl p-5 mb-5 flex-row items-center gap-4" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
          <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: theme.primary }}>
            <Text className="text-2xl font-bold" style={{ color: theme.surface }}>U</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-base font-bold" style={{ color: theme.textPrimary }}>User</Text>
            <Text className="text-sm" style={{ color: theme.textSecondary }}>user@example.com</Text>
            <View className="rounded-2xl px-2.5 py-1 self-start mt-1" style={{ backgroundColor: theme.primarySoft }}>
              <Text className="text-xs font-semibold" style={{ color: theme.primary }}>Home Owner</Text>
            </View>
          </View>
          <TouchableOpacity className="flex-row items-center gap-1.5 px-3 py-2 rounded-2xl border" style={{ borderColor: theme.primary }}>
            <Icon name="edit-2" size={16} color={theme.primary} />
            <Text className="text-xs font-semibold" style={{ color: theme.primary }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Home Card */}
        <View className="rounded-3xl p-5 mb-6" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
          <View className="flex-row items-center gap-3 mb-4">
            <Icon name="home" size={20} color={theme.primary} />
            <Text className="text-base font-bold" style={{ color: theme.textPrimary }}>My Home</Text>
          </View>
          <View className="flex-row gap-3 justify-between">
            <View className="flex-1 rounded-2xl py-4 items-center gap-1" style={{ backgroundColor: theme.surface }}>
              <Text className="text-lg font-bold" style={{ color: theme.textPrimary }}>1</Text>
              <Text className="text-xs font-medium" style={{ color: theme.textMuted }}>Device</Text>
            </View>
            <View className="flex-1 rounded-2xl py-4 items-center gap-1" style={{ backgroundColor: theme.surface }}>
              <Text className="text-lg font-bold" style={{ color: theme.textPrimary }}>1</Text>
              <Text className="text-xs font-medium" style={{ color: theme.textMuted }}>Online</Text>
            </View>
            <View className="flex-1 rounded-2xl py-4 items-center gap-1" style={{ backgroundColor: theme.surface }}>
              <Text className="text-lg font-bold" style={{ color: theme.textPrimary }}>0</Text>
              <Text className="text-xs font-medium" style={{ color: theme.textMuted }}>Rooms</Text>
            </View>
          </View>
        </View>

        {/* Home Settings Section */}
        <View className="mb-6">
          <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>HOME SETTINGS</Text>
          
          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="home" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Manage Home</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Edit home name and details</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="grid" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Rooms</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Organize devices by room</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="users" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Family Members</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Manage home access</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="smartphone" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Device Management</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>View and control all devices</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>
        </View>

        {/* App Preferences Section */}
        <View className="mb-6">
          <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>APP PREFERENCES</Text>
          
          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="bell" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Notifications</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Manage alerts and device updates</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="moon" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Theme</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Light, Dark or System</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="globe" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Language</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>English (Default)</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="eye" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>App Appearance</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Font size and display settings</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>
        </View>

        {/* Device & System Section */}
        <View className="mb-6">
          <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>DEVICE & SYSTEM</Text>
          
          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="file-text" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Device Logs</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Activity and event history</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="refresh-cw" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Firmware Updates</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Keep devices up to date</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="wifi" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Network Settings</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Wi-Fi and connectivity</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="help-circle" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Help & Support</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>FAQs and contact us</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View className="mb-6">
          <Text className="text-xs font-bold mb-3 px-1" style={{ color: theme.textMuted, letterSpacing: 0.5 }}>ACCOUNT</Text>
          
          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="shield" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Privacy & Security</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Password and data settings</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.primarySoft }}>
              <Icon name="file" size={20} color={theme.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>Terms & Policies</Text>
              <Text className="text-xs" style={{ color: theme.textMuted }}>Legal and privacy documents</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }} onPress={handleLogout}>
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.danger + '20' }}>
              <Icon name="log-out" size={20} color={theme.danger} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-semibold" style={{ color: theme.danger }}>Logout</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.border} />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
