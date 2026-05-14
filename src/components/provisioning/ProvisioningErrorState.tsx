import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface ProvisioningErrorStateProps {
  errorMessage: string;
  onTryAgain: () => void;
  onCancel: () => void;
}

const ProvisioningErrorState: React.FC<ProvisioningErrorStateProps> = ({
  errorMessage,
  onTryAgain,
  onCancel,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Provisioning Failed</Text>
      <Text style={styles.message}>{errorMessage}</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.tryAgainButton]}
          onPress={onTryAgain}
        >
          <Text style={styles.tryAgainButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  icon: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tryAgainButton: {
    backgroundColor: '#3B82F6',
  },
  tryAgainButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

export default ProvisioningErrorState;
