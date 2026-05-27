/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BleProvider } from './src/context/BleContext';
import RootNavigator from './src/navigation/RootNavigator';
import { getMQTTService } from './src/services/mqttService';
import { getPermissionService } from './src/services/permissionService';

function App() {
  // Request permissions silently on app startup
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const permissionService = getPermissionService();
        await permissionService.requestProvisioningPermissions();
      } catch (error) {
        // Permissions request failed - app will still work but with limited functionality
      }
    };

    requestPermissions();

    // Initialize MQTT connection on app startup
    const initializeMQTT = async () => {
      try {
        const mqttService = getMQTTService();

        // Step 1: Initialize client (setup callbacks)
        await mqttService.initialize();

        // Step 2: Connect to broker via WebSocket
        const mqttConfig = {
          url: 'wss://b01052fb9a1942c19262e349a38863d1.s1.eu.hivemq.cloud:8884/mqtt',
          username: 'bluetooth',
          password: 'Ble_12345',
          clientId: `smartapp-${Date.now()}_${Math.random().toString(16).slice(3)}`,
        };

        console.log('[App] Connecting to HiveMQ...');
        const connected = await mqttService.connect(mqttConfig);

        if (connected) {
          console.log('[App] ✅ MQTT connected successfully to HiveMQ');
        } else {
          console.warn('[App] ⚠️ MQTT connection failed, will retry on device subscription');
        }
      } catch (error) {
        console.error('[App] Error initializing MQTT:', error);
      }
    };

    initializeMQTT();

    // Cleanup on app unmount
    return () => {
      getMQTTService().disconnect();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <BleProvider>
        <RootNavigator />
      </BleProvider>
    </SafeAreaProvider>
  );
}

export default App;
