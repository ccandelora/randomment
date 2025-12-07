/**
 * Terms of Service Screen
 * Placeholder screen for Terms of Service
 * Can be replaced with external URL or full content later
 */

import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function TermsOfServiceScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Last Updated: [Date]</Text>
        
        <Text style={styles.paragraph}>
          This is a placeholder Terms of Service screen. Replace this content with your actual terms of service.
        </Text>

        <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          [Add your terms of service content here]
        </Text>

        <Text style={styles.sectionTitle}>User Conduct</Text>
        <Text style={styles.paragraph}>
          [Add your terms of service content here]
        </Text>

        <Text style={styles.sectionTitle}>Content Ownership</Text>
        <Text style={styles.paragraph}>
          [Add your terms of service content here]
        </Text>

        <Text style={styles.sectionTitle}>Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          [Add your terms of service content here]
        </Text>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about these Terms of Service, please contact us at legal@example.com
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  body: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
});

