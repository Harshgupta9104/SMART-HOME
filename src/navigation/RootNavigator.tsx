import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import AddDeviceScreen from '../screens/AddDeviceScreen';
import SimpleBleProvisionScreen from '../screens/SimpleBleProvisionScreen';
import WiFiProvisioningScreen from '../screens/WiFiProvisioningScreen';
import ProvisioningProgressScreen from '../screens/ProvisioningProgressScreen';
import ProvisioningSuccessScreen from '../screens/ProvisioningSuccessScreen';
import DeviceConfigScreen from '../screens/DeviceConfigScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';
import DeviceNamingScreen from '../screens/DeviceNamingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RoomManagementScreen from '../screens/RoomManagementScreen';
import { AuthWelcomeScreen, LoginScreen, SignupScreen, ForgotPasswordScreen } from '../screens/auth';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getNavigationTheme } from '../theme/theme';
import { getMQTTService } from '../services/mqttService';
import { getNotificationService } from '../services/notificationService';
import { getMQTTConfig } from '../config/mqttConfig';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { resolvedMode } = useTheme();
  const { loadingState, isAuthenticated } = useAuth();

  useEffect(() => {
    // Simulate minimal loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Initialize authenticated runtime (MQTT, notifications) when user logs in/out
  useEffect(() => {
    let isMounted = true;

    const initializeAuthenticatedRuntime = async () => {
      // If not authenticated, disconnect MQTT and return
      if (!isAuthenticated) {
        getMQTTService().disconnect();
        return;
      }

      try {
        // Initialize notification service
        await getNotificationService().initialize();

        // Initialize MQTT service
        const mqttService = getMQTTService();
        await mqttService.initialize();

        // Get MQTT config
        const mqttConfigBase = getMQTTConfig();

        // Check if config is complete (without logging credentials)
        if (!mqttConfigBase.url || !mqttConfigBase.username || !mqttConfigBase.password) {
          console.warn('[RootNavigator] MQTT config incomplete. MQTT features may be unavailable.');
          return;
        }

        // Create full config with unique client ID
        const mqttConfig = {
          url: mqttConfigBase.url,
          username: mqttConfigBase.username,
          password: mqttConfigBase.password,
          clientId: `${mqttConfigBase.clientIdPrefix}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
        };

        // Connect to MQTT
        const connected = await mqttService.connect(mqttConfig);

        if (isMounted && connected) {
          console.log('[RootNavigator] MQTT runtime connected');
        }
      } catch (error) {
        if (isMounted) {
          console.error('[RootNavigator] Error initializing authenticated runtime:', error);
        }
      }
    };

    initializeAuthenticatedRuntime();

    return () => {
      isMounted = false;
      getMQTTService().disconnect();
    };
  }, [isAuthenticated]);

  // Show loading screen while both local loading and Firebase auth are initializing
  if (isLoading || loadingState === 'initializing') {
    return (
      <NavigationContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </NavigationContainer>
    );
  }

  const navigationTheme = getNavigationTheme(resolvedMode);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack - shown when user is not authenticated
          <>
            <Stack.Screen
              name="AuthWelcome"
              component={AuthWelcomeScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          // App Stack - shown when user is authenticated
          <>
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen
              name="AddDevice"
              component={AddDeviceScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="DeviceDetails"
              component={DeviceDetailsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="SimpleBleProvision"
              component={SimpleBleProvisionScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="DeviceConfig"
              component={DeviceConfigScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="WiFiProvisioning"
              component={WiFiProvisioningScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ProvisioningProgress"
              component={ProvisioningProgressScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="ProvisioningSuccess"
              component={ProvisioningSuccessScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="DeviceNaming"
              component={DeviceNamingScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="RoomManagement"
              component={RoomManagementScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
