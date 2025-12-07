/**
 * Record button component
 * Large, prominent button for explicit recording control
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
  duration?: number;
  maxDuration?: number;
}

export function RecordButton({ 
  isRecording, 
  onPress, 
  disabled = false,
  duration = 0,
  maxDuration = 10,
}: RecordButtonProps) {
  const progress = maxDuration > 0 ? duration / maxDuration : 0;
  const remainingTime = Math.ceil(maxDuration - duration);

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{remainingTime}s</Text>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          disabled && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={styles.innerCircle}>
          {isRecording && <View style={[styles.progressRing, { opacity: progress }]} />}
        </View>
      </TouchableOpacity>
      <Text style={styles.label}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: '#FF0000',
    borderColor: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF0000',
  },
  progressRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  label: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

