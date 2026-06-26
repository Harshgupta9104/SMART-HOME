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
import { HomeProvider } from './src/contexts/HomeContext';
import { RoomProvider } from './src/contexts/RoomContext';
import RootNavigator from './src/navigation/RootNavigator';
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

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <HomeProvider>
              <RoomProvider>
                <BleProvider>
                  <RootNavigator />
                </BleProvider>
              </RoomProvider>
            </HomeProvider>
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
