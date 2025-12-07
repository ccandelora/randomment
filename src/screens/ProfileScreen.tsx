/**
 * Profile Screen
 * 
 * Displays and allows editing of user profile information.
 * Shows username, display name, and bio with edit functionality.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack/lib/typescript/src/types';
import { RootStackParamList } from '../types';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { useMoments } from '../context/MomentsContext';
import { useNotifications } from '../context/NotificationContext';
import { useStats } from '../hooks/useStats';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileNavigationProp>();
  const { profile, isLoading, error, updateProfile } = useProfile();
  const { user, signOut } = useAuth();
  const { moments } = useMoments();
  const { showSuccess, showError } = useNotifications();
  const { stats, isLoading: statsLoading } = useStats();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  // Initialize form values when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to original values
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error: updateError } = await updateProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      });

      if (updateError) {
        // Show more specific error message
        const errorMessage = updateError.message || 'Failed to update profile. Please try again.';
        showError(errorMessage);
        if (__DEV__) {
          console.error('ProfileScreen handleSave error:', updateError);
        }
        return;
      }

      setIsEditing(false);
      showSuccess('Profile updated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      showError(errorMessage);
      if (__DEV__) {
        console.error('ProfileScreen handleSave exception:', err);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
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

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      </View>
    );
  }

  // No profile (shouldn't happen if onboarding worked, but handle gracefully)
  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 20, 32) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.headerButtons}>
              {!isEditing && (
                <TouchableOpacity 
                  onPress={handleEdit} 
                  style={styles.editButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.editButtonIcon}>✏️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={handleSettingsPress} 
                style={styles.settingsButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.settingsButtonText}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Info */}
          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameContainer}>
              <Text style={styles.usernameText}>@{profile.username}</Text>
              <Text style={styles.usernameNote}>
                Username cannot be changed
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Display Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="Your display name"
                placeholderTextColor="#666666"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!isSaving}
                maxLength={50}
              />
            ) : (
              <Text style={styles.value}>
                {profile.display_name || 'Not set'}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Bio</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#666666"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSaving}
                maxLength={200}
              />
            ) : (
              <Text style={styles.value}>
                {profile.bio || 'No bio yet'}
              </Text>
            )}
            {isEditing && (
              <Text style={styles.charCount}>{bio.length}/200</Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.label}>Stats</Text>
            
            {statsLoading ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : stats ? (
              <View style={styles.statsContainer}>
                {/* Total Moments */}
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalMoments}</Text>
                  <Text style={styles.statLabel}>Total Moments</Text>
                </View>
                
                {/* Current Streak */}
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, stats.currentStreak > 0 && styles.statValueStreak]}>
                    {stats.currentStreak}
                  </Text>
                  <Text style={styles.statLabel}>
                    {stats.currentStreak === 1 ? 'Day' : 'Days'} Streak
                    {stats.currentStreak > 0 && (
                      <Text style={styles.statSubtext}> 🔥</Text>
                    )}
                  </Text>
                </View>
                
                {/* This Week */}
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.momentsThisWeek}</Text>
                  <Text style={styles.statLabel}>This Week</Text>
                </View>
                
                {/* Longest Streak */}
                {stats.longestStreak > 0 && stats.longestStreak !== stats.currentStreak && (
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.longestStreak}</Text>
                    <Text style={styles.statLabel}>Best Streak</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>No stats yet</Text>
                </View>
              </View>
            )}
          </View>

          {/* Edit Actions */}
          {isEditing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Settings Link */}
          {!isEditing && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.settingsLinkButton}
                onPress={handleSettingsPress}
                disabled={isEditing}
              >
                <Text style={styles.settingsLinkText}>⚙️ Settings</Text>
                <Text style={styles.settingsLinkArrow}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sign Out Button */}
          {!isEditing && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
                disabled={isEditing}
              >
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 4, // Add small padding for better alignment
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    flex: 1, // Allow title to take available space
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // Increased gap between buttons
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 44, // Minimum touch target size
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonIcon: {
    fontSize: 22,
  },
  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 44, // Minimum touch target size
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 22,
    color: '#CCCCCC',
  },
  settingsLinkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingsLinkText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  settingsLinkArrow: {
    color: '#666666',
    fontSize: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  usernameContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  usernameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  usernameNote: {
    color: '#666666',
    fontSize: 12,
  },
  value: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    width: '100%',
  },
  bioInput: {
    minHeight: 100,
    maxHeight: 150,
  },
  charCount: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  statSubtext: {
    color: '#FF9500',
    fontSize: 14,
  },
  statValueStreak: {
    color: '#FF9500',
  },
  statsLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: '#333333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
