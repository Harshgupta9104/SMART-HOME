import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ProvisioningState, STATUS_LABELS } from '../../constants/provisioningStates';

interface ProvisioningLoadingStateProps {
  state: ProvisioningState;
}

const ProvisioningLoadingState: React.FC<ProvisioningLoadingStateProps> = ({ state }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.title}>{STATUS_LABELS[state]}</Text>
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    opacity: 0.6,
  },
});

export default ProvisioningLoadingState;
