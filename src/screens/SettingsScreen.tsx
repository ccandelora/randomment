/**
 * Settings Screen
 * 
 * Displays app settings including user info, privacy/terms links,
 * clear local data, and logout functionality.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack/lib/typescript/src/types';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useNotifications } from '../context/NotificationContext';
import { clearAllLocalData } from '../services/storage';
import { RootStackParamList } from '../types';

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { showSuccess, showError } = useNotifications();

  const handleClearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will clear all locally stored data including moments. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllLocalData();
              showSuccess('All local data has been cleared.');
            } catch (error) {
              showError('Failed to clear local data. Please try again.');
              if (__DEV__) {
                console.error('Clear local data error:', error);
              }
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    // For now, open placeholder screen
    // Later can be replaced with external URL: Linking.openURL('https://example.com/privacy')
    navigation.navigate('PrivacyPolicy');
  };

  const handleTermsOfService = () => {
    // For now, open placeholder screen
    // Later can be replaced with external URL: Linking.openURL('https://example.com/terms')
    navigation.navigate('TermsOfService');
  };

  const handleLogOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>
            {profile?.username ? `@${profile.username}` : 'Not available'}
          </Text>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handlePrivacyPolicy}
        >
          <Text style={styles.settingItemText}>Privacy Policy</Text>
          <Text style={styles.settingItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleTermsOfService}
        >
          <Text style={styles.settingItemText}>Terms of Service</Text>
          <Text style={styles.settingItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleClearLocalData}
        >
          <Text style={[styles.settingItemText, styles.destructiveText]}>
            Clear Local Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleLogOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  infoLabel: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  settingItemArrow: {
    color: '#666666',
    fontSize: 20,
  },
  destructiveText: {
    color: '#FF3B30',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

