import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Enter WiFi password',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          secureTextEntry={!showPassword}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.visibilityIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  visibilityToggle: {
    padding: 8,
  },
  visibilityIcon: {
    fontSize: 18,
  },
});

export default PasswordInput;
