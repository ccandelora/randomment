/**
 * Visual indicator shown during recording
 * Displays recording status and remaining time
 * Improved visual design with better contrast and animation-ready structure
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface RecordingIndicatorProps {
  remainingSeconds: number;
}

export function RecordingIndicator({ remainingSeconds }: RecordingIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        Recording <Text style={styles.time}>{remainingSeconds}s</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  time: {
    fontWeight: '700',
    fontSize: 16,
  },
});
