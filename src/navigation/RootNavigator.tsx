import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import StartupScreen from '../screens/StartupScreen';
import HomeScreen from '../screens/HomeScreen';
import SimpleBleProvisionScreen from '../screens/SimpleBleProvisionScreen';
import WiFiProvisioningScreen from '../screens/WiFiProvisioningScreen';
import ProvisioningProgressScreen from '../screens/ProvisioningProgressScreen';
import ProvisioningSuccessScreen from '../screens/ProvisioningSuccessScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboarding_completed');
        setHasCompletedOnboarding(completed === 'true');
      } catch (error) {
        console.error('[RootNavigator] Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('[RootNavigator] Error saving onboarding status:', error);
    }
  };

  if (isLoading) {
    return (
      <NavigationContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {!hasCompletedOnboarding ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="Startup"
            component={StartupScreen}
            options={{
              headerShown: false,
            }}
            initialParams={{ onComplete: handleOnboardingComplete }}
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="HomeMain" component={HomeScreen} />
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
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
