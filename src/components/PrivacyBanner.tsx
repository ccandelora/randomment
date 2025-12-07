/**
 * Privacy banner component
 * Displays clear messaging about user control and privacy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PrivacyBannerProps {
  message?: string;
}

export function PrivacyBanner({ 
  message = "We never record without your explicit action" 
}: PrivacyBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

