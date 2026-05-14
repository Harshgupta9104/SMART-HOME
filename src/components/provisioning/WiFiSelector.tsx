import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { WiFiNetwork } from '../../services/wifiService';

interface WiFiSelectorProps {
  selectedSSID: string;
  onSelectSSID: (ssid: string) => void;
  networks: WiFiNetwork[];
  currentSSID: string | null;
  isScanning: boolean;
}

const WiFiSelector: React.FC<WiFiSelectorProps> = ({
  selectedSSID,
  onSelectSSID,
  networks,
  currentSSID,
  isScanning,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [manualSSID, setManualSSID] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleSelectNetwork = (ssid: string) => {
    console.log('[WiFiSelector] Selected network:', ssid);
    onSelectSSID(ssid);
    setShowPicker(false);
  };

  const handleManualEntry = () => {
    if (manualSSID.trim()) {
      console.log('[WiFiSelector] Manual entry:', manualSSID);
      onSelectSSID(manualSSID.trim());
      setManualSSID('');
      setShowManualEntry(false);
      setShowPicker(false);
    }
  };

  const getSignalBars = (level: number): string => {
    if (level > -55) return '▮▮▮'; // 3 bars - Strong
    if (level > -75) return '▮▮'; // 2 bars - Medium
    return '▮'; // 1 bar - Weak
  };

  const getSignalColor = (level: number): string => {
    if (level > -55) return '#10B981'; // Green - Strong
    if (level > -75) return '#F59E0B'; // Orange - Medium
    return '#EF4444'; // Red - Weak
  };

  console.log('[WiFiSelector] Rendering with networks:', networks.length);

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.label}>Available Networks</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.selectorIcon}>📶</Text>
          <Text style={styles.selectorText}>
            {selectedSSID || 'Select a network'}
          </Text>
          <Text style={styles.selectorDropdown}>▼</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select WiFi Network</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {showManualEntry ? (
              <View style={styles.manualEntryContainer}>
                <Text style={styles.manualEntryLabel}>Enter Network Name</Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="Network SSID"
                  value={manualSSID}
                  onChangeText={setManualSSID}
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
                <View style={styles.manualButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.manualButton, styles.manualButtonCancel]}
                    onPress={() => {
                      setShowManualEntry(false);
                      setManualSSID('');
                    }}
                  >
                    <Text style={styles.manualButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.manualButton, styles.manualButtonConfirm]}
                    onPress={handleManualEntry}
                  >
                    <Text style={styles.manualButtonConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {isScanning && (
                  <View style={styles.scanningContainer}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={styles.scanningText}>Scanning networks...</Text>
                  </View>
                )}

                <FlatList
                  data={networks}
                  keyExtractor={(item, index) => `${item.ssid}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.networkItem,
                        item.isCurrentNetwork && styles.networkItemCurrent
                      ]}
                      onPress={() => handleSelectNetwork(item.ssid)}
                    >
                      <Text style={styles.lockIcon}>🔒</Text>
                      
                      <View style={styles.networkTextContainer}>
                        <Text style={styles.networkSSID} numberOfLines={1}>
                          {item.ssid}
                        </Text>
                        {item.isCurrentNetwork && (
                          <Text style={styles.currentNetworkLabel}>Currently connected</Text>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.signalBars,
                          { color: getSignalColor(item.level) },
                        ]}
                      >
                        {getSignalBars(item.level)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={true}
                  ListEmptyComponent={
                    !isScanning ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No networks available</Text>
                        <Text style={styles.emptySubtext}>Enter a network manually below</Text>
                      </View>
                    ) : null
                  }
                />

                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => setShowManualEntry(true)}
                >
                  <Text style={styles.manualEntryButtonText}>
                    Enter Network Manually
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
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
    marginBottom: 12,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  selectorText: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  selectorDropdown: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  scanningText: {
    fontSize: 13,
    color: '#6B7280',
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  networkItemCurrent: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  lockIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  networkTextContainer: {
    flex: 1,
  },
  networkSSID: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  currentNetworkLabel: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 2,
  },
  signalBars: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 2,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
  manualEntryButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  manualEntryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },
  manualEntryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  manualEntryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  manualInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  manualButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  manualButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualButtonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  manualButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  manualButtonConfirm: {
    backgroundColor: '#3B82F6',
  },
  manualButtonConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default WiFiSelector;
