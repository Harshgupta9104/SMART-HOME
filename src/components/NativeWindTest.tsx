/**
 * NativeWind Test Component
 * Verifies that className works with React Native components
 * This is a minimal test, used only during verification phase
 * Not part of the final UI
 */

import React from 'react';
import { View, Text } from 'react-native';

export const NativeWindTest = () => {
  return (
    <View className="flex-1 justify-center items-center bg-blue-50">
      <View className="px-6 py-4 bg-white rounded-lg">
        <Text className="text-lg font-bold text-gray-800">
          NativeWind is working
        </Text>
        <Text className="text-sm text-gray-600 mt-2">
          className utilities are applied correctly
        </Text>
      </View>
    </View>
  );
};

export default NativeWindTest;
