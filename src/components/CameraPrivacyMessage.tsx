/**
 * Privacy messaging component for camera screen
 * Reinforces user control and privacy guarantees
 * Improved typography and spacing for better readability
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const PRIVACY_MESSAGES = [
  'Moment Roulette never records in the background.',
  'We only use your camera when you explicitly open it and tap record.',
  'You always review Moments before they\'re added to your feed.',
] as const;

export function CameraPrivacyMessage() {
  return (
    <View style={styles.container}>
      {PRIVACY_MESSAGES.map((message, index) => (
        <Text key={index} style={styles.text}>
          {message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    maxWidth: 320,
    alignItems: 'center',
  },
  text: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
});
