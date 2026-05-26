import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import SimpleBleProvisionScreen from '../screens/SimpleBleProvisionScreen';
import WiFiProvisioningScreen from '../screens/WiFiProvisioningScreen';
import ProvisioningProgressScreen from '../screens/ProvisioningProgressScreen';
import ProvisioningSuccessScreen from '../screens/ProvisioningSuccessScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens for other tabs
const DevicesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Devices Screen</Text>
  </View>
);

const StatsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Stats Screen</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Profile Screen</Text>
  </View>
);

// Home Stack Navigator
const HomeStackNavigator = () => {
  return (
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
  );
};

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
          <ActivityIndicator size="large" color="#5B5BFF" />
        </View>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            height: 70,
            paddingBottom: 12,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarActiveTintColor: '#5B5BFF',
          tabBarInactiveTintColor: '#CCCCCC',
          tabBarLabel: ({ focused, color }) => {
            let label = '';
            if (route.name === 'Home') label = 'Home';
            else if (route.name === 'Devices') label = 'Devices';
            else if (route.name === 'Stats') label = 'Stats';
            else if (route.name === 'Profile') label = 'Profile';

            return <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>;
          },
          tabBarIcon: ({ focused, color }) => {
            let icon = '';
            if (route.name === 'Home') icon = '🏠';
            else if (route.name === 'Devices') icon = '📱';
            else if (route.name === 'Stats') icon = '📊';
            else if (route.name === 'Profile') icon = '👤';

            return <Text style={{ fontSize: 24 }}>{icon}</Text>;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStackNavigator} />
        <Tab.Screen name="Devices" component={DevicesScreen} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
