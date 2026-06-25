import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: number;
}

interface ProvisioningStatusLogProps {
  logs: LogEntry[];
}

const ProvisioningStatusLog: React.FC<ProvisioningStatusLogProps> = ({ logs }) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs]);

  const getLogIcon = (type: 'info' | 'success' | 'error'): string => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      default:
        return 'ℹ️';
    }
  };

  const getLogColor = (type: 'info' | 'success' | 'error'): string => {
    switch (type) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Waiting for status updates...</Text>
          </View>
        ) : (
          logs.map(log => (
            <View key={log.id} style={styles.logEntry}>
              <Text style={[styles.logIcon, { color: getLogColor(log.type) }]}>
                {getLogIcon(log.type)}
              </Text>
              <View style={styles.logContent}>
                <Text
                  style={[
                    styles.logMessage,
                    { color: getLogColor(log.type) },
                  ]}
                >
                  {log.message}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  scrollView: {
    padding: 12,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logIcon: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  logContent: {
    flex: 1,
  },
  logMessage: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});

export default ProvisioningStatusLog;
