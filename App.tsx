/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { BleProvider } from './src/context/BleContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { getMQTTService } from './src/services/mqttService';
import { getPermissionService } from './src/services/permissionService';
import { getNotificationService } from './src/services/notificationService';
import { getMQTTConfig } from './src/config/mqttConfig';
import { checkFirebaseRuntime } from './src/services/firebase/firebaseRuntimeCheck';

function App() {
  // Firebase runtime health check (non-blocking)
  useEffect(() => {
    const result = checkFirebaseRuntime();

    if (result.ok) {
      console.log('[Firebase] Runtime check passed', {
        appCount: result.appCount,
        appName: result.appName,
        projectId: result.projectId,
        appIdMasked: result.appIdMasked,
        storageBucket: result.storageBucket,
      });
    } else {
      console.warn('[Firebase] Runtime check failed', {
        errorMessage: result.errorMessage,
      });
    }
  }, []);

  // Request permissions silently on app startup
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const permissionService = getPermissionService();
        await permissionService.requestProvisioningPermissions();
      } catch {
        // Permissions request failed - app will still work but with limited functionality
      }
    };

    requestPermissions();
  }, []);

  // Initialize MQTT connection in background (non-blocking)
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        // Initialize notification service
        await getNotificationService().initialize();
        
        const mqttService = getMQTTService();

        // Step 1: Initialize client (setup callbacks)
        await mqttService.initialize();

        // Step 2: Get MQTT config from environment
        const mqttConfigBase = getMQTTConfig();

        // Step 3: Generate unique client ID and connect
        const mqttConfig = {
          url: mqttConfigBase.url,
          username: mqttConfigBase.username,
          password: mqttConfigBase.password,
          clientId: `${mqttConfigBase.clientIdPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        };

        if (!mqttConfigBase.url || !mqttConfigBase.username || !mqttConfigBase.password) {
          console.warn('[App] ⚠️ MQTT config incomplete - app will run but MQTT features may not work');
          return;
        }

        console.log('[App] Connecting to MQTT broker...');
        const connected = await mqttService.connect(mqttConfig);

        if (isMounted) {
          if (connected) {
            console.log('[App] ✅ MQTT connected successfully');
          } else {
            console.warn('[App] ⚠️ MQTT connection failed, will retry on device subscription');
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('[App] Error initializing:', error);
        }
      }
    };

    // Start initialization in background (non-blocking)
    initializeApp();

    // Cleanup on app unmount
    return () => {
      isMounted = false;
      getMQTTService().disconnect();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BleProvider>
              <RootNavigator />
            </BleProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default App;
