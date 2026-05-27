import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import SimpleBleProvisionScreen from '../screens/SimpleBleProvisionScreen';
import WiFiProvisioningScreen from '../screens/WiFiProvisioningScreen';
import ProvisioningProgressScreen from '../screens/ProvisioningProgressScreen';
import ProvisioningSuccessScreen from '../screens/ProvisioningSuccessScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';
import DeviceNamingScreen from '../screens/DeviceNamingScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate minimal loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
        <Stack.Screen
          name="DeviceNaming"
          component={DeviceNamingScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
