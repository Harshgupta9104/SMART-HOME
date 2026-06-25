import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface WaitingDeviceOnlineProps {
  duration?: number;
}

type Stage = 'credentials' | 'wifi' | 'time' | 'cloud' | 'online';

const WaitingDeviceOnline: React.FC<WaitingDeviceOnlineProps> = ({ _duration = 15000 }) => {
  const [stage, setStage] = useState<Stage>('credentials');

  useEffect(() => {
    const stageTimings = {
      credentials: 0,
      wifi: 3000,
      time: 6000,
      cloud: 10000,
      online: 13000,
    };

    const timers = Object.entries(stageTimings).map(([stageName, delay]) =>
      setTimeout(() => {
        setStage(stageName as Stage);
      }, delay)
    );

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  const getStageLabel = (currentStage: Stage): string => {
    switch (currentStage) {
      case 'credentials':
        return 'WiFi credentials verified';
      case 'wifi':
        return 'Connecting to WiFi...';
      case 'time':
        return 'Syncing time...';
      case 'cloud':
        return 'Connecting to cloud...';
      case 'online':
        return 'Device online';
      default:
        return 'Provisioning...';
    }
  };

  const isStageComplete = (checkStage: Stage): boolean => {
    const stageOrder: Stage[] = ['credentials', 'wifi', 'time', 'cloud', 'online'];
    const currentIndex = stageOrder.indexOf(stage);
    const checkIndex = stageOrder.indexOf(checkStage);
    return checkIndex < currentIndex;
  };

  const stages: Stage[] = ['credentials', 'wifi', 'time', 'cloud', 'online'];

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.title}>{getStageLabel(stage)}</Text>

      <View style={styles.stagesContainer}>
        {stages.map((s, index) => (
          <View key={s} style={styles.stageRow}>
            <View
              style={[
                styles.stageDot,
                isStageComplete(s) && styles.stageDotComplete,
                stage === s && styles.stageDotActive,
              ]}
            >
              {isStageComplete(s) ? (
                <Text style={styles.stageDotText}>✓</Text>
              ) : stage === s ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.stageDotText}>{index + 1}</Text>
              )}
            </View>
            <Text
              style={[
                styles.stageLabel,
                isStageComplete(s) && styles.stageLabelComplete,
                stage === s && styles.stageLabelActive,
              ]}
            >
              {getStageLabel(s)}
            </Text>
          </View>
        ))}
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
    gap: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  stagesContainer: {
    width: '100%',
    gap: 12,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  stageDotActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  stageDotComplete: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  stageDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stageLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  stageLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  stageLabelComplete: {
    color: '#10B981',
  },
});

export default WaitingDeviceOnline;
